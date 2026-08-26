import type { Bi } from '@/lib/i18n';

/**
 * Contact details are the district's own, as published by the governorate
 * portal (alexandria.gov.eg — أحياء محافظة الإسكندرية، حي ثان المنتزه) and the
 * district's official page. The email is the governorate's monitored inbox;
 * the district has no separate one.
 */
export const site = {
  name: { ar: 'حي المنتزه الثانية', en: 'El Montazah II District' } as Bi,
  longName: {
    ar: 'حي المنتزه الثانية — محافظة الإسكندرية',
    en: 'El Montazah II District — Alexandria Governorate',
  } as Bi,
  tagline: {
    ar: 'الشمال الشرقي للإسكندرية: حدائق ملكية، وشواطئ، وقرى صيد',
    en: 'Alexandria’s north-east: royal gardens, beaches and fishing shores',
  } as Bi,
  description: {
    ar: 'البوابة الرسمية لحي المنتزه الثانية بالإسكندرية: الخدمات والتراخيص، المعالم والحدائق الملكية، الأخبار والفعاليات، ودليل المنطقة.',
    en: 'The official gateway to Alexandria’s El Montazah II District: services and permits, landmarks and the royal gardens, news and events, and a local directory.',
  } as Bi,
  address: {
    ar: 'طوسون المستشارين، بجوار فتح الله ماركت، الإسكندرية',
    en: 'Toussoun, El Mostasharin, beside Fathallah Market, Alexandria',
  } as Bi,
  phone: '+20 3 5621144',
  fax: '+20 3 5617308',
  email: 'info@alexandria.gov.eg',
  hours: {
    ar: 'الأحد إلى الخميس، 9:00 صباحًا — 2:00 ظهرًا (عدا العطلات الرسمية)',
    en: 'Sunday to Thursday, 9:00 – 14:00 (excluding public holidays)',
  } as Bi,
  /** The district's official page; add further verified accounts here. */
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/montaza2nd/' },
  ] as { label: string; href: string }[],
  /** Verified national hotlines (Egypt). */
  hotlines: [
    { key: 'complaints', number: '16528', label: { ar: 'منظومة الشكاوى الحكومية الموحدة', en: 'Unified government complaints line' } as Bi },
    { key: 'police', number: '122', label: { ar: 'النجدة', en: 'Police' } as Bi },
    { key: 'ambulance', number: '123', label: { ar: 'الإسعاف', en: 'Ambulance' } as Bi },
    { key: 'fire', number: '180', label: { ar: 'المطافئ', en: 'Fire service' } as Bi },
    { key: 'gas', number: '129', label: { ar: 'طوارئ الغاز', en: 'Gas emergency' } as Bi },
    { key: 'electricity', number: '121', label: { ar: 'أعطال الكهرباء', en: 'Electricity faults' } as Bi },
  ],
  /** Approximate figures — sourced from public statistics, refresh yearly.
      The gardens date to their enclosure by Khedive Abbas II in 1892; the
      Maamoura shore alone holds more than twenty leased bathing beaches. */
  stats: [
    { value: '≈470,000', label: { ar: 'عدد السكان', en: 'Residents' } as Bi },
    { value: '6', label: { ar: 'مناطق رئيسية', en: 'Principal areas' } as Bi },
    { value: '134+', label: { ar: 'عامًا على حدائق المنتزه', en: 'Years of the Montazah Gardens' } as Bi },
    { value: '20+', label: { ar: 'شاطئًا بالمعمورة', en: 'Maamoura beaches' } as Bi },
  ],
} as const;

/**
 * The district's strategic frame — the vision / mission / values triad a
 * government portal publishes about itself. Adapted to this district: its
 * identity is the historic core of Alexandria, so heritage stewardship stands
 * beside service quality rather than after it.
 */
