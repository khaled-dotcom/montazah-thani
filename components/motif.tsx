import type { ReactNode } from 'react';

/**
 * Hand-drawn SVG motifs used in place of photography.
 *
 * The site ships no bitmap imagery on purpose: we have no licensed photographs
 * of the district yet, and placeholder stock would misrepresent the places.
 * These line drawings are self-contained, weigh nothing, scale to any size and
 * adapt to both themes. Swap `Motif` for a real <Image> once the district's
 * photo library is cleared for use.
 */
export type MotifName =
  | 'theatre'
  | 'column'
  | 'catacomb'
  | 'library'
  | 'museum'
  | 'book'
  | 'stage'
  | 'synagogue'
  | 'square'
  | 'tram'
  | 'train'
  | 'garden'
  | 'street'
  | 'market'
  | 'palette'
  | 'permit'
  | 'report'
  | 'waste'
  | 'lamp'
  | 'road'
  | 'shop'
  | 'sign'
  | 'compass'
  | 'sea';

export type Tone = 'sea' | 'sand' | 'gold' | 'terracotta' | 'verdigris';

/**
 * Solid tints for icon chips and category badges.
 *
 * The site used to paint every chip the same harbour blue, which made a page of
 * twelve services read as one undifferentiated block. Colouring by subject lets
 * the eye sort them before it reads a word — and the palette is still the four
 * district colours, so it stays a government portal rather than a toy.
 */
export const toneChip: Record<Tone, string> = {
  sea: 'bg-sea-100 text-sea-700 dark:bg-sea-900 dark:text-sea-200',
  sand: 'bg-sand-200 text-gold-600 dark:bg-ink-700 dark:text-sand-200',
  gold: 'bg-gold-400/25 text-gold-600 dark:bg-gold-600/25 dark:text-gold-400',
  terracotta:
    'bg-terracotta-400/25 text-terracotta-600 dark:bg-terracotta-600/25 dark:text-terracotta-400',
  verdigris:
    'bg-verdigris-400/25 text-verdigris-600 dark:bg-verdigris-600/25 dark:text-verdigris-400',
};

/** The same five tones as a top rule on a card. */
export const toneRule: Record<Tone, string> = {
  sea: 'bg-sea-500',
  sand: 'bg-sand-400',
  gold: 'bg-gold-500',
  terracotta: 'bg-terracotta-500',
  verdigris: 'bg-verdigris-500',
};

const toneClasses: Record<Tone, string> = {
  sea: 'from-sea-100 to-sea-200 text-sea-800 dark:from-sea-900 dark:to-sea-800 dark:text-sea-200',
  sand: 'from-sand-100 to-sand-200 text-sea-800 dark:from-ink-700 dark:to-ink-900 dark:text-sand-200',
  gold: 'from-sand-100 to-gold-400/40 text-gold-600 dark:from-ink-700 dark:to-gold-600/30 dark:text-gold-400',
  terracotta:
    'from-sand-100 to-terracotta-400/35 text-terracotta-600 dark:from-ink-700 dark:to-terracotta-600/30 dark:text-terracotta-400',
  verdigris:
    'from-sea-50 to-verdigris-400/35 text-verdigris-600 dark:from-ink-700 dark:to-verdigris-600/30 dark:text-verdigris-400',
};

export const motifTone: Record<MotifName, Tone> = {
  theatre: 'terracotta',
  column: 'terracotta',
  catacomb: 'terracotta',
  library: 'sea',
  museum: 'sand',
  book: 'sand',
  stage: 'gold',
  synagogue: 'sand',
  square: 'sand',
  tram: 'verdigris',
  train: 'sea',
  garden: 'verdigris',
  street: 'sand',
  market: 'gold',
  palette: 'gold',
  permit: 'sea',
  report: 'terracotta',
  waste: 'verdigris',
  lamp: 'gold',
  road: 'sea',
  shop: 'gold',
  sign: 'sea',
  compass: 'verdigris',
  sea: 'sea',
};

