import type { MotifName } from '@/components/motif';
import type { Bi } from '@/lib/i18n';

/**
 * What a visitor can book a counter appointment for, and where.
 *
 * Everything here is district policy rather than code: opening days, slot
 * length, how far ahead booking opens. It is deliberately all in one file so
 * the office can change its own rules without touching the booking logic in
 * lib/slots.ts.
 *
 * The main office is the district's published seat at Toussoun, El
 * Mostasharin (alexandria.gov.eg). Counter numbers are the main service hall's;
 * the sub-offices serve the sections farthest from it.
 */

export type AppointmentTopic = {
  id: string;
  label: Bi;
  motif: MotifName;
  /** What to bring; shown once the visitor picks the topic. */
  bring: { ar: string[]; en: string[] };
  /** Minutes at the counter — drives how many slots a day holds. */
  minutes: number;
};

export const appointmentTopics: AppointmentTopic[] = [
  {
    id: 'building-permit',
    label: { ar: 'ترخيص بناء أو ترميم', en: 'Building or renovation permit' },
    motif: 'permit',
    minutes: 30,
    bring: {
      ar: [
        'صورة بطاقة الرقم القومي سارية',
        'سند الملكية أو عقد الإيجار',
        'الرسومات الهندسية معتمدة من نقابة المهندسين',
      ],
      en: [
        'A valid national ID card copy',
        'Proof of ownership or the tenancy contract',
        'Engineering drawings stamped by the Engineers Syndicate',
      ],
    },
  },
  {
    id: 'shop-licence',
    label: { ar: 'ترخيص محل تجاري', en: 'Commercial shop licence' },
    motif: 'shop',
    minutes: 30,
    bring: {
      ar: [
        'صورة بطاقة الرقم القومي سارية',
        'عقد الإيجار أو الملكية للمحل',
        'السجل التجاري والبطاقة الضريبية إن وُجدا',
      ],
      en: [
        'A valid national ID card copy',
        'The shop tenancy or ownership contract',
        'Commercial register and tax card, if you already hold them',
      ],
    },
  },
  {
    id: 'violation',
    label: { ar: 'التصالح في مخالفات البناء', en: 'Building violation settlement' },
    motif: 'report',
    minutes: 45,
    bring: {
      ar: [
        'صورة بطاقة الرقم القومي سارية',
        'رقم الطلب السابق إن كان لديك ملف مفتوح',
        'المستندات الدالة على تاريخ إنشاء المبنى',
      ],
      en: [
        'A valid national ID card copy',
        'Your existing case number, if a file is already open',
        'Documents establishing when the building was put up',
      ],
    },
  },
  {
    id: 'occupancy',
    label: { ar: 'تصريح إشغال الطريق', en: 'Street occupancy permit' },
    motif: 'sign',
    minutes: 20,
    bring: {
      ar: ['صورة بطاقة الرقم القومي سارية', 'ترخيص المحل ساري', 'بيان بالمساحة المطلوب إشغالها'],
      en: [
        'A valid national ID card copy',
        'A current shop licence',
        'A statement of the area you wish to occupy',
      ],
    },
  },
  {
    id: 'follow-up',
    label: { ar: 'متابعة طلب قائم', en: 'Follow up an existing request' },
    motif: 'permit',
    minutes: 15,
    bring: {
      ar: ['الرقم المرجعي للطلب', 'صورة بطاقة الرقم القومي سارية'],
      en: ['The reference number of your request', 'A valid national ID card copy'],
    },
  },
  {
    id: 'meet-official',
    label: { ar: 'مقابلة مسؤول بالحي', en: 'Meet a district official' },
    motif: 'report',
    minutes: 20,
    bring: {
      ar: ['صورة بطاقة الرقم القومي سارية', 'مذكرة مختصرة بموضوع المقابلة'],
      en: ['A valid national ID card copy', 'A short note setting out what you wish to raise'],
    },
  },
];

export type Office = {
  id: string;
  name: Bi;
  where: Bi;
};

