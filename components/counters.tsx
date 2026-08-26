'use client';

import { useEffect, useRef, useState } from 'react';

import type { Bi, Locale } from '@/lib/i18n';

export type CounterItem = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: Bi;
};

const DURATION = 1600;

/** easeOutCubic: fast at first so the number feels responsive, gentle at the
    end so it settles rather than slams. */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, run: boolean): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!run) return;
    /* Reduced motion skips straight to the final figure: the request is to be
       spared the movement, not the information. */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const duration = reduced ? 0 : DURATION;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(ease(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);

  return display;
}

function Counter({ item, locale, run }: { item: CounterItem; locale: Locale; run: boolean }) {
  const value = useCountUp(item.value, run);
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-GB').format(value);

  return (
    <div className="group relative px-6 py-8 text-center transition-colors hover:bg-white/5">
      {/* The gilt tick above each figure — the same accent the section rules use. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-0.5 bg-linear-to-r from-transparent via-gold-400/70 to-transparent"
      />
      <p className="num text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        {item.prefix}
        <span>{formatted}</span>
        {item.suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-sand-100/85">{item.label[locale]}</p>
    </div>
  );
}

/**
 * "The district in numbers": figures that count up once, when the block first
 * scrolls into view. The observer fires a single time and disconnects — the
 * animation is an entrance, not a toy that replays on every pass.
 */
export function Counters({ items, locale }: { items: CounterItem[]; locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 divide-line sm:divide-x rtl:sm:divide-x-reverse lg:grid-cols-4">
      {items.map((item) => (
        <Counter key={item.label.en} item={item} locale={locale} run={run} />
      ))}
    </div>
  );
}
