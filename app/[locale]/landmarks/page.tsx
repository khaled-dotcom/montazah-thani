import type { Metadata } from 'next';
import Link from 'next/link';

import { toneChip } from '@/components/motif';
import { Photo } from '@/components/photo';
import { PageHeader, Section } from '@/components/primitives';
import { photos } from '@/content/photos';
import {
  categoryTone,
  landmarkCategories,
  type LandmarkCategory,
} from '@/content/landmarks';
import { allLandmarks } from '@/lib/cms';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.landmarksTitle[locale],
    description:
      locale === 'ar'
        ? 'دليل معالم حي المنتزه الثانية بالإسكندرية: حدائق وقصور المنتزه، مصايف المعمورة، خليج أبو قير وجزيرة نيلسون.'
        : 'A guide to the landmarks of El Montazah II, Alexandria: the Montazah Gardens and palaces, the Maamoura shores, Abu Qir Bay and Nelson’s Island.',
    alternates: altLinks(`/landmarks`, locale),
  };
}

export default async function LandmarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;

  const active = landmarkCategories.find((c) => c.id === category)?.id;
  const landmarks = await allLandmarks();
  const shown = active ? landmarks.filter((l) => l.category === active) : landmarks;

  function filterHref(id?: LandmarkCategory) {
    const base = link('/landmarks', locale);
    return id ? `${base}?category=${id}` : base;
  }

  return (
    <>
      <PageHeader
        image={photos['montaza-gardens']}
        locale={locale}
        eyebrow={locale === 'ar' ? 'اكتشف' : 'Discover'}
        title={ui.landmarksTitle[locale]}
        lead={
          locale === 'ar'
            ? 'من جسر الجزيرة بحدائق المنتزه إلى رصيف أبي قير، يضم الحي طبقات متتابعة من تاريخ الإسكندرية: قصور ملكية، وخليج كانوبوس، ومصايف تعرفها أجيال.'
            : 'From the island bridge in the Montazah Gardens to the quay at Abu Qir, the district runs through layer after layer of Alexandria’s story: royal palaces, the bay of ancient Canopus, and bathing shores families have known for generations.'
        }
      />

      <Section>
        {/* Server-rendered filter: works without JavaScript. */}
        <nav aria-label={ui.filterBy[locale]} className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={filterHref()}
                aria-current={!active ? 'true' : undefined}
                className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  !active
                    ? 'border-brand bg-brand text-brand-fg'
                    : 'border-line-strong hover:bg-surface-2'
                }`}
              >
                {ui.all[locale]}
              </Link>
            </li>
            {landmarkCategories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={filterHref(cat.id)}
                  aria-current={active === cat.id ? 'true' : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
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

        <p className="mb-6 text-sm text-fg-muted">
          <span className="tnum font-semibold text-fg">{shown.length}</span>{' '}
          {locale === 'ar' ? 'معلمًا' : shown.length === 1 ? 'landmark' : 'landmarks'}
        </p>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((landmark, i) => (
            <li key={landmark.slug}>
              <Link
                href={link(`/landmarks/${landmark.slug}`, locale)}
                className="card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* The first card is the LCP element on this page. */}
                <Photo
                  slug={landmark.slug}
                  motif={landmark.motif}
                  locale={locale}
                  preload={i === 0}
                  zoom
                />
                <div className="flex flex-1 flex-col p-5">
                  <p
                    className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${toneChip[categoryTone[landmark.category]]}`}
                  >
                    {landmarkCategories.find((c) => c.id === landmark.category)?.label[locale]}
                  </p>
                  <h2 className="mt-1 font-[family-name:--font-display] text-lg font-bold group-hover:text-brand">
                    {landmark.name[locale]}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-fg-muted">{landmark.summary[locale]}</p>
                  <p className="mt-4 text-xs text-fg-muted">{landmark.section[locale]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
