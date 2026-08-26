import 'server-only';

import postgres from 'postgres';

/**
 * The Postgres connection.
 *
 * The district's bookings, contact messages and published content all live in
 * one Postgres database. It replaced a SQLite file, which was the right shape
 * for a single container with a mounted volume and the wrong one for a
 * serverless host: there, every request may land on a fresh instance with a
 * read-only disk, so a file-backed booking would be written into a sandbox that
 * is discarded moments later.
 *
 * Any Postgres works — Neon, Supabase, RDS, or one you run yourself. Point
 * DATABASE_URL at it. On Vercel the Neon integration sets POSTGRES_URL instead,
 * so both names are accepted and DATABASE_URL wins when they disagree.
 *
 * Use the POOLED connection string where the provider offers one (Neon's
 * `-pooler` host, Supabase's port 6543). Serverless scales out to many
 * short-lived instances, and a direct connection per instance exhausts the
 * server's connection slots long before it runs out of anything else.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

/**
 * Is a database configured at all?
 *
 * Read paths use this to fall back to the content committed in `content/*.ts`
 * rather than failing. That matters most during `next build`: prerendering
 * reads published news and landmarks, and a build should not die because the
 * database was unreachable for a moment — it should ship the curated content
 * and pick the rest up on the next revalidation.
 */
export function isConfigured(): boolean {
  return CONNECTION !== '';
}

/**
 * Is the database on a private network, where plaintext is acceptable?
 *
 * Two cases count. The loopback names are obvious. The other is a *single-label*
 * hostname — `db`, `postgres`, `pgbouncer` — which cannot be a public DNS name
 * at all: public hosts are dotted. A bare label only resolves inside a Docker
 * network or a Kubernetes namespace, so the traffic never leaves the host.
 *
 * Getting this wrong is not harmless in either direction. Too strict and the
 * site cannot reach its own database in compose, because the container's
 * Postgres does not speak TLS and the handshake dies with a socket
 * disconnection that names nothing useful. Too loose and a real remote database
 * is queried in the clear.
 */
