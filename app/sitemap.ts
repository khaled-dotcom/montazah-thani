import type { MetadataRoute } from 'next';

import { allLandmarks, allNews } from '@/lib/cms';
import { services } from '@/content/services';
import { locales } from '@/lib/i18n';

/** Pages that exist once per locale with no dynamic segment. */
const staticPaths = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.7, changeFrequency: 'yearly' as const },
  { path: '/landmarks', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/services', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/news', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/events', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/map', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/directory', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/gallery', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.8, changeFrequency: 'yearly' as const },
  { path: '/appointments', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/accessibility', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/credits', priority: 0.3, changeFrequency: 'monthly' as const },
  { path: '/laws', priority: 0.6, changeFrequency: 'yearly' as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.gov.eg').replace(/\/$/, '');
  const now = new Date();

  /** Every URL is emitted with an hreflang alternate for the other language. */
  function alternates(path: string) {
    return {
      languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
    };
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of staticPaths) {
      entries.push({
        url: `${base}/${locale}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: alternates(page.path),
      });
    }

    for (const landmark of await allLandmarks()) {
      entries.push({
        url: `${base}/${locale}/landmarks/${landmark.slug}`,
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.6,
        alternates: alternates(`/landmarks/${landmark.slug}`),
      });
    }

    for (const service of services) {
      entries.push({
        url: `${base}/${locale}/services/${service.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: alternates(`/services/${service.slug}`),
      });
    }

    for (const item of await allNews()) {
      entries.push({
        url: `${base}/${locale}/news/${item.slug}`,
        lastModified: new Date(`${item.date}T00:00:00Z`),
        changeFrequency: 'yearly',
        priority: 0.5,
        alternates: alternates(`/news/${item.slug}`),
      });
    }
  }

  return entries;
}
