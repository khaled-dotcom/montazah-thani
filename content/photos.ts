import type { Locale } from '@/lib/i18n';

/**
 * Every photograph the site publishes, in three groups:
 *
 *   photos      — the lead image of a landmark, keyed by its slug
 *   extraPhotos — further views of the same landmark, a strip on its own page
 *   scenes      — the district itself: the palace over the bay, the bridge, the
 *                 lighthouse
 *
 * Two provenances are represented, and the type forces the difference to be
 * declared rather than assumed. `kind: 'commons'` carries the attribution the
 * Creative Commons licences oblige us to publish, and the credits page walks
 * `allPhotos` to print it. `kind: 'pending'` is a photograph supplied by the
 * district whose source and licence have not been recorded yet — it renders
 * with a visible "source pending" line, the credits page lists it separately,
 * and `npm run preflight` counts them so none reaches production unnoticed.
 *
 * Rendering goes through `<Photo>`, which falls back to the line drawing in
 * components/motif.tsx for any landmark with no entry below (Nelson’s Island
 * and Toussoun station have none yet). Adding or removing a photograph is
 * therefore a change to this file alone.
 */
export type PhotoCredit =
  | {
      kind: 'commons';
      author: string;
      license: string;
      licenseUrl: string;
      source: string;
    }
  | {
      /** Supplied by the district; provenance not recorded yet. */
      kind: 'pending';
    };

export type Photo = {
  src: string;
  /** Intrinsic size — next/image needs both to reserve the space before load. */
  width: number;
  height: number;
  alt: Record<Locale, string>;
  credit: PhotoCredit;
  /**
   * Where the subject sits in the frame, as a Tailwind object-position class.
   * A tall façade cropped into a 16:10 card loses its roof at the default
   * centre; naming the focus keeps the building in the box.
   */
  focus?: string;
};

const BY_SA_4 = {
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
} as const;
const BY_SA_3 = {
  license: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
} as const;
const BY_SA_2 = {
  license: 'CC BY-SA 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
} as const;

/** A photograph the district supplied without a recorded source — use this
    credit when the office adds its own material, until provenance is written. */
export const PENDING: PhotoCredit = { kind: 'pending' };

export const photos: Record<string, Photo> = {
  'montaza-gardens': {
    src: '/photos/montaza-gardens.jpg',
    width: 1600,
    height: 1030,
    alt: {
      ar: 'حدائق المنتزه: مساحات خضراء ونخيل تحيط ببحيرتها الصناعية تحت سماء صافية',
      en: 'The Montazah Gardens: lawns and palms ringing the ornamental lake under a clear sky',
    },
    credit: {
      kind: 'commons',
      author: 'Jerrye & Roy Klotz, MD',
      ...BY_SA_3,
      source: 'https://commons.wikimedia.org/wiki/File:MONTAZA_GARDENS_AND_PARK,_ALEXANDRIA,_EGYPT.jpg',
    },
  },
  'haramlik-palace': {
    src: '/photos/haramlik-palace.jpg',
    width: 1600,
    height: 868,
    alt: {
      ar: 'قصر الحرمليك بواجهاته المزخرفة وبرجه المشرف على البحر من داخل حدائق المنتزه',
      en: 'Haramlik Palace, its ornamented façades and sea-facing tower seen from inside the Montazah Gardens',
    },
    credit: {
      kind: 'commons',
      author: 'Murat Özsoy 1958',
      ...BY_SA_4,
      source: 'https://commons.wikimedia.org/wiki/File:Montaza_Palace,_Alexandria,_Egypt_-_Murat_%C3%96zsoy_2018.jpg',
    },
  },
  'salamlek-palace': {
    src: '/photos/salamlek-palace.jpg',
    width: 1600,
    height: 1200,
    alt: {
      ar: 'قصر السلملك بطابقه المقلَّم وأقبية المقببة، وحديقته المطلة على البحر',
      en: 'Salamlek Palace with its shuttered upper floor and domed cellars, its lawn looking over the sea',
    },
    credit: {
      kind: 'commons',
      author: 'Dennis G. Jarvis',
      ...BY_SA_2,
      source: 'https://commons.wikimedia.org/wiki/File:Egypt-14A-131_-_Salamlek_Palace_Hotel_(2217549068).jpg',
    },
  },
  'maamoura-shores': {
    src: '/photos/maamoura-beach.jpg',
    width: 1600,
    height: 2133,
    focus: 'object-[50%_30%]',
    alt: {
      ar: 'شاطئ بالمعمورة ورماله وراكبي القوارب في خلفية الكورنيش الشرقي',
      en: 'A Maamoura beach, its sand and bathers with the eastern corniche behind',
    },
    credit: {
      kind: 'commons',
      author: 'May Hachem93',
      ...BY_SA_3,
      source: 'https://commons.wikimedia.org/wiki/File:Mamoura_-_Alex.JPG',
    },
  },
  'abu-qir-bay': {
    src: '/photos/abu-qir-bay.jpg',
    width: 1600,
    height: 1200,
    alt: {
      ar: 'خليج أبو قير بمياهه الهادئة وقوارب الصيد عند الرصيف',
      en: 'Abu Qir Bay, its calm water and fishing boats at the quay',
    },
    credit: {
      kind: 'commons',
      author: 'TRJN',
      ...BY_SA_4,
      source: 'https://commons.wikimedia.org/wiki/File:Abu_Qir_Bay-2025-9-7.jpg',
    },
  },
};

