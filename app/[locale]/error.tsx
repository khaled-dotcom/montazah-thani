'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * Deliberately bilingual and static: whatever broke may well be the thing that
 * tells us which language the reader wanted, so this shows both rather than
 * guessing. It also carries the phone number, because someone who hit an error
 * while trying to file a complaint still needs to file it.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to a line in the server log.
    console.error('[route error]', error.digest ?? '(no digest)', error.message);
  }, [error]);

  return (
    <div className="page-width py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-bold tracking-wide text-accent uppercase">خطأ — Error</p>
        <h1 className="mt-3 text-3xl font-extrabold">تعذّر عرض هذه الصفحة</h1>
        <p className="mt-1 text-xl font-bold text-fg-muted">This page could not be displayed</p>

        <p className="mt-6 text-fg-muted">
          حدث خطأ غير متوقع. جرّب تحديث الصفحة، وإذا تكرر الأمر اتصل بالحي.
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Something went wrong. Try again, and if it keeps happening please call the district.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-brand-fg hover:opacity-90"
          >
            إعادة المحاولة — Try again
          </button>
          {/* A plain anchor on purpose, not <Link>. This screen is shown because
              something in the app threw; routing away through the same client
              router risks landing on the same broken state. A full document load
              gives the visitor a clean slate. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/ar"
            className="rounded-lg border border-line-strong px-6 py-3 font-semibold hover:bg-surface-2"
          >
            الصفحة الرئيسية — Home
          </a>
        </div>

        <p className="mt-8 text-sm text-fg-muted">
          الشكاوى الحكومية{' '}
          <a href="tel:16528" className="tnum font-bold text-brand hover:underline">
            16528
          </a>
        </p>

        {error.digest && (
          <p className="mt-6 text-xs text-fg-muted">
            رمز الخطأ — Error reference: <span className="tnum font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
