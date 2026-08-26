import assert from 'node:assert/strict';
import test from 'node:test';

import { bookingHours } from '@/content/appointments';
import {
  formatSlotTime,
  isBookable,
  isOpenDay,
  openDates,
  slotsForDate,
  today,
  weekdayOf,
} from '@/lib/slots';

/**
 * These cover the decisions that cost a resident a wasted trip if they are
 * wrong: which days are open, which times exist, and whether a slot the browser
 * asks for is one the office actually runs.
 *
 * Run with: npm test
 */

/* Fixed reference points, chosen so the weekday is unambiguous.
   2026-08-25 is a Tuesday; 2026-08-28 a Friday; 2026-08-29 a Saturday. */
const TUESDAY = '2026-08-25';
const FRIDAY = '2026-08-28';
const SATURDAY = '2026-08-29';
const SUNDAY = '2026-08-30';

test('weekdayOf reads the Cairo weekday, not the host machine’s', () => {
  assert.equal(weekdayOf(SUNDAY), 0);
  assert.equal(weekdayOf(TUESDAY), 2);
  assert.equal(weekdayOf(FRIDAY), 5);
  assert.equal(weekdayOf(SATURDAY), 6);
});

test('today() returns a Cairo calendar date', () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  // Late-evening UTC is already the next day in Cairo (UTC+2 or +3).
  const lateUtc = new Date('2026-08-25T22:30:00Z');
  assert.equal(today(lateUtc), '2026-08-26');
});

test('the office is shut on Friday and Saturday', () => {
  assert.equal(isOpenDay(FRIDAY), false);
  assert.equal(isOpenDay(SATURDAY), false);
  assert.equal(isOpenDay(SUNDAY), true);
  assert.equal(isOpenDay(TUESDAY), true);
});

test('a closed day offers no times at all', () => {
  assert.deepEqual(slotsForDate(FRIDAY), []);
  assert.deepEqual(slotsForDate(SATURDAY), []);
});

test('slots run from opening to closing on the configured step', () => {
  const slots = slotsForDate(TUESDAY);
  assert.equal(slots[0], bookingHours.start);
  assert.ok(slots.length > 0);

  // Every slot starts strictly before closing time.
  const toMinutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  for (const slot of slots) {
    assert.ok(toMinutes(slot) < toMinutes(bookingHours.end), `${slot} is at or past closing`);
  }

  // And they are evenly spaced with no gaps or duplicates.
  for (let i = 1; i < slots.length; i++) {
    assert.equal(
      toMinutes(slots[i]!) - toMinutes(slots[i - 1]!),
      bookingHours.stepMinutes,
      `gap before ${slots[i]}`,
    );
  }
});

test('openDates offers only open days, and never today or the past', () => {
  const now = new Date('2026-08-25T09:00:00Z');
  const dates = openDates(now);

  assert.ok(dates.length > 0);
  assert.ok(!dates.includes(today(now)), 'same-day booking should not be offered');
  for (const date of dates) {
    assert.ok(date > today(now), `${date} is not in the future`);
    assert.ok(isOpenDay(date), `${date} is a closed day`);
  }
});

test('openDates respects the booking horizon', () => {
  const now = new Date('2026-08-25T09:00:00Z');
  const dates = openDates(now);
  const last = dates[dates.length - 1]!;
  const daysOut =
    (Date.parse(`${last}T12:00:00Z`) - Date.parse(`${today(now)}T12:00:00Z`)) / 86_400_000;
  assert.ok(daysOut <= bookingHours.horizonDays, `${last} is beyond the horizon`);
});

test('isBookable accepts a real slot', () => {
  const now = new Date('2026-08-25T09:00:00Z');
  const date = openDates(now)[0]!;
  const time = slotsForDate(date)[0]!;
  assert.equal(isBookable(date, time, now), true);
});

test('isBookable refuses what a forged request would send', () => {
  const now = new Date('2026-08-25T09:00:00Z');
  const good = openDates(now)[0]!;

  assert.equal(isBookable(FRIDAY, '10:00', now), false, 'closed day');
  assert.equal(isBookable(good, '17:00', now), false, 'after closing');
  assert.equal(isBookable(good, '08:00', now), false, 'before opening');
  assert.equal(isBookable(good, '10:07', now), false, 'off the half-hour grid');
  assert.equal(isBookable('2020-01-06', '10:00', now), false, 'in the past');
  assert.equal(isBookable(today(now), '10:00', now), false, 'same day, inside the lead time');
  assert.equal(isBookable('not-a-date', '10:00', now), false, 'malformed date');
  assert.equal(isBookable(good, '1000', now), false, 'malformed time');
  assert.equal(isBookable(good, '', now), false, 'empty time');
});

test('times are formatted in the reader’s own numerals', () => {
  // Arabic uses Arabic-Indic digits and a 12-hour clock; English stays 24-hour.
  assert.match(formatSlotTime('09:30', 'ar'), /[٠-٩]/);
  assert.equal(formatSlotTime('13:00', 'en'), '13:00');
});
