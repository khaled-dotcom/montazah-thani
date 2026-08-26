import { NextResponse } from 'next/server';

import { createMessage } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Contact and issue-reporting endpoint.
 *
 * The submission is stored in the district database and shows up in the staff
 * dashboard at /admin/messages, which is what makes the reference number on the
 * visitor's screen worth anything: a clerk can find the message by it.
 *
 * If the district later adopts a case-management system, this is the one place
 * to redirect — the reference should then come from that system instead.
 */

type Payload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  location?: string;
  message: string;
};

const SUBJECTS = ['enquiry', 'report', 'permit', 'listing', 'other'];
const LIMITS = { name: 120, email: 160, phone: 40, location: 240, message: 4000 };

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

  // Honeypot: a real person never fills a field that is hidden from them.
  // The bot gets a plausible reference and nothing is written.
  if (typeof data.website === 'string' && data.website.length > 0) {
    return NextResponse.json({ reference: 'WS-00000000-00000' });
  }

  const errors: string[] = [];
  if (typeof data.name !== 'string' || data.name.trim().length < 2) errors.push('name');
  if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email))
    errors.push('email');
  if (typeof data.subject !== 'string' || !SUBJECTS.includes(data.subject)) errors.push('subject');
  if (typeof data.message !== 'string' || data.message.trim().length < 10) errors.push('message');

  for (const [field, max] of Object.entries(LIMITS)) {
    const value = data[field as keyof Payload];
    if (typeof value === 'string' && value.length > max) errors.push(field);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'validation', fields: [...new Set(errors)] }, { status: 400 });
  }

  try {
    const message = await createMessage({
      name: data.name as string,
      email: data.email as string,
      phone: data.phone as string | undefined,
      subject: data.subject as string,
      location: data.location as string | undefined,
      body: data.message as string,
    });

    // Reference and subject only. The name, email and message body are the
    // resident's, and a server log is the wrong place for them.
    console.info('[contact] message stored', {
      reference: message.reference,
      subject: message.subject,
    });

    return NextResponse.json({ reference: message.reference });
  } catch (error) {
    console.error('[contact] could not store message', error);
    return NextResponse.json({ error: 'storage' }, { status: 500 });
  }
}
