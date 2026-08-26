'use client';

import { useEffect, useState } from 'react';

import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';

const SHOW_AFTER = 480;

/**
 * A floating return-to-top control that appears once the reader has scrolled
 * into the page proper and hides again near the top, where it would only sit
 * over the header doing nothing.
 */
export function BackToTop({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Rendered but translated out of reach rather than unmounted: the button
     never steals focus mid-scroll by appearing under the pointer. */
  return (
    <button
      type="button"
      aria-label={ui.backToTop[locale]}
      title={ui.backToTop[locale]}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-5 end-5 z-40 rounded-full border border-line-strong bg-surface p-3 text-brand shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:bg-canvas-alt ${
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 16V4M4.5 9.5L10 4l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
