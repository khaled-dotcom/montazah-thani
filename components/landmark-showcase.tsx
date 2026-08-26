'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';
import type { Photo as PhotoData } from '@/content/photos';
import { Motif, type MotifName } from '@/components/motif';

export type ShowcaseSlide = {
  slug: string;
  name: string;
  section: string;
  motif: MotifName;
  photo?: PhotoData;
};

const INTERVAL = 5000;

/**
 * The landmark photo tour: one large frame through which the district's
 * monuments pass on their own, each held a few seconds with a slow zoom,
 * named over a scrim and linked to its page.
 *
 * Same contract as the hero carousel — WAI-ARIA carousel semantics, autoplay
 * that stops the moment a reader interacts and never starts for reduced
 * motion, hidden slides both aria-hidden and inert.
 */
export function LandmarkShowcase({ slides, locale }: { slides: ShowcaseSlide[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    if (!mq.matches) setPlaying(true);
  }, []);

  const go = useCallback(
    (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (!playing || hovered) return;
    const timer = window.setInterval(() => go(index + 1), INTERVAL);
    return () => window.clearInterval(timer);
  }, [playing, hovered, index, go]);

  if (slides.length === 0) return null;

  return (
    <section
      role="group"
      aria-roledescription="carousel"
      aria-label={ui.showcaseLabel[locale]}
      className="relative isolate overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-card"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="relative h-[21rem] sm:h-[25rem] lg:h-[29rem]">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.slug}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                active ? 'z-10 opacity-100' : 'opacity-0'
              }`}
            >
              {slide.photo ? (
                <Image
                  src={slide.photo.src}
                  alt={slide.photo.alt[locale]}
                  width={slide.photo.width}
                  height={slide.photo.height}
                  sizes="(min-width: 1280px) 72rem, 100vw"
                  priority={i === 0}
                  className={`absolute inset-0 size-full object-cover ${slide.photo.focus ?? ''} ${
                    active && !reducedMotion
                      ? 'scale-[1.07] transition-transform duration-[6800ms] ease-linear'
                      : 'scale-100'
                  }`}
                />
              ) : (
                <Motif name={slide.motif} ratio="" className="size-full rounded-none" />
              )}

              {/* Scrims: a floor for the caption and a wash toward the start
                  edge where the type lands. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink-900/90 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 start-0 w-2/3 bg-linear-to-r from-ink-900/55 to-transparent rtl:bg-linear-to-l"
              />

              <div className="absolute inset-x-0 top-0 z-10 p-4 md:p-5">
                <p className="inline-flex items-center gap-2 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-bold tracking-wide text-gold-300 uppercase ring-1 ring-gold-400/40 backdrop-blur-sm">
                  <span className="tnum">
                    {i + 1}/{slides.length}
                  </span>
                  {slide.section}
                </p>
              </div>

              <Link
                href={link(`/landmarks/${slide.slug}`, locale)}
                tabIndex={active ? undefined : -1}
                className="group absolute inset-x-0 bottom-0 z-10 block p-5 pb-14 md:p-7 md:pb-14"
              >
                <span className="mb-1 block text-xs font-semibold tracking-wide text-gold-300 uppercase drop-shadow-sm">
                  {locale === 'ar' ? 'معلم من معالم الحي' : 'District landmark'}
                </span>
                <span className="block max-w-xl text-balance text-2xl font-extrabold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)] md:text-3xl">
                  {slide.name}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-sand-100/85 transition-colors group-hover:text-gold-300"
                >
                  {ui.readMore[locale]}
                  <svg
                    viewBox="0 0 20 20"
                    className={`size-4 transition-transform group-hover:translate-x-0.5 ${
                      locale === 'ar' ? '-scale-x-100 group-hover:-translate-x-0.5' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>

              {/* Prev / next, seated mid-frame like the hero's. */}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  go(index - 1);
                }}
                aria-label={ui.slidePrev[locale]}
                className="absolute start-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-ink-900/45 p-2 text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-ink-900/70"
              >
                <svg viewBox="0 0 20 20" className="size-4 rtl:-scale-x-100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  go(index + 1);
                }}
                aria-label={ui.slideNext[locale]}
                className="absolute end-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-ink-900/45 p-2 text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-ink-900/70"
              >
                <svg viewBox="0 0 20 20" className="size-4 rtl:-scale-x-100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Dots + pause on the rail along the frame's foot. */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-linear-to-r from-gold-500 via-terracotta-400 to-verdigris-500" />
      <div className="absolute inset-x-0 bottom-4 z-30">
        <div className="page-width flex items-center gap-2 px-1">
          <ul className="flex items-center gap-1.5 rounded-full bg-ink-900/40 px-2 py-1.5 backdrop-blur-sm ring-1 ring-white/10">
            {slides.map((slide, i) => (
              <li key={slide.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    go(i);
                  }}
                  aria-label={`${ui.slideGoTo[locale]} ${i + 1}`}
                  aria-current={i === index}
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? 'w-7 bg-gold-400' : 'w-1.5 bg-white/50 hover:bg-white/85'
                  }`}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? ui.slidePause[locale] : ui.slidePlay[locale]}
            title={playing ? ui.slidePause[locale] : ui.slidePlay[locale]}
            className="ms-auto rounded-full bg-ink-900/45 p-2 text-white backdrop-blur-sm ring-1 ring-white/15 transition-colors hover:bg-ink-900/70"
          >
            {playing ? (
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="currentColor">
                <rect x="5" y="4" width="3.4" height="12" rx="1" />
                <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="currentColor">
                <path d="M6 4.5v11l9-5.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
