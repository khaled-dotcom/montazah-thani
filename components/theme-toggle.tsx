'use client';

import { useEffect, useState } from 'react';

import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'montazah2-theme';

/**
 * Runs before first paint, inlined into <head>, so the page never flashes the
 * wrong theme. Kept as a string because it must execute ahead of hydration —
 * and deliberately tiny, since it blocks rendering.
 *
 * Light is the default when nothing is stored: the palette this site was drawn
 * in is the light one, and a district portal should not open dark by surprise.
 */
export const themeScript = `(function(){document.documentElement.classList.add('js');try{var c=localStorage.getItem('${THEME_KEY}');var d=c==='dark'||(c==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

function apply(choice: ThemeChoice) {
  const dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

const choices: ThemeChoice[] = ['light', 'dark', 'system'];

function Icon({ choice }: { choice: ThemeChoice }) {
  const common = {
    viewBox: '0 0 20 20',
    'aria-hidden': true,
    className: 'size-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (choice === 'light') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4" />
      </svg>
    );
  }
  if (choice === 'dark') {
    return (
      <svg {...common}>
        <path d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2.5" y="4" width="15" height="10" rx="1.5" />
      <path d="M7 17h6" />
    </svg>
  );
}

/**
 * Light / dark / system, as three radio-like buttons rather than a single
 * cycling switch: with a cycling switch you cannot tell what the next press
 * gives you, and "system" has no icon that reads as a state.
 */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const [choice, setChoice] = useState<ThemeChoice>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      /* storage can be blocked; the default stands */
    }
    /* Reading the stored choice cannot happen during render: the server has no
       localStorage, so doing it there would either crash or hydrate to a
       different value than the browser shows. A mount effect is the only place
       this can run, and it runs exactly once. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'light' || stored === 'dark' || stored === 'system') setChoice(stored);
    setReady(true);
  }, []);

  // Follow the OS live, but only while the reader has actually chosen "system".
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  function pick(next: ThemeChoice) {
    setChoice(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* a reader with storage blocked still gets the change for this page */
    }
  }

  return (
    <div
      role="group"
      aria-label={ui.themeLabel[locale]}
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
    >
      {choices.map((c) => {
        const active = ready && choice === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            aria-pressed={active}
            title={ui[`theme_${c}` as const][locale]}
            className={`flex size-7 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-brand text-brand-fg'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            <Icon choice={c} />
            <span className="sr-only">{ui[`theme_${c}` as const][locale]}</span>
          </button>
        );
      })}
    </div>
  );
}
