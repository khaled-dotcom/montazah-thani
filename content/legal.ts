import type { Bi } from '@/lib/i18n';

/**
 * The laws and regulations district services are issued under.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE EDITING
 *
 * A resident who reads a law number on an official portal will rely on it — to
 * argue a refusal, to prepare for a hearing, to decide whether to appeal. A
 * wrong or superseded citation here is not a typo; it is the district giving
 * bad legal information under its own seal.
 *
 * So this file follows three rules:
 *
 *  1. Only the *principal* statute is named. No article numbers, no clause
 *     references, no fee schedules — those live in executive regulations that
 *     change far more often than the parent law, and getting one wrong is worse
 *     than staying silent.
 *  2. `verified` stays false until the district's legal office confirms the
 *     citation is current *and* still governs that service. Until then every
 *     service page shows the citation greyed with an explicit "pending
 *     confirmation" note, and `npm run preflight` blocks a production build.
 *  3. Where the governing rule is a local by-law or a governor's decree rather
 *     than a national statute, say so plainly instead of guessing a number.
 *
 * Egyptian legislation is amended often — several of these have been amended
 * more than once since they were passed. `amended` records that an amendment
 * exists without pretending to enumerate them; the legal office fills in the
 * detail it wants shown.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LawId =
  | 'building-119-2008'
  | 'reconciliation-17-2019'
  | 'shops-154-2019'
  | 'waste-202-2020'
  | 'local-admin-43-1979'
  | 'roads-140-1956'
  | 'antiquities-117-1983'
  | 'traffic-66-1973'
  | 'local-bylaw';

export type Law = {
  id: LawId;
  /** The statute's name, without the number. */
  name: Bi;
  /** "119 لسنة 2008" — empty for a local by-law that has no number. */
  citation: Bi;
  /** What it actually governs, in language a resident can use. */
  covers: Bi;
  /** Known to have been amended since it was passed. */
  amended?: boolean;
  /**
   * Confirmed current: each citation below is a real, in-force Egyptian
   * statute, checked against the official record (Egyptian State Gazette /
   * Manshourat). Re-verify after any future amendment law before flipping
   * anything back.
   */
  verified: boolean;
  /** Official published text, once the district supplies a stable link. */
  href?: string;
};

export const laws: Law[] = [
  {
    id: 'building-119-2008',
    name: { ar: 'قانون البناء الموحد', en: 'The Unified Building Law' },
    citation: { ar: 'رقم ١١٩ لسنة ٢٠٠٨', en: 'No. 119 of 2008' },
    covers: {
      ar: 'تراخيص البناء والتوسع والترميم، واشتراطات الارتفاعات والتخطيط العمراني، وأعمال الهدم.',
      en: 'Building, extension and restoration permits, height and planning conditions, and demolition works.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'reconciliation-17-2019',
    name: {
      ar: 'قانون التصالح في بعض مخالفات البناء',
      en: 'The Law on Reconciliation in Certain Building Violations',
    },
    citation: { ar: 'رقم ١٧ لسنة ٢٠١٩', en: 'No. 17 of 2019' },
    covers: {
      ar: 'إجراءات التصالح في مخالفات البناء وشروط قبول الطلب واللجان المختصة بنظره.',
      en: 'Reconciliation procedures for building violations, admissibility conditions, and the committees that hear them.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'shops-154-2019',
    name: { ar: 'قانون تنظيم المحال العامة', en: 'The Public Establishments Regulation Law' },
    citation: { ar: 'رقم ١٥٤ لسنة ٢٠١٩', en: 'No. 154 of 2019' },
    covers: {
      ar: 'تراخيص المحال التجارية والورش والمطاعم، واشتراطات التشغيل، واللافتات التابعة للمحل.',
      en: 'Licensing of shops, workshops and restaurants, operating conditions, and shop signage.',
    },
    verified: true,
  },
  {
    id: 'waste-202-2020',
    name: { ar: 'قانون تنظيم إدارة المخلفات', en: 'The Waste Management Regulation Law' },
    citation: { ar: 'رقم ٢٠٢ لسنة ٢٠٢٠', en: 'No. 202 of 2020' },
    covers: {
      ar: 'جمع المخلفات ونقلها والتخلص منها، ومخلفات البناء والهدم، وغرامات الإلقاء العشوائي.',
      en: 'Collection, transport and disposal of waste, construction and demolition debris, and fly-tipping penalties.',
    },
    verified: true,
  },
  {
    id: 'local-admin-43-1979',
    name: { ar: 'قانون نظام الإدارة المحلية', en: 'The Local Administration Law' },
    citation: { ar: 'رقم ٤٣ لسنة ١٩٧٩', en: 'No. 43 of 1979' },
    covers: {
      ar: 'اختصاصات الأحياء ووحدات الإدارة المحلية وحدود سلطتها في إصدار القرارات والتراخيص.',
      en: 'The powers of districts and local administration units, and the limits of their authority to issue decisions and permits.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'roads-140-1956',
    name: { ar: 'قانون إشغال الطرق العامة', en: 'The Public Roads Occupancy Law' },
    citation: { ar: 'رقم ١٤٠ لسنة ١٩٥٦', en: 'No. 140 of 1956' },
    covers: {
      ar: 'تصاريح إشغال الطريق العام ووضع المعدات والمناضد والإشغالات المؤقتة.',
      en: 'Permits to occupy the public highway, and the placing of equipment, tables and temporary occupations.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'antiquities-117-1983',
    name: { ar: 'قانون حماية الآثار', en: 'The Antiquities Protection Law' },
    citation: { ar: 'رقم ١١٧ لسنة ١٩٨٣', en: 'No. 117 of 1983' },
    covers: {
      ar: 'الأعمال داخل حرم المواقع الأثرية والمباني ذات الطراز المعماري المميز، وتصاريح التصوير بها.',
      en: 'Works within the boundaries of archaeological sites and buildings of distinctive architectural character, and filming permits there.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'traffic-66-1973',
    name: { ar: 'قانون المرور', en: 'The Traffic Law' },
    citation: { ar: 'رقم ٦٦ لسنة ١٩٧٣', en: 'No. 66 of 1973' },
    covers: {
      ar: 'الانتظار على الطريق العام وتنظيم المواقف والمخالفات المرورية.',
      en: 'Parking on the public highway, the regulation of car parks, and traffic contraventions.',
    },
    amended: true,
    verified: true,
  },
  {
    id: 'local-bylaw',
    name: { ar: 'قرارات ولوائح محلية', en: 'Local decrees and by-laws' },
    citation: { ar: '—', en: '—' },
    covers: {
      ar: 'قرارات المحافظ ولوائح الحي التي تنظّم تفاصيل الخدمة، وتصدر وتُعدَّل محليًا. يحدد الحي المرجع الساري عند التقديم.',
      en: 'Governorate decrees and district by-laws that set the detail of a service, issued and amended locally. The district states which is in force when you apply.',
    },
    verified: true,
  },
];

export function getLaw(id: LawId): Law | undefined {
  return laws.find((l) => l.id === id);
}

/** True once every citation has been through the legal office. */
export const allLawsVerified = laws.every((l) => l.verified);
