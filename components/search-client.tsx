'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ui } from '@/content/ui';
import type { Doc, DocType } from '@/lib/search';
import { search } from '@/lib/search';
import { link, type Locale } from '@/lib/i18n';

export function SearchClient({
  locale,
  docs,
  typeLabels,
}: {
  locale: Locale;
  docs: Doc[];
  typeLabels: Record<DocType, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initial);

  const results = useMemo(() => search(query, docs, 40), [query, docs]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Keep the URL shareable without a full navigation.
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    router.replace(`${link('/search', locale)}${params.size ? `?${params}` : ''}`, {
      scroll: false,
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} role="search" className="card p-5">
        <label htmlFor="site-search" className="mb-1.5 block text-sm font-semibold">
          {ui.searchAria[locale]}
        </label>
        <div className="flex gap-2">
          <input
            id="site-search"
            type="search"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ui.searchPlaceholder[locale]}
            className="flex-1 rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-brand-fg hover:opacity-90"
          >
            {ui.search[locale]}
          </button>
        </div>
      </form>

      {query.trim().length > 0 && (
        <>
          <p className="mt-6 mb-4 text-sm text-fg-muted" aria-live="polite">
            <span className="tnum font-semibold text-fg">{results.length}</span>{' '}
            {locale === 'ar' ? 'نتيجة' : ui.resultsCount.en}
          </p>

          {results.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-semibold">{ui.noResults[locale]}</p>
              <p className="mt-1 text-sm text-fg-muted">{ui.noResultsHint[locale]}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {results.map((hit) => (
                <li key={hit.id}>
                  <Link href={hit.href} className="block py-4 transition-colors hover:bg-surface-2">
                    <span className="text-xs font-semibold text-accent uppercase">
                      {typeLabels[hit.type]}
                    </span>
                    <span className="mt-1 block font-[family-name:--font-display] text-lg font-bold text-brand">
                      {hit.title}
                    </span>
                    <span className="mt-1 block text-sm text-fg-muted">{hit.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
