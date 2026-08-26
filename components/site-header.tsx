'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { nav, site } from '@/content/site';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';

/**
 * The governorate emblem — the Pharos lighthouse and the city's founding
 * figure, as it appears on the Alexandria Governorate flag. It is a real
 * insignia, so it is rendered as supplied rather than redrawn: `unoptimized`
 * keeps the flat colour crisp at 40px instead of letting a resampler smear it.
 */
function Crest({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={960}
      height={615}
      unoptimized
      loading="eager"
      fetchPriority="high"
      className={`${className} rounded-md ring-1 ring-line`}
    />
  );
}

function ChevronDown({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const searchId = useId();
  const navRef = useRef<HTMLDivElement>(null);

  /* Close the mobile panel and any dropdown whenever the route changes.
     Adjusted during render rather than in an effect: React re-runs this
     component before painting, so the menu never flashes open on the new page
     the way an effect-based reset does. */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  // Click outside or Escape closes an open dropdown.
  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '';
  const switchHref = `/${other}${pathWithoutLocale}`;

  function isActive(href: string) {
    const full = link(href.split('?')[0], locale);
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('q');
    if (typeof value === 'string' && value.trim()) {
      router.push(`${link('/search', locale)}?q=${encodeURIComponent(value.trim())}`);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      {/* Utility strip */}
      <div className="hidden border-b border-line bg-canvas-alt text-sm md:block">
        <div className="page-width flex items-center justify-between gap-4 py-1.5">
          <p className="text-fg-muted">
            {locale === 'ar' ? 'بوابة رسمية — محافظة الإسكندرية' : 'Official portal — Alexandria Governorate'}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="tel:16528"
              className="font-medium text-fg-muted hover:text-brand hover:underline"
            >
              {locale === 'ar' ? 'الشكاوى الحكومية' : 'Government complaints'}{' '}
              <span className="tnum">16528</span>
            </a>
            <Link
              href={switchHref}
              lang={other}
              hrefLang={other}
              aria-label={ui.switchLanguageLabel[locale]}
              className="rounded-md border border-line-strong px-2.5 py-0.5 font-medium hover:bg-surface"
            >
              {ui.switchLanguage[locale]}
            </Link>
            <ThemeToggle locale={locale} />
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="page-width flex items-center gap-3 py-3">
        <Link
          href={link('/', locale)}
          className="flex shrink-0 items-center gap-3"
          aria-label={site.longName[locale]}
        >
          <Crest />
          <span className="leading-tight">
            <span className="block font-[family-name:--font-display] text-lg font-extrabold text-brand sm:text-xl">
              {site.name[locale]}
            </span>
            <span className="block text-xs text-fg-muted sm:text-sm">
              {locale === 'ar' ? 'محافظة الإسكندرية' : 'Alexandria Governorate'}
            </span>
          </span>
        </Link>

        <div ref={navRef} className="ms-auto hidden lg:block">
          <nav aria-label={ui.menu[locale]}>
            <ul className="flex items-center gap-0.5">
              {nav.map((item) => {
                const active = isActive(item.href);
                if (!item.children) {
                  return (
                    <li key={item.href}>
                      <Link
                        href={link(item.href, locale)}
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 ${
                          active ? 'text-brand underline decoration-2 underline-offset-8' : ''
                        }`}
                      >
                        {item.label[locale]}
                      </Link>
                    </li>
                  );
                }
                const open = openMenu === item.href;
                return (
                  <li key={item.href} className="relative">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-haspopup="true"
                      onClick={() => setOpenMenu(open ? null : item.href)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 ${
                        active ? 'text-brand underline decoration-2 underline-offset-8' : ''
                      }`}
                    >
                      {item.label[locale]}
                      <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <ul className="card pop-in absolute start-0 top-full z-10 mt-1 min-w-56 p-1.5 shadow-xl">
                        <li>
                          <Link
                            href={link(item.href, locale)}
                            className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface-2"
                          >
                            {item.label[locale]}
                          </Link>
                        </li>
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={link(child.href, locale)}
                              className="block rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                            >
                              {child.label[locale]}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <form onSubmit={onSearch} role="search" className="ms-auto hidden lg:ms-3 lg:block">
          <label htmlFor={searchId} className="sr-only">
            {ui.searchAria[locale]}
          </label>
          <div className="relative">
            <input
              id={searchId}
              name="q"
              type="search"
              placeholder={ui.search[locale]}
              className="w-44 rounded-lg border border-line-strong bg-surface py-2 pe-3 ps-9 text-sm placeholder:text-fg-muted transition-[width,border-color] focus:border-focus focus:w-56 focus:outline-none"
            />
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5L18 18" strokeLinecap="round" />
            </svg>
          </div>
        </form>

        {/* Mobile controls */}
        <div className="ms-auto flex items-center gap-2 lg:hidden">
          <Link
            href={switchHref}
            lang={other}
            hrefLang={other}
            aria-label={ui.switchLanguageLabel[locale]}
            className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm font-medium"
          >
            {ui.switchLanguage[locale]}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="rounded-lg border border-line-strong p-2"
          >
            <span className="sr-only">{mobileOpen ? ui.closeMenu[locale] : ui.menu[locale]}</span>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-surface lg:hidden"
        >
          <div className="page-width py-4">
            <form onSubmit={onSearch} role="search" className="mb-4">
              <label htmlFor={`${searchId}-m`} className="sr-only">
                {ui.searchAria[locale]}
              </label>
              <input
                id={`${searchId}-m`}
                name="q"
                type="search"
                placeholder={ui.searchPlaceholder[locale]}
                className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm"
              />
            </form>
            <nav aria-label={ui.menu[locale]}>
              <ul className="space-y-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={link(item.href, locale)}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className="block rounded-lg px-3 py-3 font-medium hover:bg-surface-2 aria-[current=page]:text-brand"
                    >
                      {item.label[locale]}
                    </Link>
                    {item.children && (
                      <ul className="mb-1 ms-3 border-s border-line ps-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={link(child.href, locale)}
                              className="block rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-2"
                            >
                              {child.label[locale]}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <a
              href="tel:16528"
              className="mt-4 flex items-center justify-between rounded-lg bg-canvas-alt px-3 py-3 text-sm font-medium"
            >
              <span>{locale === 'ar' ? 'الشكاوى الحكومية' : 'Government complaints'}</span>
              <span className="tnum text-brand">16528</span>
            </a>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-canvas-alt px-3 py-2.5 text-sm">
              <span className="font-medium">{ui.themeLabel[locale]}</span>
              <ThemeToggle locale={locale} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
