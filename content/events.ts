import type { Bi } from '@/lib/i18n';

/** District events. Only events with an announced, sourced programme are listed. */
export type EventKind = 'culture' | 'community' | 'official' | 'sport';

export const eventKinds: { id: EventKind; label: Bi }[] = [
  { id: 'culture', label: { ar: 'ثقافي', en: 'Cultural' } },
  { id: 'community', label: { ar: 'مجتمعي', en: 'Community' } },
  { id: 'official', label: { ar: 'رسمي', en: 'Official' } },
  { id: 'sport', label: { ar: 'رياضي', en: 'Sport' } },
];

export type EventItem = {
  slug: string;
  title: Bi;
  kind: EventKind;
  /** ISO date. Multi-day events also carry `endDate`. */
  date: string;
  endDate?: string;
  time: Bi;
  venue: Bi;
  /** Slug of a landmark, when the venue is one. */
  landmark?: string;
  summary: Bi;
  booking: Bi;
  free: boolean;
  demo?: boolean;
};

export const events: EventItem[] = [
  {
    slug: 'beach-season-maamoura',
    title: {
      ar: 'موسم الشواطئ الصيفي — مصايف المعمورة وأبو قير',
      en: 'Summer beach season — the Maamoura and Abu Qir shores',
    },
    kind: 'community',
    date: '2026-06-01',
    endDate: '2026-09-30',
    time: { ar: 'يوميًا من الثامنة صباحًا حتى الغروب', en: 'Daily from 8:00 until sunset' },
    venue: { ar: 'صف مصايف الكورنيش الشرقي وشاطئ أبي قير', en: 'The row of beaches on the eastern corniche and Abu Qir beach' },
    landmark: 'maamoura-shores',
    summary: {
      ar: 'الموسم الصيفي بمصايف الحي: أكثر من عشرين شاطئًا بالمعمورة بين مؤجَّر وعام، وخدمات الإنقاذ والنظافة اليومية، وسوق السمك بأبي قير في ذروته.',
      en: 'The summer season across the district’s shores: more than twenty Maamoura beaches leased and public, daily lifeguard and cleaning services, and the Abu Qir fish market at its peak.',
    },
    booking: {
      ar: 'تذاكر رمزية على بوابات المصايف المؤجرة؛ الشواطئ العامة والكورنيش مجانًا',
      en: 'Modest tickets at leased beach gates; public beaches and the corniche are free',
    },
    free: false,
  },
  {
    slug: 'montazah-gardens-summer-evenings',
    title: {
      ar: 'أمسيات حدائق المنتزه',
      en: 'Evenings in the Montazah Gardens',
    },
    kind: 'culture',
    date: '2026-07-01',
    endDate: '2026-09-15',
    time: { ar: 'من العصر حتى منتصف الليل تقريبًا', en: 'From late afternoon until around midnight' },
    venue: { ar: 'حدائق المنتزه وممرها البحري', en: 'The Montazah Gardens and their seaward walks' },
    landmark: 'montaza-gardens',
    summary: {
      ar: 'في أمسيات الصيف تمتد مواعيد الحدائق لتستقبل النزهة المسائية: الجسر والبحيرة مضاءتان، ومقاعد الكورنيش الداخلي تكتمل، والعائلات تصطف أمام عربات الذرة كالعادة كل صيف.',
      en: 'On summer evenings the gardens stay open late for the evening promenade: bridge and lake lit, the inner corniche seats filling, and families queueing at the corn carts as they do every summer.',
    },
    booking: {
      ar: 'الدخول بمذكرة الحدائق دون حجز',
      en: 'Entry with the garden ticket, no booking needed',
    },
    free: false,
  },
];

export function getEvent(slug: string): EventItem | undefined {
  return events.find((e) => e.slug === slug);
}

/** Events whose (end) date has not passed, soonest first. */
export function upcomingEvents(from: Date = new Date()): EventItem[] {
  const today = from.toISOString().slice(0, 10);
  return events
    .filter((e) => (e.endDate ?? e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}
