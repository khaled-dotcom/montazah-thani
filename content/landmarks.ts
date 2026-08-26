import type { Bi, BiBlock } from '@/lib/i18n';
import type { MotifName, Tone } from '@/components/motif';

export type LandmarkCategory =
  | 'antiquities'
  | 'museum'
  | 'worship'
  | 'urban'
  | 'culture'
  | 'nature';

export const landmarkCategories: { id: LandmarkCategory; label: Bi }[] = [
  { id: 'antiquities', label: { ar: 'آثار', en: 'Antiquities' } },
  { id: 'museum', label: { ar: 'متاحف', en: 'Museums' } },
  { id: 'worship', label: { ar: 'دور عبادة', en: 'Places of worship' } },
  { id: 'urban', label: { ar: 'ميادين وشوارع', en: 'Squares & streets' } },
  { id: 'culture', label: { ar: 'قصور وفنون', en: 'Palaces & arts' } },
  { id: 'nature', label: { ar: 'حدائق وشواطئ', en: 'Parks & shores' } },
];

/**
 * A colour per category, so a mixed grid of landmarks sorts itself visually.
 * Chosen to match what the thing is made of: Roman brick for the antiquities,
 * limestone for the museums, harbour blue for the places that face the sea,
 * opera gilt for the palaces and arts, verdigris for the gardens and shores.
 */
export const categoryTone: Record<LandmarkCategory, Tone> = {
  antiquities: 'terracotta',
  museum: 'sand',
  worship: 'sea',
  urban: 'sea',
  culture: 'gold',
  nature: 'verdigris',
};

export type Landmark = {
  slug: string;
  name: Bi;
  category: LandmarkCategory;
  section: Bi;
  motif: MotifName;
  featured?: boolean;
  /** Approximate coordinates for map pins — verify against the district GIS layer. */
  coords: { lat: number; lng: number };
  summary: Bi;
  body: BiBlock;
  highlights: { ar: string[]; en: string[] };
  visit: {
    hours: Bi;
    tickets: Bi;
    access: Bi;
    getting: Bi;
  };
};