export const offices: Office[] = [
  {
    id: 'hq-toussoun',
    name: { ar: 'المقر الرئيسي — طوسون', en: 'Main offices — Toussoun' },
    where: {
      ar: 'طوسون المستشارين، بجوار فتح الله ماركت — قاعة خدمة المواطنين',
      en: 'Toussoun, El Mostasharin, beside Fathallah Market — citizen service hall',
    },
  },
  {
    id: 'abu-qir',
    name: { ar: 'مكتب خدمة أبو قير', en: 'Abu Qir service office' },
    where: { ar: 'قرية أبو قير — قرب ميناء الصيد', en: 'Abu Qir village, near the fishing harbour' },
  },
  {
    id: 'maamoura',
    name: { ar: 'مكتب خدمة المعمورة', en: 'Maamoura service office' },
    where: { ar: 'الكورنيش الشرقي — منطقة المصايف', en: 'Eastern Corniche — the bathing-shore quarter' },
  },
];

/** The counter day. Times are Africa/Cairo, in 24-hour form. */
export const bookingHours = {
  /** Sunday = 0 … Saturday = 6. The office closes Friday and Saturday. */
  openDays: [0, 1, 2, 3, 4],
  start: '09:00',
  end: '13:30',
  /** Slot granularity; a topic needing longer simply occupies the counter longer. */
  stepMinutes: 30,
  /** Booking opens the next working day and runs this many days out. */
  leadDays: 1,
  horizonDays: 21,
} as const;

/**
 * Days the counters are shut on top of the weekend: public holidays, and any
 * local closure (a stocktake, a polling day, a burst water main).
 *
 * Egypt's official calendar mixes fixed Gregorian dates with Hijri feasts that
 * move each year and are confirmed by decree only weeks ahead, so there is no
 * rule to compute this from — it has to be a list somebody maintains. Add the
 * year's dates as soon as the decree is published; a missed entry means
 * residents booking a slot at a locked door.
 *
 * Format: YYYY-MM-DD, in the district's own timezone.
 */
export const holidays: { date: string; label: Bi }[] = [
  // 2026 — the dates the government announced for the official paid holidays
  // (mid-week feasts are moved to the end of the working week by decree, so a
  // moved date is the one the counters observe):
  { date: '2026-08-27', label: { ar: 'المولد النبوي الشريف', en: 'Mawlid al-Nabi (moved from 25 Aug by decree)' } },
  { date: '2026-10-06', label: { ar: 'عيد القوات المسلحة', en: 'Armed Forces Day' } },
  { date: '2026-10-08', label: { ar: 'راحة بديلة لعيد القوات المسلحة', en: 'Armed Forces Day — moved day off' } },
  // 2027 — fixed-date national holidays. The Hijri feasts (Eid al-Fitr,
  // Eid al-Adha, Islamic New Year, Mawlid) are confirmed by decree only weeks
  // ahead; add each one here as soon as it is announced.
  { date: '2027-01-07', label: { ar: 'عيد الميلاد المجيد', en: 'Coptic Christmas' } },
  { date: '2027-01-25', label: { ar: 'عيد الشرطة — ثورة 25 يناير', en: 'Police Day — 25 January Revolution' } },
  { date: '2027-04-25', label: { ar: 'عيد تحرير سيناء', en: 'Sinai Liberation Day' } },
  { date: '2027-05-01', label: { ar: 'عيد العمال', en: 'Labour Day' } },
  { date: '2027-05-03', label: { ar: 'شم النسيم', en: 'Sham El-Nessim' } },
  { date: '2027-06-30', label: { ar: 'ثورة 30 يونيو', en: '30 June Revolution' } },
  { date: '2027-07-23', label: { ar: 'ثورة 23 يوليو', en: '23 July Revolution' } },
  { date: '2027-10-06', label: { ar: 'عيد القوات المسلحة', en: 'Armed Forces Day' } },
];

const holidayDates = new Set(holidays.map((h) => h.date));

export function isHoliday(date: string): boolean {
  return holidayDates.has(date);
}

export function getHoliday(date: string): { date: string; label: Bi } | undefined {
  return holidays.find((h) => h.date === date);
}

export function getTopic(id: string | undefined): AppointmentTopic | undefined {
  return appointmentTopics.find((t) => t.id === id);
}

export function getOffice(id: string | undefined): Office | undefined {
  return offices.find((o) => o.id === id);
}
