import type { Bi } from '@/lib/i18n';

/**
 * The district's own business directory.
 *
 * Listings are compiled and maintained by the district's commercial-registration
 * office: an entry is published only after the trade licence has been checked,
 * and carries no telephone numbers or e-mail addresses on purpose — those change
 * hands too often for a government portal to vouch for them; visitors ask at the
 * shop or through its listing page once the district publishes contacts.
 *
 * To add or amend an entry, file a "directory listing request" on the contact
 * page with the licence number; the office confirms it before publishing.
 */
export type DirectoryCategory =
  | 'food'
  | 'retail'
  | 'stay'
  | 'health'
  | 'services'
  | 'crafts';

export const directoryCategories: { id: DirectoryCategory; label: Bi }[] = [
  { id: 'food', label: { ar: 'مطاعم ومقاهٍ', en: 'Food & cafés' } },
  { id: 'retail', label: { ar: 'محال ومتاجر', en: 'Shops & retail' } },
  { id: 'stay', label: { ar: 'إقامة', en: 'Places to stay' } },
  { id: 'health', label: { ar: 'صحة وصيدليات', en: 'Health & pharmacies' } },
  { id: 'services', label: { ar: 'خدمات', en: 'Services' } },
  { id: 'crafts', label: { ar: 'حرف وصناعات', en: 'Crafts & trades' } },
];

export type Listing = {
  id: string;
  name: Bi;
  category: DirectoryCategory;
  section: Bi;
  street: Bi;
  blurb: Bi;
  /** True only once the district has checked the trade licence. */
  verified: boolean;
  accessible?: boolean;
};

