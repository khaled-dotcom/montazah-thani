import { NextResponse } from 'next/server';

import { AgentError, agentConfigured, submitAgentForm } from '@/lib/agent';
import { ui } from '@/content/ui';
import { isLocale, type Locale } from '@/lib/i18n';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Submits a form the assistant opened inside the chat panel — an appointment
 * booking or a report.
 *
 * This route is a forwarder, not a validator. The assistant re-derives every
 * field against its own district list, service list, open days and free slots
 * before it writes a row, and it is the only side that can see whether a slot
 * was taken thirty seconds ago. Duplicating those rules here would mean two
 * copies to keep in step, and the copy that matters is the one next to the
 * database.
 *
 * What it does own is the shape of what leaves this server: field names and
 * values only, capped in count and length, so a hostile page cannot use the
 * site as an amplifier into the assistant.
 */

/** Matches the assistant's own session-id rule, so a bad id is rejected here. */
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;

const MAX_FIELDS = 24;
const MAX_VALUE_LENGTH = 2000;

/* Form submissions write rows and send email, so they are limited harder than
   chat messages. The assistant keeps its own limiter in the database, shared
   across workers; this one only spares it the obvious floods. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
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

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
}

/** Strings in, strings out — anything else is dropped rather than coerced. */
function cleanValues(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0 || entries.length > MAX_FIELDS) return null;

  const values: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (typeof key !== 'string' || key.length > 64) continue;
    if (typeof value !== 'string') continue;
    values[key] = value.slice(0, MAX_VALUE_LENGTH);
  }

  return Object.keys(values).length > 0 ? values : null;
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  if (!agentConfigured()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const {
    kind,
    sessionId: rawSessionId,
    values: rawValues,
    locale: rawLocale,
  } = (payload ?? {}) as Record<string, unknown>;

  const locale: Locale = typeof rawLocale === 'string' && isLocale(rawLocale) ? rawLocale : 'ar';

  if (kind !== 'appointment' && kind !== 'complaint') {
    return NextResponse.json({ error: 'unknown_form' }, { status: 400 });
  }

  const sessionId = typeof rawSessionId === 'string' ? rawSessionId : '';
  if (!SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }

  const values = cleanValues(rawValues);
  if (!values) {
    return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
  }

  try {
    const result = await submitAgentForm(sessionId, kind, values);

    if (!result.ok) {
      /* Field errors are the citizen's own data coming back for correction,
         so they pass through with their per-field messages intact. */
      return NextResponse.json(
        { error: 'validation', message: result.message, fields: result.fields },
        { status: result.status === 422 ? 422 : result.status },
      );
    }

    const { turn } = result;

    return NextResponse.json({
      reply: turn.reply,
      mode: 'agent',
      intent: turn.intent,
      reference: turn.reference,
      ticketUrl: turn.ticketReference ? `/api/chat/ticket/${turn.ticketReference}` : null,
    });
  } catch (error) {
    /* A timeout here is the dangerous case: the assistant writes the row and
       issues its reference before it answers, so a submission we stopped
       waiting for may well have been recorded. Telling the citizen it failed
       invites them to send it again and end up with two bookings under their
       name — say what is actually true instead. */
    if (error instanceof AgentError && error.timedOut) {
      console.error('[assistant] form submission timed out', error.message);
      return NextResponse.json(
        { error: 'timeout', reply: ui.chatTimeout[locale] },
        { status: 504 },
      );
    }

    console.error('[assistant] form submission failed', error);
    return NextResponse.json({ error: 'storage' }, { status: 502 });
  }
}