export const visionMission = {
  vision: {
    label: { ar: 'رؤية الحي', en: 'Our vision' } as Bi,
    icon: 'compass' as const,
    text: {
      ar: 'أن يكون حي المنتزه الثانية نموذجًا للخدمة المحلية على الشمال الشرقي للإسكندرية: شواطئ نظيفة، وحدائق محفوظة، وخدمات تصل إلى أهل طوسون وأبي قير والمعمورة وخورشيد حيثما كانوا.',
      en: 'For El Montazah II to be the model of local service across Alexandria’s north-east: clean beaches, kept gardens, and services that reach the people of Toussoun, Abu Qir, Maamoura and Khourshid wherever they live.',
    } as Bi,
  },
  mission: {
    label: { ar: 'رسالة الحي', en: 'Our mission' } as Bi,
    icon: 'sign' as const,
    text: {
      ar: 'ضبط الأداء والارتقاء بجودة الخدمات الحكومية المقدَّمة للمواطن: إنجاز أسرع، وإجراءات أوضح، وشفافية أكبر، بما يرتقي برضا المتلقّي ويحقق جودة الحياة لهذا الجيل وما بعده.',
      en: 'To discipline performance and raise the quality of government services: faster completion, clearer procedures and fuller transparency — lifting satisfaction and quality of life for this generation and the next.',
    } as Bi,
  },
  values: {
    label: { ar: 'قيمنا', en: 'Our values' } as Bi,
    icon: 'permit' as const,
    text: {
      ar: 'الشفافية في الإجراء، والإنصاف في التعامل، والكفاءة في الأداء، واحترام كل مواطن وزائر، وحفظ الحدائق الملكية والشواطئ والنسيج السكني الذي يميز الشمال الشرقي للمدينة.',
      en: 'Transparency of procedure, fairness in dealing, efficiency of performance, respect for every citizen and visitor, and care for the royal gardens, the shores and the residential fabric that mark the city’s north-east.',
    } as Bi,
  },
} as const;

/**
 * National portals a resident is likely to need next. External by design —
 * they are other institutions' services, so they open in a new tab.
 */
export type GovLink = {
  key: string;
  href: string;
  label: Bi;
  note: Bi;
};

export const govLinks: GovLink[] = [
  {
    key: 'lgs',
    href: 'https://lgs.gov.eg/#/home',
    label: { ar: 'بوابة خدمات المحليات', en: 'Local Government Services portal' },
    note: { ar: 'قدِّم طلباتك الحكومية إلكترونيًا', en: 'File government requests online' },
  },
  {
    key: 'shakwa',
    href: 'https://www.shakwa.eg/',
    label: { ar: 'بوابة الشكاوى الموحدة', en: 'Unified government complaints portal' },
    note: { ar: 'تابع شكواك على مستوى الجمهورية', en: 'Track a complaint nationwide' },
  },
  {
    key: 'governorate',
    href: 'http://www.alexandria.gov.eg/mainhome.aspx',
    label: { ar: 'محافظة الإسكندرية', en: 'Alexandria Governorate' },
    note: { ar: 'البوابة الرسمية للمحافظة', en: 'The governorate\u2019s official portal' },
  },
  {
    key: 'mld',
    href: 'https://mld.gov.eg/ar',
    label: { ar: 'وزارة التنمية المحلية', en: 'Ministry of Local Development' },
    note: { ar: 'الجهة الوصي على الأحياء', en: 'The ministry overseeing districts' },
  },
];

/**
 * The district's figures as numbers, for the animated counters on the home
 * page. `site.stats` above stays the human-written presentation; these carry
 * the same facts in a form that can be counted up to.
 */
export const districtCounters: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: Bi;
}[] = [
  { value: 470000, prefix: '≈', label: { ar: 'عدد السكان', en: 'Residents' } },
  { value: 6, label: { ar: 'مناطق رئيسية', en: 'Principal areas' } },
  { value: 134, suffix: '+', label: { ar: 'عامًا على حدائق المنتزه', en: 'Years of the Montazah Gardens' } },
  { value: 20, suffix: '+', label: { ar: 'شاطئًا بالمعمورة', en: 'Maamoura beaches' } },
];

