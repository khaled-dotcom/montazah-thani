import Image from 'next/image';
import Link from 'next/link';

import { Motif, type MotifName } from '@/components/motif';
import {
  getPhoto,
  type Photo as PhotoData,
  type PhotoCredit as Credit,
} from '@/content/photos';
import { link, type Locale } from '@/lib/i18n';

/**
 * A landmark image: the photograph if we hold one, and the line drawing if we
 * do not.
 *
 * Both branches fill the same aspect box, so a card grid stays on its grid
 * whether or not a given landmark has been photographed yet. `sizes` matters
 * more than it looks — without it next/image serves the widest candidate to
 * every card in a three-column grid.
 */
export function Photo({
  slug,
  motif,
  locale,
  ratio = 'aspect-[16/10]',
  className = '',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  preload = false,
  zoom = false,
}: {
  slug: string;
  motif: MotifName;
  locale: Locale;
  /** Tailwind aspect class; pass '' to let the parent size it. */
  ratio?: string;
  className?: string;
  sizes?: string;
  /** Next 16 replaced the old `priority` prop with this. */
  preload?: boolean;
  /** Ease the image in when the card around it is hovered. */
  zoom?: boolean;
}) {
  const photo = getPhoto(slug);

  if (!photo) {
    return <Motif name={motif} ratio={ratio} className={className} />;
  }

  return (
    <Frame photo={photo} locale={locale} ratio={ratio} className={className} sizes={sizes} preload={preload} zoom={zoom} />
  );
}

/**
 * One photograph in its aspect box. Split out from `Photo` because the extra
 * views on a landmark page and the scenes in the gallery are photographs
 * without a landmark slug of their own.
 */
export function Frame({
  photo,
  locale,
  ratio = 'aspect-[16/10]',
  className = '',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  preload = false,
  zoom = false,
}: {
  photo: PhotoData;
  locale: Locale;
  ratio?: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
  zoom?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${ratio} ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt[locale]}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        preload={preload}
        className={`absolute inset-0 size-full object-cover ${photo.focus ?? ''} ${
          zoom ? 'transition-transform duration-500 ease-out group-hover:scale-[1.04]' : ''
        }`}
      />
    </div>
  );
}

/**
 * The attribution line the CC licences require, rendered wherever a photograph
 * is shown large enough to stand on its own. Grid thumbnails are covered by the
 * credits page instead, which every one of these lines links to.
 */
export function PhotoCredit({
  slug,
  locale,
  className = '',
}: {
  slug: string;
  locale: Locale;
  className?: string;
}) {
  const photo = getPhoto(slug);
  if (!photo) return null;

  return (
    <p className={`mt-2 text-xs text-fg-muted ${className}`}>
      <CreditText credit={photo.credit} locale={locale} />{' '}
      <Link href={link('/credits', locale)} className="underline hover:text-brand">
        {locale === 'ar' ? 'كل حقوق الصور' : 'All image credits'}
      </Link>
    </p>
  );
}

/**
 * Photographer and licence, both linked to their source — or, for a photograph
 * the district supplied without a recorded provenance, a plain line saying so.
 * Reused by the credits page and the gallery.
 */
export function CreditText({ credit, locale }: { credit: Credit; locale: Locale }) {
  if (credit.kind === 'pending') {
    return (
      <>{locale === 'ar' ? 'صورة من الحي — المصدر قيد التوثيق' : 'District photograph — source pending confirmation'}</>
    );
  }

  return (
    <>
      {locale === 'ar' ? 'تصوير' : 'Photo'}{' '}
      <a
        href={credit.source}
        rel="noopener noreferrer license"
        target="_blank"
        className="underline hover:text-brand"
      >
        {credit.author}
      </a>
      {locale === 'ar' ? '، عبر ويكيميديا كومنز، رخصة ' : ', via Wikimedia Commons, '}
      <a
        href={credit.licenseUrl}
        rel="noopener noreferrer license"
        target="_blank"
        className="underline hover:text-brand"
      >
        {credit.license}
      </a>
    </>
  );
}

/** The same attribution as flat text, for the places a card cannot carry links. */
export function creditLine(credit: Credit, locale: Locale): string {
  if (credit.kind === 'pending') {
    return locale === 'ar' ? 'صورة من الحي — المصدر قيد التوثيق' : 'District photograph — source pending';
  }
  return locale === 'ar'
    ? `تصوير ${credit.author} — ${credit.license}`
    : `Photo ${credit.author} — ${credit.license}`;
}
