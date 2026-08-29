import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge, PageHeader, Section } from '@/components/primitives';
import { eventKinds, upcomingEvents, events as allEvents } from '@/content/events';
import { allLandmarks } from '@/lib/cms';
import { ui } from '@/content/ui';
import { formatDate, link, type Locale } from '@/lib/i18n';
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
    title: ui.eventsTitle[locale],
    description:
      locale === 'ar'
        ? 'الفعاليات والمواسم في حي منتزه ثاني بالإسكندرية: موسم المصايف، وأمسيات الحدائق، والأنشطة المجتمعية.'
        : 'Events and seasons in El Montazah II, Alexandria: the beach season, garden evenings and community activities.',
    alternates: altLinks(`/events`, locale),
  };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const upcoming = upcomingEvents();
  /* Read once and index by slug. Landmarks come from the database, and looking
     one up inside the render loop would be a round trip per event. */
  const landmarks = new Map((await allLandmarks()).map((l) => [l.slug, l]));
  const past = allEvents.filter((e) => !upcoming.includes(e)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'التقويم' : 'Calendar'}
        title={ui.eventsTitle[locale]}
        lead={
          locale === 'ar'
            ? 'ما يحدث في الحي: من أمسيات المسرح الروماني إلى الجلسات المفتوحة مع الأهالي.'
            : 'What’s on in the district: from evenings at the Roman theatre to open sessions with residents.'
        }
      />

      <Section>
        {upcoming.length === 0 ? (
          <p className="text-fg-muted">{ui.noUpcoming[locale]}</p>
        ) : (
          <ul className="space-y-4">
            {upcoming.map((event) => {
              const landmark = event.landmark ? landmarks.get(event.landmark) : undefined;
              const kind = eventKinds.find((k) => k.id === event.kind);
              return (
                <li key={event.slug} className="card p-5 md:p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <div className="tnum flex shrink-0 flex-row items-center gap-3 md:w-28 md:flex-col md:gap-0 md:rounded-xl md:bg-sea-50 md:py-4 md:text-center md:dark:bg-sea-900">
                      <span className="font-[family-name:--font-display] text-3xl font-extrabold text-brand">
                        {event.date.slice(8, 10)}
                      </span>
                      <span className="text-sm font-medium text-fg-muted">
                        {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        }).format(new Date(`${event.date}T00:00:00Z`))}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{kind?.label[locale]}</Badge>
                        <Badge tone={event.free ? 'success' : 'accent'}>
                          {event.free ? ui.freeEntry[locale] : ui.ticketed[locale]}
                        </Badge>
                      </div>

                      <h2 className="mt-3 font-[family-name:--font-display] text-xl font-bold">
                        {event.title[locale]}
                      </h2>
                      <p className="mt-2 text-fg-muted">{event.summary[locale]}</p>

                      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="font-semibold">{ui.when[locale]}:</dt>
                          <dd className="text-fg-muted">
                            {formatDate(event.date, locale)}
                            {event.endDate ? ` — ${formatDate(event.endDate, locale)}` : ''} ·{' '}
                            {event.time[locale]}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">{ui.where[locale]}:</dt>
                          <dd className="text-fg-muted">
                            {landmark ? (
                              <Link
                                href={link(`/landmarks/${landmark.slug}`, locale)}
                                className="text-brand hover:underline"
                              >
                                {event.venue[locale]}
                              </Link>
                            ) : (
                              event.venue[locale]
                            )}
                          </dd>
                        </div>
                        <div className="flex gap-2 sm:col-span-2">
                          <dt className="font-semibold">{ui.booking[locale]}:</dt>
                          <dd className="text-fg-muted">{event.booking[locale]}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {past.length > 0 && (
          <div className="mt-14">
            <h2 className="rule-accent text-xl font-extrabold">
              {locale === 'ar' ? 'فعاليات سابقة' : 'Past events'}
            </h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {past.map((event) => (
                <li key={event.slug} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                  <time dateTime={event.date} className="tnum w-32 text-sm text-fg-muted">
                    {formatDate(event.date, locale)}
                  </time>
                  <span className="font-medium">{event.title[locale]}</span>
                  <span className="text-sm text-fg-muted">{event.venue[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </>
  );
}
