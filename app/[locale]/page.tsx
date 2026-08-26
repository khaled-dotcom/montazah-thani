import Link from 'next/link';

import { ArrowLink, Badge, Notice, Section } from '@/components/primitives';
import { Motif, MotifChip, motifTone, toneRule } from '@/components/motif';
import { Frame, Photo } from '@/components/photo';
import { HeroSlider, type HeroSlide } from '@/components/hero-slider';
import { LandmarkShowcase, type ShowcaseSlide } from '@/components/landmark-showcase';
import { Counters } from '@/components/counters';
import { VisionTabs } from '@/components/vision-tabs';
import { BackToTop } from '@/components/back-to-top';
import { Reveal } from '@/components/reveal';

import { DEMO_CONTENT } from '@/content/news';
import { allNews, featuredLandmarksMerged } from '@/lib/cms';
import { upcomingEvents } from '@/content/events';
import { getPhoto, heroScene, heroStrip, scenes } from '@/content/photos';
import { featuredServices } from '@/content/services';
import { districtCounters, govLinks, site, visionMission } from '@/content/site';
import { ui } from '@/content/ui';
import { formatDate, link, type Locale } from '@/lib/i18n';

/* This page is built from content the dashboard can change, so it must live in
   the revalidation cache rather than being frozen at build time: a fully static
   page cannot be refreshed by revalidatePath at all. Publishing refreshes it
   immediately; the interval is the safety net if that call is ever missed. */
export const revalidate = 300;