/**
 * Second and third views of a landmark, shown as a strip beneath the lead
 * image on its own page. Nothing else reads this, so a landmark with no entry
 * here simply shows one photograph.
 */
export const extraPhotos: Record<string, Photo[]> = {
  'haramlik-palace': [
    {
      src: '/photos/haramlik-palace-2.jpg',
      width: 1600,
      height: 798,
      alt: {
        ar: 'لقطة بانورامية لقصر الحرمليك وحديقته المدرَّجة نحو البحر',
        en: 'A panoramic view of Haramlik Palace and its terraced garden stepping towards the sea',
      },
      credit: {
        kind: 'commons',
        author: 'Murat Özsoy 1958',
        ...BY_SA_4,
        source: 'https://commons.wikimedia.org/wiki/File:Montaza_Palace,_Alexandria,_Egypt_-_Murat_%C3%96zsoy_2018_(2).jpg',
      },
    },
  ],
  'salamlek-palace': [
    {
      src: '/photos/salamlek-palace-2.jpg',
      width: 1600,
      height: 1200,
      alt: {
        ar: 'زاوية أخرى لقصر السلملك بين أشجار حدائق المنتزه',
        en: 'Another corner of Salamlek Palace among the trees of the Montazah Gardens',
      },
      credit: {
        kind: 'commons',
        author: 'Dennis G. Jarvis',
        ...BY_SA_2,
        source: 'https://commons.wikimedia.org/wiki/File:Flickr_-_archer10_(Dennis)_-_Egypt-14A-124.jpg',
      },
    },
  ],
  'montaza-gardens': [
    {
      src: '/photos/montaza-bridge.jpg',
      width: 1600,
      height: 829,
      alt: {
        ar: 'أمواج البحر تعبر أسفل جسر الجزيرة بحجارته المقوسة داخل حدائق المنتزه',
        en: 'Sea waves crossing beneath the arched island bridge inside the Montazah Gardens',
      },
      credit: {
        kind: 'commons',
        author: 'Aya Ibrahim',
        ...BY_SA_4,
        source: 'https://commons.wikimedia.org/wiki/File:The_Waves_Crossed_The_Bridge.jpg',
      },
    },
  ],
};

/**
 * Views of the district that are not a landmark entry of their own — the
 * palace over the bay, the bridge and the lighthouse. The gallery page
 * publishes these under their own heading, and the home page opens with
 * `heroScene`.
 *
 * `where` is the honest location line: these views sit inside or beside the
 * gardens at the district’s western edge, and say so plainly.
 */
