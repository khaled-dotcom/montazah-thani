import type { Bi } from '@/lib/i18n';
import type { MotifName } from '@/components/motif';
import type { LawId } from '@/content/legal';

export type Audience = 'residents' | 'business' | 'visitors';

export const audiences: { id: Audience; label: Bi; blurb: Bi }[] = [
  {
    id: 'residents',
    label: { ar: 'المواطنون', en: 'Residents' },
    blurb: {
      ar: 'التراخيص والبلاغات والخدمات اليومية لسكان الحي',
      en: 'Permits, reports and everyday services for people living in the district',
    },
  },
  {
    id: 'business',
    label: { ar: 'الأعمال', en: 'Business' },
    blurb: {
      ar: 'تراخيص المحال والإشغالات واللافتات ودعم المشروعات',
      en: 'Shop licences, occupancy, signage and enterprise support',
    },
  },
  {
    id: 'visitors',
    label: { ar: 'الزائرون', en: 'Visitors' },
    blurb: {
      ar: 'معلومات الزيارة والتصاريح والمواقف والمسارات السياحية',
      en: 'Visitor information, permits, parking and heritage trails',
    },
  },
];

export type Service = {
  slug: string;
  title: Bi;
  audience: Audience;
  motif: MotifName;
  featured?: boolean;
  summary: Bi;
  /** Who may apply. */
  eligibility: { ar: string[]; en: string[] };
  /** Documents to bring. */
  documents: { ar: string[]; en: string[] };
  /** Ordered application steps. */
  steps: { ar: string[]; en: string[] };
  fee: Bi;
  duration: Bi;
  channel: Bi;
  /**
   * The statutes the service is issued under, most specific first.
   * See content/legal.ts — citations are unverified until the legal office
   * signs them off, and the service page says so on screen.
   */
  legal: LawId[];
  /** External portal, if the transaction is handled nationally. */
  external?: { label: Bi; href: string };
};

/**
 * Fees below are quoted the way the counters quote them: by area and use under
 * the regulations in force, with the exact figure confirmed at the window when
 * the application is filed — fee schedules are amended too often for a portal
 * to print a number a clerk cannot honour. Durations are the district's own
 * service commitments.
 */
