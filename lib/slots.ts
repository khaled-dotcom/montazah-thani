import { bookingHours, holidays, isHoliday } from '@/content/appointments';

/**
 * Which days and times a counter appointment can be booked for.
 *
 * Every function here is pure and works off a YYYY-MM-DD string in the
 * district's own timezone. That matters: the server may well run outside Egypt,
 * and using the host's local time would silently offer — or refuse — a slot on
 * the wrong day. Nothing here reads a clock except `today`, and nothing stores
 * anything, so the API route can re-derive the exact same answer the browser
 * saw and refuse anything that is not on the list.
 */

const TZ = 'Africa/Cairo';

/** YYYY-MM-DD, as it is *in Cairo* right now. */
export function today(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is what we want to compare as strings.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Sunday = 0 … Saturday = 6, for a YYYY-MM-DD read in Cairo. */
export function weekdayOf(date: string): number {
  // Midday UTC is far enough from either edge that no timezone shifts the day.
  const at = new Date(`${date}T12:00:00Z`);
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(at);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

function addDays(date: string, days: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Open on this date: a working weekday, and not a declared holiday. */
export function isOpenDay(date: string): boolean {
  if (!(bookingHours.openDays as readonly number[]).includes(weekdayOf(date))) return false;
  return !isHoliday(date);
}

/** Whether the district has published a holiday calendar at all. */
export const hasHolidayCalendar = holidays.length > 0;

/**
 * The bookable days: open days only, starting after the lead time and running
 * to the horizon.
 */
export function openDates(now: Date = new Date()): string[] {
  const first = today(now);
  const dates: string[] = [];
  for (let i = bookingHours.leadDays; i <= bookingHours.horizonDays; i++) {
    const date = addDays(first, i);
    if (isOpenDay(date)) dates.push(date);
  }
  return dates;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Every slot the counter runs in a day, regardless of what is already taken. */
export function slotsForDate(date: string): string[] {
  if (!isOpenDay(date)) return [];
  const slots: string[] = [];
  const end = toMinutes(bookingHours.end);
  for (let t = toMinutes(bookingHours.start); t < end; t += bookingHours.stepMinutes) {
    slots.push(toHHMM(t));
  }
  return slots;
}

/**
 * The one check the API route must run before accepting a booking: the browser
 * is free to post any date and time it likes, so the pair has to be re-derived
 * here rather than trusted.
 */
export function isBookable(date: string, time: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  if (!openDates(now).includes(date)) return false;
  return slotsForDate(date).includes(time);
}

/** A day label in the reader's language, e.g. "الأحد 7 سبتمبر". */
export function formatSlotDate(date: string, locale: 'ar' | 'en'): string {
  const at = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(at);
}

/** A slot time in the reader's language, e.g. "٩:٣٠ ص". */
export function formatSlotTime(time: string, locale: 'ar' | 'en'): string {
  const at = new Date(`1970-01-01T${time}:00Z`);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'ar',
  }).format(at);
}
