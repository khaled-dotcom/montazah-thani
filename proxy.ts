import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-session';

/**
 * Gate on the staff dashboard.
 *
 * A signed, HttpOnly session cookie set by the /admin/login form, keyed on
 * ADMIN_PASSWORD — so there is exactly one secret to configure, and rotating
 * the password invalidates every open session for free. That is deliberately
 * modest, and its limits should be understood before this carries real bookings:
 *
 *   - One shared account for the whole office means no audit trail: the list
 *     shows who booked, never which clerk cancelled it.
 *   - There is no lockout, so a weak password will eventually be guessed.
 *   - The cookie is only as safe as the connection it travels over — the
 *     deployment MUST terminate TLS in front of this (see docker/nginx).
 *
 * It is the right size for a district counter tool behind HTTPS, and the wrong
 * size the moment more than a handful of people need their own login. Replace
 * it with the governorate's own sign-on when that exists.
 *
 * Fails closed: with no password configured, the dashboard is unreachable
 * rather than open.
 */

const LOGIN_PATH = '/admin/login';

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

  const { pathname } = request.nextUrl;

  // The login page (and the POST the form makes to it) must stay reachable
  // without a session, or nobody could ever sign in.
  if (pathname === LOGIN_PATH) return NextResponse.next();

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session, password)) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

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