export const sections: { ar: string; en: string; note: Bi }[] = [
  { ar: 'طوسون', en: 'Toussoun', note: { ar: 'مقر الحي ومحطته على خط أبو قير', en: 'The district seat and its station on the Abu Qir line' } },
  { ar: 'أبو قير', en: 'Abu Qir', note: { ar: 'قرية الصيد والخليج التاريخي في أقصى الشمال الشرقي', en: 'The fishing village and historic bay at the far north-east' } },
  { ar: 'المعمورة', en: 'El Maamoura', note: { ar: 'مصايف وحديقة عامة على الكورنيش الشرقي', en: 'Bathing shores and a public garden on the eastern corniche' } },
  { ar: 'خورشيد', en: 'Khourshid', note: { ar: 'نسيج سكني وقرية صيد قرب مصب بحيرة مريوط', en: 'Residential fabric and a fishing hamlet near the Maryout outfall' } },
  { ar: 'السيوف', en: 'El Seyouf', note: { ar: 'أحياء سكنية حديثة بين طوسون والمعمورة', en: 'Newer residential quarters between Toussoun and Maamoura' } },
  { ar: 'التوفيقية', en: 'El Tawfikiya', note: { ar: 'منطقة سكنية شعبية على الطريق الدائري', en: 'A popular residential quarter on the ring road' } },
];

export type NavItem = { href: string; label: Bi; children?: NavItem[] };

export const nav: NavItem[] = [
  {
    href: '/about',
    label: { ar: 'عن الحي', en: 'About' },
  },
  {
    href: '/landmarks',
    label: { ar: 'المعالم والثقافة', en: 'Landmarks & Culture' },
  },
  {
    href: '/services',
    label: { ar: 'الخدمات والتراخيص', en: 'Services & Permits' },
    children: [
      { href: '/services?for=residents', label: { ar: 'خدمات المواطنين', en: 'Resident services' } },
      { href: '/services?for=business', label: { ar: 'خدمات الأعمال', en: 'Business services' } },
      { href: '/services?for=visitors', label: { ar: 'خدمات الزائرين', en: 'Visitor services' } },
      { href: '/appointments', label: { ar: 'حجز موعد', en: 'Book an appointment' } },
      { href: '/laws', label: { ar: 'القوانين واللوائح', en: 'Laws & regulations' } },
    ],
  },
  {
    href: '/news',
    label: { ar: 'الأخبار والفعاليات', en: 'News & Events' },
    children: [
      { href: '/news', label: { ar: 'الأخبار', en: 'News' } },
      { href: '/events', label: { ar: 'الفعاليات', en: 'Events' } },
      { href: '/gallery', label: { ar: 'معرض الصور', en: 'Gallery' } },
    ],
  },
  {
    href: '/map',
    label: { ar: 'الخرائط والتنقل', en: 'Maps & Transport' },
  },
  {
    href: '/directory',
    label: { ar: 'دليل الأعمال', en: 'Business Directory' },
  },
  {
    href: '/contact',
    label: { ar: 'اتصل بنا', en: 'Contact' },
  },
];

export const footerLinks: { title: Bi; items: NavItem[] }[] = [
  {
    title: { ar: 'الخدمات', en: 'Services' },
    items: [
      { href: '/services/building-permit', label: { ar: 'ترخيص بناء أو ترميم', en: 'Building or renovation permit' } },
      { href: '/services/shop-licence', label: { ar: 'ترخيص محل تجاري', en: 'Commercial shop licence' } },
      { href: '/services/report-issue', label: { ar: 'الإبلاغ عن مشكلة', en: 'Report an issue' } },
      { href: '/appointments', label: { ar: 'حجز موعد', en: 'Book an appointment' } },
    ],
  },
  {
    title: { ar: 'اكتشف', en: 'Discover' },
    items: [
      { href: '/landmarks', label: { ar: 'المعالم', en: 'Landmarks' } },
      { href: '/about', label: { ar: 'تاريخ الحي', en: 'District history' } },
      { href: '/events', label: { ar: 'الفعاليات القادمة', en: 'Upcoming events' } },
      { href: '/gallery', label: { ar: 'معرض الصور', en: 'Photo gallery' } },
    ],
  },
  {
    title: { ar: 'معلومات', en: 'Information' },
    items: [
      { href: '/contact', label: { ar: 'اتصل بنا', en: 'Contact us' } },
      { href: '/accessibility', label: { ar: 'إتاحة الوصول', en: 'Accessibility' } },
      { href: '/privacy', label: { ar: 'الخصوصية واستخدام البيانات', en: 'Privacy & data use' } },
      { href: '/laws', label: { ar: 'القوانين واللوائح', en: 'Laws & regulations' } },
      { href: '/credits', label: { ar: 'حقوق الصور', en: 'Image credits' } },
      { href: '/search', label: { ar: 'بحث في الموقع', en: 'Search the site' } },
    ],
  },
];