/* Every drawing lives in a 160×100 box, stroked in currentColor. */
const drawings: Record<MotifName, ReactNode> = {
  theatre: (
    <>
      <path d="M20 78h120" />
      <path d="M34 78a46 34 0 0 1 92 0" opacity="0.85" />
      <path d="M46 78a34 25 0 0 1 68 0" opacity="0.7" />
      <path d="M58 78a22 16 0 0 1 44 0" opacity="0.55" />
      <path d="M72 78a8 6 0 0 1 16 0" opacity="0.4" />
      <path d="M28 78V60M132 78V60" opacity="0.5" />
      <circle cx="80" cy="26" r="7" opacity="0.5" />
    </>
  ),
  column: (
    <>
      <path d="M24 84h112" />
      <path d="M52 84V32M80 84V24M108 84V36" />
      <path d="M44 32h16M72 24h16M100 36h16" />
      <path d="M46 84h12M74 84h12M102 84h12" />
      <path d="M40 26h24M68 18h24M96 30h24" opacity="0.6" />
      <path d="M52 76v-36M80 76v-44M108 76v-32" opacity="0.35" />
    </>
  ),
  catacomb: (
    <>
      <path d="M24 22h112v62H24z" opacity="0.35" />
      <path d="M52 84V52a28 28 0 0 1 56 0v32" />
      <path d="M64 84V56a16 16 0 0 1 32 0v28" opacity="0.7" />
      <circle cx="80" cy="52" r="5" opacity="0.6" />
      <path d="M24 40h20M116 40h20" opacity="0.5" />
      <path d="M24 58h14M122 58h14" opacity="0.5" />
    </>
  ),
  library: (
    <>
      <path d="M14 84h132" />
      <path d="M26 84a58 44 0 0 1 108-24" />
      <path d="M40 84a44 32 0 0 1 82-18" opacity="0.6" />
      <path d="M54 84a30 22 0 0 1 56-12" opacity="0.4" />
      <path d="M118 30l6-10M132 40l12-6M126 54l14 2" opacity="0.6" />
      <circle cx="112" cy="34" r="4" opacity="0.7" />
    </>
  ),
  museum: (
    <>
      <path d="M20 84h120" />
      <path d="M28 84V44M52 84V44M80 84V44M108 84V44M132 84V44" />
      <path d="M20 44h120L80 16z" />
      <path d="M20 44h120" />
      <path d="M24 84h112" opacity="0.5" />
      <path d="M62 34h36" opacity="0.5" />
    </>
  ),
  book: (
    <>
      <path d="M80 30v52" />
      <path d="M80 30c-14-9-30-11-46-8v52c16-3 32-1 46 8" />
      <path d="M80 30c14-9 30-11 46-8v52c-16-3-32-1-46 8" />
      <path d="M44 40h22M44 52h22M94 40h22M94 52h22" opacity="0.45" />
    </>
  ),
  stage: (
    <>
      <path d="M24 86h112V26H24z" opacity="0.3" />
      <path d="M24 26h112" />
      <path d="M44 26v60c10-14 10-42 0-60M116 26v60c-10-14-10-42 0-60" />
      <path d="M24 86h112" />
      <circle cx="80" cy="46" r="10" opacity="0.6" />
      <path d="M80 56v18M70 74h20" opacity="0.6" />
    </>
  ),
  synagogue: (
    <>
      <path d="M22 86h116" />
      <path d="M34 86V38h92v48" />
      <path d="M34 38l46-22 46 22" />
      <path d="M56 86V60a10 10 0 0 1 20 0v26" opacity="0.7" />
      <path d="M88 86V60a10 10 0 0 1 20 0v26" opacity="0.7" />
      <circle cx="80" cy="42" r="8" opacity="0.6" />
    </>
  ),
  square: (
    <>
      <path d="M14 86h132" />
      <path d="M24 86V46h26v40M110 86V50h26v36" opacity="0.55" />
      <path d="M30 56h14M30 66h14M116 58h14M116 68h14" opacity="0.4" />
      <path d="M68 86V64h24v22" opacity="0.4" />
      <path d="M74 64V44a6 6 0 0 1 12 0v20" />
      <circle cx="80" cy="34" r="6" />
    </>
  ),
  tram: (
    <>
      <path d="M18 88h124" />
      <rect x="38" y="34" width="84" height="44" rx="6" />
      <path d="M38 52h84" opacity="0.6" />
      <path d="M52 40h20v10H52zM88 40h20v10H88z" opacity="0.5" />
      <circle cx="58" cy="82" r="5" />
      <circle cx="102" cy="82" r="5" />
      <path d="M80 34V18h26" opacity="0.7" />
      <path d="M18 20h124" opacity="0.35" />
    </>
  ),
  train: (
    <>
      <path d="M16 86h128" />
      <path d="M28 86V52a52 30 0 0 1 104 0v34" opacity="0.45" />
      <rect x="44" y="46" width="72" height="32" rx="4" />
      <path d="M56 54h18v12H56zM86 54h18v12H86z" opacity="0.5" />
      <circle cx="62" cy="82" r="4" />
      <circle cx="98" cy="82" r="4" />
      <path d="M44 62H30M116 62h14" opacity="0.4" />
    </>
  ),
  garden: (
    <>
      <path d="M16 84h128" opacity="0.5" />
      <path d="M16 76c14-6 26 6 40 0s26 6 40 0 26 6 48 0" />
      <path d="M16 86c14-6 26 6 40 0s26 6 40 0 26 6 48 0" opacity="0.5" />
      <path d="M46 68V44" />
      <circle cx="46" cy="34" r="14" opacity="0.8" />
      <path d="M108 68V38" />
      <path d="M108 38l-14-8M108 44l14-10M108 52l-12-6" opacity="0.7" />
    </>
  ),
  street: (
    <>
      <path d="M14 88h132" />
      <path d="M26 88V30h34v58M100 88V36h34v52" />
      <path d="M32 40h8M46 40h8M32 54h8M46 54h8M32 68h8M46 68h8" opacity="0.45" />
      <path d="M106 46h8M120 46h8M106 60h8M120 60h8M106 74h8M120 74h8" opacity="0.45" />
      <path d="M68 88l10-30h4l10 30" opacity="0.4" />
    </>
  ),
  market: (
    <>
      <path d="M18 88h124" />
      <path d="M28 46h104v42H28z" opacity="0.3" />
      <path d="M24 46l10-16h92l10 16z" />
      <path d="M24 46c8 8 16 8 24 0s16 8 24 0 16 8 24 0 16 8 24 0 12 8 16 0" opacity="0.7" />
      <path d="M52 88V66h20v22M96 88V66h18v22" opacity="0.5" />
    </>
  ),
  palette: (
    <>
      <path d="M80 22c-30 0-52 18-52 38 0 14 12 22 24 18 8-3 14 2 12 10-2 7 4 12 14 12 28 0 54-20 54-40S110 22 80 22z" />
      <circle cx="58" cy="42" r="5" opacity="0.8" />
      <circle cx="80" cy="34" r="5" opacity="0.6" />
      <circle cx="102" cy="42" r="5" opacity="0.8" />
      <circle cx="110" cy="62" r="5" opacity="0.6" />
    </>
  ),
  permit: (
    <>
      <path d="M42 16h58l20 20v66H42z" />
      <path d="M100 16v20h20" opacity="0.6" />
      <path d="M56 52h48M56 64h48M56 76h30" opacity="0.55" />
      <circle cx="104" cy="82" r="12" opacity="0.8" />
      <path d="M98 82l4 5 9-10" opacity="0.9" />
    </>
  ),
  report: (
    <>
      <path d="M26 24h108v56H86l-22 20V80H26z" />
      <path d="M80 40v20" />
      <circle cx="80" cy="68" r="3" />
    </>
  ),
  waste: (
    <>
      <path d="M46 36h68l-6 62H52z" />
      <path d="M38 36h84" />
      <path d="M66 36v-8h28v8" />
      <path d="M66 52v30M80 52v30M94 52v30" opacity="0.5" />
    </>
  ),
  lamp: (
    <>
      <path d="M40 90h40" />
      <path d="M60 90V28" />
      <path d="M60 28h28a14 14 0 0 1 14 14" />
      <path d="M92 42h20l-8 16H100z" />
      <path d="M96 66l-4 12M108 66l4 12M102 68v14" opacity="0.55" />
    </>
  ),
  road: (
    <>
      <path d="M28 96L58 20h44l30 76" />
      <path d="M80 28v10M80 48v10M80 68v10M80 88v6" opacity="0.7" />
      <path d="M20 96h120" opacity="0.4" />
    </>
  ),
  shop: (
    <>
      <path d="M22 88h116" />
      <path d="M30 88V44h100v44" />
      <path d="M24 44l8-16h96l8 16z" />
      <path d="M24 44c8 8 16 8 24 0s16 8 24 0 16 8 24 0 16 8 24 0 12 8 16 0" opacity="0.65" />
      <path d="M60 88V62h24v26" opacity="0.6" />
      <path d="M100 60h22v18h-22z" opacity="0.4" />
    </>
  ),
  sign: (
    <>
      <path d="M34 92V22" />
      <path d="M34 30h84a10 10 0 0 1 0 20H34" />
      <path d="M34 58h60a10 10 0 0 1 0 20H34" opacity="0.6" />
      <path d="M26 92h20" />
      <path d="M52 40h48M52 68h30" opacity="0.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="80" cy="52" r="34" />
      <path d="M80 26l10 26-10 26-10-26z" />
      <path d="M54 52h52" opacity="0.4" />
      <path d="M80 12v6M80 86v6M34 52h-6M132 52h6" opacity="0.6" />
    </>
  ),
  /* Used full-bleed behind the hero, so it is waves only — a horizon line or a
     sun disc would read as a stray artefact crossing the text. */
  sea: (
    <>
      <path d="M14 54c14-8 26 8 40 0s26 8 40 0 26 8 38 0" opacity="0.5" />
      <path d="M14 68c14-8 26 8 40 0s26 8 40 0 26 8 38 0" />
      <path d="M14 82c14-8 26 8 40 0s26 8 40 0 26 8 38 0" opacity="0.7" />
      <path d="M14 96c14-8 26 8 40 0s26 8 40 0 26 8 38 0" opacity="0.4" />
    </>
  ),
};

export function Motif({
  name,
  className = '',
  ratio = 'aspect-[16/10]',
}: {
  name: MotifName;
  className?: string;
  /** Tailwind aspect class; pass '' to let the parent size it. */
  ratio?: string;
}) {
  const tone = toneClasses[motifTone[name]];
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-linear-to-br ${tone} ${ratio} ${className}`}
    >
      <svg
        viewBox="0 0 160 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {drawings[name]}
      </svg>
    </div>
  );
}

/** A motif icon in a tinted square, coloured by the motif's own subject. */
export function MotifChip({
  name,
  className = 'size-11',
  iconClassName = 'size-6',
}: {
  name: MotifName;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${toneChip[motifTone[name]]} ${className}`}
    >
      <MotifIcon name={name} className={iconClassName} />
    </span>
  );
}

/** Small inline version for lists and buttons. */
export function MotifIcon({ name, className = 'size-6' }: { name: MotifName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {drawings[name]}
    </svg>
  );
}
