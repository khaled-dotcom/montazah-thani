import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

/**
 * These exercise the real store, so they need a real Postgres.
 *
 * Point TEST_DATABASE_URL at a THROWAWAY database — the suite truncates
 * `appointments` and `messages` before it runs, and would happily do that to
 * the district's live booking record if you pointed it there. It deliberately
 * does not fall back to DATABASE_URL for exactly that reason.
 *
 * With it unset every test below is skipped rather than failed, so `npm test`
 * stays useful on a machine with no database: the pure-logic suites (slots,
 * search, i18n, the assistant's retrieval) still run and still catch things.
 *
 *   docker run --rm -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:16
 *   TEST_DATABASE_URL=postgres://postgres:x@localhost:5433/postgres npm test
 */
const TEST_DB = process.env.TEST_DATABASE_URL ?? '';
const skip = TEST_DB
  ? false
  : 'set TEST_DATABASE_URL to a throwaway Postgres to run the store tests';

/* Set before importing the store — lib/sql.ts reads the connection string once,
   when the module is first evaluated. */
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const {
  closeDb,
  createBooking,
  createMessage,
  getMessage,
  listMessages,
  setMessageStatus,
  unreadMessageCount,
  getByReference,
  healthCheck,
  listBookings,
  setStatus,
  SlotTakenError,
  takenSlots,
} = await import('@/lib/db');

before(async () => {
  if (!TEST_DB) return;
  const { ensureSchema, sql } = await import('@/lib/sql');
  await ensureSchema();
  await sql()`TRUNCATE appointments, messages RESTART IDENTITY`;
});

after(async () => {
  // An open connection keeps the event loop alive and the process never exits.
  if (TEST_DB) await closeDb();
});

const base = {
  topic: 'follow-up',
  office: 'hq-azarita',
  date: '2026-09-01',
  time: '09:00',
  name: 'اسم المواطن',
  phone: '01012345678',
};

test('a booking comes back with a reference that can be looked up', { skip }, async () => {
  const booking = await createBooking({ ...base, time: '09:00' });
  assert.match(booking.reference, /^MW-20260901-\d{5}$/);
  assert.equal(booking.status, 'booked');

  const found = await getByReference(booking.reference);
  assert.equal(found?.name, base.name);
  assert.equal(found?.phone, base.phone);
});

test('the same counter slot cannot be booked twice', { skip }, async () => {
  await createBooking({ ...base, time: '09:30' });
  await assert.rejects(
    () => createBooking({ ...base, time: '09:30', name: 'شخص آخر' }),
    SlotTakenError,
    'the second booking must be refused',
  );
});

test('the same time at a different office is a different slot', { skip }, async () => {
  await createBooking({ ...base, time: '10:00', office: 'hq-azarita' });
  const other = await createBooking({ ...base, time: '10:00', office: 'moharram-bek' });
  assert.equal(other.office, 'moharram-bek');
});

test('cancelling frees the slot for someone else', { skip }, async () => {
  const first = await createBooking({ ...base, time: '11:00' });
  assert.ok((await takenSlots('hq-azarita', base.date)).includes('11:00'));

  await setStatus(first.reference, 'cancelled');
  assert.ok(
    !(await takenSlots('hq-azarita', base.date)).includes('11:00'),
    'slot should be free again',
  );

  // And it can genuinely be rebooked.
  const second = await createBooking({ ...base, time: '11:00', name: 'مواطن آخر' });
  assert.notEqual(second.reference, first.reference);
});

test('marking attended does not free the slot', { skip }, async () => {
  const booking = await createBooking({ ...base, time: '11:30' });
  await setStatus(booking.reference, 'attended');
  assert.ok(
    (await takenSlots('hq-azarita', base.date)).includes('11:30'),
    'an attended appointment still occupied the counter',
  );
});

test('references are unique across many bookings', { skip }, async () => {
  const refs = new Set<string>();
  for (const time of ['12:00', '12:30', '13:00']) {
    refs.add((await createBooking({ ...base, time, office: 'attarin' })).reference);
  }
  assert.equal(refs.size, 3);
});

