#!/usr/bin/env node
/**
 * Refuses to ship a build that still carries development stand-ins.
 *
 * This site is a government portal. A placeholder telephone number is not a
 * cosmetic problem here — it is a resident dialling a dead line about a permit.
 * None of these values can be guessed by a developer or by a tool: every one of
 * them has to come from the district. So rather than leave them as comments
 * nobody reads, the build stops until each is answered.
 *
 *   npm run preflight                            everything, for a person
 *   node scripts/preflight.mjs --scope=build      content and the built artefact
 *   node scripts/preflight.mjs --scope=runtime    the environment it will run in
 *
 * The two scopes exist because they are answered in different places, and
 * conflating them makes the production image unbuildable. Content — a telephone
 * number, a verified statute — is compiled into the build and has to be right
 * before the image is made. Credentials and API keys are not: they arrive as
 * environment on the running container, and a build that demanded them could
 * only be satisfied by baking a password into an image layer, which is exactly
 * what nobody should do. So the Dockerfile runs --scope=build while building,
 * and --scope=runtime at container start, where the container refuses to serve
 * rather than coming up half-configured.
 *
 * FAIL blocks. WARN prints and continues — those are choices the district may
 * legitimately make (no social accounts yet, say).
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

/* The script runs under plain node, which does not read .env the way `next`
   does. Load it here — but only fill what the environment does not already
   set, so a deployment's real variables always win over the file. */
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const requested = (process.argv.find((a) => a.startsWith('--scope=')) ?? '--scope=all').slice(8);
if (!['build', 'runtime', 'all'].includes(requested)) {
  console.error(`Unknown scope "${requested}". Use build, runtime or all.`);
  process.exit(2);
}

const failures = [];
const warnings = [];
const passes = [];

/**
 * `scope` says where the answer lives, not how serious it is. A check outside
 * the requested scope is skipped entirely: reporting it as passing would be a
 * lie, and reporting it as failing would block the wrong stage.
 */
const runsBuild = requested === 'build' || requested === 'all';

/**
 * Read a source file, but only when the build scope is actually running.
 *
 * The runtime image contains the compiled server and public/ — not content/.
 * Reading those unconditionally crashes the container on start, so the whole
 * build scope is gated on this rather than only its assertions.
 */
const readSource = (p) => (runsBuild ? read(p) : '');

const check = ({ name, ok, fix, level = 'fail', scope = 'build' }) => {
  if (requested !== 'all' && scope !== requested) return;
  if (ok) passes.push(name);
  else if (level === 'warn') warnings.push({ name, fix });
  else failures.push({ name, fix });
};

/* ---------------------------------------------------------------- environment */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
check({
  name: 'NEXT_PUBLIC_SITE_URL is a real district domain',
  ok: /^https:\/\/.+/.test(siteUrl) && !/example\.gov\.eg/.test(siteUrl),
  fix: 'Set NEXT_PUBLIC_SITE_URL to the live https:// domain. It is what sitemap.xml, robots.txt and every canonical/hreflang tag are built from; wrong here means the whole site is misindexed.',
});

const adminUser = process.env.ADMIN_USER ?? '';
const adminPassword = process.env.ADMIN_PASSWORD ?? '';
check({
  name: 'Staff dashboard credentials are set',
  scope: 'runtime',
  ok: adminUser.length > 0 && adminPassword.length > 0,
  fix: 'Set ADMIN_USER and ADMIN_PASSWORD. Without them /admin returns 503 and no one can see the bookings residents are making.',
});
check({
  name: 'Staff password is not trivially guessable',
  scope: 'runtime',
  ok:
    adminPassword.length >= 16 &&
    !/^(admin|password|123|clerk|test|counter-pass)/i.test(adminPassword),
  fix: 'Use at least 16 characters and nothing guessable. This is one shared account with no lockout, so its only defence is length.',
});
check({
  name: 'APPOINTMENTS_DB points at a persistent volume',
  scope: 'runtime',
  ok: (process.env.APPOINTMENTS_DB ?? '').length > 0,
  fix: 'Set APPOINTMENTS_DB to a path on a mounted, backed-up volume. Left unset it defaults inside the project directory, which a container rebuild erases — along with every booking.',
  level: 'warn',
});

/* ------------------------------------------------------- the assistant service */
/* Checked only when AGENT_URL says the assistant is part of this deployment.
   A site running without it is a valid configuration; a site running *with* it
   and a wide-open CORS policy is not. */

