import type { Bi, BiBlock } from '@/lib/i18n';

export const intro: BiBlock = {
  ar: [
    'حي منتزه ثاني هو الطرف الشمالي الشرقي لمدينة الإسكندرية. من طوسون حيث مقر الحي، إلى قرية الصيد بأبي قير عند مصب خليجها التاريخي، وصولًا إلى مصايف المعمورة على الكورنيش — يمتد الحي بين الحدائق الملكية غربًا والبحيرة شرقًا، وهو الجمع النادر بين حدائق قصور ملكية وشواطئ عامة وقرى صيد عاملة وأحياء سكنية جديدة.',
    'يشتهر النطاق بثلاثة أصول لا يجتمع مثلها في حي آخر: حدائق وقصور المنتزه التي اختارها الخديوي عباس حلمي الثاني مأوى له منذ 1892، وخليج أبو قير الذي يحفظ اسم كانوبوس القديمة ومعركة بحرية غيّرت وجه مصر الحديثة، ومصايف المعمورة التي تقصد آلاف الأسر كل صيف.',
    'هذه الازدواجية — قرى صيد تعمل كل فجر، ومصايف تمتلئ كل مساء، وحدائق ملكية تشرف على الاثنين — هي ما يحدد أولويات العمل بالحي: خدمات تصل إلى نطاق واسع ومتباعد، ونظافة للشواطئ والمسطحات الخضراء، وتنظيم للحركة في موسم الصيف الذي يتضاعف فيه عدد قاطني المنطقة مؤقتًا.',
  ],
  en: [
    'El Montazah II is the north-eastern edge of Alexandria. From Toussoun — where the district sits — to the fishing village of Abu Qir on its historic bay, and along to the Maamoura shores on the eastern corniche, the district stretches between royal gardens on one side and the lake outfall on the other: a rare combination of palace gardens and public beaches, working fishing villages and new residential quarters.',
    'The area is known for three assets no other district can claim together: the Montazah Gardens and palaces chosen as a retreat by Khedive Abbas Helmi II from 1892; Abu Qir Bay, which keeps the name of ancient Canopus and remembers a sea battle that changed modern Egypt; and the Maamoura bathing shores that thousands of families head for every summer.',
    'That double character — fishing villages that work every dawn, beaches that fill every evening, and royal gardens looking over both — sets the district’s priorities: services that reach a wide, spread-out area, cleanliness of beaches and green spaces, and management of movement through a summer season in which the district’s population temporarily multiplies.',
  ],
};

export type TimelineEntry = {
  period: Bi;
  title: Bi;
  text: Bi;
};

