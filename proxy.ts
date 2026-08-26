import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gate on the staff dashboard.
 *
 * HTTP Basic, checked against ADMIN_USER / ADMIN_PASSWORD. That is deliberately
 * modest, and its limits should be understood before this carries real bookings:
 *
 *   - Basic sends the password on every request, base64-encoded, not hashed.
 *     Over plain HTTP that is the same as sending it in the clear, so the
 *     deployment MUST terminate TLS in front of this.
 *   - One shared account for the whole office means no audit trail: the list
 *     shows who booked, never which clerk cancelled it.
 *   - There is no lockout, so a weak password will eventually be guessed.
 *
 * It is the right size for a district counter tool behind HTTPS, and the wrong
 * size the moment more than a handful of people need their own login. Replace
 * it with the governorate's own sign-on when that exists.
 *
 * Fails closed: with no password configured, the dashboard is unreachable
 * rather than open.
 */

/* Header values are Latin-1 only: an em dash or an Arabic letter here throws
   before the 401 is ever sent, and the browser gets a 500 with no login prompt.
   Keep this ASCII. */
const REALM = 'Hay Wasat staff';

function unauthorized(message: string) {
  return new NextResponse(message, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

/** Compares without leaking length or position through timing. */
function safeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i]! ^ bBytes[i]!;
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      'لوحة الموظفين غير مُفعّلة: اضبط ADMIN_USER و ADMIN_PASSWORD.\n' +
        'Staff dashboard disabled: set ADMIN_USER and ADMIN_PASSWORD.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized('Authentication required');

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized('Malformed credentials');
  }

  // Only the first colon separates them; a password may contain more.
  const separator = decoded.indexOf(':');
  const givenUser = separator === -1 ? decoded : decoded.slice(0, separator);
  const givenPassword = separator === -1 ? '' : decoded.slice(separator + 1);

  // Both compared every time, so a wrong username costs the same as a wrong password.
  const ok = safeEqual(givenUser, user) === true && safeEqual(givenPassword, password) === true;
  if (!ok) return unauthorized('Invalid credentials');

  // Staff pages list residents' names and phone numbers. Keep them out of
  // caches and out of search engines.
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, private');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