function isPrivateHost(connection: string): boolean {
  let hostname: string;
  try {
    ({ hostname } = new URL(connection));
  } catch {
    // An unparseable URL is not something to grant an exemption to.
    return false;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  return hostname !== '' && !hostname.includes('.');
}

/** Thrown by write paths when there is nowhere to write to. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'No database configured. Set DATABASE_URL to a Postgres connection string ' +
        '(see .env.example). Bookings, messages and the staff dashboard need it.',
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

type Sql = ReturnType<typeof postgres>;

/* Next's dev server re-evaluates modules on edit, and a warm serverless
   instance re-enters this one on every request. Without the global, each would
   open another pool and leak it. */
const globalForSql = globalThis as unknown as {
  __districtSql?: Sql;
  __districtSchema?: Promise<void>;
};

export function sql(): Sql {
  if (!isConfigured()) throw new DatabaseNotConfiguredError();
  if (globalForSql.__districtSql) return globalForSql.__districtSql;

  /* Providers put `sslmode` in the URL and postgres.js honours it. When it is
     absent we still require TLS for anything that is not on a private network —
     this connection carries residents' names and telephone numbers, and
     defaulting to plaintext because a query string was missing is not a mistake
     worth leaving available. */
  const declaresSsl = /[?&]sslmode=/.test(CONNECTION);

  const client = postgres(CONNECTION, {
    /* One connection per instance. Serverless runs one request at a time per
       instance, so a larger pool buys nothing and costs the provider's
       connection budget. */
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    /* Transaction-mode poolers (Supabase's 6543, PgBouncer generally) cannot
       carry a prepared statement across the pooled connection it was made on.
       Disabling them costs a little planning time per query and is the only
       thing that works everywhere. */
    prepare: false,
    onnotice: () => {},
    /* Set this key ONLY when we are the ones deciding, because postgres.js
       resolves every option with `k in o` (src/index.js) — and `in` is true for
       a key that is present holding `undefined`. So `ssl: undefined` does not
       mean "fall back to the URL", it means "override the URL with nothing",
       and the sslmode=require the provider put in the connection string is
       never read. The connection then goes out in plaintext and Neon closes it
       with "connection is insecure". Spreading an empty object leaves the key
       absent, which is the only way to actually defer. */
    ...(declaresSsl || isPrivateHost(CONNECTION) ? {} : { ssl: 'require' as const }),
  });

  globalForSql.__districtSql = client;
  return client;
}

/**
 * Create the tables if they are not there yet, once per process.
 *
 * Every read and write funnels through here so that a fresh database — a new
 * Neon project, a preview branch, a developer's local Postgres — works without
 * anyone remembering to run a migration first. `scripts/migrate.mjs` runs the
 * same DDL for when you would rather do it deliberately.
 *
 * Two instances can arrive at an empty database at the same moment, and
 * `CREATE TABLE IF NOT EXISTS` is not in fact safe under that race: both see no
 * table, both create one, and the loser fails on pg_type with a duplicate key
 * error rather than the no-op the name implies. The advisory lock serialises
 * them. It is transaction-scoped, so it is released whatever happens next.
 */
export function ensureSchema(): Promise<void> {
  if (globalForSql.__districtSchema) return globalForSql.__districtSchema;

  const run = sql()
    .begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('district_schema'))`;

      /* Appointments. `date` and `time` stay TEXT holding 'YYYY-MM-DD' and
         'HH:MM' exactly as the form submits them. They are wall-clock values at
         a counter in Alexandria, not instants: storing them as a timestamp
         invites the server's UTC to shift an 09:00 booking to the day before,
         which is the sort of bug only noticed by the resident who is turned
         away. */
      await tx`
        CREATE TABLE IF NOT EXISTS appointments (
          id         BIGSERIAL PRIMARY KEY,
          reference  TEXT        NOT NULL DEFAULT '',
          topic      TEXT        NOT NULL,
          office     TEXT        NOT NULL,
          date       TEXT        NOT NULL,
          time       TEXT        NOT NULL,
          name       TEXT        NOT NULL,
          phone      TEXT        NOT NULL,
          note       TEXT,
          status     TEXT        NOT NULL DEFAULT 'booked',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      /* One live booking per counter slot. Two people pressing confirm in the
         same second both pass any check-then-write; only one can win an index.
         The loser gets a clean "slot taken" instead of a double booking. */
      await tx`
        CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot
          ON appointments (office, date, time)
          WHERE status <> 'cancelled'
      `;
      await tx`CREATE UNIQUE INDEX IF NOT EXISTS appointments_reference ON appointments (reference)`;
      await tx`CREATE INDEX IF NOT EXISTS appointments_by_date ON appointments (date, time)`;

      await tx`
        CREATE TABLE IF NOT EXISTS messages (
          id         BIGSERIAL PRIMARY KEY,
          reference  TEXT        NOT NULL DEFAULT '',
          name       TEXT        NOT NULL,
          email      TEXT        NOT NULL,
          phone      TEXT,
          subject    TEXT        NOT NULL,
          location   TEXT,
          body       TEXT        NOT NULL,
          status     TEXT        NOT NULL DEFAULT 'new',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await tx`CREATE UNIQUE INDEX IF NOT EXISTS messages_reference ON messages (reference)`;
      await tx`CREATE INDEX IF NOT EXISTS messages_by_status ON messages (status, id DESC)`;

      await tx`
        CREATE TABLE IF NOT EXISTS cms_news (
          id         BIGSERIAL PRIMARY KEY,
          slug       TEXT        NOT NULL UNIQUE,
          title_ar   TEXT        NOT NULL,
          title_en   TEXT        NOT NULL,
          date       TEXT        NOT NULL,
          category   TEXT        NOT NULL,
          summary_ar TEXT        NOT NULL,
          summary_en TEXT        NOT NULL,
          body_ar    TEXT        NOT NULL,
          body_en    TEXT        NOT NULL,
          published  BOOLEAN     NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await tx`CREATE INDEX IF NOT EXISTS cms_news_by_date ON cms_news (date DESC)`;

      await tx`
        CREATE TABLE IF NOT EXISTS cms_landmarks (
          id         BIGSERIAL PRIMARY KEY,
          slug       TEXT        NOT NULL UNIQUE,
          name_ar    TEXT        NOT NULL,
          name_en    TEXT        NOT NULL,
          category   TEXT        NOT NULL,
          section_ar TEXT        NOT NULL,
          section_en TEXT        NOT NULL,
          motif      TEXT        NOT NULL,
          summary_ar TEXT        NOT NULL,
          summary_en TEXT        NOT NULL,
          body_ar    TEXT        NOT NULL,
          body_en    TEXT        NOT NULL,
          lat        DOUBLE PRECISION,
          lng        DOUBLE PRECISION,
          published  BOOLEAN     NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })
    .then(() => undefined)
    .catch((error) => {
      /* A failed attempt must not be cached as a success — the next request
         should be able to try again against a database that has since come
         back. */
      delete globalForSql.__districtSchema;
      throw error;
    });

  globalForSql.__districtSchema = run;
  return run;
}

/**
 * Close the pool.
 *
 * The server never calls this; tests and one-shot scripts do, because
 * postgres.js keeps the event loop alive while a connection is open and the
 * process would otherwise hang after the last assertion.
 */
export async function closeSql(): Promise<void> {
  const client = globalForSql.__districtSql;
  delete globalForSql.__districtSql;
  delete globalForSql.__districtSchema;
  if (client) await client.end({ timeout: 5 });
}

/** Postgres' unique-violation SQLSTATE, and the name of the constraint that tripped it. */
export function uniqueViolation(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as { code?: string; constraint_name?: string };
  return e.code === '23505' ? (e.constraint_name ?? '') : undefined;
}

/** An ISO-8601 string from whatever the driver handed back for a timestamp column. */
export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}