export const timeline: TimelineEntry[] = [
  {
    period: { ar: 'العصر البطلمي', en: 'Ptolemaic era' },
    title: { ar: 'كانوبوس على الخليج', en: 'Canopus on the bay' },
    text: {
      ar: 'قامت كانوبوس — أعرق مدن الإسكندرية المجاورة — عند مصب الفرع الكانوبي في موقع أبي قير الحالي، وازدهرت ميناءً ومعبدًا لسيرابيس حتى غمرتها الرمال والبحر. ولا تزال آثار المنطقة تحت الرواسب وتل الرديف وجزيرة نيلسون.',
      en: 'Canopus — the oldest of Alexandria’s neighbouring cities — stood at the mouth of the Canopic branch on the site of present-day Abu Qir, flourishing as a port and a seat of the cult of Serapis before sand and sea buried it. Its remains still lie under the silt, at Tell El-Radif and on Nelson’s Island.',
    },
  },
  {
    period: { ar: '1798', en: '1798' },
    title: { ar: 'معركة أبي قير البحرية', en: 'The Battle of the Nile' },
    text: {
      ar: 'خليج أبو قير مسرحًا لأشهر معارك البحر المتوسط: أسطول نيلسون دمّر الأسطول الفرنسي الراسي أمامه، لتقطع بذلك إمدادات حملة نابليون إلى مصر. وفي الجزيرة التي تحمل اسم نيلسون دُفن جنود وأسرى المعركة، وتحوّلت لاحقًا محطة للحفريات الأثرية.',
      en: 'Abu Qir Bay staged one of the Mediterranean’s most famous battles: Nelson’s fleet destroyed the French squadron anchored before it, cutting Napoleon’s expedition off from its supplies. On the island now bearing Nelson’s name were buried soldiers and prisoners of the battle; it later became an archaeological excavation site.',
    },
  },
  {
    period: { ar: '1892', en: '1892' },
    title: { ar: 'الخديوي يختار الساحل', en: 'The Khedive chooses the shore' },
    text: {
      ar: 'اختار الخديوي عباس حلمي الثاني هذا الساحل مأوى صيفيًا: بنى السلملك أول القصور، وحوّط مساحات واسعة من الأرض لتصبح حدائق المنتزه، فدخلت المنطقة تاريخ العمارة الملكية في مصر. وقد سُمّيت منطقة طوسون باسم الأمير طوسون من الأسرة العلوية.',
      en: 'Khedive Abbas Helmi II chose this shore as his summer retreat: he built Salamlek, the first of the palaces, and enclosed broad tracts of land that became the Montazah Gardens, entering the area into the history of Egypt’s royal architecture. The Toussoun quarter takes its name from Prince Toussoun of the Mohamed Ali family.',
    },
  },
  {
    period: { ar: '1932', en: '1932' },
    title: { ar: 'اكتمال الحرمليك', en: 'Haramlik is completed' },
    text: {
      ar: 'اكتمل بناء قصر الحرمليك على طرف الحدائق البحري في عهد الملك فؤاد الأول، بطُرزه المزيج الفاخر، ليكون مقصدًا رسميًا للأسرة المالكة صيفًا. وبعد 1952 انتقلت الحدائق والقصور إلى الهيئات العامة، ثم فُتحت الحدائق أمام الجمهور لتصبح أشهر متنزهات المدينة.',
      en: 'Haramlik Palace was completed on the seaward end of the gardens in the reign of King Fuad I, in its sumptuous blended style, as the royal family’s formal summer destination. After 1952 the gardens and palaces passed to public authorities, and the gardens opened to everyone — becoming the city’s best-loved park.',
    },
  },
  {
    period: { ar: '1972', en: '1972' },
    title: { ar: 'الأكاديمية العربية بأبو قير', en: 'The Academy at Abu Qir' },
    text: {
      ar: 'استقر مقر الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري على ساحل أبي قير، فأضاف للمنطقة بعدًا تعليميًا ودوليًا: طلبة من عشرات الدول يجاورون ورش الصيد والترامات، وميناء تدريب بحري على الخليج ذاته.',
      en: 'The Arab Academy for Science, Technology and Maritime Transport settled its main campus on the Abu Qir shore, adding an educational and international dimension to the area: students from dozens of countries alongside the fishing workshops and tram depot, and a training harbour on the same bay.',
    },
  },
  {
    period: { ar: 'اليوم', en: 'Today' },
    title: { ar: 'حيٌّ يعمل ويستقبل', en: 'A district that works and welcomes' },
    text: {
      ar: 'يعمل الحي اليوم على ثلاثة محاور متوازية: خدمات يومية تصل إلى نطاق واسع من طوسون إلى أبي قير، وصون الحدائق الملكية والشواطئ باعتبارها رئة المنطقة، وإدارة موسم الصيف بمصايف المعمورة وما جاورها.',
      en: 'The district today works on three parallel tracks: everyday services reaching across the spread from Toussoun to Abu Qir, stewardship of the royal gardens and beaches as the area’s lungs, and running the summer season along the Maamoura shores and beyond.',
    },
  },
];

export type Pillar = { title: Bi; text: Bi };

export const pillars: Pillar[] = [
  {
    title: { ar: 'خدمة تصل إلى الأطراف', en: 'Service that reaches the edges' },
    text: {
      ar: 'أن يحصل ساكن أبو قير أو السيوف على نفس سرعة الخدمة التي يحصل عليها جار مقر الحي بطوسون.',
      en: 'A resident of Abu Qir or El Seyouf should get the same speed of service as the neighbour of the district seat at Toussoun.',
    },
  },
  {
    title: { ar: 'شواطئ نظيفة', en: 'Clean beaches' },
    text: {
      ar: 'نظافة المصايف ورصدها اليومي في الموسم، لأنها وجهة آلاف الأسر ومصدر عمل مئات الصيادين.',
      en: 'Season-long cleanliness and daily monitoring of the bathing shores — they are the destination of thousands of families and the workplace of hundreds of fishermen.',
    },
  },
  {
    title: { ar: 'حدائق محفوظة', en: 'Kept gardens' },
    text: {
      ar: 'المحافظة على المسطحات الخضراء والحدائق العامة باعتبارها ذاكرة المنطقة وفرتها الصيفية الأولى.',
      en: 'Caring for the green spaces and public gardens as the area’s memory and its first summer resort.',
    },
  },
  {
    title: { ar: 'موسم منظّم', en: 'An organised season' },
    text: {
      ar: 'إدارة حركة الزوار والمواقف والباعة في الصيف بما يحفظ حق الساكن قبل الزائر.',
      en: 'Managing visitors, parking and traders through summer so the resident’s right comes before the visitor’s convenience.',
    },
  },
];

