import Link from 'next/link';

import { getLaw, type LawId } from '@/content/legal';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';

/**
 * The statutes a service is issued under.
 *
 * An unverified citation is shown, but never as though it were settled: it
 * carries a visible "pending confirmation" mark. Hiding it entirely would leave
 * the resident with nothing; presenting it as confirmed would be the district
 * vouching for something its legal office has not read.
 */
export function LegalBasis({ ids, locale }: { ids: LawId[]; locale: Locale }) {
  const items = ids.map(getLaw).filter((l) => l !== undefined);
  if (items.length === 0) return null;

  const anyUnverified = items.some((l) => !l.verified);

  return (
    <section aria-labelledby="legal-basis">
      <h2 id="legal-basis" className="rule-accent text-xl font-extrabold">
        {ui.legalBasis[locale]}
      </h2>

      <ul className="mt-4 space-y-3">
        {items.map((law) => (
          <li key={law.id} className="card p-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-[family-name:--font-display] font-bold">
                {law.name[locale]}
              </span>
              {law.citation[locale] !== '—' && (
                <span className="tnum text-sm font-semibold text-brand">
                  {law.citation[locale]}
                </span>
              )}
              {law.amended && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
                  {ui.legalAmended[locale]}
                </span>
              )}
              {!law.verified && (
                <span className="rounded-full bg-gold-400/25 px-2 py-0.5 text-xs font-semibold text-gold-600 dark:bg-gold-600/25 dark:text-gold-400">
                  {ui.legalUnverified[locale]}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-fg-muted">{law.covers[locale]}</p>
            {law.href && (
              <a
                href={law.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand underline"
              >
                {ui.legalOfficialText[locale]} ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-fg-muted">
        {anyUnverified ? ui.legalNoticeUnverified[locale] : ui.legalNotice[locale]}{' '}
        <Link href={link('/laws', locale)} className="font-semibold text-brand hover:underline">
          {ui.legalAllLaws[locale]}
        </Link>
      </p>
    </section>
  );
}
