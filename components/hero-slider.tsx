'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ui } from '@/content/ui';
import { link, type Bi, type Locale } from '@/lib/i18n';
import type { Photo } from '@/content/photos';

export type HeroSlide = {
  id: string;
  photo: Photo;
  eyebrow: Bi;
  title: Bi;
  lead: Bi;
  ctaLabel: Bi;
  ctaHref: string;
};

const INTERVAL = 6500;

/**
 * The opening carousel: one full-width photograph at a time, each carrying its
 * own announcement and call to action, advancing on its own and stopping the
 * moment a reader interacts with it.
 *
 * Accessibility follows the WAI-ARIA carousel pattern: the region is named,
 * every slide is described as such, hidden slides are both aria-hidden and
 * inert so neither screen readers nor keyboard focus wander into them, and
 * autoplay never starts for a reader who has asked the OS for less motion —
 * nor after they pause it themselves.
 */
export function HeroSlider({ slides, locale }: { slides: HeroSlide[]; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* Autoplay is opt-out rather than opt-in, but the OS "reduce motion"
     preference counts as an opt-out made in advance. Read once on mount: the
     server rendered no preference at all, so this is the earliest moment the
     client can know it — hence a synchronous state write, as in the theme
     toggle's own bootstrapping. */
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

  /* One interval, restarted whenever anything that should delay it changes:
     the slide itself (a manual advance resets the clock), the pause button,
     and hover or focus anywhere over the hero. */
  useEffect(() => {
    if (!playing || hovered) return;
    const timer = window.setInterval(() => go(index + 1), INTERVAL);
    return () => window.clearInterval(timer);
  }, [playing, hovered, index, go]);

  return (
    <section
      role="group"
      aria-roledescription="carousel"
      aria-label={ui.sliderLabel[locale]}
      className="relative isolate overflow-hidden border-b border-line bg-ink-900"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* The gilt band every page opens with. */}
      <div aria-hidden="true" className="gilt-band absolute inset-x-0 top-0 z-30" />

      {/* Ambient harbour light behind the photograph's edges. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span
          className="orb orb-drift-a start-[-10%] top-[20%] size-[26rem] bg-sea-500/25"
        />
        <span
          className="orb orb-drift-b end-[-8%] bottom-[5%] size-[22rem] bg-gold-500/20"
        />
      </div>

      {/* The khatam lattice, faint over the deepest part of the scrim so the
          hero carries the district's geometry without fighting the photo. */}
      <div
        aria-hidden="true"
        className="bg-pattern pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 opacity-70 [mask-image:linear-gradient(to_top,black,transparent)]"
      />

      <div className="relative h-[34rem] sm:h-[36rem] md:h-[40rem] lg:h-[43rem]">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              aria-hidden={!active}
              inert={i !== index}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
            >
              {/* The photograph. The first preloads — it is the site's LCP
                  element; the rest wait their turn. A slow zoom keeps the
                  frame alive without moving the text above it. */}
              <div className="absolute inset-0 -z-20 overflow-hidden">
                <Image
                  src={slide.photo.src}
                  alt=""
                  width={slide.photo.width}
                  height={slide.photo.height}
                  sizes="100vw"
                  priority={i === 0}
                  className={`absolute inset-0 size-full object-cover ${slide.photo.focus ?? ''} ${
                    active && !reducedMotion
                      ? 'scale-[1.06] transition-transform duration-[7000ms] ease-linear'
                      : 'scale-100'
                  }`}
                />
              </div>
              {/* Scrims: lighter than before so the photograph — the palace
                  above all — stays crisp; the floor under the caption keeps
                  enough depth for white type in both themes. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-ink-900/85 via-ink-900/45 to-ink-900/10"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-r from-ink-900/65 via-ink-900/20 to-transparent rtl:bg-linear-to-l"
              />

              <div className="page-width relative z-10 flex h-full flex-col justify-center pb-16 pt-8">
                <div
                  className={`max-w-3xl transition-all duration-700 ease-out ${
                    active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                >
                  <p className="mb-4 inline-flex rounded-full bg-gold-400/20 px-3 py-1 text-sm font-bold tracking-wide text-gold-400 uppercase ring-1 ring-gold-400/40 backdrop-blur-sm">
                    {slide.eyebrow[locale]}
                  </p>
                  {/* Only the first slide owns the page's h1; later slides
                      style the same line without multiplying headings. */}
                  {i === 0 ? (
                    <h1 className="text-balance text-4xl font-extrabold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] md:text-5xl lg:text-6xl">
                      {slide.title[locale]}
                    </h1>
                  ) : (
                    <p className="text-balance text-4xl font-extrabold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] md:text-5xl lg:text-6xl">
                      {slide.title[locale]}
                    </p>
                  )}
                  <p className="mt-5 max-w-2xl text-lg text-sand-100/90">{slide.lead[locale]}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href={link(slide.ctaHref, locale)}
                      tabIndex={active ? undefined : -1}
                      className="group inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 font-semibold text-ink-900 shadow-lg transition-all hover:scale-[1.02] hover:bg-gold-400 hover:shadow-xl focus-visible:bg-gold-400"
                    >
                      {slide.ctaLabel[locale]}
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls. Logical properties seat them at the inline edge, so they
          mirror with the language like everything else. */}
      <button
        type="button"
        onClick={() => {
          setPlaying(false);
          go(index - 1);
        }}
        aria-label={ui.slidePrev[locale]}
        className="absolute start-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-ink-900/45 p-2.5 text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-ink-900/70 sm:start-5"
      >
        <svg viewBox="0 0 20 20" className="size-5 rtl:-scale-x-100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
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
        className="absolute end-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-ink-900/45 p-2.5 text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-ink-900/70 sm:end-5"
      >
        <svg viewBox="0 0 20 20" className="size-5 rtl:-scale-x-100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="absolute inset-x-0 bottom-4 z-20">
        <div className="page-width flex items-center gap-3">
          <ul className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <li key={slide.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    go(i);
                  }}
                  aria-label={`${ui.slideGoTo[locale]} ${i + 1}`}
                  aria-current={i === index}
                  className={`block h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-gold-400' : 'w-2 bg-white/45 hover:bg-white/80'
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
            className="ms-auto rounded-full border border-white/25 bg-ink-900/45 p-2 text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-ink-900/70"
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