export type Faq = { q: Bi; a: Bi };

export const faqs: Faq[] = [
  {
    q: { ar: 'ما مواعيد العمل بمقر الحي؟', en: 'What are the district office hours?' },
    a: {
      ar: 'من الأحد إلى الخميس، من التاسعة صباحًا حتى الثانية ظهرًا، عدا العطلات الرسمية، بمقر الحي بطوسون المستشارين.',
      en: 'Sunday to Thursday, 09:00 to 14:00, excluding public holidays, at the district seat in Toussoun, El Mostasharin.',
    },
  },
  {
    q: { ar: 'كيف أصل إلى الحدائق والقصور؟', en: 'How do I reach the gardens and palaces?' },
    a: {
      ar: 'خط ترام الرمل–السيوف يوقف عند بوابة المنتزه، وخط سكة حديد أبو قير ينزل بك في محطتي سيدي بشر وطوسون، ومنهما أتوبيس أو تاكسي دقائق إلى البوابات.',
      en: 'The Raml–Seyouf tram stops at the Montazah gate, and the Abu Qir railway line sets you down at Sidi Bishr or Toussoun stations — from either, a short bus or taxi ride reaches the entrances.',
    },
  },
  {
    q: { ar: 'أين أبلّغ عن حفرة بالطريق أو عمود إنارة معطّل؟', en: 'Where do I report a pothole or a broken streetlight?' },
    a: {
      ar: 'عبر نموذج «الإبلاغ عن مشكلة» في صفحة الخدمات، أو المساعد الذكي، أو الخط الساخن الموحد 16528. احتفظ برقم البلاغ لمتابعته.',
      en: 'Through the “Report an issue” form in the services section, the assistant, or the unified 16528 hotline. Keep the reference number to follow it up.',
    },
  },
  {
    q: { ar: 'هل الحي مسؤول عن المياه والكهرباء؟', en: 'Is the district responsible for water and electricity?' },
    a: {
      ar: 'شبكات المياه والصرف والكهرباء تديرها شركات مرافق مستقلة. يستقبل الحي البلاغ ويحوّله إلى الجهة المختصة، ولطوارئ الكهرباء اتصل بـ121 وللغاز 129.',
      en: 'Water, drainage and electricity networks are run by separate utility companies. The district receives reports and refers them on; for electricity emergencies call 121 and for gas 129.',
    },
  },
  {
    q: { ar: 'ما أفضل وقت لزيارة شاطئ المعمورة؟', en: 'When is the best time to visit Maamoura beach?' },
    a: {
      ar: 'الموسم من يونيو إلى سبتمبر؛ الصباح الباكر أنسب للسباحة والهدوء، والعصر للعائلات. خارج الموسم يبقى الكورنيش والحديقة العامة مفتوحين طوال العام.',
      en: 'The season runs June to September; early morning suits swimming and quiet, late afternoon suits families. Outside the season the corniche and public garden stay open all year.',
    },
  },
  {
    q: { ar: 'هل يمكن زيارة جزيرة نيلسون؟', en: 'Can I visit Nelson’s Island?' },
    a: {
      ar: 'الجزيرة منطقة أثرية تخضع لإدارة مجلس الآثار ولا توجد لها زيارة منظمة بانتظام حاليًا؛ يمكن رؤيتها من شاطئ أبي قير، وتُدرَج الرحلات المصرح لها أحيانًا عبر جهات سياحية مرخصة.',
      en: 'The island is an archaeological site under the antiquities council with no regular visiting arrangement at present; it can be seen from Abu Qir beach, and licensed operators occasionally run authorised trips.',
    },
  },
];
