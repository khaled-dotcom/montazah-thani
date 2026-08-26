export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** A string that exists in both languages. */
export type Bi = { ar: string; en: string };
/** A block of paragraphs that exists in both languages. */
export type BiBlock = { ar: string[]; en: string[] };

export function t(value: Bi, locale: Locale): string {
  return value[locale];
}

export function tBlock(value: BiBlock, locale: Locale): string[] {
  return value[locale];
}

/** Locale-aware href helper: link('/landmarks', 'en') -> '/en/landmarks' */
export function link(path: string, locale: Locale): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${clean}`;
}

const dateLocale: Record<Locale, string> = { ar: 'ar-EG', en: 'en-GB' };

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(dateLocale[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(dateLocale[locale]).format(n);
}
