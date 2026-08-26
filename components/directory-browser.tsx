'use client';

import { useMemo, useState } from 'react';

import { ui } from '@/content/ui';
import { normalize } from '@/lib/search';
import type { Locale } from '@/lib/i18n';

export type FlatListing = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  section: string;
  street: string;
  blurb: string;
  verified: boolean;
  accessible: boolean;
};

export function DirectoryBrowser({
  locale,
  listings,
  categories,
  sections,
}: {
  locale: Locale;
  listings: FlatListing[];
  categories: { id: string; label: string }[];
  sections: string[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [section, setSection] = useState('');

  const results = useMemo(() => {
    const q = normalize(query);
    return listings.filter((listing) => {
      if (category && listing.category !== category) return false;
      if (section && listing.section !== section) return false;
      if (!q) return true;
      return normalize(`${listing.name} ${listing.blurb} ${listing.street} ${listing.section}`).includes(q);
    });
  }, [listings, query, category, section]);

  const filtered = query !== '' || category !== '' || section !== '';

  return (
    <>
      <div className="card mb-8 grid gap-4 p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="dir-q" className="mb-1.5 block text-sm font-semibold">
            {ui.search[locale]}
          </label>
          <input
            id="dir-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === 'ar' ? 'اسم النشاط أو الشارع…' : 'Business name or street…'}
            className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="dir-cat" className="mb-1.5 block text-sm font-semibold">
            {ui.filterCategory[locale]}
          </label>
          <select
            id="dir-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm"
          >
            <option value="">{ui.all[locale]}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dir-sec" className="mb-1.5 block text-sm font-semibold">
            {ui.filterSection[locale]}
          </label>
          <select
            id="dir-sec"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm"
          >
            <option value="">{ui.all[locale]}</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setQuery('');
            setCategory('');
            setSection('');
          }}
          disabled={!filtered}
          className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {ui.clearFilters[locale]}
        </button>
      </div>

      <p className="mb-5 text-sm text-fg-muted" aria-live="polite">
        <span className="tnum font-semibold text-fg">{results.length}</span>{' '}
        {locale === 'ar' ? 'نتيجة' : ui.resultsCount.en}
      </p>

      {results.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">{ui.noResults[locale]}</p>
          <p className="mt-1 text-sm text-fg-muted">{ui.noResultsHint[locale]}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((listing) => (
            <li key={listing.id} className="card flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-[family-name:--font-display] font-bold">{listing.name}</h3>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
                    listing.verified
                      ? 'border-verdigris-400/40 bg-verdigris-400/15 text-verdigris-600 dark:text-verdigris-400'
                      : 'border-line bg-surface-2 text-fg-muted'
                  }`}
                >
                  {listing.verified ? ui.verified[locale] : ui.pendingVerification[locale]}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg-muted">{listing.categoryLabel}</p>
              <p className="mt-3 flex-1 text-sm text-fg-muted">{listing.blurb}</p>
              <p className="mt-4 text-xs text-fg-muted">
                {listing.street} — {listing.section}
              </p>
              {listing.accessible && (
                <p className="mt-2 text-xs font-medium text-verdigris-600 dark:text-verdigris-400">
                  ♿ {ui.wheelchairAccessible[locale]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
