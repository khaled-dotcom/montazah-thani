import 'server-only';
/* This module talks to Postgres. Importing it from a client component would
   pull the driver into the browser bundle; the guard turns that into a clear
   build error naming the offending file. */

import { ensureSchema, sql, toIso, uniqueViolation } from '@/lib/sql';

/**
 * The appointments store.
 *
 * Postgres, reached over the network — see lib/sql.ts for the connection and
 * the schema. This was a SQLite file until the site moved to a serverless host,
 * where the two things that file needed (a writable disk, and the same disk
 * next time) are both absent.
 *
 * These rows are the district's booking record and its inbox. They hold
 * residents' names and telephone numbers, so:
 *
 *   - Use a provider that takes backups. There is no second copy here either,
 *     only someone else's promise of one — check it is actually turned on.
 *   - Point DATABASE_URL at the POOLED connection string.
 *
 * Slots are held by a partial unique index rather than by checking-then-writing:
 * two people pressing "confirm" in the same second both pass a check, but only
 * one wins an index. The loser gets a clean "slot taken" instead of a silent
 * double booking.
 *
 * Every function here is async, which is the one real difference from the
 * SQLite version — a network database cannot be read synchronously, so callers
 * await.
 */

export type BookingStatus = 'booked' | 'attended' | 'cancelled' | 'no_show';

export type Booking = {
  id: number;
  reference: string;
  topic: string;
  office: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  note: string | null;
  status: BookingStatus;
  createdAt: string;
};

/** Open the connection and make sure the tables exist. */
async function db() {
  await ensureSchema();
  return sql();
}

/**
 * Release the connection.
 *
 * The server never calls this — it holds the pool for its whole life — but
 * tests and scripts do, because an open connection keeps the event loop alive
 * and the process would otherwise never exit.
 */
export { closeSql as closeDb } from '@/lib/sql';

/** Thrown when the chosen slot was taken between loading the page and pressing confirm. */
export class SlotTakenError extends Error {
  constructor() {
    super('slot_taken');
    this.name = 'SlotTakenError';
  }
}

type NewBooking = {
  topic: string;
  office: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  note?: string;
};

type Row = Record<string, unknown>;

function toBooking(row: Row): Booking {
  return {
    id: Number(row.id),
    reference: String(row.reference),
    topic: String(row.topic),
    office: String(row.office),
    date: String(row.date),
    time: String(row.time),
    name: String(row.name),
    phone: String(row.phone),
    note: row.note === null ? null : String(row.note),
    status: String(row.status) as BookingStatus,
    createdAt: toIso(row.created_at),
  };
}

/**
 * Reserve a slot and return the booking.
 *
 * The reference is derived from the row id, so it is unique because the id is,
 * and it carries the appointment date — which is what the clerk actually needs
 * when someone reads it out at the counter. Insert and update run in one
 * transaction so no reader can catch the row in the moment it has no reference.
 */
export async function createBooking(input: NewBooking): Promise<Booking> {
  const client = await db();

  try {
    const [row] = await client.begin(async (tx) => {
      const [inserted] = await tx`
        INSERT INTO appointments (topic, office, date, time, name, phone, note)
        VALUES (
          ${input.topic}, ${input.office}, ${input.date}, ${input.time},
          ${input.name.trim()}, ${input.phone.trim()}, ${input.note?.trim() || null}
        )
        RETURNING id
      `;

      const id = Number(inserted.id);
      const reference = `MW-${input.date.replace(/-/g, '')}-${String(id).padStart(5, '0')}`;

      return tx`
        UPDATE appointments SET reference = ${reference} WHERE id = ${id} RETURNING *
      `;
    });

    return toBooking(row as Row);
  } catch (error) {
    /* The slot index is the only uniqueness a visitor can realistically trip.
       Anything else — a reference collision, say — is a bug rather than a race
       between two residents, and should surface as one. */
    if (uniqueViolation(error) === 'appointments_slot') throw new SlotTakenError();
    throw error;
  }
}

/** The times already spoken for at one office on one day. */
export async function takenSlots(office: string, date: string): Promise<string[]> {
  const client = await db();
  const rows = await client`
    SELECT time FROM appointments
    WHERE office = ${office} AND date = ${date} AND status <> 'cancelled'
  `;
  return rows.map((r) => String(r.time));
}

export async function getByReference(reference: string): Promise<Booking | undefined> {
  const client = await db();
  const [row] = await client`SELECT * FROM appointments WHERE reference = ${reference}`;
  return row ? toBooking(row as Row) : undefined;
}

export type BookingFilter = { date?: string; office?: string; query?: string };

