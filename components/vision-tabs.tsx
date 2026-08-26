'use client';

import { useId, useRef, useState } from 'react';

import { Motif, type MotifName } from '@/components/motif';
import type { Bi, Locale } from '@/lib/i18n';

export type VisionEntry = {
  label: Bi;
  icon: MotifName;
  text: Bi;
};

/**
 * Vision / mission / values as real ARIA tabs — roving focus with the arrow
 * keys, Home and End, activation on move. Three short statements do not need
 * a carousel; they need to be readable one at a time and reachable by
 * keyboard in the order they appear.
 */
export function VisionTabs({ entries, locale }: { entries: VisionEntry[]; locale: Locale }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = entries.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    /* In RTL reading the visual order flips; the DOM order does not, so map
       Left/Right back to front when the page runs right-to-left. */
    const rtl = listRef.current?.closest('[dir="rtl"]') != null;
    if (rtl) {
      if (e.key === 'ArrowRight') next = active === 0 ? last : active - 1;
      if (e.key === 'ArrowLeft') next = active === last ? 0 : active + 1;
    }
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (next !== null) {
      e.preventDefault();
      setActive(next);
      listRef.current
        ?.querySelectorAll('[role="tab"]')
        [next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      (listRef.current?.querySelectorAll('[role="tab"]')[next] as HTMLElement | null)?.focus();
    }
  }

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label={locale === 'ar' ? 'رؤية الحي ورسالته' : 'District vision and mission'}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {entries.map((entry, i) => {
          const selected = i === active;
          return (
            <button
              key={entry.label.en}
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                selected
                  ? 'bg-brand text-brand-fg shadow-md'
                  : 'border border-line-strong bg-surface text-fg-muted hover:border-brand hover:text-brand'
              }`}
            >
              {entry.label[locale]}
            </button>
          );
        })}
      </div>

      {entries.map((entry, i) => {
        const selected = i === active;
        return (
          <div
            key={entry.label.en}
            role="tabpanel"
            id={`${baseId}-panel-${i}`}
            aria-labelledby={`${baseId}-tab-${i}`}
            hidden={!selected}
            tabIndex={0}
            className="mt-6"
          >
            {selected && (
              <figure className="card relative overflow-hidden p-7 md:p-10">
                <Motif
                  name={entry.icon}
                  ratio=""
                  className="pointer-events-none absolute -end-8 -top-8 size-40 opacity-[0.08]"
                />
                <blockquote className="relative max-w-3xl text-xl leading-relaxed text-fg md:text-2xl md:leading-relaxed">
                  {entry.text[locale]}
                </blockquote>
                <figcaption className="mt-4 text-sm font-bold text-accent">
                  — {entry.label[locale]}
                </figcaption>
              </figure>
            )}
          </div>
        );
      })}
    </div>
  );
}