const agentUrl = process.env.AGENT_URL ?? '';
if (agentUrl) {
  check({
    name: 'Assistant is reached over a private network or TLS',
  scope: 'runtime',
    ok: /^https:\/\//.test(agentUrl) || /^http:\/\/(agent|localhost|127\.0\.0\.1|\[::1\])(:|$|\/)/.test(agentUrl),
    fix: 'AGENT_URL points at a plain-http host that is not local. Every citizen message, national ID and telephone number in a conversation would cross the network in the clear. Reach the assistant by its compose service name on the internal network, or over https.',
  });

  const secretKey = process.env.SECRET_KEY ?? '';
  check({
    name: 'Assistant session key is long and random',
  scope: 'runtime',
    ok: secretKey.length >= 32 && !/^(changeme|secret|test|dev)/i.test(secretKey),
    fix: 'Set SECRET_KEY to at least 32 random characters — it signs the assistant’s session cookies, and a guessable one lets an attacker forge a staff session. Generate: python -c "import secrets; print(secrets.token_hex(32))"',
  });

  check({
    name: 'Assistant has a Groq key',
  scope: 'runtime',
    ok: (process.env.GROQ_API_KEY ?? '').length > 0,
    fix: 'Set GROQ_API_KEY, or the assistant cannot understand a single message and every conversation ends in an apology.',
  });

  const origins = process.env.ALLOWED_ORIGINS ?? '';
  check({
    name: 'Assistant does not accept every origin',
  scope: 'runtime',
    ok: origins.length > 0 && !origins.split(',').some((o) => o.trim() === '*'),
    fix: 'ALLOWED_ORIGINS is empty or contains "*", so any website on the internet can embed the assistant and file complaints through it in residents’ names. Set it to the district’s own domains, comma-separated.',
  });

  check({
    name: 'Assistant session cookies are Secure',
  scope: 'runtime',
    ok: (process.env.SECURE_COOKIES ?? '1') !== '0',
    fix: 'SECURE_COOKIES=0 lets the assistant’s session cookie travel over plain http. It is a local-development setting; unset it, or set it to 1, before this faces the public.',
  });

  const pgPassword = process.env.POSTGRES_PASSWORD ?? '';
  check({
    name: 'Assistant database password is not trivial',
  scope: 'runtime',
    ok: pgPassword.length >= 16 && !/^(postgres|password|changeme|123)/i.test(pgPassword),
    fix: 'Use at least 16 characters and nothing guessable for POSTGRES_PASSWORD. The assistant’s database holds every complaint, national ID and telephone number residents have given it.',
  });

  check({
    name: 'Site knows which district it speaks for',
  scope: 'runtime',
    ok: (process.env.AGENT_DISTRICT_ID ?? '').length > 0,
    fix: 'Set AGENT_DISTRICT_ID to this district’s row in the assistant’s database, or the assistant asks every caller which district they are writing from before it will take a complaint. `flask import-site-knowledge` prints the id.',
    level: 'warn',
  });

  check({
    name: 'Knowledge base has been exported for the assistant',
    ok: exists('agent/site_knowledge/hay-wasat.json'),
    fix: 'Run `npm run knowledge:export`, then `flask import-site-knowledge` in the assistant. Without it the assistant has no service catalogue and answers "I do not have that" to every question the site can answer.',
  });
}

/* -------------------------------------------------------------------- content */

const site = readSource('content/site.ts');

check({
  name: 'District telephone number is real',
  ok: !/\+20 3 000 0000/.test(site),
  fix: 'Replace site.phone in content/site.ts with the district switchboard number.',
});
check({
  name: 'District email address is real',
  ok: !/example\.gov\.eg/.test(site),
  fix: 'Replace site.email in content/site.ts with the district inbox that is actually monitored.',
});
check({
  name: 'Postal address confirmed',
  ok: !/PLACEHOLDER — confirm with the district office/.test(site),
  fix: 'Confirm site.address in content/site.ts, then delete the PLACEHOLDER comment above it.',
});
check({
  name: 'Social links point at the district accounts',
  ok: !/href: 'https:\/\/(www\.facebook\.com|x\.com|www\.youtube\.com)\/'/.test(site),
  fix: 'Point site.social at the district pages, or delete the entries. Bare domains in a footer look like an unfinished site.',
  level: 'warn',
});

const news = readSource('content/news.ts');
check({
  name: 'Demo news and events are switched off',
  ok: /export const DEMO_CONTENT = false/.test(news),
  fix: 'Replace the sample items in content/news.ts and content/events.ts with real ones, then set DEMO_CONTENT = false. Until then every visitor sees a banner saying the content is fake.',
});

