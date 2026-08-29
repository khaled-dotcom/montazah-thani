import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * The staff dashboard's session cookie.
 *
 * Signed with ADMIN_PASSWORD rather than a separate secret: it is already the
 * one credential guarding this resource, already required, and rotating it
 * invalidates every open session for free — no second value to generate,
 * store, or leak.
 */

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours — one shift

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex');
}

/** Constant-time comparison, safe for secrets of differing length. */
export function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, 'utf8');
  const bBytes = Buffer.from(b, 'utf8');
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

export function createAdminSession(password: string): string {
  const expires = String(Date.now() + ADMIN_SESSION_MAX_AGE * 1000);
  return `${expires}.${sign(expires, password)}`;
}

export function verifyAdminSession(value: string | undefined, password: string): boolean {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot === -1) return false;

  const expires = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!safeEqual(sig, sign(expires, password))) return false;

  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
