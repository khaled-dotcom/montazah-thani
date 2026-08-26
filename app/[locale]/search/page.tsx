import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHeader, Section } from '@/components/primitives';
import { SearchClient } from '@/components/search-client';
import { ui } from '@/content/ui';
import { docTypeLabel, type DocType } from '@/lib/search';
import { buildIndex } from '@/lib/search-index';
import type { Locale } from '@/lib/i18n';

/* This page is built from content the dashboard can change, so it must live in
   the revalidation cache rather than being frozen at build time: a fully static
   page cannot be refreshed by revalidatePath at all. Publishing refreshes it
   immediately; the interval is the safety net if that call is ever missed. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.search[locale],
    description: ui.searchAria[locale],
    robots: { index: false, follow: true },
  };
}

const TYPES: DocType[] = ['landmark', 'service', 'news', 'event', 'listing', 'page', 'faq'];

export default async function SearchPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  // The index is small enough (a few dozen documents) to ship to the browser,
  // which keeps search instant and works offline. Move it behind an API route
  // if the corpus grows past a few hundred entries.
  const docs = await buildIndex(locale);
  const typeLabels = Object.fromEntries(
    TYPES.map((type) => [type, docTypeLabel(type, locale)]),
  ) as Record<DocType, string>;

  return (
    <>
      <PageHeader
        title={ui.search[locale]}
        lead={
          locale === 'ar'
            ? 'ابحث في الخدمات والمعالم والأخبار والفعاليات ودليل الأعمال دفعة واحدة.'
            : 'Search services, landmarks, news, events and the business directory at once.'
        }
      />
      <Section>
        <Suspense fallback={null}>
          <SearchClient locale={locale} docs={docs} typeLabels={typeLabels} />
        </Suspense>
      </Section>
    </>
  );
}
