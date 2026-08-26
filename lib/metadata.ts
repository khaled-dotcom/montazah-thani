import type { Photo } from '@/content/photos';
import { locales, type Locale } from '@/lib/i18n';

/**
 * Canonical + hreflang alternates for one page.
 *
 * Every page must emit the full language map, not just its own canonical:
 * setting `alternates` on a page replaces the layout's value rather than
 * merging with it, so a page that only sets `canonical` silently drops the
 * hreflang links for the other language.
 *
 * Hrefs resolve against `metadataBase`, which comes from NEXT_PUBLIC_SITE_URL.
 * Set that in production or the tags stay relative.
 */
export function altLinks(path: string, locale: Locale) {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${clean}`])),
      'x-default': `/ar${clean}`,
    } as Record<string, string>,
  };
}

/**
 * The image a link to this site unfurls with on social platforms and in chat
 * apps. Absolute URLs are required there, and they are produced by resolving
 * these paths against `metadataBase` — so with NEXT_PUBLIC_SITE_URL unset the
 * card falls back to no image rather than a broken one.
 */
export function ogImage(photo: Photo, locale: Locale) {
  return [
    {
      url: photo.src,
      width: photo.width,
      height: photo.height,
      alt: photo.alt[locale],
    },
  ];
}
