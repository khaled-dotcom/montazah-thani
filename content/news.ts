import type { Bi, BiBlock } from '@/lib/i18n';

/**
 * District news. Every item below was reported by the governorate portal's
 * district page, with the source named in the body. Items are dated by their
 * publication. When the district's own communications office supplies copy,
 * it replaces or extends this list directly in this file.
 */
export const DEMO_CONTENT = false;

export type NewsCategory = 'projects' | 'services' | 'culture' | 'announcement';

export const newsCategories: { id: NewsCategory; label: Bi }[] = [
  { id: 'projects', label: { ar: 'مشروعات', en: 'Projects' } },
  { id: 'services', label: { ar: 'خدمات', en: 'Services' } },
  { id: 'culture', label: { ar: 'ثقافة', en: 'Culture' } },
  { id: 'announcement', label: { ar: 'إعلانات', en: 'Announcements' } },
];

export type NewsItem = {
  slug: string;
  title: Bi;
  date: string;
  category: NewsCategory;
  summary: Bi;
  body: BiBlock;
  demo?: boolean;
};

export const news: NewsItem[] = [
  {
    slug: 'field-post-street-25',
    title: {
      ar: 'نقطة التمركز الميداني بشارع ٢٥ تواصل أعمالها على مدار الساعة لمنع عودة المخالفات',
      en: 'Field post on Street 25 works round the clock to keep violations from returning',
    },
    date: '2026-07-19',
    category: 'announcement',
    summary: {
      ar: 'الحي واصل تمركز ميداني دائم بشارع ٢٥ لمتابعة الشارع على مدار الساعة، وضمان عدم عودة المخالفات وتجمعات الباعة الجائلين من جديد.',
      en: 'The district maintains a permanent field presence on Street 25, monitoring it around the clock so removed violations and street-trader gatherings do not return.',
    },
    body: {
      ar: [
        'تواصل أجهزة حي منتزه ثاني عمل نقطة التمركز الميداني بشارع ٢٥، والتي تعمل على مدار الساعة لضمان عدم عودة المخالفات التي سبقت إزالتها، ومنع تجدد تجمعات الباعة الجائلين بالشارع.',
        'وتشمل أعمال النقطة ضبط الإشغالات، وتنظيم حركة المرور والمشاة، والتواجد الدائم للأجهزة التنفيذية حتى لا تتراخى المتابعة بعد انتهاء الحملات.',
        'ويؤكد الحي أن استمرارية التميز الميداني — لا حملة تلو الأخرى — هي ما يحفظ حق السكان في شوارع نظيفة ومنظمة.',
        'المصدر: البوابة الرسمية لمحافظة الإسكندرية — صفحة حي ثان المنتزه.',
      ],
      en: [
        'El Montazah II’s crews continue operating the permanent field post on Street 25, working around the clock to ensure that previously removed violations are not reinstated and that street-trader gatherings do not re-form.',
        'The post’s remit covers occupancy control, traffic and pedestrian management, and a constant executive presence so that follow-up does not slacken once campaigns end.',
        'The district stresses that continuity of the field presence — rather than one campaign after another — is what protects residents’ right to clean, orderly streets.',
        'Source: Alexandria Governorate official portal — El Montazah II district page.',
      ],
    },
  },
  {
    slug: 'rapid-response-abu-qir',
    title: {
      ar: 'وحدة التدخل السريع تشن حملة فورية ضد المخالفات بمنطقة أبو قير',
      en: 'Rapid-response unit mounts an immediate campaign against violations in Abu Qir',
    },
    date: '2026-07-19',
    category: 'announcement',
    summary: {
      ar: 'استجابت وحدة التدخل السريع بالحي لبلاغات طارئة بشن حملة فورية ضد أعمال مخالفة بمنطقة أبو قير.',
      en: 'Acting on urgent reports, the district’s rapid-response unit carried out an immediate campaign against violation works in Abu Qir.',
    },
    body: {
      ar: [
        'استجابت وحدة التدخل السريع بحي منتزه ثاني لبلاغات طارئة وردت إليها، وشنت حملة فورية بمدينة أبو قير للتصدي لأعمال مخالفة قامت داخل النطاق.',
        'جرى رفع الإشغالات وإزالة التعديات وتحرير المحاضر اللازمة، مع استمرار المتابعة للتأكد من عدم العودة.',
        'ويطالب الحي الأهالي بالاستمرار في إبلاغه عبر القنوات الرسمية أو الخط الموحد 16528، مؤكدًا أن الاستجابة الفورية للبلاغات أسلوب عمل دائم وليست استثناء.',
        'المصدر: البوابة الرسمية لمحافظة الإسكندرية — صفحة حي ثان المنتزه.',
      ],
      en: [
        'Responding to urgent reports, the rapid-response unit of El Montazah II mounted an immediate campaign in Abu Qir against violation works within its bounds.',
        'Occupancies were lifted, encroachments cleared and the necessary citations issued, with follow-up continuing to prevent reinstatement.',
        'The district asks residents to keep reporting through official channels or the unified 16528 line, affirming that immediate response to reports is standing practice, not an exception.',
        'Source: Alexandria Governorate official portal — El Montazah II district page.',
      ],
    },
  },
  {
    slug: 'green-spaces-uplift',
    title: {
      ar: 'رئيس الحي تكلف إدارة الحدائق برفع كفاءة المسطحات الخضراء بنطاق الحي',
      en: 'District head tasks the parks department with uplifting green spaces across the district',
    },
    date: '2026-07-19',
    category: 'projects',
    summary: {
      ar: 'كُلفت إدارة الحدائق بالحي بمواصلة أعمالها لرفع كفاءة المسطحات الخضراء بنطاق الحي ضمن خطة الصيف.',
      en: 'The district’s parks department has been directed to continue upgrading green spaces across its area under the summer plan.',
    },
    body: {
      ar: [
        'كلفت المهندسة دعاء محمد عبد الرزاق، رئيس حي منتزه ثاني، إدارة الحدائق بمواصلة أعمالها لرفع كفاءة المسطحات الخضراء بنطاق الحي.',
        'تشمل الأعمال تقليم وأصلاح الأشجار والنخيل، وترقيع المساحات العشبية، وصيانة شبكات الري، ومتابعة نظارة الحدائق العامة والجزيرة الوسطية للممشى الرئيسي.',
        'وتأتي هذه التكليف ضمن استعدادات موسم الصيف الذي تتضاعف فيه أعداد مرتادي الحدائق والمصايف بنطاق الحي، وبما يواكب توجيهات المحافظة بالارتقاء بالمشهد الأخضر بأحياء المحافظة.',
        'المصدر: البوابة الرسمية لمحافظة الإسكندرية — صفحة حي ثان المنتزه.',
      ],
      en: [
        'Eng. Doaa Mohamed Abdel Razek, head of El Montazah II District, tasked the parks department with continuing its work to uplift green spaces across the district.',
        'The works cover pruning and repairing trees and palms, patching lawns, maintaining irrigation networks, and overseeing the cleanliness of public gardens along the main walking spine.',
        'The directive forms part of preparations for the summer season, when visitor numbers to the district’s gardens and beaches multiply, in step with the governorate’s drive to uplift the green landscape of its districts.',
        'Source: Alexandria Governorate official portal — El Montazah II district page.',
      ],
    },
  },
  {
    slug: 'evening-campaign-horus-school-street',
    title: {
      ar: 'حملة مسائية لإزالة الإشغالات بشوارع ٢٠ ومدرسة حورس',
      en: 'Evening campaign clears occupancy on Street 20 and Horus School Street',
    },
    date: '2026-07-18',
    category: 'announcement',
    summary: {
      ar: 'وجهت رئيس الحي بحملة مسائية لإزالة الإشغالات والتصدي للتعديات على حرم الطريق العام بشوارع ٢٠ ومدرسة حورس.',
      en: 'The district head ordered an evening campaign to clear occupancies and act against encroachments on the public way along Street 20 and Horus School Street.',
    },
    body: {
      ar: [
        'وجهت المهندسة دعاء محمد عبد الرزاق، رئيس حي منتزه ثاني، بتنفيذ حملة مسائية لازالة الإشغالات وللتصدي للتعديات على حرم الطريق العام بشوارع ٢٠ وشارع مدرسة حورس.',
        'ونفذت الأجهزة التنفيذية بالحي أعمال الحملة برفع ما تعرض منه أصحاب الأنشطة على الشوارع، بما يسير حركة المرور ويحفظ حق الساكن في استخدام الرصيف.',
        'وأكد الحي استمرار الحملات المسائية والدورية على الشوارع التجارية، مع فتح باب البلاغات عبر القنوات الرسمية للتصدي الفوري لأي تعديات جديدة.',
        'المصدر: البوابة الرسمية لمحافظة الإسكندرية — صفحة حي ثان المنتزه.',
      ],
      en: [
        'Eng. Doaa Mohamed Abdel Razek, head of El Montazah II District, ordered an evening campaign to clear occupancies and act against encroachments on the public way along Street 20 and Horus School Street.',
        'The district’s executive crews carried the campaign out, lifting what traders had placed onto the streets — keeping traffic moving and preserving residents’ use of their pavements.',
        'The district affirms that evening and periodic campaigns over commercial streets will continue, with reports channels open for immediate action against any new encroachment.',
        'Source: Alexandria Governorate official portal — El Montazah II district page.',
      ],
    },
  },
];

export function getNewsItem(slug: string): NewsItem | undefined {
  return news.find((n) => n.slug === slug);
}

export const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date));