export const listings: Listing[] = [
  // — Food — fish houses, beach cafés and the working-day tables of Toussoun —
  { id: 'm01', name: { ar: 'مطاعم سمك الرصيف بأبو قير', en: 'Abu Qir Quay Fish Restaurants' }, category: 'food', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'رصيف ميناء الصيد', en: 'The fishing harbour quay' }, blurb: { ar: 'صف مطاعم السمك المطل على الخليج، صيد اليوم يُطهى على الطريقة الإسكندرانية', en: 'A row of sea-facing fish restaurants over the bay, cooking the day’s catch Alexandrian-style' }, verified: true, accessible: true },
  { id: 'm02', name: { ar: 'كافيهات كورنيش المعمورة', en: 'Maamoura Corniche Cafés' }, category: 'food', section: { ar: 'المعمورة', en: 'El Maamoura' }, street: { ar: 'الكورنيش الشرقي', en: 'Eastern Corniche' }, blurb: { ar: 'قهوة وعصائر على ممشى الغروب، طاولات تواجه البحر حتى ما بعد منتصف الليل في الصيف', en: 'Coffee and juices on the sunset promenade, sea-facing tables open past midnight in summer' }, verified: true },
  { id: 'm03', name: { ar: 'فول وطعمية المستشارين', en: 'El Mostasharin Foul House' }, category: 'food', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'شارع المستشارين', en: 'El Mostasharin St' }, blurb: { ar: 'فطور بلدي يخدم أهالي الحي قبل دوامهم منذ عقود', en: 'A neighbourhood breakfast table serving the district’s workers before their day since decades' }, verified: true },
  { id: 'm04', name: { ar: 'مشويات طوسون', en: 'Toussoun Grills' }, category: 'food', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'السوق التجاري بطوسون', en: 'Toussoun market street' }, blurb: { ar: 'كباب وكفتة ومشويات لعائلات المنطقة، جلسات عائلية مساءً', en: 'Kebab, kofta and grills for the area’s families, with family seating in the evenings' }, verified: true },
  { id: 'm05', name: { ar: 'عصائر وفطاير المعمورة', en: 'Maamoura Juices & Fiteer' }, category: 'food', section: { ar: 'المعمورة', en: 'El Maamoura' }, street: { ar: 'أول الكورنيش الشرقي', en: 'Head of the Eastern Corniche' }, blurb: { ar: 'عصائر قصب ومانجو صيفًا، وفطير مشلتت يخرج من الفرن على مدار اليوم', en: 'Sugarcane and mango juices in season, fiteer out of the oven all day' }, verified: false },

  // — Retail — markets the district actually shops at —
  { id: 'm06', name: { ar: 'أسواق طوسون التجارية', en: 'Toussoun Market Streets' }, category: 'retail', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'محيط المحطة والمستشارين', en: 'Around the station and El Mostasharin' }, blurb: { ar: 'قلب التسوق اليومي للحي: خضار وبقالة وأقمشة ومحال الأجهزة', en: 'The district’s daily shopping heart: greengrocers, grocers, fabrics and appliance shops' }, verified: true },
  { id: 'm07', name: { ar: 'محلات سوق أبو قير', en: 'Abu Qir Village Shops' }, category: 'retail', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'شارع أبو قير الرئيسي', en: 'Abu Qir main street' }, blurb: { ar: 'سلع بحرية وتجهيزات صيد واحتياجات قرية الصيد اليومية', en: 'Marine goods, fishing tackle and the fishing village’s everyday needs' }, verified: true },
  { id: 'm08', name: { ar: 'أسواق السيوف', en: 'El Seyouf Markets' }, category: 'retail', section: { ar: 'السيوف', en: 'El Seyouf' }, street: { ar: 'شوارع السيوف السكنية', en: 'El Seyouf residential streets' }, blurb: { ar: 'سوبر ماركت ومحال أجهزة ومنازل تخدم الأحياء الحديثة شرق طوسون', en: 'Supermarkets, appliance shops and homeware serving the newer quarters east of Toussoun' }, verified: true },

  // — Places to stay —
  { id: 'm09', name: { ar: 'فندق السلملك القصري', en: 'Salamlek Palace Hotel' }, category: 'stay', section: { ar: 'طوسون — داخل حدائق المنتزه', en: 'Toussoun — inside the Montazah Gardens' }, street: { ar: 'حدائق المنتزه، البوابة الغربية', en: 'Montazah Gardens, western gate' }, blurb: { ar: 'إقامة داخل قصر ملكي من 1892، حديقة على البحر وصالون شاي تاريخي', en: 'Stay inside an 1892 royal palace, with a seaside lawn and a historic tea salon' }, verified: true },
  { id: 'm10', name: { ar: 'شاليهات مصايف المعمورة', en: 'Maamoura Beach Chalets' }, category: 'stay', section: { ar: 'المعمورة', en: 'El Maamoura' }, street: { ar: 'الكورنيش الشرقي', en: 'Eastern Corniche' }, blurb: { ar: 'شاليهات وغرف إيجاب يومي لموسم الصيف على خط البحر', en: 'Chalets and daily-let rooms for the summer season along the shore line' }, verified: false },
  { id: 'm11', name: { ar: 'بنسيون أبو قير', en: 'Abu Qir Pension' }, category: 'stay', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'قرية أبو قير', en: 'Abu Qir village' }, blurb: { ar: 'غرف بسيطة لرواد صيد السمك وزوار الأكاديمية', en: 'Simple rooms for anglers and Academy visitors' }, verified: false },

  // — Health —
  { id: 'm12', name: { ar: 'صيدلية المستشارين', en: 'El Mostasharin Pharmacy' }, category: 'health', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'شارع المستشارين', en: 'El Mostasharin St' }, blurb: { ar: 'صيدلية مجاورة لمقر الحي تعمل حتى منتصف الليل', en: 'A pharmacy beside the district seat, open until midnight' }, verified: true, accessible: true },
  { id: 'm13', name: { ar: 'مركز طوسون الطبي', en: 'Toussoun Medical Centre' }, category: 'health', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'بطريق أبو قير', en: 'On Abu Qir road' }, blurb: { ar: 'عيادات عامة ومعمل تحاليل يخدم أحياء الحي الداخلية', en: 'General clinics and a laboratory serving the district’s inland quarters' }, verified: true, accessible: true },
  { id: 'm14', name: { ar: 'صيدلية المعمورة', en: 'Maamoura Pharmacy' }, category: 'health', section: { ar: 'المعمورة', en: 'El Maamoura' }, street: { ar: 'الكورنيش الشرقي', en: 'Eastern Corniche' }, blurb: { ar: 'صيدلية موسمية تمتد ساعاتها في الصيف لمرتادي المصايف', en: 'A pharmacy extending its hours through the summer season' }, verified: true },
  { id: 'm15', name: { ar: 'وحدة طب الأسرة بخورشيد', en: 'Khourshid Family Medicine Unit' }, category: 'health', section: { ar: 'خورشيد', en: 'Khourshid' }, street: { ar: 'قرية خورشيد', en: 'Khourshid hamlet' }, blurb: { ar: 'وحدة صحية حكومية تخدم القرية والمناطق المجاورة', en: 'A government health unit serving the hamlet and its surroundings' }, verified: true },

  // — Services —
  { id: 'm16', name: { ar: 'مكتب بريد طوسون', en: 'Toussoun Post Office' }, category: 'services', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'السوق التجاري', en: 'Market street' }, blurb: { ar: 'خدمات بريدية ومالية وتحصيل فواتير لأهالي مقر الحي', en: 'Postal and financial services and bill payment for the seat quarter’s residents' }, verified: true, accessible: true },
  { id: 'm17', name: { ar: 'الأكاديمية العربية للعلوم والتكنولوجيا — مقر أبو قير', en: 'Arab Academy for Science & Technology — Abu Qir campus' }, category: 'services', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'طوسون — أبو قير الساحلي', en: 'Toussoun — Abu Qir shore' }, blurb: { ar: 'المقر الرئيسي للأكاديمية وكلية النقل البحري وميناء التدريب', en: 'The Academy’s main campus, its maritime transport college and training harbour' }, verified: true },
  { id: 'm18', name: { ar: 'مكتب هندسي استشاري بالسيوف', en: 'Consulting Engineering Office, El Seyouf' }, category: 'services', section: { ar: 'السيوف', en: 'El Seyouf' }, street: { ar: 'شوارع السيوف', en: 'El Seyouf streets' }, blurb: { ar: 'رسومات تراخيص وتقارير سلامة للمباني الجديدة بنطاق الحي', en: 'Permit drawings and structural reports for the district’s newer buildings' }, verified: true },
  { id: 'm19', name: { ar: 'نقابة وجمعية صيادي أبي قير', en: 'Abu Qir Fishermen’s Association' }, category: 'services', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'ميناء الصيد', en: 'The fishing harbour' }, blurb: { ar: 'الجهة التي تنظم تراخيص القوارب وشؤون الصيادين بالخليج', en: 'The body organising boat licences and fishermen’s affairs on the bay' }, verified: true },

  // — Crafts & trades —
  { id: 'm20', name: { ar: 'ورش سفن وقوارب أبي قير', en: 'Abu Qir Boat Workshops' }, category: 'crafts', section: { ar: 'أبو قير', en: 'Abu Qir' }, street: { ar: 'خلف ميناء الصيد', en: 'Behind the fishing harbour' }, blurb: { ar: 'بناء وإصلاح القوارب الخشبية كما تعلمته أجيال القرية', en: 'Building and repairing wooden boats the way generations of the village learned it' }, verified: true },
  { id: 'm21', name: { ar: 'حدادة وألوميتال طوسون', en: 'Toussoun Metalwork & Aluminium' }, category: 'crafts', section: { ar: 'طوسون', en: 'Toussoun' }, street: { ar: 'الطريق الدائري بطوسون', en: 'Ring road, Toussoun' }, blurb: { ar: 'أبواب ونوافذ ومظلات للمباني السكنية الجديدة بالسيوف والتوفيقية', en: 'Doors, windows and shades for the new housing of Seyouf and Tawfikiya' }, verified: true },
  { id: 'm22', name: { ar: 'ورشة شبابيك وخيام المعمورة', en: 'Maamoura Canvas & Awning Workshop' }, category: 'crafts', section: { ar: 'المعمورة', en: 'El Maamoura' }, street: { ar: 'أول الكورنيش الشرقي', en: 'Head of the Eastern Corniche' }, blurb: { ar: 'خيام ومظلات الشاطئ التي يعتمد عليها الموسم كل صيف', en: 'Beach tents and awnings the whole season depends on, every summer' }, verified: true },
];

/** Every entry that still awaits its licence check, by id. */
export const pendingListings = listings.filter((l) => !l.verified).map((l) => l.id);
