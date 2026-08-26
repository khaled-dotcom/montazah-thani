import Link from 'next/link';
import type { ReactNode } from 'react';

import { Frame } from '@/components/photo';
import type { Photo } from '@/content/photos';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';

/**
 * Page banner: eyebrow, title, standfirst.
 *
 * Pass `image` and the banner opens on a photograph instead of the tinted
 * gradient — the same treatment as the home hero, at half its height. Type
 * turns white over the scrim in both themes, because white on a photograph is
 * the same decision in light mode and in dark.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  image,
  locale,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  image?: Photo;
  /** Required when `image` is given — the alt text is bilingual. */
  locale?: Locale;
  children?: ReactNode;
}) {
  const photographic = Boolean(image && locale);

  return (
    <div
      className={`relative isolate overflow-hidden border-b border-line ${
        photographic
          ? 'bg-ink-900'
          : 'bg-linear-to-br from-sea-100 via-canvas-alt to-verdigris-400/15 dark:from-sea-900 dark:via-canvas-alt dark:to-canvas-alt'
      }`}
    >
      {image && locale && (
        <>
          {/* Preloaded, not lazy. This is the banner at the very top of the
              page and the LCP element on every page that carries one; left
              lazy, its container is still zero-height at first layout and
              Chrome defers the fetch, leaving the banner a flat grey. */}
          <div className="absolute inset-0 -z-20">
            <Frame photo={image} locale={locale} ratio="" className="size-full" sizes="100vw" preload />
          </div>
          {/* Lighter than the home hero's scrim on purpose. This banner is a
              third of its height, so the same ramp would land entirely in its
              dark end and bury the photograph. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-ink-900/90 via-ink-900/55 to-ink-900/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-r from-ink-900/80 via-ink-900/20 to-transparent rtl:bg-linear-to-l"
          />
        </>
      )}
      {/* Ambient orbs behind the tinted banners: harbour light at the start
          edge, gold at the end. Purely decorative, GPU-transformed only. */}
      {!photographic && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="orb orb-drift-a -top-24 start-[-6%] size-80 bg-sea-400/20 dark:bg-sea-700/30" />
          <span className="orb orb-drift-b -bottom-28 end-[-4%] size-72 bg-gold-400/15 dark:bg-gold-600/20" />
        </div>
      )}
      {/* The khatam lattice over the tinted banner. */}
      {!photographic && (
        <div
          aria-hidden="true"
          className="bg-pattern pointer-events-none absolute inset-0 -z-10"
        />
      )}
      {/* The same gilt band the home hero carries, so every page opens the same way. */}
      <div aria-hidden="true" className="gilt-band absolute inset-x-0 top-0 z-10" />
      <div className={`page-width relative ${photographic ? 'py-14 md:py-20' : 'py-10 md:py-14'}`}>
        {eyebrow && (
          <p
            className={`mb-2 inline-flex rounded-full px-3 py-1 text-sm font-bold tracking-wide uppercase ${
              photographic
                ? 'bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40 backdrop-blur-sm'
                : 'bg-gold-400/25 text-gold-600 dark:bg-gold-600/25 dark:text-gold-400'
            }`}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={`max-w-4xl text-3xl font-extrabold md:text-4xl lg:text-5xl ${
            photographic ? 'text-white drop-shadow-sm' : ''
          }`}
        >
          {title}
        </h1>
        {lead && (
          <p className={`mt-4 max-w-3xl text-lg ${photographic ? 'text-sand-100/90' : 'text-fg-muted'}`}>
            {lead}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function Breadcrumbs({
  locale,
  trail,
}: {
  locale: Locale;
  trail: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={locale === 'ar' ? 'مسار التنقل' : 'Breadcrumb'} className="page-width pt-5">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
        <li>
          <Link href={link('/', locale)} className="hover:text-brand hover:underline">
            {ui.home[locale]}
          </Link>
        </li>
        {trail.map((item, i) => (
          <li key={item.href} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-line-strong">
              /
            </span>
            {i === trail.length - 1 ? (
              <span className="text-fg">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-brand hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Section({
  title,
  lead,
  action,
  children,
  className = '',
  tone = 'plain',
}: {
  title?: string;
  lead?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'alt';
}) {
  return (
    <section className={`${tone === 'alt' ? 'surface-alt border-y border-line' : ''} ${className}`}>
      <div className="page-width py-12 md:py-16">
        {(title || action) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h2 className="rule-accent text-2xl font-extrabold md:text-3xl">{title}</h2>}
              {lead && <p className="mt-2 max-w-2xl text-fg-muted">{lead}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'success';
}) {
  const tones = {
    neutral: 'bg-surface-2 text-fg-muted border-line',
    brand: 'bg-sea-50 text-sea-700 border-sea-200 dark:bg-sea-900 dark:text-sea-200 dark:border-sea-700',
    accent: 'bg-sand-100 text-gold-600 border-sand-300 dark:bg-ink-700 dark:text-gold-400 dark:border-gold-600',
    success:
      'bg-verdigris-400/15 text-verdigris-600 border-verdigris-400/40 dark:text-verdigris-400',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A bordered callout used for disclaimers and demo-content warnings. */
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warn';
}) {
  const tones = {
    info: 'border-sea-200 bg-sea-50 text-sea-800 dark:border-sea-700 dark:bg-sea-900/50 dark:text-sea-100',
    warn: 'border-gold-400 bg-sand-100 text-gold-600 dark:border-gold-600 dark:bg-ink-700 dark:text-gold-400',
  } as const;
  return (
    <p className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role="note">
      {children}
    </p>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="prose-district">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Definition row used on landmark and service detail pages. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-3 last:border-0">
      <dt className="text-sm font-semibold text-fg">{label}</dt>
      <dd className="mt-1 text-sm text-fg-muted">{children}</dd>
    </div>
  );
}

export function ArrowLink({
  href,
  children,
  locale,
}: {
  href: string;
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
    >
      {children}
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={`size-4 transition-transform group-hover:translate-x-0.5 ${
          locale === 'ar' ? 'rotate-180 group-hover:-translate-x-0.5' : ''
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