export const services: Service[] = [
  {
    slug: 'building-permit',
    title: { ar: 'ترخيص بناء أو ترميم', en: 'Building or renovation permit' },
    audience: 'residents',
    motif: 'permit',
    featured: true,
    summary: {
      ar: 'التصريح اللازم لإقامة مبنى جديد أو التوسع أو أعمال الترميم والتدعيم داخل نطاق الحي.',
      en: 'The permit required to build, extend, restore or structurally strengthen a property within the district.',
    },
    eligibility: {
      ar: ['مالك العقار أو من يمثله بتوكيل رسمي', 'أن يكون العقار داخل النطاق الإداري لحي المنتزه الثانية', 'ألا يكون العقار محل نزاع قضائي على الملكية'],
      en: ['The owner or a formally authorised representative', 'The property must fall within El Montazah II District boundary', 'The property must not be subject to an ownership dispute'],
    },
    documents: {
      ar: [
        'أصل وصورة إثبات الملكية (عقد مسجل أو حكم نهائي)',
        'بطاقة الرقم القومي سارية للمالك أو الوكيل',
        'الرسومات الهندسية معتمدة من مكتب استشاري مقيّد بنقابة المهندسين',
        'شهادة صلاحية الموقع للبناء',
        'إيصال سداد رسوم فحص الطلب',
      ],
      en: [
        'Original and copy of proof of ownership (registered deed or final judgment)',
        'Valid national ID for the owner or representative',
        'Engineering drawings certified by a consultancy registered with the Engineers Syndicate',
        'Site suitability certificate',
        'Receipt for the application review fee',
      ],
    },
    steps: {
      ar: [
        'تقديم الطلب بمركز خدمة المواطنين بمقر الحي مرفقًا به المستندات كاملة.',
        'سداد رسوم الفحص واستلام رقم الطلب لمتابعته.',
        'معاينة الموقع من الإدارة الهندسية خلال المدة المقررة.',
        'عرض الطلب على اللجنة الفنية لمراجعة الاشتراطات البنائية والارتفاعات.',
        'استلام الترخيص أو بيان أسباب الرفض كتابةً مع حق التظلم.',
      ],
      en: [
        'Submit the application at the citizen service centre in the district offices with the full document set.',
        'Pay the review fee and receive a tracking number.',
        'Site inspection by the engineering department within the stated period.',
        'Review by the technical committee against building conditions and height limits.',
        'Collect the permit, or receive written reasons for refusal with the right to appeal.',
      ],
    },
    fee: { ar: 'تُحسب الرسوم وفق المساحة والغرض طبقًا للائحة المعمول بها — يُرجى التأكد من الشباك', en: 'Calculated by area and use under the applicable regulations — confirm at the counter' },
    duration: { ar: 'من 30 إلى 60 يوم عمل حسب اكتمال المستندات', en: '30–60 working days depending on document completeness' },
    channel: { ar: 'مركز خدمة المواطنين — مقر حي المنتزه الثانية', en: 'Citizen service centre — El Montazah II District offices' },
    legal: ['building-119-2008', 'local-admin-43-1979'],
  },
  {
    slug: 'violation-settlement',
    title: { ar: 'التصالح في مخالفات البناء', en: 'Settlement of building violations' },
    audience: 'residents',
    motif: 'permit',
    summary: {
      ar: 'إجراءات التقدم بطلب التصالح عن أعمال بناء مخالفة، وفق القانون المنظّم وقرارات لجانه.',
      en: 'How to apply to settle unlicensed building works under the governing law and its committee decisions.',
    },
    eligibility: {
      ar: ['مالك العقار المخالف أو الشاغل بموافقة المالك', 'أن تكون المخالفة ضمن الحالات التي يجيز القانون التصالح فيها', 'سلامة المنشأ إنشائيًا بتقرير من مكتب هندسي معتمد'],
      en: ['The owner of the property in violation, or the occupier with the owner’s consent', 'The violation must fall within the categories the law permits to be settled', 'Structural soundness certified by an accredited engineering office'],
    },
    documents: {
      ar: [
        'استمارة طلب التصالح',
        'إثبات الملكية أو الحيازة',
        'تقرير السلامة الإنشائية',
        'رسم كروكي موضح عليه المخالفة',
        'إيصال سداد مقدم جدية التصالح',
      ],
      en: [
        'Settlement application form',
        'Proof of ownership or possession',
        'Structural safety report',
        'A sketch showing the violation',
        'Receipt for the good-faith deposit',
      ],
    },
    steps: {
      ar: [
        'سحب الاستمارة من الحي أو تحميلها إلكترونيًا.',
        'إرفاق تقرير السلامة الإنشائية من مكتب معتمد.',
        'تقديم الملف وسداد مقدم الجدية.',
        'عرض الملف على لجنة التصالح المختصة.',
        'سداد المقابل المقرر واستلام شهادة التصالح.',
      ],
      en: [
        'Collect the form from the district office or download it.',
        'Attach the structural safety report from an accredited office.',
        'Submit the file and pay the good-faith deposit.',
        'The file is referred to the competent settlement committee.',
        'Pay the assessed amount and collect the settlement certificate.',
      ],
    },
    fee: { ar: 'يُقدَّر المقابل حسب الموقع والمساحة ونوع المخالفة بقرار من اللجنة', en: 'Assessed by the committee according to location, area and type of violation' },
    duration: { ar: 'حسب دور اللجنة وحجم الطلبات المعروضة', en: 'Depends on the committee’s schedule and caseload' },
    channel: { ar: 'الإدارة الهندسية — مقر حي المنتزه الثانية', en: 'Engineering department — El Montazah II District offices' },
    legal: ['reconciliation-17-2019', 'building-119-2008'],
  },
  {
    slug: 'report-issue',
    title: { ar: 'الإبلاغ عن مشكلة', en: 'Report an issue' },
    audience: 'residents',
    motif: 'report',
    featured: true,
    summary: {
      ar: 'بلاغ عن كسر ماسورة، أو تراكم مخلفات، أو حفرة بالطريق، أو عمود إنارة معطّل، أو إشغال مخالف — مع رقم متابعة.',
      en: 'Report a burst pipe, accumulated waste, a pothole, a broken streetlight or an illegal encroachment — with a tracking number.',
    },
    eligibility: {
      ar: ['متاح لأي مواطن دون اشتراطات', 'يُفضَّل تحديد الموقع بدقة وإرفاق صورة'],
      en: ['Open to any citizen, with no conditions', 'A precise location and a photo greatly help'],
    },
    documents: {
      ar: ['وصف المشكلة وموقعها (الشارع وأقرب علامة مميزة)', 'صورة فوتوغرافية إن أمكن', 'رقم هاتف للتواصل عند الحاجة'],
      en: ['A description and location (street and nearest landmark)', 'A photograph if possible', 'A contact number for follow-up'],
    },
    steps: {
      ar: [
        'اختر قناة البلاغ: نموذج الموقع، أو المساعد الذكي، أو الخط الساخن 16528.',
        'صف المشكلة وحدد موقعها بدقة.',
        'احتفظ برقم البلاغ الذي يظهر لك بعد الإرسال.',
        'تابع حالة البلاغ برقمه، وستصلك رسالة عند الإغلاق.',
      ],
      en: [
        'Choose a channel: the site form, the assistant, or the 16528 hotline.',
        'Describe the problem and pinpoint its location.',
        'Keep the reference number shown after submission.',
        'Track the report by its number; you are notified when it is closed.',
      ],
    },
    fee: { ar: 'مجاني', en: 'Free' },
    duration: { ar: 'من 24 إلى 72 ساعة للاستجابة الأولية حسب نوع البلاغ', en: '24–72 hours for a first response, depending on the type of report' },
    channel: { ar: 'نموذج الموقع، المساعد الذكي، أو الخط الساخن 16528', en: 'Site form, the assistant, or the 16528 hotline' },
    legal: ['local-admin-43-1979'],
    external: {
      label: { ar: 'منظومة الشكاوى الحكومية الموحدة', en: 'Unified government complaints system' },
      href: 'https://www.shakwa.eg/',
    },
  },
  {
    slug: 'waste-collection',
    title: { ar: 'النظافة ورفع المخلفات', en: 'Waste collection' },
    audience: 'residents',
    motif: 'waste',
    featured: true,
    summary: {
      ar: 'مواعيد الرفع الدوري، وطلب رفع مخلفات البناء أو الأثاث الثقيل، والإبلاغ عن تراكم القمامة.',
      en: 'Regular collection schedules, requests to remove construction debris or bulky items, and reporting waste build-up.',
    },
    eligibility: {
      ar: ['متاح لسكان الحي والمنشآت التجارية داخل النطاق', 'رفع مخلفات البناء يتطلب طلبًا وسدادًا منفصلًا'],
      en: ['Available to residents and businesses within the district boundary', 'Construction debris removal requires a separate request and payment'],
    },
    documents: {
      ar: ['العنوان التفصيلي', 'نوع المخلفات وكميتها التقريبية', 'رقم تواصل'],
      en: ['Full address', 'Type and approximate volume of waste', 'A contact number'],
    },
    steps: {
      ar: [
        'راجع جدول الرفع الدوري لمنطقتك.',
        'لطلب رفع استثنائي، قدّم الطلب عبر نموذج الموقع أو مكتب النظافة بالحي.',
        'سدّد المقابل المقرر لمخلفات البناء والأثاث الثقيل.',
        'حدد موعد الرفع واستلم رقم الطلب.',
      ],
      en: [
        'Check the regular collection schedule for your area.',
        'For an extra collection, apply via the site form or the district cleansing office.',
        'Pay the applicable charge for construction debris and bulky items.',
        'Agree a collection slot and receive a request number.',
      ],
    },
    fee: { ar: 'الرفع الدوري ضمن رسم النظافة؛ رفع مخلفات البناء بمقابل يُحدَّد بالكمية', en: 'Regular collection is covered by the cleansing levy; debris removal is charged by volume' },
    duration: { ar: 'من 48 إلى 96 ساعة للطلبات الاستثنائية', en: '48–96 hours for extra collection requests' },
    channel: { ar: 'إدارة النظافة — مقر حي المنتزه الثانية', en: 'Cleansing department — El Montazah II District offices' },
    legal: ['waste-202-2020', 'local-bylaw'],
  },
  {
    slug: 'street-lighting',
    title: { ar: 'الإنارة العامة وإصلاح الأعطال', en: 'Street lighting and fault repair' },
    audience: 'residents',
    motif: 'lamp',
    summary: {
      ar: 'الإبلاغ عن عمود إنارة مطفأ أو كابل مكشوف أو ميدان غير مضاء، ومتابعة الإصلاح.',
      en: 'Report an unlit column, an exposed cable or an unlit square, and follow the repair through.',
    },
    eligibility: {
      ar: ['متاح لأي مواطن', 'الأعطال الخطرة (كابل مكشوف) تُعامَل كأولوية قصوى'],
      en: ['Open to any citizen', 'Hazardous faults such as exposed cabling are treated as top priority'],
    },
    documents: {
      ar: ['موقع العمود ورقمه إن وُجد', 'وصف العطل', 'صورة إن أمكن'],
      en: ['The column location and its number if visible', 'A description of the fault', 'A photo if possible'],
    },
    steps: {
      ar: [
        'حدد موقع العمود بدقة (اسم الشارع وأقرب رقم عقار).',
        'أرسل البلاغ عبر النموذج أو المساعد الذكي.',
        'يُحوَّل البلاغ إلى إدارة الإنارة ويُدرج في جدول الصيانة.',
        'تتم المعاينة والإصلاح ويُغلق البلاغ برقمه.',
      ],
      en: [
        'Pinpoint the column (street name and nearest building number).',
        'Submit the report via the form or the assistant.',
        'The report is routed to the lighting department and scheduled.',
        'Inspection and repair are carried out and the report is closed by reference.',
      ],
    },
    fee: { ar: 'مجاني', en: 'Free' },
    duration: { ar: 'من 3 إلى 7 أيام عمل، وأسرع في حالات الخطر', en: '3–7 working days; faster where there is a hazard' },
    channel: { ar: 'إدارة الإنارة — مقر حي المنتزه الثانية', en: 'Lighting department — El Montazah II District offices' },
    legal: ['local-admin-43-1979'],
  },
  {
    slug: 'road-maintenance',
    title: { ar: 'رصف وصيانة الطرق والأرصفة', en: 'Road and pavement maintenance' },
    audience: 'residents',
    motif: 'road',
    summary: {
      ar: 'طلبات إصلاح الحفر وهبوط الطريق وتلف الأرصفة، وخطة الرصف السنوية للحي.',
      en: 'Requests to repair potholes, subsidence and damaged pavements, plus the district’s annual resurfacing plan.',
    },
    eligibility: {
      ar: ['متاح لأي مواطن أو جهة', 'أعمال الرصف الكبرى تُدرج ضمن الخطة السنوية المعتمدة'],
      en: ['Open to any citizen or organisation', 'Major resurfacing is programmed into the approved annual plan'],
    },
    documents: {
      ar: ['موقع العطب وامتداده التقريبي', 'صورة توضح الحالة'],
      en: ['Location and approximate extent of the defect', 'A photo showing the condition'],
    },
    steps: {
      ar: [
        'قدّم البلاغ محددًا الشارع والمقطع.',
        'تعاين الإدارة الهندسية الموقع وتقدّر نوع التدخل.',
        'الأعطال الطارئة تُصلَح فورًا؛ والأعمال الكبرى تُدرج في خطة الرصف.',
        'تابع حالة الطلب برقمه.',
      ],
      en: [
        'Submit the report identifying the street and section.',
        'The engineering department inspects and classifies the intervention.',
        'Urgent defects are repaired immediately; larger works enter the resurfacing plan.',
        'Track the request by its number.',
      ],
    },
    fee: { ar: 'مجاني', en: 'Free' },
    duration: { ar: 'الإصلاحات العاجلة خلال أسبوع؛ أعمال الرصف حسب الخطة', en: 'Urgent repairs within a week; resurfacing according to the plan' },
    channel: { ar: 'الإدارة الهندسية — مقر حي المنتزه الثانية', en: 'Engineering department — El Montazah II District offices' },
    legal: ['local-admin-43-1979', 'roads-140-1956'],
  },
  {
    slug: 'burial-permit',
    title: { ar: 'تصاريح الدفن والمقابر', en: 'Burial permits and cemeteries' },
    audience: 'residents',
    motif: 'permit',
    summary: {
      ar: 'استخراج تصريح الدفن وبيانات المقابر التابعة للحي، وإجراءات النقل بين الجبانات.',
      en: 'Obtaining a burial permit, information on district cemeteries, and transfer procedures between burial grounds.',
    },
    eligibility: {
      ar: ['أحد أقارب المتوفى من الدرجة الأولى أو من يمثله', 'وجود شهادة وفاة معتمدة'],
      en: ['A first-degree relative of the deceased or their representative', 'A certified death certificate is required'],
    },
    documents: {
      ar: ['شهادة الوفاة', 'بطاقة الرقم القومي لمقدم الطلب', 'إثبات ملكية أو حق الانتفاع بالمقبرة'],
      en: ['Death certificate', 'The applicant’s national ID', 'Proof of ownership or right of use of the grave'],
    },
    steps: {
      ar: [
        'استخراج شهادة الوفاة من مكتب الصحة المختص.',
        'التوجه إلى إدارة المقابر بالحي بالمستندات.',
        'استلام تصريح الدفن.',
      ],
      en: [
        'Obtain the death certificate from the relevant health office.',
        'Attend the district cemeteries department with the documents.',
        'Receive the burial permit.',
      ],
    },
    fee: { ar: 'رسوم رمزية وفق اللائحة', en: 'Nominal fees under the regulations' },
    duration: { ar: 'في اليوم ذاته عند اكتمال المستندات', en: 'Same day when documents are complete' },
    channel: { ar: 'إدارة المقابر — مقر حي المنتزه الثانية', en: 'Cemeteries department — El Montazah II District offices' },
    legal: ['local-bylaw'],
  },
  {
    slug: 'shop-licence',
    title: { ar: 'ترخيص محل تجاري', en: 'Commercial shop licence' },
    audience: 'business',
    motif: 'shop',
    featured: true,
    summary: {
      ar: 'الترخيص اللازم لتشغيل محل تجاري أو ورشة أو مطعم داخل نطاق الحي، وفق قانون تنظيم المحال.',
      en: 'The licence required to operate a shop, workshop or restaurant within the district, under the shops regulation law.',
    },
    eligibility: {
      ar: ['صاحب النشاط أو الشريك المفوض', 'أن يكون المحل صالحًا للاستعمال ومطابقًا لاشتراطات النشاط', 'ألا يقع النشاط ضمن الأنشطة المحظورة بالمنطقة'],
      en: ['The business owner or an authorised partner', 'The premises must be fit for use and meet the activity’s conditions', 'The activity must not be prohibited in that area'],
    },
    documents: {
      ar: [
        'إثبات شخصية صاحب النشاط',
        'سند الحيازة (عقد إيجار أو ملكية)',
        'شهادة سلامة الموقع من الحماية المدنية',
        'موافقة الجهات المعنية حسب النشاط (الصحة، السياحة، البيئة)',
        'رسم كروكي للمحل موضحًا عليه المساحات',
      ],
      en: [
        'Identity document of the business owner',
        'Proof of tenure (lease or ownership deed)',
        'Civil Protection site safety certificate',
        'Approvals from relevant authorities by activity (health, tourism, environment)',
        'A dimensioned sketch of the premises',
      ],
    },
    steps: {
      ar: [
        'تقديم الطلب بمركز خدمات المستثمرين بالحي.',
        'سداد رسوم فحص الطلب واستلام رقم المتابعة.',
        'معاينة المحل من اللجنة المشتركة.',
        'استيفاء أي ملاحظات فنية خلال المهلة المحددة.',
        'استلام الترخيص أو الرفض المسبب.',
      ],
      en: [
        'Submit the application at the district investor services desk.',
        'Pay the review fee and receive a tracking number.',
        'Joint committee inspection of the premises.',
        'Address any technical observations within the stated period.',
        'Collect the licence, or a reasoned refusal.',
      ],
    },
    fee: { ar: 'تختلف حسب النشاط والمساحة وفق اللائحة التنفيذية', en: 'Varies by activity and floor area under the executive regulations' },
    duration: { ar: 'المدة القانونية المقررة للبت في الطلب من تاريخ اكتمال المستندات', en: 'The statutory decision period from the date the file is complete' },
    channel: { ar: 'مركز خدمات المستثمرين — مقر حي المنتزه الثانية', en: 'Investor services desk — El Montazah II District offices' },
    legal: ['shops-154-2019'],
  },
  {
    slug: 'occupancy-permit',
    title: { ar: 'تصريح إشغال الطريق', en: 'Public-space occupancy permit' },
    audience: 'business',
    motif: 'shop',
    summary: {
      ar: 'التصريح المؤقت لوضع مناضد المقاهي أو معدات البناء أو معرض موسمي على جزء من الطريق العام.',
      en: 'A temporary permit to place café tables, construction equipment or a seasonal display on part of the public way.',
    },
    eligibility: {
      ar: ['أن يكون النشاط مرخّصًا', 'ألا يعيق الإشغال حركة المشاة أو المرور', 'التزام المساحة المصرّح بها بدقة'],
      en: ['The business must already be licensed', 'The occupancy must not obstruct pedestrians or traffic', 'The permitted footprint must be observed exactly'],
    },
    documents: {
      ar: ['صورة الترخيص الساري', 'رسم كروكي للمساحة المطلوبة بالأبعاد', 'إيصال سداد مقابل الإشغال'],
      en: ['A copy of the valid licence', 'A dimensioned sketch of the requested area', 'Receipt for the occupancy charge'],
    },
    steps: {
      ar: [
        'تقديم الطلب مرفقًا بالكروكي.',
        'معاينة الموقع لتقدير الأثر على الحركة.',
        'سداد المقابل واستلام التصريح المؤقت.',
        'تجديد التصريح قبل انتهاء مدته.',
      ],
      en: [
        'Submit the application with the sketch.',
        'Site inspection to assess the effect on movement.',
        'Pay the charge and receive the temporary permit.',
        'Renew before expiry.',
      ],
    },
    fee: { ar: 'يُحسب بالمتر المربع وبمدة الإشغال وفق التعريفة المعتمدة', en: 'Charged per square metre and by duration under the approved tariff' },
    duration: { ar: 'من 7 إلى 15 يوم عمل', en: '7–15 working days' },
    channel: { ar: 'إدارة الإشغالات — مقر حي المنتزه الثانية', en: 'Occupancy department — El Montazah II District offices' },
    legal: ['roads-140-1956', 'local-bylaw'],
  },
  {
    slug: 'signage-permit',
    title: { ar: 'ترخيص لافتة أو إعلان', en: 'Signage and advertising permit' },
    audience: 'business',
    motif: 'sign',
    summary: {
      ar: 'ترخيص اللافتات التجارية واللوحات الإعلانية، مع اشتراطات خاصة في مناطق التراث العمراني بالحي.',
      en: 'Licensing shop signs and advertising boards, with special conditions in the district’s built-heritage areas.',
    },
    eligibility: {
      ar: ['صاحب نشاط مرخّص أو شركة إعلانات مقيّدة', 'الالتزام بالاشتراطات البصرية في مناطق التراث', 'موافقة اتحاد الشاغلين للواجهات المشتركة'],
      en: ['A licensed business or a registered advertising company', 'Compliance with visual conditions in heritage areas', 'Consent of the owners’ association for shared façades'],
    },
    documents: {
      ar: ['صورة الترخيص', 'تصميم اللافتة بالأبعاد والألوان', 'موافقة مالك الواجهة'],
      en: ['A copy of the licence', 'The sign design with dimensions and colours', 'Consent of the façade owner'],
    },
    steps: {
      ar: [
        'تقديم التصميم المقترح للمراجعة.',
        'مراجعة الاشتراطات البصرية، خاصة في محيط شارع فؤاد والمنشية.',
        'سداد الرسم السنوي واستلام الترخيص.',
      ],
      en: [
        'Submit the proposed design for review.',
        'Review against visual conditions, especially around Fouad Street and El Manshia.',
        'Pay the annual fee and collect the permit.',
      ],
    },
    fee: { ar: 'رسم سنوي يُحسب بمساحة اللافتة وموقعها', en: 'An annual fee based on sign area and location' },
    duration: { ar: 'من 10 إلى 20 يوم عمل', en: '10–20 working days' },
    channel: { ar: 'إدارة الإعلانات — مقر حي المنتزه الثانية', en: 'Advertising department — El Montazah II District offices' },
    legal: ['shops-154-2019', 'local-bylaw'],
  },
  {
    slug: 'sme-support',
    title: { ar: 'دعم المشروعات الصغيرة والمتوسطة', en: 'Small and medium enterprise support' },
    audience: 'business',
    motif: 'shop',
    summary: {
      ar: 'إرشاد أصحاب المشروعات إلى برامج التمويل والتدريب وتيسير التراخيص عبر جهاز تنمية المشروعات.',
      en: 'Guiding entrepreneurs to financing and training programmes and to streamlined licensing via the national MSME agency.',
    },
    eligibility: {
      ar: ['أصحاب المشروعات القائمة أو تحت التأسيس', 'المقيمون أو العاملون داخل نطاق الحي'],
      en: ['Owners of existing or start-up enterprises', 'Residing or operating within the district'],
    },
    documents: {
      ar: ['بطاقة الرقم القومي', 'دراسة مبسطة للمشروع', 'مستندات المقر إن وُجد'],
      en: ['National ID', 'A simple business plan', 'Premises documents if applicable'],
    },
    steps: {
      ar: [
        'حجز موعد إرشادي بمكتب خدمة المستثمرين.',
        'تحديد البرنامج المناسب: تمويل، تدريب، أو تيسير تراخيص.',
        'التحويل إلى فرع جهاز تنمية المشروعات لاستكمال الإجراءات.',
      ],
      en: [
        'Book an advisory appointment at the investor services desk.',
        'Identify the right programme: financing, training or licensing facilitation.',
        'Referral to the MSME agency branch to complete the process.',
      ],
    },
    fee: { ar: 'الإرشاد مجاني؛ وتخضع برامج التمويل لشروط الجهة المانحة', en: 'Advice is free; financing programmes follow the funder’s terms' },
    duration: { ar: 'موعد إرشادي خلال أسبوع', en: 'An advisory appointment within a week' },
    channel: { ar: 'مركز خدمات المستثمرين — مقر حي المنتزه الثانية', en: 'Investor services desk — El Montazah II District offices' },
    legal: ['local-admin-43-1979'],
    external: {
      label: { ar: 'جهاز تنمية المشروعات المتوسطة والصغيرة ومتناهية الصغر', en: 'Micro, Small and Medium Enterprise Development Agency' },
      href: 'https://www.msmeda.org.eg/',
    },
  },
  {
    slug: 'visitor-information',
    title: { ar: 'الاستعلامات السياحية والمسارات', en: 'Visitor information and trails' },
    audience: 'visitors',
    motif: 'compass',
    summary: {
      ar: 'خرائط الحي، ومسارات المشي التراثية، ومعلومات الزيارة للمواقع الأثرية والمتاحف.',
      en: 'District maps, heritage walking trails, and visiting information for archaeological sites and museums.',
    },
    eligibility: {
      ar: ['متاح للجميع دون اشتراطات'],
      en: ['Open to everyone, with no conditions'],
    },
    documents: {
      ar: ['لا توجد مستندات مطلوبة'],
      en: ['No documents required'],
    },
    steps: {
      ar: [
        'تصفح صفحة المعالم لاختيار المواقع التي تهمك.',
        'اطّلع على مسارات المشي المقترحة في صفحة الخرائط والتنقل.',
        'اسأل المساعد الذكي عن المواعيد أو أقرب وسيلة مواصلات.',
      ],
      en: [
        'Browse the landmarks pages to choose the sites that interest you.',
        'See the suggested walking trails on the maps and transport page.',
        'Ask the assistant about opening hours or the nearest transport option.',
      ],
    },
    fee: { ar: 'مجاني', en: 'Free' },
    duration: { ar: 'فوري', en: 'Immediate' },
    channel: { ar: 'الموقع الإلكتروني والمساعد الذكي', en: 'This website and the assistant' },
    legal: ['local-bylaw'],
  },
  {
    slug: 'filming-permit',
    title: { ar: 'تصريح تصوير أو إقامة فعالية', en: 'Filming or event permit' },
    audience: 'visitors',
    motif: 'stage',
    summary: {
      ar: 'التصريح اللازم للتصوير الاحترافي أو إقامة فعالية عامة في الميادين والشوارع التابعة للحي.',
      en: 'The permit required for professional filming or holding a public event in the district’s squares and streets.',
    },
    eligibility: {
      ar: ['جهة إنتاج أو منظّم فعالية له كيان قانوني', 'التصوير داخل المواقع الأثرية يتطلب تصريحًا منفصلًا من وزارة السياحة والآثار'],
      en: ['A production company or event organiser with legal standing', 'Filming inside archaeological sites requires a separate permit from the Ministry of Tourism and Antiquities'],
    },
    documents: {
      ar: ['خطاب من الجهة المنظمة موضحًا الموقع والتاريخ', 'بيان بالمعدات وعدد الأفراد', 'تأمين على الموقع إن لزم'],
      en: ['A letter from the organiser stating location and dates', 'A schedule of equipment and crew numbers', 'Site insurance where required'],
    },
    steps: {
      ar: [
        'تقديم الطلب قبل الموعد بمدة كافية.',
        'مراجعة الطلب مع الجهات الأمنية والمرورية.',
        'سداد المقابل واستلام التصريح مع شروط التشغيل.',
      ],
      en: [
        'Apply well in advance of the date.',
        'The request is reviewed with the security and traffic authorities.',
        'Pay the charge and collect the permit with its operating conditions.',
      ],
    },
    fee: { ar: 'يُحدَّد حسب المساحة والمدة ونوع النشاط', en: 'Set by area, duration and type of activity' },
    duration: { ar: 'من 10 إلى 21 يوم عمل', en: '10–21 working days' },
    channel: { ar: 'مكتب رئيس الحي — التصاريح', en: 'District chief’s office — permits' },
    legal: ['antiquities-117-1983', 'local-bylaw'],
  },
  {
    slug: 'parking',
    title: { ar: 'مواقف السيارات', en: 'Parking' },
    audience: 'visitors',
    motif: 'road',
    summary: {
      ar: 'مواقع المواقف المنظمة في وسط البلد، والتعريفة، وقواعد الانتظار في الشوارع الرئيسية.',
      en: 'Where the organised car parks are in the district, the tariff, and on-street parking rules on main streets.',
    },
    eligibility: {
      ar: ['متاح للجميع', 'أماكن مخصصة لذوي الإعاقة في المواقف الرئيسية'],
      en: ['Open to all', 'Designated bays for people with disabilities in the main car parks'],
    },
    documents: {
      ar: ['لا توجد مستندات مطلوبة'],
      en: ['No documents required'],
    },
    steps: {
      ar: [
        'راجع خريطة المواقف في صفحة الخرائط والتنقل.',
        'التزم بالتعريفة المعلنة واحتفظ بالإيصال.',
        'تجنّب الانتظار في الممنوع خاصة بمحيط محطة الرمل والمنشية.',
      ],
      en: [
        'Check the car park map on the maps and transport page.',
        'Pay the posted tariff and keep the receipt.',
        'Avoid restricted zones, particularly around Mahatet El Raml and El Manshia.',
      ],
    },
    fee: { ar: 'تعريفة معلنة بالساعة في المواقف المنظمة', en: 'A posted hourly tariff in the organised car parks' },
    duration: { ar: 'فوري', en: 'Immediate' },
    channel: { ar: 'إدارة المواقف — مقر حي المنتزه الثانية', en: 'Parking department — El Montazah II District offices' },
    legal: ['traffic-66-1973', 'local-bylaw'],
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function servicesFor(audience: Audience): Service[] {
  return services.filter((s) => s.audience === audience);
}

export const featuredServices = services.filter((s) => s.featured);