function scene(id: string) {
  return scenes.find((s) => s.id === id) ?? heroScene;
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const news = (await allNews()).slice(0, 3);
  const events = upcomingEvents().slice(0, 4);
  /* Read once. This page renders the featured landmarks twice — the showcase
     slider and the grid below it — and they come from the database now. */
  const featured = await featuredLandmarksMerged();

  const slides: HeroSlide[] = [
    {
      id: 'welcome',
      photo: heroScene,
      eyebrow: {
        ar: 'البوابة الرسمية — محافظة الإسكندرية',
        en: 'The official portal — Alexandria Governorate',
      },
      title: site.name,
      lead: site.tagline,
      ctaLabel: ui.heroCtaServices,
      ctaHref: '/services',
    },
    {
      id: 'booking',
      photo: scene('montaza-bridge'),
      eyebrow: { ar: 'خدمة الحجز المسبق', en: 'Advance booking' },
      title: ui.appointmentBandTitle,
      lead: {
        ar: 'اختر الغرض والمقر والوقت المناسب لك، ووفّر على نفسك انتظار الطوابير.',
        en: 'Choose the purpose, the office and the time that suit you — and spare yourself the queue.',
      },
      ctaLabel: ui.appointmentBandCta,
      ctaHref: '/appointments',
    },
    {
      id: 'heritage',
      photo: scene('montaza-lighthouse'),
      eyebrow: { ar: 'الشمال الشرقي للإسكندرية', en: 'Alexandria’s north-eastern shore' },
      title: ui.discoverTitle,
      lead: {
        ar: 'حدائق ملكية، وقصور تشرف على البحر، ومصايف تعرفها أجيال — كلها على امتداد كورنيش واحد.',
        en: 'Royal gardens, palaces over the sea and bathing shores generations have known — all along a single corniche.',
      },
      ctaLabel: ui.heroCtaExplore,
      ctaHref: '/landmarks',
    },
  ];

  const visionEntries = [visionMission.vision, visionMission.mission, visionMission.values];

  /* The photo tour: every landmark we hold a photograph of, led by the palace
     itself — the district's postcard — then gardens, Salamlek, the bay and the
     shores. Landmarks still without a photograph stay in the grid below. */
  const showcaseOrder = [
    'haramlik-palace',
    'montaza-gardens',
    'salamlek-palace',
    'abu-qir-bay',
    'maamoura-shores',
  ];
  const showcase: ShowcaseSlide[] = showcaseOrder
    .map((slug): ShowcaseSlide | undefined => {
      const landmark = featured.find((l) => l.slug === slug);
      const photo = getPhoto(slug);
      if (!landmark || !photo) return undefined;
      return {
        slug,
        name: landmark.name[locale],
        section: landmark.section[locale],
        motif: landmark.motif,
        photo,
      };
    })
    .filter((slide): slide is ShowcaseSlide => Boolean(slide));

  return (
    <>
      {/* The ambient backdrop: three colour fields breathing behind the whole
          page plus a whisper of grain. Decorative, fixed, pointer-transparent;
          hidden entirely for print and stilled under reduced motion. */}
      <div aria-hidden="true" className="ambient-canvas">
        <span className="ambient-sea" />
        <span className="ambient-gold" />
        <span className="ambient-verdigris" />
      </div>
      <div aria-hidden="true" className="grain" />

      <HeroSlider slides={slides} locale={locale} />

      {/* A filmstrip of the district beneath the hero. Decorative on a small
          screen, so it is simply not rendered there. */}
      <div className="page-width hidden pt-8 lg:block">
        <ul className="flex gap-3">
          {heroStrip.map((sceneItem) => (
            <li key={sceneItem.id} className="min-w-0 flex-1">
              <Link
                href={link('/gallery', locale)}
                className="card card-interactive group block overflow-hidden p-0"
              >
                <Frame
                  photo={sceneItem}
                  locale={locale}
                  ratio="aspect-[16/9]"
                  sizes="20vw"
                  zoom
                />
                <span className="block truncate px-3 py-2 text-xs font-medium text-fg-muted group-hover:text-brand">
                  {sceneItem.title[locale]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Most requested services */}
      <Section title={ui.quickServices[locale]} lead={ui.quickServicesNote[locale]} className="pt-10 lg:pt-12">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredServices.map((service, i) => (
            <li key={service.slug}>
              <Reveal delay={(i % 4) * 70} className="h-full">
                <Link
                  href={link(`/services/${service.slug}`, locale)}
                  className="card card-interactive card-sheen group flex h-full flex-col overflow-hidden p-0"
                >
                  <span aria-hidden="true" className={`block h-1 w-full ${toneRule[motifTone[service.motif]]}`} />
                  <span className="flex flex-1 flex-col p-5">
                    <MotifChip name={service.motif} className="mb-4 size-11 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3" />
                    <span className="font-[family-name:--font-display] text-lg font-bold group-hover:text-brand">
                      {service.title[locale]}
                    </span>
                    <span className="mt-2 flex-1 text-sm text-fg-muted">{service.summary[locale]}</span>
                    <span
                      aria-hidden="true"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {locale === 'ar' ? 'تفاصيل الخدمة' : 'Service details'}
                      <svg viewBox="0 0 20 20" className={`size-4 ${locale === 'ar' ? '-scale-x-100' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <ArrowLink href={link('/services', locale)} locale={locale}>
            {ui.viewAll[locale]} — {ui.servicesTitle[locale]}
          </ArrowLink>
        </div>
      </Section>

      {/* Appointment band — the one action most visitors came for. */}
      <section aria-labelledby="appointment-band" className="border-y border-line">
        <div className="bg-pattern relative isolate overflow-hidden bg-linear-to-br from-sea-800 via-sea-700 to-sea-600 dark:from-sea-900 dark:via-sea-800 dark:to-sea-700">
          <div
            aria-hidden="true"
            className="gilt-band absolute inset-x-0 top-0"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="orb orb-drift-a -top-24 start-[8%] size-96 bg-verdigris-400/25" />
            <span className="orb orb-drift-b -bottom-32 end-[4%] size-80 bg-gold-400/20" />
          </div>
          <Motif
            name="permit"
            ratio=""
            className="pointer-events-none absolute -end-10 -top-10 z-0 size-56 opacity-10"
          />
          <div className="page-width relative z-10 flex flex-col items-start gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14">
            <div className="max-w-2xl">
              <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide text-gold-300 uppercase ring-1 ring-white/25">
                {locale === 'ar' ? 'أونلاين' : 'Online'}
              </p>
              <h2 id="appointment-band" className="text-2xl font-extrabold text-white md:text-3xl">
                {ui.appointmentBandTitle[locale]}
              </h2>
              <p className="mt-3 text-sand-100/85">{ui.appointmentBandLead[locale]}</p>
            </div>
            <Link
              href={link('/appointments', locale)}
              className="group inline-flex shrink-0 items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 font-bold text-ink-900 shadow-xl transition-all hover:scale-[1.03] hover:bg-gold-400"
            >
              {ui.appointmentBandCta[locale]}
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={`size-4 transition-transform group-hover:translate-x-0.5 ${
                  locale === 'ar' ? 'rotate-180 group-hover:-translate-x-0.5' : ''
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Vision / mission / values */}
      <Section tone="alt" title={ui.glanceTitle[locale]} lead={ui.glanceLead[locale]}>
        <VisionTabs entries={visionEntries} locale={locale} />
      </Section>

      {/* Landmarks — opening with the auto-rotating photo tour. */}
      <Section title={ui.discoverTitle[locale]} lead={ui.showcaseLead[locale]}>
        <Reveal>
          <LandmarkShowcase slides={showcase} locale={locale} />
        </Reveal>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 6).map((landmark, i) => (
            <li key={landmark.slug}>
              <Reveal delay={(i % 3) * 80} className="h-full">
                <Link
                  href={link(`/landmarks/${landmark.slug}`, locale)}
                  className="card card-interactive card-sheen group block h-full overflow-hidden"
                >
                  <Photo slug={landmark.slug} motif={landmark.motif} locale={locale} zoom />
                  <div className="p-5">
                    <h3 className="font-[family-name:--font-display] text-lg font-bold group-hover:text-brand">
                      {landmark.name[locale]}
                    </h3>
                    <p className="mt-1 text-xs text-fg-muted">{landmark.section[locale]}</p>
                    <p className="mt-3 text-sm text-fg-muted">{landmark.summary[locale]}</p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <ArrowLink href={link('/landmarks', locale)} locale={locale}>
            {ui.viewAll[locale]} — {ui.landmarksTitle[locale]}
          </ArrowLink>
        </div>
      </Section>

      {/* News and events */}
      <Section tone="alt">
        {DEMO_CONTENT && (
          <div className="mb-8">
            <Notice tone="warn">{ui.demoNotice[locale]}</Notice>
          </div>
        )}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Reveal>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="rule-accent text-2xl font-extrabold">{ui.latestNews[locale]}</h2>
                <ArrowLink href={link('/news', locale)} locale={locale}>
                  {ui.viewAll[locale]}
                </ArrowLink>
              </div>
            </Reveal>
            <ul className="space-y-4">
              {news.map((item, i) => (
                <li key={item.slug}>
                  <Reveal delay={i * 70}>
                    <Link
                      href={link(`/news/${item.slug}`, locale)}
                      className="card card-interactive card-sheen group flex gap-4 p-4"
                    >
                      <Motif
                        name="street"
                        ratio=""
                        className="hidden size-24 shrink-0 rounded-lg sm:block"
                      />
                      <div>
                        <time
                          dateTime={item.date}
                          className="tnum text-xs font-medium text-fg-muted"
                        >
                          {formatDate(item.date, locale)}
                        </time>
                        <h3 className="mt-1 font-[family-name:--font-display] font-bold group-hover:text-brand">
                          {item.title[locale]}
                        </h3>
                        <p className="mt-1 text-sm text-fg-muted">{item.summary[locale]}</p>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Reveal delay={100}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="rule-accent text-2xl font-extrabold">{ui.upcoming[locale]}</h2>
                <ArrowLink href={link('/events', locale)} locale={locale}>
                  {ui.viewAll[locale]}
                </ArrowLink>
              </div>
            </Reveal>
            {events.length === 0 ? (
              <p className="text-sm text-fg-muted">{ui.noUpcoming[locale]}</p>
            ) : (
              <ul className="card divide-y divide-line">
                {events.map((event) => (
                  <li key={event.slug} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="tnum shrink-0 rounded-lg bg-sea-50 px-3 py-2 text-center dark:bg-sea-900">
                        <span className="block text-lg font-extrabold text-brand">
                          {event.date.slice(8, 10)}
                        </span>
                        <span className="block text-[0.65rem] font-medium text-fg-muted uppercase">
                          {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                            month: 'short',
                            timeZone: 'UTC',
                          }).format(new Date(`${event.date}T00:00:00Z`))}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.title[locale]}</h3>
                        <p className="mt-0.5 text-xs text-fg-muted">{event.venue[locale]}</p>
                        <p className="mt-2">
                          <Badge tone={event.free ? 'success' : 'accent'}>
                            {event.free ? ui.freeEntry[locale] : ui.ticketed[locale]}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* The district in numbers — counted up as the block enters view. */}
      <section aria-label={ui.statsTitle[locale]} className="relative isolate overflow-hidden border-y border-line bg-ink-900">
        <div
          aria-hidden="true"
          className="gilt-band absolute inset-x-0 top-0"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="orb orb-drift-a -top-32 start-[15%] size-[28rem] bg-sea-500/30" />
          <span className="orb orb-drift-b -bottom-40 end-[10%] size-96 bg-gold-500/20" />
          <span className="orb orb-drift-a bottom-0 start-[45%] size-72 bg-verdigris-500/20" />
        </div>
        <div
          aria-hidden="true"
          className="bg-pattern pointer-events-none absolute inset-0 opacity-80 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        <div className="relative z-10 page-width py-14 md:py-16">
          <h2 className="mb-10 text-center font-[family-name:--font-display] text-2xl font-extrabold text-white md:text-3xl">
            {ui.statsTitle[locale]}
          </h2>
          <Counters items={[...districtCounters]} locale={locale} />
          <p className="mt-8 text-center text-xs text-sand-100/60">{ui.countersNote[locale]}</p>
        </div>
      </section>

      {/* National portals that complement the district's own services. */}
      <Section title={ui.govLinksTitle[locale]} lead={ui.govLinksNote[locale]}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {govLinks.map((portal, i) => (
            <li key={portal.key}>
              <Reveal delay={(i % 4) * 70} className="h-full">
                <a
                  href={portal.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-interactive card-sheen group flex h-full flex-col p-5"
                >
                  <span className="flex items-center justify-between gap-2">
                    <MotifChip name="compass" className="size-10" />
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="size-4 text-fg-muted transition-colors group-hover:text-brand"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M7 4H4.5A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17h10a1.5 1.5 0 0 0 1.5-1.5V13M12 3h5m0 0v5m0-5L9 11" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="mt-4 font-[family-name:--font-display] font-bold group-hover:text-brand">
                    {portal.label[locale]}
                  </span>
                  <span className="mt-1.5 flex-1 text-sm text-fg-muted">{portal.note[locale]}</span>
                  <span className="sr-only">({ui.opensExternal[locale]})</span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* Hotlines */}
      <Section tone="alt" title={ui.emergencyTitle[locale]}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {site.hotlines.map((hotline) => (
            <li key={hotline.key}>
              <a
                href={`tel:${hotline.number}`}
                className="card card-interactive flex items-center justify-between gap-3 p-4"
              >
                <span className="font-medium">{hotline.label[locale]}</span>
                <span className="tnum text-xl font-extrabold text-brand">{hotline.number}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <BackToTop locale={locale} />
    </>
  );
}
