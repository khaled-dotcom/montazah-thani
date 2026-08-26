import type { Metadata } from 'next';
import Link from 'next/link';

import { CreditText, Frame } from '@/components/photo';
import { Notice, PageHeader, Section } from '@/components/primitives';
import { allLandmarks } from '@/lib/cms';
import type { Landmark } from '@/content/landmarks';
import { allPhotos, photos, scenes, type Photo } from '@/content/photos';
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
    title: ui.creditsTitle[locale],
    description:
      locale === 'ar'
        ? 'مصادر صور الموقع ومصوّروها وتراخيصها.'
        : 'The source, photographer and licence of every photograph on this site.',
    alternates: altLinks(`/credits`, locale),
  };
}

/* The landmark list is read once by the page and handed down. It comes from
   the database now, so calling it from each of these helpers would be one
   round trip per photograph on a page that shows every photograph at once. */

/** Landmarks that still show a line drawing, so the page can say so plainly. */
function undrawn(landmarks: Landmark[], locale: Locale) {
  return landmarks
    .filter((landmark) => !photos[landmark.slug])
    .map((landmark) => landmark.name[locale]);
}

/** What a photograph is of, in words — its landmark name, or its scene title. */
function subject(landmarks: Landmark[], slug: string, locale: Locale): string | undefined {
  const landmark = landmarks.find((l) => l.slug === slug);
  if (landmark) return landmark.name[locale];
  return scenes.find((scene) => scene.id === slug)?.title[locale];
}

function CreditCard({
  photo,
  locale,
  landmarks,
}: {
  photo: Photo & { slug: string };
  locale: Locale;
  landmarks: Landmark[];
}) {
  const landmark = landmarks.find((l) => l.slug === photo.slug);
  const name = subject(landmarks, photo.slug, locale);

  return (
    <li className="card overflow-hidden">
      {/* Optimised thumbnails, not the originals, and `sizes` pinned to the
          card's real width rather than a viewport fraction. This page shows
          every photograph the site holds at once: served full size that is
          tens of megabytes, and a browser that stalls decoding them. */}
      <Frame
        photo={photo}
        locale={locale}
        ratio="aspect-[16/10]"
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
      />
      <div className="p-4 text-sm">
        {name && (
          <p className="font-bold">
            {landmark ? (
              <Link
                href={link(`/landmarks/${landmark.slug}`, locale)}
                className="hover:text-brand hover:underline"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
        )}
        <p className="mt-2 text-xs text-fg-muted">
          <CreditText credit={photo.credit} locale={locale} />
        </p>
      </div>
    </li>
  );
}

export default async function CreditsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const landmarks = await allLandmarks();
  const missing = undrawn(landmarks, locale);
  const attributed = allPhotos.filter((photo) => photo.credit.kind === 'commons');
  const pending = allPhotos.filter((photo) => photo.credit.kind === 'pending');

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'المصادر' : 'Sources'}
        title={ui.creditsTitle[locale]}
        lead={
          locale === 'ar'
            ? 'كل صورة على هذا الموقع لها مصدر معلن. الصور المأخوذة من ويكيميديا كومنز برخصة تسمح بإعادة الاستخدام مقابل نسبتها إلى مصوّرها — وهذه هي تلك النسبة. والصور التي وفّرها الحي ولم يُسجَّل مصدرها بعد مذكورة هنا كذلك، بلا ادّعاء.'
            : 'Every photograph on this site has a declared source. Those from Wikimedia Commons carry a licence that permits reuse in exchange for crediting the photographer — this page is that credit. Those supplied by the district whose source has not been recorded yet are listed here too, with no claim made for them.'
        }
      />

      <Section title={locale === 'ar' ? 'صور بترخيص موثّق' : 'Photographs with a recorded licence'}>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {attributed.map((photo) => (
            <CreditCard key={photo.src} photo={photo} locale={locale} landmarks={landmarks} />
          ))}
        </ul>
      </Section>

      {pending.length > 0 && (
        <Section
          tone="alt"
          title={locale === 'ar' ? 'صور من الحي — المصدر قيد التوثيق' : 'District photographs — source pending'}
        >
          <div className="mb-8 max-w-3xl">
            <Notice tone="warn">
              {locale === 'ar'
                ? 'هذه الصور مرفوعة ضمن مواد الحي دون تسجيل مصوّرها ورخصتها. حتى يُستكمل ذلك، لا يدّعي الموقع لها ترخيصًا، وتحمل كل واحدة منها سطرًا يقول إن مصدرها قيد التوثيق. على الحي إثبات ملكيته لها أو رخصتها قبل النشر النهائي.'
                : 'These images were supplied with the district’s material without a recorded photographer or licence. Until that is completed the site claims no licence for them, and each carries a line saying its source is pending. The district must establish its ownership of, or licence for, each one before final publication.'}
            </Notice>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((photo) => (
              <CreditCard key={photo.src} photo={photo} locale={locale} landmarks={landmarks} />
            ))}
          </ul>
        </Section>
      )}

      <Section>
        {missing.length > 0 && (
          <div className="max-w-3xl">
            <h2 className="rule-accent text-xl font-extrabold">
              {locale === 'ar' ? 'معالم بلا صورة بعد' : 'Landmarks with no photograph yet'}
            </h2>
            <p className="mt-3 text-sm text-fg-muted">
              {locale === 'ar'
                ? 'لم نعثر على صورة لهذه المعالم يمكن نشرها هنا، فتظهر برسم خطي أُنتج للموقع بدلًا من صورة قد تُضلّل عمّا ستراه على الأرض:'
                : 'We hold no photograph of these that we can publish here, so they appear as a line drawing made for this site rather than as an image that might misrepresent what you would find on the ground:'}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm">
              {missing.map((name, i) => (
                <li key={name}>
                  {name}
                  {i < missing.length - 1 && <span aria-hidden="true">،</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 max-w-3xl">
          <h2 className="rule-accent text-xl font-extrabold">
            {locale === 'ar' ? 'الرسوم الخطية' : 'The line drawings'}
          </h2>
          <p className="mt-3 text-sm text-fg-muted">
            {locale === 'ar'
              ? 'الرسوم الخطية المستخدمة في أيقونات الخدمات وفي المعالم التي لا صورة لها أُنتجت خصيصًا لهذا الموقع، وهي ملك للحي.'
              : 'The line drawings used for service icons, and for landmarks without a photograph, were made for this site and belong to the district.'}
          </p>
        </div>
      </Section>
    </>
  );
}
