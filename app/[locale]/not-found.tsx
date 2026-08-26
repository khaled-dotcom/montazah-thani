import Link from 'next/link';

import { ui } from '@/content/ui';
import { defaultLocale, link } from '@/lib/i18n';

/**
 * Rendered for unknown paths. It cannot read the locale segment (Next does not
 * pass params to not-found), so it offers both languages.
 */
export default function NotFound() {
  return (
    <div className="page-width flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-[family-name:--font-display] text-7xl font-extrabold text-line-strong">
        404
      </p>
      <h1 className="mt-4 text-2xl font-extrabold md:text-3xl">
        {ui.notFoundTitle.ar} — {ui.notFoundTitle.en}
      </h1>
      <p className="mt-3 max-w-xl text-fg-muted">{ui.notFoundBody.ar}</p>
      <p className="mt-1 max-w-xl text-fg-muted">{ui.notFoundBody.en}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={link('/', defaultLocale)}
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-brand-fg hover:opacity-90"
        >
          الرئيسية
        </Link>
        <Link
          href={link('/', 'en')}
          className="rounded-lg border border-line-strong px-6 py-3 font-semibold hover:bg-surface-2"
        >
          Home
        </Link>
        <Link
          href={link('/search', defaultLocale)}
          className="rounded-lg border border-line-strong px-6 py-3 font-semibold hover:bg-surface-2"
        >
          {ui.search.ar} / {ui.search.en}
        </Link>
      </div>
    </div>
  );
}
