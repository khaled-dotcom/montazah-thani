import type { Bi } from '@/lib/i18n';

export type TransportMode = {
  id: string;
  name: Bi;
  detail: Bi;
  note: Bi;
};

export const transportModes: TransportMode[] = [
  {
    id: 'rail',
    name: { ar: 'قطار أبو قير', en: 'The Abu Qir train' },
    detail: {
      ar: 'خط سكة حديد أقدم خطوط المدينة شرقًا: ينطلق من محطة مصر عبر السيوف وسيدي جابر حتى محطتي طوسون وأبو قير، وهو العمود الفقري لتنقلات الحي.',
      en: 'One of the city’s oldest lines runs east: from Misr Station through El Seyouf and Sidi Gaber to the Toussoun and Abu Qir halts — the backbone of getting around the district.',
    },
    note: { ar: 'التذكرة رمزية وتُشترى بالمحطة؛ القطارات متكررة صباحًا وتخف بعد منتصف الليل.', en: 'Fares are nominal, bought at the station; trains are frequent in the morning and thin out after midnight.' },
  },
  {
    id: 'tram',
    name: { ar: 'الترام', en: 'Tram' },
    detail: {
      ar: 'خط الترام الشرقي على الكورنيش يوقف قرب بوابات حدائق المنتزه ومصايف المعمورة، ويصل الحي بميدان الرمل ووسط البلد.',
      en: 'The eastern tramline on the corniche stops near the Montazah garden gates and the Maamoura shores, tying the district to Raml Square and downtown.',
    },
    note: { ar: 'أبطأ من الأتوبيس لكنه أوضح مسارًا للزائر، ومحطاته قريبة من مداخل المعالم.', en: 'Slower than the bus but far easier for a visitor to follow, with stops near every landmark entrance.' },
  },
  {
    id: 'bus',
    name: { ar: 'الأتوبيس والميكروباص', en: 'Bus & microbus' },
    detail: {
      ar: 'متروباصات شارع أبو قير والكورنيش الشرقي تربط طوسون بالمعمورة وخورشيد وقرية الصيد، ومن ميدان سيدي جابر تنطلق خطوط أتوبيس نحو الحي.',
      en: 'Microbuses along Abu Qir Street and the eastern corniche link Toussoun to Maamoura, Khourshid and the fishing village; buses towards the district also leave from Sidi Gaber.',
    },
    note: { ar: 'الميكروباص أسرع لكن مساراته غير معلنة رسميًا — اسأل السائق عن الوجهة قبل الركوب.', en: 'Microbuses are quicker but their routes are not formally published — confirm the destination with the driver before boarding.' },
  },
  {
    id: 'walk',
    name: { ar: 'المشي', en: 'Walking' },
    detail: {
      ar: 'حدائق المنتزه نفسها متعة مشي كاملة، وكورنيش المعمورة أطول ممشى مساءً في شرق المدينة؛ المسافات داخل كل منطقة قصيرة.',
      en: 'The Montazah Gardens alone make a full walk, and the Maamoura corniche is the east of the city’s longest evening promenade; distances within each quarter are short.',
    },
    note: { ar: 'في موسم الصيف امشِ الصباح الباكر أو بعد العصر؛ الشمس ظهرًا قاسية حتى على البحر.', en: 'In summer walk early morning or after late afternoon; the midday sun is harsh even by the sea.' },
  },
];

export type Trail = {
  slug: string;
  name: Bi;
  duration: Bi;
  distance: Bi;
  summary: Bi;
  /** Landmark slugs in walking order. */
  stops: string[];
};

export const trails: Trail[] = [
  {
    slug: 'royal-gardens',
    name: { ar: 'مسار القصور والحدائق', en: 'Palaces & gardens trail' },
    duration: { ar: 'نحو 3 ساعات', en: 'About 3 hours' },
    distance: { ar: '3 كم داخل الحدائق', en: '3 km inside the gardens' },
    summary: {
      ar: 'من باب السلملك إلى جسر الجزيرة فالحرمليك: أفضل ما في حدائق المنتزه في جولة واحدة.',
      en: 'From Salamlek’s gate to the island bridge and on to Haramlik: the best of the Montazah Gardens in one circuit.',
    },
    stops: ['salamlek-palace', 'montaza-gardens', 'haramlik-palace'],
  },
  {
    slug: 'maamoura-corniche',
    name: { ar: 'مسار كورنيش المعمورة', en: 'Maamoura corniche trail' },
    duration: { ar: 'نحو ساعتين', en: 'About 2 hours' },
    distance: { ar: '2.5 كم', en: '2.5 km' },
    summary: {
      ar: 'من حديقة المعمورة العامة بين صف المصايف — المشي الأجمل وقت الغروب في شرق الإسكندرية.',
      en: 'From the Maamoura public garden between the row of beaches — the loveliest sunset walk in eastern Alexandria.',
    },
    stops: ['maamoura-shores'],
  },
  {
    slug: 'abu-qir-heritage',
    name: { ar: 'مسار أبو قير التاريخي', en: 'Abu Qir heritage trail' },
    duration: { ar: 'نصف يوم', en: 'Half a day' },
    distance: { ar: 'قطار + مشي', en: 'Train + walking' },
    summary: {
      ar: 'بالقطار إلى طوسون ثم قرية الصيد: مزاد السمك، غداء على الخليج، وجزيرة نيلسون من بعيد.',
      en: 'By train to Toussoun then the fishing village: dawn fish auctions, lunch over the bay, and Nelson’s Island on the horizon.',
    },
    stops: ['toussoun-station', 'abu-qir-bay', 'nelsons-island'],
  },
];

export type ParkingArea = {
  name: Bi;
  type: Bi;
  note: Bi;
};

export const parkingAreas: ParkingArea[] = [
  { name: { ar: 'بوابات حدائق المنتزه', en: 'Montazah Gardens entrances' }, type: { ar: 'مواقف جانبية على الكورنيش', en: 'Roadside parking on the corniche' }, note: { ar: 'تمتلئ عطلات الصيف قبل العاشرة صباحًا', en: 'Fills before ten on summer holiday mornings' } },
  { name: { ar: 'كورنيش المعمورة', en: 'Maamoura corniche' }, type: { ar: 'انتظار جانبي موسمي', en: 'Seasonal side-street parking' }, note: { ar: 'نظّم في الموسم بمواقف مرصودة', en: 'Managed during the season with marked bays' } },
  { name: { ar: 'قرية وميناء أبو قير', en: 'Abu Qir village & harbour' }, type: { ar: 'ساحة أمام الميناء', en: 'Open ground by the harbour' }, note: { ar: 'الأنسب صباحًا لمتتبعي سوق السمك', en: 'Best in the morning for the fish market' } },
  { name: { ar: 'أسواق طوسون', en: 'Toussoun markets' }, type: { ar: 'انتظار ضيق بالشوارع الجانبية', en: 'Tight side-street parking' }, note: { ar: 'استخدم القطار إن كنت قادمًا من وسط البلد', en: 'Take the train if you are coming from downtown' } },
];
