'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll-reveal: children rise into place the first time they enter the
 * viewport.
 *
 * The hiding is done in CSS only when <html> carries the `js` class — set by
 * the same pre-paint script that resolves the theme — so a reader without
 * JavaScript sees the page fully rendered and nothing is ever trapped behind a
 * failed hydration. The observer fires once and disconnects: an entrance, not
 * a toy that replays on every pass. `prefers-reduced-motion` is honoured in
 * the stylesheet, which simply cancels both the offset and the transition.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  /** Stagger in milliseconds, for siblings revealed together. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