export const landmarks: Landmark[] = [
  {
    slug: 'montaza-gardens',
    name: { ar: 'حدائق المنتزه', en: 'The Montazah Gardens' },
    category: 'nature',
    section: { ar: 'طوسون — على حدود الحي الغربية', en: 'Toussoun — on the district’s western edge' },
    motif: 'garden',
    featured: true,
    coords: { lat: 31.2885, lng: 30.013 },
    summary: {
      ar: 'أوسع متنزهات الإسكندرية وأشهرها: مساحات خضراء ونخيل وصنوبر تحيط بالبحر، وفي جعبتها القصور الملكية وجسر الجزيرة.',
      en: 'Alexandria’s largest and best-loved park: green lawns, palms and pines ringing the sea, holding the royal palaces and the bridge to its little island within it.',
    },
    body: {
      ar: [
        'اختار الخديوي عباس حلمي الثاني هذا الساحل مأوى صيفيًا منذ 1892، فأحوط مساحات واسعة زُرعت بالنخيل والصنوبر والكازورينا لتصبح حدائق المنتزه، التي نمت مع الوقت إلى أوسع رئة خضراء على ساحل المدينة الشرقي.',
        'تمتد الحدائق بين الكورنيش والتلال الداخلية، وتضم بحيرات صناعية صغيرة وقناة يعبَر عليها بجسر قوسي شهير إلى جزيرة النبات، إضافة إلى غروتوهات حجرية وممرات مشجرة تنتهي كل واحدة منها إلى مشهد على البحر أو على القصور.',
        'بعد 1952 انتقلت الحدائق إلى الهيئات العامة وفُتحت أمام الجمهور، وصارت مقصد عائلات الإسكندرية أولًا وزائرينها بعد ذلك: نزهات صباحية، وحفلات زفاف عند البحيرة، ومقاعد مساءً تواجه شمس تغرب خلف المدينة.',
      ],
      en: [
        'Khedive Abbas Helmi II chose this shore as his summer retreat from 1892, enclosing broad tracts planted with palms, pines and casuarina that grew into the Montazah Gardens — the largest green lung on the city’s eastern coast.',
        'The gardens run between the corniche and their inner hills, holding small ornamental lakes and a channel crossed by the famous arched bridge to the plant island, stone grottoes, and tree-lined walks each ending at a view over the sea or the palaces.',
        'After 1952 the gardens passed to public authorities and opened to everyone; they became first destination for Alexandria’s families and then for its visitors — morning promenades, weddings by the lake, and evening seats facing the sun as it sets behind the city.',
      ],
    },
    highlights: {
      ar: ['جسر الجزيرة ذو الأقواس', 'بحيرة الحدائق وقاربها', 'ممشى الكورنيش الداخلي', 'إطلالات القصور من بين أشجار الكازورينا'],
      en: ['The arched island bridge', 'The garden lake and its boat', 'The inner corniche walk', 'Palace views through the casuarinas'],
    },
    visit: {
      hours: { ar: 'يوميًا من 8:00 صباحًا حتى منتصف الليل تقريبًا في الصيف، وتُقصر المواعيد شتاءً', en: 'Daily from 8:00 until around midnight in summer; shorter hours in winter' },
      tickets: { ar: 'تذكرة دخول رمزية للحدائق', en: 'A modest entrance ticket to the gardens' },
      access: { ar: 'ممرات رئيسية ممهّدة؛ بعض المسارات المرتفعة غير مستوية', en: 'Paved main paths; some raised walks are uneven' },
      getting: { ar: 'بوابات الحدائق على الكورنيش مباشرة؛ ترام الرمل–السيوف يوقف قرب البوابة الغربية', en: 'Entrances lie directly on the corniche; the Raml–Seyouf tram stops near the western gate' },
    },
  },
  {
    slug: 'haramlik-palace',
    name: { ar: 'قصر الحرمليك', en: 'Haramlik Palace' },
    category: 'culture',
    section: { ar: 'طوسون — داخل حدائق المنتزه', en: 'Toussoun — inside the Montazah Gardens' },
    motif: 'museum',
    featured: true,
    coords: { lat: 31.2918, lng: 30.021 },
    summary: {
      ar: 'آخر قصور المنتزه وأكثرها فخامة: اكتمل 1932 في عهد الملك فؤاد الأول على طرف الحدائق البحري، بطُرزه الذي يمزج التوسكاني بالأندلسي والإيطالي.',
      en: 'The last and most sumptuous of the Montazah palaces, completed in 1932 in the reign of King Fuad I on the seaward end of the gardens, in a style blending Tuscan, Andalusian and Italian elements.',
    },
    body: {
      ar: [
        'شيّده الملك فؤاد الأول ليكون مقصد الأسرة المالكة الصيفي الرسمي، واكتمل بناؤه عام 1932 على يد المهندس الإيطالي فيراتيني، على نقطة مرتفعة تشرف على البحر المتوسط من ثلاث جهات.',
        'يميز القصر برجه المركزي العالي ونوافذ المقنطرات وحديقته الإيطالية المدرَّجة التي تنزل نحو الشاطئ، وداخله رسوم جدارية وأثاث أوروبي أصلي ما زال في مكانه.',
        'يُستخدم القصر اليوم في الاستقبالات الرسمية ولا يُفتح للزيارة المنظمة بانتظام، لكنه يشاهد بأبهى صوره من ممرات حدائق المنتزة المحيطة به، خصوصًا عند الغروب.',
      ],
      en: [
        'King Fuad I built it as the royal family’s formal summer seat, completed in 1932 by the Italian architect Veratelli on a raised point overlooking the Mediterranean from three sides.',
        'The palace is marked by its tall central tower, arcaded windows, and the terraced Italian garden stepping down towards the shore; inside survive original murals and European furnishings in place.',
        'Today the palace serves official receptions rather than regular visiting, but at its best it is seen exactly as intended — from the paths of the surrounding gardens, especially at sunset.',
      ],
    },
    highlights: {
      ar: ['البرج المركزي المشرف على البحر', 'الحديقة الإيطالية المدرَّجة', 'واجهات المقنطرات الملونة', 'أفضل زاوية تصوير عند الغروب'],
      en: ['The sea-facing central tower', 'The terraced Italian garden', 'Colourful arcaded façades', 'The finest sunset vantage'],
    },
    visit: {
      hours: { ar: 'يُشاهَد من خارج عبر الحدائق طوال مواعيد الحدائق؛ الزيارة الداخلية غير منتظمة', en: 'Seen from outside throughout garden hours; interior visiting is irregular' },
      tickets: { ar: 'لا تذكرة منفصلة — مشمول بمذكرة دخول الحدائق من الخارج', en: 'No separate ticket — included with the garden ticket when viewed from outside' },
      access: { ar: 'المحيط الخارجي ممهّد؛ المدخل الرئيسي بدرجات', en: 'Surroundings paved; the main entrance has steps' },
      getting: { ar: 'داخل حدائق المنتزه عند طرفها الشرقي البحري، عشر دقائق سيرًا من الجسر', en: 'Inside the Montazah Gardens at their eastern seaward end, ten minutes’ walk from the bridge' },
    },
  },
  {
    slug: 'salamlek-palace',
    name: { ar: 'قصر السلملك', en: 'Salamlek Palace' },
    category: 'culture',
    section: { ar: 'طوسون — داخل حدائق المنتزه', en: 'Toussoun — inside the Montazah Gardens' },
    motif: 'stage',
    coords: { lat: 31.287, lng: 30.0095 },
    summary: {
      ar: 'أقدم قصور المنتزه: بناه الخديوي عباس حلمي الثاني 1892 مأوى صيفيًا متكيسًا، وتحوّل اليوم إلى فندق صغير يحفظ طرازه الملكي.',
      en: 'The oldest of the Montazah palaces, built by Khedive Abbas Helmi II in 1892 as a summer hunting retreat — today a small hotel that keeps its royal character.',
    },
    body: {
      ar: [
        'كان السلملك أول ما أقيم في المنتزه: قصر صغير من طابقين بناه الخديوي عباس حلمي الثاني لرحلات الصيد والاستجمام، قبل أن تكبر الحدائق حوله وتُضاف القصور الأخرى.',
        'يتميز بطُرازه الإسلامي-الموري من الطابق المقلَّم والأقبية المقببة، وحديقته المطلة على البحر التي جلس فيها ملوك ورؤساء على مدار قرن ونصف.',
        'يعمل القصر منذ سنوات فندقًا تراثيًا صغيرًا؛ فيمكن لأهالي الحي وزواره الجلوس في حديقته أو تناول الشاي في صالونه، وهي أسهل طريقة للوقوف داخل أحد قصور مصر الملكية.',
      ],
      en: [
        'Salamlek was the first structure raised at Montazah: a two-storey lodge built by Khedive Abbas Helmi II for hunting and rest, before the gardens grew around it and the other palaces followed.',
        'It is marked by its Moorish-Islamic style — shuttered upper floor and domed cellars — and its sea-view lawn where kings and presidents have sat across a century and a half.',
        'For years now the palace has worked as a heritage hotel; residents and visitors alike can sit on its lawn or take tea in its salon — the easiest way to step inside one of Egypt’s royal palaces.',
      ],
    },
    highlights: {
      ar: ['أقدم مبانٍ بالمنتزه (1892)', 'الأقبية المقبّبة والطابق المقلَّم', 'حديقة الفندق على البحر', 'جلسات الشاي داخل القصر'],
      en: ['The oldest building at Montazah (1892)', 'Domed cellars and shuttered floor', 'The hotel’s seaside lawn', 'Tea inside the palace'],
    },
    visit: {
      hours: { ar: 'الفندق وحديقته يستقبلان الضيوف طوال اليوم', en: 'Hotel and lawn welcome guests through the day' },
      tickets: { ar: 'الدخول للفندق ضيوفًا أو لمشروب دون تذكرة', en: 'Entry as a guest or for a drink, without a ticket' },
      access: { ar: 'الحديقة ممهّدة؛ داخل القصر درجات وبعض الممرات ضيقة', en: 'Lawn paved; inside, stairs and some narrow passages' },
      getting: { ar: 'داخل حدائق المنتزه قرب بوابتها الغربية، على بُعد دقائق من موقف الترام', en: 'Inside the Montazah Gardens near the western gate, minutes from the tram stop' },
    },
  },
  {
    slug: 'maamoura-shores',
    name: { ar: 'مصايف وكورنيش المعمورة', en: 'The Maamoura Shores' },
    category: 'nature',
    section: { ar: 'المعمورة', en: 'El Maamoura' },
    motif: 'sea',
    featured: true,
    coords: { lat: 31.293, lng: 30.036 },
    summary: {
      ar: 'أشهر مصايف شرق الإسكندرية: أكثر من عشرين شاطئًا متتاليًا على الكورنيش، وحديقة عامة ظليلة تجمع العائلات طوال العام.',
      en: 'Eastern Alexandria’s best-known resort shore: more than twenty bathing beaches in a row along the corniche, with a leafy public garden drawing families all year.',
    },
    body: {
      ar: [
        'تمتد شواطئ المعمورة على الكورنيش الشرقي في صف متصل من المصايف المؤجرة والعامة، لكل منها رقمه وجمهوره: مصايف عائلية هادئة صباحًا تتخذها فرق السباحة، وأخرى تعرف صخبها المسائي.',
        'خلف الشواطئ تقع حديقة المعمورة العامة بمساحتها الخضراء وملاهيها الصغيرة ومقاعدها الظليلة، وقد كانت جزءًا من أملاك الأسرة المالكة قبل أن تُفتح للجمهور.',
        'في الموسم — من يونيو إلى سبتمبر — يتضاعف عدد قاطني المنطقة مؤقتًا، ويتحول الكورنيش إلى أطول ممر نزهة في شرق المدينة: عربات الذرة والبطاطا الحارة، وصيادون على الصخور، ومصايف تمتد أنوارها إلى ما بعد منتصف الليل.',
      ],
      en: [
        'The Maamoura beaches run along the eastern corniche in an unbroken row of leased and public shores, each numbered with its own crowd: quiet family beaches in the morning that swimming clubs take over, and others known for their evening bustle.',
        'Behind them lies the Maamoura public garden — green lawns, small fairground rides and shaded seats — once part of the royal family’s estate before opening to everyone.',
        'In season — June to September — the area’s population temporarily multiplies and the corniche becomes the longest promenade in the east of the city: corn and sweet-potato carts, anglers on the rocks, and beaches whose lights burn past midnight.',
      ],
    },
    highlights: {
      ar: ['صف المصايف المرقمة على الكورنيش', 'حديقة المعمورة العامة', 'ممشى الغروب الأطول في شرق البلد', 'أسماك المعمورة عند مغرب الشمس'],
      en: ['The numbered row of beaches along the corniche', 'The Maamoura public garden', 'The east of the city’s longest sunset walk', 'Evening fish suppers at Maamoura'],
    },
    visit: {
      hours: { ar: 'الموسم يونيو–سبتمبر من 8:00 حتى الغروب؛ الكورنيش والحديقة طوال العام', en: 'Season June–September, 8:00 to sunset; corniche and garden open all year' },
      tickets: { ar: 'تذاكر رمزية للمصايف المؤجرة، والحديقة العامة مجانية', en: 'Modest tickets at leased beaches; the public garden is free' },
      access: { ar: 'منحدرات على الكورنيش؛ داخل بعض المصايف سلالم', en: 'Ramps from the corniche; steps inside some beaches' },
      getting: { ar: 'ترام أو متروباص على الكورنيش الشرقي حتى مواقف المعمورة، وخط أبو قير للقطارات يوقف في سيدي بشر المجاورة', en: 'Tram or microbus along the eastern corniche to the Maamoura stops; the neighbouring Sidi Bishr railway stop serves the Abu Qir line' },
    },
  },
  {
    slug: 'abu-qir-bay',
    name: { ar: 'خليج وميناء أبو قير', en: 'Abu Qir Bay & Harbour' },
    category: 'urban',
    section: { ar: 'أبو قير', en: 'Abu Qir' },
    motif: 'sea',
    featured: true,
    coords: { lat: 31.3167, lng: 30.0667 },
    summary: {
      ar: 'قرية الصيد الكبرى في شمال شرق الإسكندرية، وخليجها الذي حمل اسم كانوبوس القديمة وشاهد أشهر معركة بحرية في القرن الثامن عشر.',
      en: 'The great fishing village of north-eastern Alexandria, and its bay — which carried ancient Canopus’s name and witnessed the most famous naval battle of the eighteenth century.',
    },
    body: {
      ar: [
        'يعيش أبو قير من البحر كما عاش آلاف السنين: قوارب الصيد تنطلج قبل الفجر وتعود ظهرًا إلى ميناء صيد من أكبر مراسي الإسكندرية، وأسواق السمك تُنصب على الرصيف حيث يشتري أهل المدينة صيد اليوم مباشرة من صياده.',
        'التاريخ هنا طبقتان لا ثالث لهما: فوق الرصيف قرية تعمل، وتحت الرمال كانوبوس ومنشية أثرية غمرها الزمن، وعلى مياه الخليج في أغسطس 1798 التحم أسطولا نيلسون والأدميرال بروي الفرنسي في «معركة النيل» التي حسمت مصير حملة نابليون.',
        'اليوم يجاور القرية محطات خط أبو قير للسك الحديدية ومقر الأكاديمية العربية للعلوم والتكنولوجيا، فتجتمع في شريط واحد قوارب خشبية وقطارات صباحية وطلبة معامل من عشرين جنسية.',
      ],
      en: [
        'Abu Qir lives from the sea as it has for thousands of years: fishing boats slip out before dawn and return at noon to one of Alexandria’s largest landing harbours, while fish markets set up along the quay where townspeople buy the day’s catch straight from the crews.',
        'History here comes in layers: above the quay a working village; beneath the sands Canopus and buried antiquities; and on these waters in August 1798 Nelson’s fleet met Admiral Brueys’ French squadron in the Battle of the Nile that decided Napoleon’s expedition.',
        'Today the village sits beside the Abu Qir railway terminus and the Arab Academy for Science, Technology and Maritime Transport — wooden boats, morning trains and laboratory students of twenty nationalities sharing one shoreline.',
      ],
    },
    highlights: {
      ar: ['مزاد السمك على الرصيف فجرًا', 'مطاعم السمك المطلّة على الخليج', 'رؤية جزيرة نيلسون من الشاطئ', 'محطة نهاية خط أبو قير'],
      en: ['Dawn fish auctions on the quay', 'Sea-facing fish restaurants', 'Nelson’s Island seen from the beach', 'The terminus of the Abu Qir line'],
    },
    visit: {
      hours: { ar: 'القرية والميناء أحياء على مدار اليوم؛ أسواق السمك أوجها فجرًا وعند عودة القوارب', en: 'Village and harbour live all day; fish markets peak at dawn and when boats land' },
      tickets: { ar: 'لا تذاكر — مكان عام', en: 'No tickets — a public place' },
      access: { ar: 'رصيف مستوٍ؛ شواطئ رملية بمداخل مفتوحة', en: 'Level quay; sandy beaches with open entrances' },
      getting: { ar: 'قطار خط أبو قير من محطة السيوف أو سيدي جابر حتى محطة أبي قير الأخيرة، أو متروباصات شارع أبو قير', en: 'Train on the Abu Qir line from El Seyouf or Sidi Gaber to the last stop, or microbuses up Abu Qir Street' },
    },
  },
  {
    slug: 'nelsons-island',
    name: { ar: 'جزيرة نيلسون', en: 'Nelson’s Island' },
    category: 'antiquities',
    section: { ar: 'أبو قير — قبالة الشاطئ', en: 'Abu Qir — offshore' },
    motif: 'catacomb',
    coords: { lat: 31.33, lng: 30.085 },
    summary: {
      ar: 'جزيرة رملية صغيرة قبالة أبي قير جمعت ثلاث حضارات في بقعة واحدة: مدافن إغريقية قديمة، وقبور جنود ومعسكري 1798، وموقع حفريات حديث.',
      en: 'A small sandy island off Abu Qir gathering three eras in one spot: ancient Greek burial ground, the graves and camps of the 1798 battle, and a modern excavation site.',
    },
    body: {
      ar: [
        'ترتفع جزيرة نيلسون من مياه الخليج على بعد كيلومترات من الشاطئ، وكانت في العصور القديمة ملتقى بحّارة كانوبوس، ثم غطّتها الرمال المتحركة حتى كشفها البحر من جديد.',
        'فيها عثرت بعثات الآثار على مدافن يونانية تعود إلى قرون قبل الميلاد، وعلى بقايا مخيم ومعسكري جنود المعركة البحرية الكبرى عام 1798 وقبورهم — فحملت اسم الأميرال نيلسون الذي انتصر في تلك المعركة.',
        'الجزيرة منطقة أثرية محمية لا توجد لها زيارة منظمة بانتظام حاليًا، لكنها تُرى بوضوح من شاطئ أبي قير يوم الصحو، وتُدرَج أحيانًا في رحلات بحرية مرخصة.',
      ],
      en: [
        'Nelson’s Island rises from the bay a couple of kilometres offshore; in antiquity it was a landmark for the sailors of Canopus before shifting sands buried it and the sea uncovered it again.',
        'Excavations have found Greek burials centuries before our era alongside the remains of the camp and graves of soldiers from the great 1798 naval battle — hence the island’s naming after Admiral Nelson, victor of that day.',
        'The island is a protected archaeological site with no regular visiting arrangement at present, though it is clearly visible from Abu Qir beach on clear days and occasionally included in licensed sea trips.',
      ],
    },
    highlights: {
      ar: ['مدافن يونانية قديمة', 'بقايا معسكري وقبور 1798', 'أعمال حفريات مجلس الآثار', 'أفضل مشاهدة من شاطئ أبي قير'],
      en: ['Ancient Greek burials', 'Remains of the 1798 camps and graves', 'Antiquities council excavations', 'Best seen from Abu Qir beach'],
    },
    visit: {
      hours: { ar: 'لا زيارة منظمة حاليًا؛ تُرى من الشاطئ نهارًا', en: 'No regular visits at present; visible from shore by day' },
      tickets: { ar: '—', en: '—' },
      access: { ar: 'الوصول بحري فقط وبإذن', en: 'Reachable only by boat and by permit' },
      getting: { ar: 'شاهدْها من شاطئ أبو قير أو ضمن رحلات مرخصة تصدر عن الجهات السياحية', en: 'View it from Abu Qir beach or on licensed trips arranged through tour operators' },
    },
  },
  {
    slug: 'toussoun-station',
    name: { ar: 'محطة طوسون وخط أبو قير', en: 'Toussoun Station & the Abu Qir Line' },
    category: 'urban',
    section: { ar: 'طوسون', en: 'Toussoun' },
    motif: 'train',
    coords: { lat: 31.301, lng: 30.045 },
    summary: {
      ar: 'قلب النقل في شرق الإسكندرية: قطارات خط أبو قير تربط الحي بالمدينة، ومقر الحي على بُعد خطوات من الرصيف.',
      en: 'The heart of transport in eastern Alexandria: trains on the Abu Qir line tie the district to the city, with the district seat a few steps from the platform.',
    },
    body: {
      ar: [
        'يمر خط سكة حديد أبو قير — أحد أقدم خطوط الإسكندرية — بشوارع الحي الداخلية، ومحطته في طوسون هي أقرب نقطة ركوب لأهالي مقر الحي والسيوف والتوفيقية.',
        'من المحطة شبكة متروباصات تفرّق الركاب إلى أبو قير والمعمورة وخورشيد، وتلتقي قربها شوارع التجارة اليومية: أسواق طوسون ومحلات المستشارين وفتح الله.',
        'للزائر القادم من وسط البلد، الرحلة نفسها متعة: قطار قصير يعبر أحواض الصيد وسكة الترام القديمة قبل أن ينزل في قلب حي لا يعرف السياحة إلا من نواحيها الهادئة.',
      ],
      en: [
        'The Abu Qir railway line — among Alexandria’s oldest — threads the district’s inner streets, and its Toussoun halt is the closest boarding point for the people of the district seat, El Seyouf and El Tawfikiya.',
        'From the station a web of microbuses spreads passengers to Abu Qir, Maamoura and Khourshid, meeting the daily trade streets nearby: Toussoun’s markets and the shops of El Mostasharin and Fathallah.',
        'For a visitor coming from downtown the ride itself is part of the pleasure: a short train crossing the fishing basins beside the old tram reservation, setting you down in the middle of a district tourism reaches only by its quiet edges.',
      ],
    },
    highlights: {
      ar: ['قطارات دورية على طول الحي', 'أسواق طوسون المجاورة للمحطة', 'ربط مباشر بالسيوف والتوفيقية', 'بوابة الحي لزائريه من وسط المدينة'],
      en: ['Regular trains along the district', 'Toussoun markets beside the halt', 'Direct links to Seyouf and Tawfikiya', 'The district’s gateway from downtown'],
    },
    visit: {
      hours: { ar: 'خدمة قطارات من الصباح الباكر حتى آخر الليل تقريبًا', en: 'Trains run from early morning until late at night' },
      tickets: { ar: 'تذاكر قطارات قليلة الثمن من أي محطة', en: 'Inexpensive tickets bought at any station' },
      access: { ar: 'رصيف مستوٍ؛ استعن بالموظفين عند ركوب العربات ذات الدرجة العالية', en: 'Level platforms; ask staff when boarding high-step carriages' },
      getting: { ar: 'من وسط البلد: قطار من محطة السيوف أو سيدي جابر باتجاه أبو قير، نزولًا في طوسون', en: 'From downtown: board at El Seyouf or Sidi Gaber towards Abu Qir and alight at Toussoun' },
    },
  },
];

export function getLandmark(slug: string): Landmark | undefined {
  return landmarks.find((l) => l.slug === slug);
}

/** Featured first, then alphabetical — the order the grids show. */
export const sortedLandmarks = [...landmarks].sort((a, b) => {
  if ((b.featured ?? false) !== (a.featured ?? false)) return (b.featured ?? false) ? 1 : -1;
  return a.name.en.localeCompare(b.name.en);
});