export type Scene = Photo & {
  id: string;
  title: Record<Locale, string>;
  where: Record<Locale, string>;
};

export const scenes: Scene[] = [
  {
    id: 'montaza-sea',
    src: '/photos/montaza-palace-hero.jpg',
    width: 2400,
    height: 1576,
    title: { ar: 'قصر المنتزه والبحر', en: 'Montazah Palace and the sea' },
    where: { ar: 'حدائق المنتزه — حي منتزه ثاني', en: 'The Montazah Gardens — El Montazah II District' },
    alt: {
      ar: 'قصر الحرمليك يرتفع خلف أمواج البحر المتوسط على طرف حدائق المنتزه',
      en: 'Haramlik Palace rising behind Mediterranean waves at the seaward end of the Montazah Gardens',
    },
    credit: {
      kind: 'commons',
      author: 'ASaber91',
      ...BY_SA_4,
      source: 'https://commons.wikimedia.org/wiki/File:Alexandria-MontazahPalace.jpg',
    },
  },
  {
    id: 'montaza-bridge',
    src: '/photos/montaza-bridge.jpg',
    width: 1600,
    height: 829,
    title: { ar: 'جسر جزيرة المنتزه', en: 'The Montazah island bridge' },
    where: { ar: 'حدائق المنتزه — حي منتزه ثاني', en: 'The Montazah Gardens — El Montazah II District' },
    alt: {
      ar: 'أمواج تعبر أسفل قناة جسر الجزيرة بحجارته المقوسة',
      en: 'Waves passing beneath the arched stone channel of the island bridge',
    },
    credit: {
      kind: 'commons',
      author: 'Aya Ibrahim',
      ...BY_SA_4,
      source: 'https://commons.wikimedia.org/wiki/File:The_Waves_Crossed_The_Bridge.jpg',
    },
  },
  {
    id: 'montaza-lighthouse',
    src: '/photos/montaza-lighthouse.jpg',
    width: 1600,
    height: 1200,
    title: { ar: 'منارة المنتزه', en: 'The Montazah lighthouse' },
    where: { ar: 'طرف الحدائق البحري — حي منتزه ثاني', en: 'The gardens’ seaward end — El Montazah II District' },
    alt: {
      ar: 'منارة المنتزه البيضاء ذات الأشرطة الحمراء بين أشجار الحدائق',
      en: 'The white Montazah lighthouse with its red bands among the trees of the gardens',
    },
    credit: {
      kind: 'commons',
      author: 'Dennis G. Jarvis',
      ...BY_SA_2,
      source: 'https://commons.wikimedia.org/wiki/File:Lighthouse_Egypt-14A-141_-_Montazah_Lighthouse_(2216756909).jpg',
    },
  },
];

/** The photograph the home page opens with. */
export const heroScene: Scene = scenes[0];

/** The strip of small photographs along the foot of the home hero. */
export const heroStrip: Scene[] = ['montaza-bridge', 'montaza-lighthouse']
  .map((id) => scenes.find((s) => s.id === id))
  .filter((s): s is Scene => Boolean(s));

export function getPhoto(slug: string | undefined): Photo | undefined {
  return slug ? photos[slug] : undefined;
}

export function getExtraPhotos(slug: string | undefined): Photo[] {
  return slug ? (extraPhotos[slug] ?? []) : [];
}

/** Every photograph the site publishes, ordered by slug — the credits page walks this. */
export const allPhotos: (Photo & { slug: string })[] = [
  ...Object.entries(photos).map(([slug, photo]) => ({ slug, ...photo })),
  ...Object.entries(extraPhotos).flatMap(([slug, list]) =>
    list.map((photo) => ({ slug, ...photo })),
  ),
  ...scenes.map(({ id, title: _title, where: _where, ...photo }) => ({ slug: id, ...photo })),
].sort((a, b) => a.slug.localeCompare(b.slug));

/** Photographs still waiting for their source and licence to be recorded. */
export const unattributedPhotos = allPhotos.filter((photo) => photo.credit.kind === 'pending');
