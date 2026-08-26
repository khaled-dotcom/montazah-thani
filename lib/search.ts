import type { Locale } from '@/lib/i18n';

export type DocType = 'landmark' | 'service' | 'news' | 'event' | 'listing' | 'page' | 'faq';

export type Doc = {
  id: string;
  type: DocType;
  title: string;
  summary: string;
  /** Everything searchable, already flattened. */
  text: string;
  href: string;
};

const typeLabels: Record<DocType, { ar: string; en: string }> = {
  landmark: { ar: 'معلم', en: 'Landmark' },
  service: { ar: 'خدمة', en: 'Service' },
  news: { ar: 'خبر', en: 'News' },
  event: { ar: 'فعالية', en: 'Event' },
  listing: { ar: 'نشاط تجاري', en: 'Business' },
  page: { ar: 'صفحة', en: 'Page' },
  faq: { ar: 'سؤال شائع', en: 'FAQ' },
};

export function docTypeLabel(type: DocType, locale: Locale): string {
  return typeLabels[type][locale];
}


/* -------------------------------------------------------------------------
   Matching
   Arabic needs normalising before comparison: readers type "الاسكندريه"
   for "الإسكندرية", drop diacritics, and mix ى/ي and ة/ه freely.
------------------------------------------------------------------------- */
const DIACRITICS = /[ً-ْٰـ]/g;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words too common to carry meaning in a query. */
const STOP_WORDS = new Set([
  'في', 'من', 'الى', 'إلى', 'على', 'عن', 'مع', 'هل', 'ما', 'ماهي', 'ماهو', 'كيف', 'اين', 'أين',
  'هي', 'هو', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'is', 'are', 'what',
  'where', 'how', 'do', 'i', 'can', 'my',
]);

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export type Hit = Doc & { score: number };

export function search(query: string, docs: Doc[], limit = 20): Hit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: Hit[] = [];
  for (const doc of docs) {
    const title = normalize(doc.title);
    const summary = normalize(doc.summary);
    const text = normalize(doc.text);

    let score = 0;
    let matched = 0;

    for (const token of tokens) {
      let tokenScore = 0;
      if (title.includes(token)) tokenScore += 6;
      if (summary.includes(token)) tokenScore += 2;
      const occurrences = text.split(token).length - 1;
      if (occurrences > 0) tokenScore += Math.min(occurrences, 4);
      if (tokenScore > 0) matched += 1;
      score += tokenScore;
    }

    if (matched === 0) continue;
    // Reward documents that cover more of the query.
    score *= matched / tokens.length;
    // An exact phrase in the title is a strong signal.
    if (title.includes(normalize(query))) score += 10;

    hits.push({ ...doc, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
