import type { Metadata } from 'next';
import Link from 'next/link';

import { Motif } from '@/components/motif';
import { Badge, Notice, PageHeader, Section } from '@/components/primitives';
import { DEMO_CONTENT, newsCategories } from '@/content/news';
import { allNews } from '@/lib/cms';
import { ui } from '@/content/ui';
import { formatDate, link, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.newsTitle[locale],
    description:
      locale === 'ar'
        ? 'أخبار حي منتزه ثاني بالإسكندرية: المشروعات والخدمات والحملات الميدانية والإعلانات الرسمية.'
        : 'News from El Montazah II, Alexandria: projects, services, field campaigns and official announcements.',
    alternates: altLinks(`/news`, locale),
  };
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  const active = newsCategories.find((c) => c.id === category)?.id;
  const sortedNews = await allNews();
  const shown = active ? sortedNews.filter((n) => n.category === active) : sortedNews;

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'ما الجديد' : 'What’s new'}
        title={ui.newsTitle[locale]}
        lead={
          locale === 'ar'
            ? 'المشروعات الجارية، والتغييرات في الخدمات، والأنشطة الثقافية داخل الحي.'
            : 'Works in progress, changes to services, and cultural activity across the district.'
        }
      />

      <Section>
        {DEMO_CONTENT && (
          <div className="mb-8">
            <Notice tone="warn">{ui.demoNotice[locale]}</Notice>
          </div>
        )}

        <nav aria-label={ui.filterBy[locale]} className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={link('/news', locale)}
                aria-current={!active ? 'true' : undefined}
                className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium ${
                  !active ? 'border-brand bg-brand text-brand-fg' : 'border-line-strong hover:bg-surface-2'
                }`}
              >
                {ui.all[locale]}
              </Link>
            </li>
            {newsCategories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`${link('/news', locale)}?category=${cat.id}`}
                  aria-current={active === cat.id ? 'true' : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium ${
                    active === cat.id
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line-strong hover:bg-surface-2'
                  }`}
                >
                  {cat.label[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <li key={item.slug}>
              <Link
                href={link(`/news/${item.slug}`, locale)}
                className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg"
              >
                <Motif name={item.category === 'culture' ? 'stage' : 'street'} ratio="aspect-[16/8]" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3">
                    <Badge tone="brand">
                      {newsCategories.find((c) => c.id === item.category)?.label[locale]}
                    </Badge>
                    <time dateTime={item.date} className="tnum text-xs text-fg-muted">
                      {formatDate(item.date, locale)}
                    </time>
                  </div>
                  <h2 className="mt-3 font-[family-name:--font-display] text-lg font-bold group-hover:text-brand">
                    {item.title[locale]}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-fg-muted">{item.summary[locale]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
