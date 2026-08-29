import type { Metadata } from 'next';
import Link from 'next/link';

import { Frame, Photo, creditLine } from '@/components/photo';
import { Notice, PageHeader, Section } from '@/components/primitives';
import { getPhoto, photos, scenes } from '@/content/photos';
import { allLandmarks } from '@/lib/cms';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

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
    title: ui.galleryTitle[locale],
    description:
      locale === 'ar'
        ? 'معرض بصري لمعالم حي منتزه ثاني بالإسكندرية.'
        : 'A visual gallery of the landmarks of El Montazah II, Alexandria.',
    alternates: altLinks(`/gallery`, locale),
  };
}

/** Attribution as flat text, for the one place a card cannot carry links. */
function landmarkCredit(slug: string, locale: Locale): string {
  const photo = getPhoto(slug);
  if (!photo) {
    return locale === 'ar' ? 'رسم خطي — إنتاج الموقع' : 'Line drawing — made for this site';
  }
  return creditLine(photo.credit, locale);
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const landmarks = await allLandmarks();
  /* A wide, daylit photograph. The banner is short and carries a scrim, so a
     portrait crop loses its subject and a night shot goes to mud under it. */
  const cover = photos['montaza-gardens'] ?? Object.values(photos)[0];

  return (
    <>
      <PageHeader
        image={cover}
        locale={locale}
        eyebrow={locale === 'ar' ? 'بالصورة' : 'In pictures'}
        title={ui.galleryTitle[locale]}
        lead={
          locale === 'ar'
            ? 'لوحة بصرية لمعالم الحي، مرتبة كما قد تراها في جولة سيرًا على الأقدام.'
            : 'A visual board of the district’s landmarks, ordered roughly as you would meet them on foot.'
        }
      />

      {/* Scenes of the district — the shores and streets between the
          landmarks, plus what stands across the water from them. Each card
          names where it actually stands. */}
      <Section
        title={locale === 'ar' ? 'مشاهد من الحي' : 'Scenes of the district'}
        lead={
          locale === 'ar'
            ? 'الكورنيش الشرقي ومصايفه وقرى الصيد التي تصنع أفق الحي — وما يراه الحي على خليجه كل صباح.'
            : 'The eastern corniche, its bathing shores and fishing villages that make the district’s skyline — and what the district looks out at across its bay every morning.'
        }
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((scene, i) => (
            <li
              key={scene.id}
              className={`group ${i === 0 ? 'sm:col-span-2' : ''}`}
            >
              <figure className="card h-full overflow-hidden">
                <Frame
                  photo={scene}
                  locale={locale}
                  ratio={i === 0 ? 'aspect-[21/9]' : 'aspect-[4/3]'}
                  sizes={
                    i === 0
                      ? '(min-width: 1024px) 66vw, 100vw'
                      : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
                  }
                  zoom
                />
                <figcaption className="p-4">
                  <p className="font-[family-name:--font-display] font-bold">
                    {scene.title[locale]}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">{scene.where[locale]}</p>
                  <p className="mt-2 text-xs text-fg-muted opacity-75">
                    {creditLine(scene.credit, locale)}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="alt" title={ui.landmarksTitle[locale]}>
        <div className="mb-8 max-w-3xl">
          <Notice>
            {locale === 'ar'
              ? 'الصور المأخوذة من ويكيميديا كومنز منشورة بتراخيص تسمح بإعادة الاستخدام مع نسبتها إلى مصوّريها، واسم كل مصوّر ورخصته مذكوران في صفحة حقوق الصور. الصور التي وفّرها الحي ولم يُوثَّق مصدرها بعد مُعلَّمة كذلك. المعالم التي لا صورة لها تظهر برسم خطي أُنتج للموقع.'
              : 'Photographs taken from Wikimedia Commons are published under licences that permit reuse with attribution; each photographer and licence is named on the image credits page. Photographs supplied by the district whose source is not yet recorded are marked as such. Landmarks with no photograph appear as a line drawing made for this site.'}
          </Notice>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landmarks.map((landmark, i) => (
            <li
              key={landmark.slug}
              className={i % 5 === 0 ? 'sm:col-span-2 lg:col-span-2' : undefined}
            >
              <Link
                href={link(`/landmarks/${landmark.slug}`, locale)}
                className="card group block overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Photo
                  slug={landmark.slug}
                  motif={landmark.motif}
                  locale={locale}
                  ratio={i % 5 === 0 ? 'aspect-[21/9]' : 'aspect-[4/3]'}
                  sizes={
                    i % 5 === 0
                      ? '(min-width: 1024px) 66vw, 100vw'
                      : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
                  }
                  zoom
                />
                <div className="p-4">
                  <p className="font-[family-name:--font-display] font-bold group-hover:text-brand">
                    {landmark.name[locale]}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">{landmark.section[locale]}</p>
                  {/* Plain text, not a link: this card is already one big link. The
                      linked form of the same credit lives on the credits page. */}
                  <p className="mt-2 text-xs text-fg-muted opacity-75">
                    {landmarkCredit(landmark.slug, locale)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
