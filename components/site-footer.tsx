import Image from 'next/image';
import Link from 'next/link';

import { footerLinks, site } from '@/content/site';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-ink-700 bg-ink-900 text-sand-100">
      {/* The gilt band every page opens with, repeated at the close. */}
      <div aria-hidden="true" className="gilt-band absolute inset-x-0 top-0" />
      {/* The khatam lattice over the dark ground, fading out downward. */}
      <div
        aria-hidden="true"
        className="bg-pattern pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative isolate page-width py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/images/logo.png"
              alt=""
              width={960}
              height={615}
              unoptimized
              className="mb-4 h-12 w-auto rounded-md ring-1 ring-white/25"
            />
            <p className="font-[family-name:--font-display] text-lg font-extrabold text-white">
              {site.longName[locale]}
            </p>
            <p className="mt-3 max-w-sm text-sm text-sand-100/70">{site.description[locale]}</p>
            <address className="mt-4 space-y-1 text-sm not-italic text-sand-100/70">
              <p>{site.address[locale]}</p>
              <p>
                <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="tnum hover:text-white hover:underline">
                  {site.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${site.email}`} className="hover:text-white hover:underline">
                  {site.email}
                </a>
              </p>
            </address>
          </div>

          {footerLinks.map((group) => (
            <nav key={group.title.en} aria-label={group.title[locale]}>
              <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                {group.title[locale]}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={link(item.href, locale)}
                      className="text-sm text-sand-100/70 transition-colors hover:text-white hover:underline"
                    >
                      {item.label[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          <h2 className="text-sm font-bold text-white">{ui.emergencyTitle[locale]}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {site.hotlines.map((h) => (
              <li key={h.key} className="text-sm">
                <a href={`tel:${h.number}`} className="hover:underline">
                  <span className="text-sand-100/70">{h.label[locale]}</span>{' '}
                  <span className="tnum font-bold text-gold-400">{h.number}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-sand-100/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {ui.footerRights[locale]}
          </p>
          {site.social.length > 0 && (
            <ul className="flex gap-4">
              {site.social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="hover:text-white hover:underline"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 rounded-lg border border-dashed border-white/25 px-4 py-3 text-xs text-sand-100/60">
          {ui.footerNote[locale]}
        </p>
      </div>
    </footer>
  );
}
