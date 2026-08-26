import { NextResponse } from 'next/server';

import { getOffice } from '@/content/appointments';
import { takenSlots } from '@/lib/db';
import { slotsForDate } from '@/lib/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Which times are still free at one office on one day.
 *
 * The booking form calls this whenever the office or the day changes, so a
 * visitor is not offered a slot someone else already holds. It is advisory
 * only — the slot is actually won on write, in POST /api/appointments.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const office = url.searchParams.get('office') ?? '';
  const date = url.searchParams.get('date') ?? '';

  if (!getOffice(office) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }

  const all = slotsForDate(date);
  const taken = new Set(await takenSlots(office, date));

  return NextResponse.json(
    {
      date,
      office,
      slots: all.map((time) => ({ time, taken: taken.has(time) })),
    },
    // Availability changes the moment anyone books; never let this be cached.
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
