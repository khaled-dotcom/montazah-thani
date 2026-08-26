import type { Metadata } from 'next';
import Link from 'next/link';

import { MotifChip } from '@/components/motif';
import { Notice, PageHeader, Section } from '@/components/primitives';
import { allLandmarks } from '@/lib/cms';
import { parkingAreas, trails, transportModes } from '@/content/transport';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

/* This page is built from content the dashboard can change, so it must live in
   the revalidation cache rather than being frozen at build time: a fully static
   page cannot be refreshed by revalidatePath at all. Publishing refreshes it
   immediately; the interval is the safety net if that call is ever missed. */
export const revalidate = 300;

/** Bounding box covering the district, used for the embedded map: from the
    Montazah Gardens in the west to Abu Qir bay and Nelson's Island in the east. */
const BBOX = { minLng: 29.995, minLat: 31.278, maxLng: 30.09, maxLat: 31.335 };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.mapTitle[locale],
    description:
      locale === 'ar'
        ? 'كيف تتنقل في حي المنتزه الثانية بالإسكندرية: قطار أبو قير والترام والميكروباص، ومسارات المشي، ومواقف السيارات.'
        : 'Getting around El Montazah II, Alexandria: the Abu Qir train, tram, bus and microbus, walking trails and parking.',
    alternates: altLinks(`/map`, locale),
  };
}

export default async function MapPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  /* Read once and index by slug: the coordinates table lists every landmark,
     and each walking trail then names its stops out of the same list. */
  const landmarks = await allLandmarks();
  const bySlug = new Map(landmarks.map((l) => [l.slug, l]));
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX.minLng}%2C${BBOX.minLat}%2C${BBOX.maxLng}%2C${BBOX.maxLat}&layer=mapnik`;

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'التنقل' : 'Getting around'}
        title={ui.mapTitle[locale]}
        lead={
          locale === 'ar'
            ? 'أغلب معالم الحي داخل دائرة قطرها كيلومتران — المشي غالبًا أسرع من السيارة، والترام أوضح مسارًا للزائر.'
            : 'Most of the district sits inside a two-kilometre circle — walking is often faster than driving, and the tram is the easiest route to follow.'
        }
      />

      <Section title={ui.mapCaption[locale]}>
        <div className="card overflow-hidden">
          <iframe
            src={embedSrc}
            title={ui.mapCaption[locale]}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[24rem] w-full border-0 md:h-[32rem]"
          />
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          {locale === 'ar' ? 'خريطة الأساس من ' : 'Base map from '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>
          {locale === 'ar'
            ? '. مواقع المعالم تقريبية وتحتاج مطابقة مع طبقة الـGIS الخاصة بالحي.'
            : '. Landmark positions are approximate and need reconciling with the district GIS layer.'}
        </p>

        <h3 className="mt-10 text-lg font-bold">
          {locale === 'ar' ? 'المعالم وإحداثياتها' : 'Landmarks and coordinates'}
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-start">
                <th scope="col" className="py-2.5 pe-4 text-start font-semibold">
                  {locale === 'ar' ? 'المعلم' : 'Landmark'}
                </th>
                <th scope="col" className="py-2.5 pe-4 text-start font-semibold">
                  {ui.landmarkSection[locale]}
                </th>
                <th scope="col" className="py-2.5 text-start font-semibold">
                  {locale === 'ar' ? 'الموقع' : 'Location'}
                </th>
              </tr>
            </thead>
            <tbody>
              {landmarks.map((landmark) => (
                <tr key={landmark.slug} className="border-b border-line">
                  <td className="py-2.5 pe-4">
                    <Link
                      href={link(`/landmarks/${landmark.slug}`, locale)}
                      className="font-medium text-brand hover:underline"
                    >
                      {landmark.name[locale]}
                    </Link>
                  </td>
                  <td className="py-2.5 pe-4 text-fg-muted">{landmark.section[locale]}</td>
                  <td className="tnum py-2.5">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${landmark.coords.lat}&mlon=${landmark.coords.lng}#map=17/${landmark.coords.lat}/${landmark.coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg-muted hover:underline"
                    >
                      {landmark.coords.lat.toFixed(4)}, {landmark.coords.lng.toFixed(4)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="alt" title={ui.trailsTitle[locale]}>
        <ul className="grid gap-6 md:grid-cols-2">
          {trails.map((trail) => (
            <li key={trail.slug} className="card p-6">
              <h3 className="font-[family-name:--font-display] text-xl font-bold">
                {trail.name[locale]}
              </h3>
              <p className="tnum mt-1 text-sm text-fg-muted">
                {trail.duration[locale]} · {trail.distance[locale]}
              </p>
              <p className="mt-3 text-sm text-fg-muted">{trail.summary[locale]}</p>

              <p className="mt-5 text-xs font-semibold text-fg uppercase">{ui.stops[locale]}</p>
              <ol className="mt-2 space-y-2">
                {trail.stops.map((slug, i) => {
                  const stop = bySlug.get(slug);
                  if (!stop) return null;
                  return (
                    <li key={slug} className="flex items-center gap-3 text-sm">
                      <span className="tnum flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-bold">
                        {i + 1}
                      </span>
                      <Link
                        href={link(`/landmarks/${slug}`, locale)}
                        className="hover:text-brand hover:underline"
                      >
                        {stop.name[locale]}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={ui.transportTitle[locale]}>
        <ul className="grid gap-6 sm:grid-cols-2">
          {transportModes.map((mode) => (
            <li key={mode.id} className="card p-6">
              <MotifChip
                name={
                  mode.id === 'tram'
                    ? 'tram'
                    : mode.id === 'rail'
                      ? 'train'
                      : mode.id === 'walk'
                        ? 'compass'
                        : 'road'
                }
                className="mb-3 size-11"
              />
              <h3 className="font-[family-name:--font-display] text-lg font-bold">
                {mode.name[locale]}
              </h3>
              <p className="mt-2 text-sm text-fg-muted">{mode.detail[locale]}</p>
              <p className="mt-3 border-s-2 border-accent ps-3 text-sm text-fg-muted">
                {mode.note[locale]}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="alt" title={ui.parkingTitle[locale]}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {parkingAreas.map((area) => (
            <li key={area.name.en} className="card p-5">
              <h3 className="font-bold">{area.name[locale]}</h3>
              <p className="mt-1 text-sm text-fg-muted">{area.type[locale]}</p>
              <p className="mt-3 text-xs text-fg-muted">{area.note[locale]}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 max-w-3xl">
          <Notice>
            {locale === 'ar'
              ? 'التعريفة ومواقع الانتظار المنظم قابلة للتغيير — يُرجى الالتزام باللافتات في الموقع.'
              : 'Tariffs and controlled parking areas can change — always follow the signage on site.'}
          </Notice>
        </div>
      </Section>
    </>
  );
}