test('an optional note is stored, and a blank one becomes null', { skip }, async () => {
  const withNote = await createBooking({
    ...base,
    time: '09:00',
    office: 'attarin',
    note: '  ملاحظة  ',
  });
  assert.equal(withNote.note, 'ملاحظة', 'note should be trimmed');

  const blank = await createBooking({ ...base, time: '09:30', office: 'attarin', note: '   ' });
  assert.equal(blank.note, null, 'whitespace-only note should not be stored');
});

test('search finds a booking by reference, name or phone', { skip }, async () => {
  const booking = await createBooking({
    ...base,
    time: '10:30',
    office: 'moharram-bek',
    name: 'سلمى فؤاد',
    phone: '01199998888',
  });

  assert.equal((await listBookings({ query: booking.reference })).length, 1);
  assert.ok(
    (await listBookings({ query: 'سلمى' })).some((b) => b.reference === booking.reference),
  );
  assert.ok(
    (await listBookings({ query: '01199998888' })).some((b) => b.reference === booking.reference),
  );
});

test('the dashboard list is ordered by day then time', { skip }, async () => {
  const list = await listBookings({ office: 'hq-azarita' });
  const keys = list.map((b) => `${b.date} ${b.time}`);
  assert.deepEqual(keys, [...keys].sort(), 'bookings should come back in counter order');
});

test('health check reports a writable store', { skip }, async () => {
  const health = await healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.writable, true);
});

/* ------------------------------------------------------------------ messages */

const messageInput = (over: Record<string, unknown> = {}) => ({
  name: 'مواطن',
  email: 'resident@example.com',
  subject: 'report',
  body: 'عمود إنارة معطّل في شارع فؤاد أمام رقم ١٢.',
  ...over,
});

test('a contact message is stored and findable by its reference', { skip }, async () => {
  const message = await createMessage(messageInput());
  assert.match(message.reference, /^WS-\d{8}-\d{5}$/);
  assert.equal(message.status, 'new', 'a new message starts unread');

  const found = await getMessage(message.reference);
  assert.equal(found?.body, messageInput().body);
  assert.equal(found?.email, 'resident@example.com');
});

test('optional fields become null rather than empty strings', { skip }, async () => {
  const message = await createMessage(messageInput({ phone: '   ', location: '' }));
  assert.equal(message.phone, null);
  assert.equal(message.location, null);
});

test('message references are unique', { skip }, async () => {
  const refs = new Set([
    (await createMessage(messageInput())).reference,
    (await createMessage(messageInput())).reference,
    (await createMessage(messageInput())).reference,
  ]);
  assert.equal(refs.size, 3);
});

test('the unread count tracks status changes', { skip }, async () => {
  const before = await unreadMessageCount();
  const message = await createMessage(messageInput());
  assert.equal(await unreadMessageCount(), before + 1);

  await setMessageStatus(message.reference, 'answered');
  assert.equal(
    await unreadMessageCount(),
    before,
    'answering must clear it from the unread count',
  );
});

test('messages can be filtered by status and searched', { skip }, async () => {
  const message = await createMessage(
    messageInput({ name: 'سعاد حسني', email: 'suad@example.com', body: 'استفسار عن ترخيص' }),
  );
  assert.equal((await listMessages({ query: message.reference })).length, 1);
  assert.ok(
    (await listMessages({ query: 'سعاد' })).some((m) => m.reference === message.reference),
  );
  assert.ok(
    (await listMessages({ status: 'new' })).some((m) => m.reference === message.reference),
  );

  await setMessageStatus(message.reference, 'closed');
  assert.ok(
    !(await listMessages({ status: 'new' })).some((m) => m.reference === message.reference),
  );
});

test('the newest message comes first', { skip }, async () => {
  const latest = await createMessage(messageInput({ name: 'آخر مرسل' }));
  assert.equal((await listMessages())[0]?.reference, latest.reference);
});

test('setting the status of a reference that does not exist reports failure', { skip }, async () => {
  assert.equal(await setMessageStatus('WS-00000000-99999', 'read'), false);
});
