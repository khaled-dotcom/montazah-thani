import { NextResponse } from 'next/server';

import { getOffice, getTopic } from '@/content/appointments';
import { createBooking, SlotTakenError } from '@/lib/db';
import { isBookable } from '@/lib/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Counter appointment booking.
 *
 * The booking is written to the district store (lib/db.ts), which is what makes
 * the reference number mean anything: it comes back from the row, the clerk can
 * look it up, and the slot stops being offered to anyone else.
 *
 * Two things are deliberately not trusted:
 *   - the browser's word that a date and time are bookable — lib/slots.ts
 *     re-derives that;
 *   - a check-then-write for availability — the store's unique index decides,
 *     so two simultaneous bookings cannot both win.
 */

type Payload = {
  topic: string;
  office: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  note?: string;
};

const LIMITS = { name: 120, phone: 40, note: 600 };

/* Egyptian mobile numbers, with or without the country code, spaces and dashes
   tolerated: 01X XXXX XXXX. */
const PHONE = /^(?:\+?20|0)?1[0125]\d{8}$/;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  if (buckets.size > 5000) buckets.clear();
  return bucket.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data = (body ?? {}) as Partial<Payload> & { website?: string };

  // Honeypot, same as the contact form: a person never fills a hidden field.
  // The bot gets a plausible reference and nothing is written.
  if (typeof data.website === 'string' && data.website.length > 0) {
    return NextResponse.json({ reference: 'MW-00000000-00000' });
  }

  const errors: string[] = [];

  if (!getTopic(data.topic)) errors.push('topic');
  if (!getOffice(data.office)) errors.push('office');
  if (typeof data.name !== 'string' || data.name.trim().length < 2) errors.push('name');
  if (typeof data.phone !== 'string' || !PHONE.test(data.phone.replace(/[\s-]/g, '')))
    errors.push('phone');

  // The slot is re-derived, never taken on the client's word.
  if (
    typeof data.date !== 'string' ||
    typeof data.time !== 'string' ||
    !isBookable(data.date, data.time)
  ) {
    errors.push('slot');
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    const value = data[field as keyof Payload];
    if (typeof value === 'string' && value.length > max) errors.push(field);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'validation', fields: [...new Set(errors)] }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      topic: data.topic as string,
      office: data.office as string,
      date: data.date as string,
      time: data.time as string,
      name: data.name as string,
      phone: data.phone as string,
      note: data.note as string | undefined,
    });

    // Reference and slot only — never the applicant's name or number, which
    // have no business sitting in a server log.
    console.info('[appointments] booked', {
      reference: booking.reference,
      office: booking.office,
      date: booking.date,
      time: booking.time,
    });

    return NextResponse.json({ reference: booking.reference });
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return NextResponse.json({ error: 'slot_taken', fields: ['slot'] }, { status: 409 });
    }
    console.error('[appointments] could not store booking', error);
    return NextResponse.json({ error: 'storage' }, { status: 500 });
  }
}