/** The dashboard list: upcoming first, then by time of day. */
export async function listBookings(
  filter: BookingFilter = {},
  limit = 200,
): Promise<Booking[]> {
  const client = await db();

  /* Composed as fragments rather than string concatenation: each value stays a
     bound parameter, so a clerk searching for a name with an apostrophe in it
     finds the booking instead of a syntax error. */
  const clauses = [];
  if (filter.date) clauses.push(client`date = ${filter.date}`);
  if (filter.office) clauses.push(client`office = ${filter.office}`);
  if (filter.query) {
    const like = `%${filter.query}%`;
    clauses.push(
      client`(reference ILIKE ${like} OR name ILIKE ${like} OR phone ILIKE ${like})`,
    );
  }

  const where = clauses.length
    ? client`WHERE ${clauses.reduce((a, b) => client`${a} AND ${b}`)}`
    : client``;

  const rows = await client`
    SELECT * FROM appointments
    ${where}
    ORDER BY date ASC, time ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => toBooking(r as Row));
}

export async function setStatus(reference: string, status: BookingStatus): Promise<boolean> {
  const client = await db();
  const rows = await client`
    UPDATE appointments SET status = ${status} WHERE reference = ${reference} RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Can this process actually serve bookings?
 *
 * Writes rather than only reading: a read succeeds against a database that has
 * since gone read-only, filled its disk, or failed over to a replica, and the
 * failure would then only surface when a resident presses confirm. The probe
 * table is temporary and dropped on commit, so the check leaves nothing behind
 * and works through a transaction-mode pooler.
 */
export async function healthCheck(): Promise<{
  ok: boolean;
  writable: boolean;
  error?: string;
}> {
  try {
    const client = await db();
    await client.begin(async (tx) => {
      await tx`CREATE TEMP TABLE health_probe (n INTEGER) ON COMMIT DROP`;
      await tx`INSERT INTO health_probe (n) VALUES (1)`;
    });
    return { ok: true, writable: true };
  } catch (error) {
    return {
      ok: false,
      writable: false,
      error: error instanceof Error ? error.message : 'unknown',
    };
  }
}

/** Counts for the dashboard header. */
export async function countsForDate(date: string): Promise<Record<BookingStatus, number>> {
  const client = await db();
  const rows = await client`
    SELECT status, count(*) AS n FROM appointments WHERE date = ${date} GROUP BY status
  `;
  const counts: Record<BookingStatus, number> = {
    booked: 0,
    attended: 0,
    cancelled: 0,
    no_show: 0,
  };
  for (const row of rows) counts[String(row.status) as BookingStatus] = Number(row.n);
  return counts;
}

/* ------------------------------------------------------------------ messages */

export type MessageStatus = 'new' | 'read' | 'answered' | 'closed';

export type Message = {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  location: string | null;
  body: string;
  status: MessageStatus;
  createdAt: string;
};

type NewMessage = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  location?: string;
  body: string;
};

function toMessage(row: Row): Message {
  return {
    id: Number(row.id),
    reference: String(row.reference),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone === null ? null : String(row.phone),
    subject: String(row.subject),
    location: row.location === null ? null : String(row.location),
    body: String(row.body),
    status: String(row.status) as MessageStatus,
    createdAt: toIso(row.created_at),
  };
}

/**
 * Record a contact submission and return it.
 *
 * The reference is derived from the row id for the same reason the booking one
 * is: a number the resident is told to quote has to lead back to something.
 * `WS-` distinguishes a message from an appointment (`MW-`) at a glance, so a
 * clerk knows which list to look in before they start typing.
 */
export async function createMessage(input: NewMessage): Promise<Message> {
  const client = await db();

  const [row] = await client.begin(async (tx) => {
    const [inserted] = await tx`
      INSERT INTO messages (name, email, phone, subject, location, body)
      VALUES (
        ${input.name.trim()}, ${input.email.trim()}, ${input.phone?.trim() || null},
        ${input.subject}, ${input.location?.trim() || null}, ${input.body.trim()}
      )
      RETURNING id
    `;

    const id = Number(inserted.id);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reference = `WS-${stamp}-${String(id).padStart(5, '0')}`;

    return tx`UPDATE messages SET reference = ${reference} WHERE id = ${id} RETURNING *`;
  });

  return toMessage(row as Row);
}

export async function getMessage(reference: string): Promise<Message | undefined> {
  const client = await db();
  const [row] = await client`SELECT * FROM messages WHERE reference = ${reference}`;
  return row ? toMessage(row as Row) : undefined;
}

export async function listMessages(
  filter: { status?: MessageStatus; query?: string } = {},
  limit = 200,
): Promise<Message[]> {
  const client = await db();

  const clauses = [];
  if (filter.status) clauses.push(client`status = ${filter.status}`);
  if (filter.query) {
    const like = `%${filter.query}%`;
    clauses.push(
      client`(reference ILIKE ${like} OR name ILIKE ${like} OR email ILIKE ${like} OR body ILIKE ${like})`,
    );
  }

  const where = clauses.length
    ? client`WHERE ${clauses.reduce((a, b) => client`${a} AND ${b}`)}`
    : client``;

  const rows = await client`
    SELECT * FROM messages
    ${where}
    ORDER BY id DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => toMessage(r as Row));
}

export async function setMessageStatus(
  reference: string,
  status: MessageStatus,
): Promise<boolean> {
  const client = await db();
  const rows = await client`
    UPDATE messages SET status = ${status} WHERE reference = ${reference} RETURNING id
  `;
  return rows.length > 0;
}

/** How many are still untouched — the badge on the dashboard. */
export async function unreadMessageCount(): Promise<number> {
  const client = await db();
  const [row] = await client`SELECT count(*) AS n FROM messages WHERE status = 'new'`;
  return Number(row?.n ?? 0);
}
