'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  safeEqual,
} from '@/lib/admin-session';

/** Only ever redirect back into the dashboard, never off-site. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? '');
  return next.startsWith('/admin') ? next : '/admin';
}

export async function login(formData: FormData) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const next = safeNext(formData.get('next'));

  if (!user || !password) redirect('/admin/login?error=disabled');

  const givenUser = String(formData.get('username') ?? '');
  const givenPassword = String(formData.get('password') ?? '');
  const ok = safeEqual(givenUser, user) && safeEqual(givenPassword, password);

  if (!ok) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  // nginx sets this from $scheme (see docker/nginx/*.conf), so the cookie
  // is marked Secure exactly when the connection actually is — during the
  // http-only bootstrap phase, after the switch to TLS, and in local dev
  // where the header is simply absent.
  const proto = (await headers()).get('x-forwarded-proto');

  (await cookies()).set(ADMIN_SESSION_COOKIE, createAdminSession(password), {
    httpOnly: true,
    secure: proto === 'https',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: '/admin',
  });

  redirect(next);
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_SESSION_COOKIE, path: '/admin' });
  redirect('/admin/login');
}
