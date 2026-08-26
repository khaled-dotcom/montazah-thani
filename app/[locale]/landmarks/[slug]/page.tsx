import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Frame, Photo, PhotoCredit } from '@/components/photo';
import { Breadcrumbs, DetailRow, Notice, Prose, Section } from '@/components/primitives';
import { landmarkCategories } from '@/content/landmarks';
import { getExtraPhotos, getPhoto } from '@/content/photos';
import { allLandmarks, findLandmark } from '@/lib/cms';
import { ui } from '@/content/ui';
import { link, locales, type Locale } from '@/lib/i18n';
import { altLinks, ogImage } from '@/lib/metadata';

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
  const landmarks = await allLandmarks();
  return locales.flatMap((locale) => landmarks.map((l) => ({ locale, slug: l.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const landmark = await findLandmark(slug);
  if (!landmark) return {};
  const photo = getPhoto(slug);
  return {
    title: landmark.name[locale],
    description: landmark.summary[locale],
    alternates: altLinks(`/landmarks/${slug}`, locale),
    openGraph: {
      title: landmark.name[locale],
      description: landmark.summary[locale],
      ...(photo ? { images: ogImage(photo, locale) } : {}),
    },
  };
}

export default async function LandmarkPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const landmark = await findLandmark(slug);
  if (!landmark) notFound();

  const category = landmarkCategories.find((c) => c.id === landmark.category);
  const extras = getExtraPhotos(landmark.slug);
  const nearby = (await allLandmarks())
    .filter((l) => l.slug !== landmark.slug)
    .map((l) => ({
      landmark: l,
      distance:
        Math.abs(l.coords.lat - landmark.coords.lat) + Math.abs(l.coords.lng - landmark.coords.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const mapsHref = `https://www.openstreetmap.org/?mlat=${landmark.coords.lat}&mlon=${landmark.coords.lng}#map=17/${landmark.coords.lat}/${landmark.coords.lng}`;

  return (
    <>
      <Breadcrumbs
        locale={locale}
        trail={[
          { href: link('/landmarks', locale), label: ui.landmarksTitle[locale] },
          { href: '#', label: landmark.name[locale] },
        ]}
      />

      <div className="page-width py-8 md:py-10">
        <p className="text-sm font-semibold text-accent uppercase">{category?.label[locale]}</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-extrabold md:text-4xl lg:text-5xl">
          {landmark.name[locale]}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-fg-muted">{landmark.summary[locale]}</p>
      </div>

      <div className="page-width">
        <Photo
          slug={landmark.slug}
          motif={landmark.motif}
          locale={locale}
          ratio="aspect-[21/9]"
          className="rounded-xl"
          sizes="(min-width: 1280px) 1200px, 100vw"
          preload
        />
        <PhotoCredit slug={landmark.slug} locale={locale} />

        {/* Further views, where we hold them. A landmark with one photograph
            renders nothing here rather than an empty rail. */}
        {extras.length > 0 && (
          /* One extra fills the column; two or more share it. A lone half-width
             photograph under a full-width one just leaves a hole beside it. */
          <ul className={`mt-4 grid gap-4 ${extras.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {extras.map((extra) => (
              <li key={extra.src}>
                <figure>
                  <Frame
                    photo={extra}
                    locale={locale}
                    ratio={extras.length > 1 ? 'aspect-[16/9]' : 'aspect-[21/9]'}
                    className="rounded-xl"
                    sizes={
                      extras.length > 1
                        ? '(min-width: 640px) 50vw, 100vw'
                        : '(min-width: 1280px) 1200px, 100vw'
                    }
                  />
                  <figcaption className="mt-2 text-xs text-fg-muted">
                    {extra.alt[locale]}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="page-width grid gap-12 py-12 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <Prose paragraphs={landmark.body[locale]} />

          <h2 className="mt-10 rule-accent text-xl font-extrabold">{ui.highlights[locale]}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {landmark.highlights[locale].map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <h2 className="font-[family-name:--font-display] text-lg font-bold">
              {ui.visitInfo[locale]}
            </h2>
            <dl className="mt-3">
              <DetailRow label={ui.landmarkSection[locale]}>{landmark.section[locale]}</DetailRow>
              <DetailRow label={ui.hours[locale]}>{landmark.visit.hours[locale]}</DetailRow>
              <DetailRow label={ui.tickets[locale]}>{landmark.visit.tickets[locale]}</DetailRow>
              <DetailRow label={ui.access[locale]}>{landmark.visit.access[locale]}</DetailRow>
              <DetailRow label={ui.gettingThere[locale]}>{landmark.visit.getting[locale]}</DetailRow>
            </dl>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-lg border border-line-strong px-4 py-2.5 text-center text-sm font-semibold hover:bg-surface-2"
            >
              {ui.openInMaps[locale]}
            </a>
            <div className="mt-4">
              <Notice>{ui.visitDisclaimer[locale]}</Notice>
            </div>
          </div>
        </aside>
      </div>

      <Section tone="alt" title={ui.nearby[locale]}>
        <ul className="grid gap-6 sm:grid-cols-3">
          {nearby.map(({ landmark: item }) => (
            <li key={item.slug}>
              <Link
                href={link(`/landmarks/${item.slug}`, locale)}
                className="card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Photo
                  slug={item.slug}
                  motif={item.motif}
                  locale={locale}
                  ratio="aspect-[16/7]"
                  sizes="(min-width: 640px) 33vw, 100vw"
                  zoom
                />
                <div className="p-4">
                  <h3 className="font-bold group-hover:text-brand">{item.name[locale]}</h3>
                  <p className="mt-1 text-xs text-fg-muted">{item.section[locale]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
