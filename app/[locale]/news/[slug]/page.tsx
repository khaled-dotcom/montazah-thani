import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Motif } from '@/components/motif';
import { Badge, Breadcrumbs, Notice, Prose, Section } from '@/components/primitives';
import { newsCategories } from '@/content/news';
import { allNews, findNews } from '@/lib/cms';
import { ui } from '@/content/ui';
import { formatDate, link, locales, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

/* This page is built from content the dashboard can change, so it must live in
   the revalidation cache rather than being frozen at build time: a fully static
   page cannot be refreshed by revalidatePath at all. Publishing refreshes it
   immediately; the interval is the safety net if that call is ever missed. */
export const revalidate = 300;

/* The layout turns these off site-wide. Content published from the
   dashboard after a build has no prerendered page, so these two routes
   opt back in and render it on first request. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const news = await allNews();
  return locales.flatMap((locale) => news.map((n) => ({ locale, slug: n.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await findNews(slug);
  if (!item) return {};
  return {
    title: item.title[locale],
    description: item.summary[locale],
    alternates: altLinks(`/news/${slug}`, locale),
    openGraph: { type: 'article', publishedTime: item.date, title: item.title[locale] },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const item = await findNews(slug);
  if (!item) notFound();

  const category = newsCategories.find((c) => c.id === item.category);
  const more = (await allNews()).filter((n) => n.slug !== item.slug).slice(0, 3);

  return (
    <>
      <Breadcrumbs
        locale={locale}
        trail={[
          { href: link('/news', locale), label: ui.newsTitle[locale] },
          { href: '#', label: item.title[locale] },
        ]}
      />

      <article className="page-width py-8 md:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand">{category?.label[locale]}</Badge>
          <time dateTime={item.date} className="tnum text-sm text-fg-muted">
            {ui.publishedOn[locale]} {formatDate(item.date, locale)}
          </time>
        </div>

        <h1 className="mt-4 max-w-4xl text-3xl font-extrabold md:text-4xl lg:text-5xl">
          {item.title[locale]}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-fg-muted">{item.summary[locale]}</p>

        {item.demo && (
          <div className="mt-6 max-w-3xl">
            <Notice tone="warn">{ui.demoNotice[locale]}</Notice>
          </div>
        )}

        <div className="mt-8">
          <Motif
            name={item.category === 'culture' ? 'stage' : 'street'}
            ratio="aspect-[21/9]"
            className="rounded-xl"
          />
        </div>

        <div className="mt-10">
          <Prose paragraphs={item.body[locale]} />
        </div>
      </article>

      <Section tone="alt" title={ui.latestNews[locale]}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {more.map((other) => (
            <li key={other.slug}>
              <Link
                href={link(`/news/${other.slug}`, locale)}
                className="card block h-full p-5 transition-shadow hover:shadow-lg"
              >
                <time dateTime={other.date} className="tnum text-xs text-fg-muted">
                  {formatDate(other.date, locale)}
                </time>
                <h3 className="mt-1 font-bold">{other.title[locale]}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