const services = readSource('content/services.ts');
check({
  name: 'Service fees and timescales verified',
  ok: !/MUST be\s*\n?\s*\*?\s*confirmed against the current executive regulations/.test(services),
  fix: 'Check every fee, duration and legal reference in content/services.ts against the current executive regulations, then remove the warning comment at the top of the file.',
});

const appointments = readSource('content/appointments.ts');
check({
  name: 'Appointment offices and counters confirmed',
  ok: !/PLACEHOLDER — office names, room numbers/.test(appointments),
  fix: 'Confirm the offices, room numbers and per-topic durations in content/appointments.ts with the counter supervisor, then remove the PLACEHOLDER note.',
});
/* The mechanism exists (isOpenDay filters by it); what is missing is the list. */
const holidayEntries = (appointments.match(/^\s*\{ date: '\d{4}-\d{2}-\d{2}'/gm) ?? []).length;
check({
  name: 'Public holiday calendar populated',
  ok: holidayEntries > 0,
  fix: 'The `holidays` list in content/appointments.ts is empty, so booking will offer slots on Eid and national holidays. Add this year’s confirmed dates.',
});

const legal = readSource('content/legal.ts');
const unverified = (legal.match(/verified: false/g) ?? []).length;
check({
  name: 'Legal citations confirmed by the legal office',
  ok: unverified === 0,
  fix: `content/legal.ts still has ${unverified} citation(s) marked verified: false. Every service page and /laws currently shows them with a "pending confirmation" badge. The legal office must confirm each statute is current and still governs that service, then flip the flag.`,
});

/* Photographs supplied by the district without a recorded photographer or
   licence. They publish with a visible "source pending" line and the credits
   page lists them apart, so nothing is claimed falsely — but the district still
   has to establish its right to each one. */
const photosFile = readSource('content/photos.ts');
const pendingPhotos = (photosFile.match(/credit: PENDING/g) ?? []).length;
check({
  name: 'Every photograph has a recorded source',
  ok: pendingPhotos === 0,
  fix: `${pendingPhotos} photograph(s) in content/photos.ts carry credit: PENDING — supplied with the district's material, with no photographer or licence recorded. Each publishes with a "source pending confirmation" line. Confirm the district owns or is licensed for each one and replace PENDING with the credit, or remove the file.`,
  level: 'warn',
});

/* --------------------------------------------------------------- deliverability */

check({
  name: 'Contact form reaches a person',
  ok: !runsBuild || /createMessage\(/.test(read('app/api/contact/route.ts')),
  fix: 'app/api/contact/route.ts must store submissions somewhere a clerk reads. It currently does not, so residents would be writing into the void.',
});

/* --------------------------------------------------------------------- assets */

check({
  name: 'Favicon and app icons present',
  ok: exists('app/icon.svg') || exists('app/favicon.ico'),
  fix: 'Add app/icon.svg (and optionally app/apple-icon.png) so the tab and bookmarks show the district crest.',
});

/* --------------------------------------------------------------------- report */

const pad = (s) => s.padEnd(52, ' ');
console.log('\nProduction preflight — حي وسط\n' + '─'.repeat(72));
for (const name of passes) console.log(`  PASS  ${name}`);
for (const { name } of warnings) console.log(`  WARN  ${name}`);
for (const { name } of failures) console.log(`  FAIL  ${name}`);

if (warnings.length) {
  console.log('\nWarnings — the build continues, but read these:\n');
  for (const { name, fix } of warnings) console.log(`  ${pad(name)}\n      ${fix}\n`);
}

if (failures.length) {
  console.log('\nBlocking — each of these needs an answer from the district:\n');
  for (const { name, fix } of failures) console.log(`  ${pad(name)}\n      ${fix}\n`);
  console.log(
    `${failures.length} blocking item${failures.length === 1 ? '' : 's'}. ` +
      'Build refused.\n\nTo build anyway for a staging or demo deployment:\n' +
      '  PREFLIGHT_ALLOW_PLACEHOLDERS=1 npm run build:prod\n',
  );
  if (process.env.PREFLIGHT_ALLOW_PLACEHOLDERS !== '1') process.exit(1);
  console.log('PREFLIGHT_ALLOW_PLACEHOLDERS=1 set — continuing with placeholders in place.\n');
} else {
  console.log(`\nAll ${passes.length} checks passed. Clear to build.\n`);
}
