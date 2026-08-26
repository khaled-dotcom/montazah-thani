import 'server-only';
/* This module talks to Postgres. Importing it from a client component would
   pull the driver into the browser bundle; the guard turns that into a clear
   build error naming the offending file. */

import { ensureSchema, isConfigured, sql } from '@/lib/sql';
import type { MotifName } from '@/components/motif';
import type { LandmarkCategory, Landmark } from '@/content/landmarks';
import { landmarks as curatedLandmarks } from '@/content/landmarks';
import type { NewsCategory, NewsItem } from '@/content/news';
import { news as curatedNews } from '@/content/news';

/**
 * News and landmarks the district publishes from the dashboard.
 *
 * The site has two sources of content and they are deliberately different
 * things:
 *
 *   - `content/news.ts` and `content/landmarks.ts` are *curated* — long-form,
 *     reviewed, versioned in git alongside the code. The sixteen landmarks with
 *     their visiting hours and body text live there.
 *   - This module is what a clerk publishes day to day, stored in the same
 *     Postgres database as the bookings.
 *
 * Reads merge the two. Writes only ever touch the database, so a dashboard user
 * cannot damage reviewed content — and a redeploy cannot silently drop what
 * they published. Everything published here is bilingual, because the site
 * promises both languages and a half-translated announcement breaks that.
 *
 * A published page is statically rendered, so writes call revalidatePath; see
 * the actions in app/admin.
 */

/** Open the connection and make sure the tables exist. */
async function db() {
  await ensureSchema();
  return sql();
}

/**
 * Run a read, and give up quietly if the database will not answer.
 *
 * The public pages are prerendered, and prerendering happens on a build machine
 * that may have no database reachable at all — a preview build, a fresh clone,
 * CI running `next build` to check the site compiles. None of those should fail
 * the build: the curated content in `content/*.ts` is the substance of the site
 * and it renders perfectly well on its own. What the clerk published is
 * additive, and the next revalidation picks it up.
 *
 * Writes deliberately do NOT do this. A booking or an announcement that
 * silently vanishes is far worse than an error message.
 */
async function read<T>(what: string, query: () => Promise<T>, fallback: T): Promise<T> {
  if (!isConfigured()) return fallback;
  try {
    return await query();
  } catch (error) {
    console.warn(
      `[cms] could not read ${what} from the database; serving curated content only.`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

/* Body text is entered as paragraphs separated by a blank line, which is how a
   person writing prose in a textarea naturally separates them. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean);
}

export function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}

/**
 * A URL-safe slug from the English title.
 *
 * English rather than Arabic on purpose: percent-encoded Arabic slugs are
 * unreadable in a browser bar, break when pasted into WhatsApp, and are painful
 * to dictate over the phone — which is how a resident is most likely to be
 * given one.
 */
export function slugify(englishTitle: string): string {
  return englishTitle
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/* ------------------------------------------------------------------ reading */

type Row = Record<string, unknown>;

function toNews(row: Row): NewsItem & { source: 'published'; id: number; published: boolean } {
  return {
    id: Number(row.id),
    source: 'published',
    published: row.published === true,
    slug: String(row.slug),
    title: { ar: String(row.title_ar), en: String(row.title_en) },
    date: String(row.date),
    category: String(row.category) as NewsCategory,
    summary: { ar: String(row.summary_ar), en: String(row.summary_en) },
    body: {
      ar: splitParagraphs(String(row.body_ar)),
      en: splitParagraphs(String(row.body_en)),
    },
  };
}

function toLandmark(
  row: Row,
): Landmark & { source: 'published'; id: number; published: boolean } {
  return {
    id: Number(row.id),
    source: 'published',
    published: row.published === true,
    slug: String(row.slug),
    name: { ar: String(row.name_ar), en: String(row.name_en) },
    category: String(row.category) as LandmarkCategory,
    section: { ar: String(row.section_ar), en: String(row.section_en) },
    motif: String(row.motif) as MotifName,
    coords: { lat: Number(row.lat ?? 0), lng: Number(row.lng ?? 0) },
    summary: { ar: String(row.summary_ar), en: String(row.summary_en) },
    body: {
      ar: splitParagraphs(String(row.body_ar)),
      en: splitParagraphs(String(row.body_en)),
    },
    highlights: { ar: [], en: [] },
    visit: {
      hours: { ar: '', en: '' },
      tickets: { ar: '', en: '' },
      access: { ar: '', en: '' },
      getting: { ar: '', en: '' },
    },
  };
}

/** Everything the dashboard holds, including drafts. */
export async function listPublishedNews(includeDrafts = false) {
  return read(
    'news',
    async () => {
      const client = await db();
      const rows = includeDrafts
        ? await client`SELECT * FROM cms_news ORDER BY date DESC, id DESC`
        : await client`SELECT * FROM cms_news WHERE published = TRUE ORDER BY date DESC, id DESC`;
      return rows.map((r) => toNews(r as Row));
    },
    [],
  );
}

export async function listPublishedLandmarks(includeDrafts = false) {
  return read(
    'landmarks',
    async () => {
      const client = await db();
      const rows = includeDrafts
        ? await client`SELECT * FROM cms_landmarks ORDER BY id DESC`
        : await client`SELECT * FROM cms_landmarks WHERE published = TRUE ORDER BY id DESC`;
      return rows.map((r) => toLandmark(r as Row));
    },
    [],
  );
}

/** Curated plus published, newest first — what every public news view reads. */
export async function allNews(): Promise<NewsItem[]> {
  const published = await listPublishedNews();
  return [...curatedNews, ...published].sort((a, b) => b.date.localeCompare(a.date));
}

export async function findNews(slug: string): Promise<NewsItem | undefined> {
  return (await allNews()).find((item) => item.slug === slug);
}

/** Curated plus published — what every public landmark view reads. */
export async function allLandmarks(): Promise<Landmark[]> {
  const published = await listPublishedLandmarks();
  return [...curatedLandmarks, ...published];
}

export async function findLandmark(slug: string): Promise<Landmark | undefined> {
  return (await allLandmarks()).find((item) => item.slug === slug);
}

export async function featuredLandmarksMerged(): Promise<Landmark[]> {
  return (await allLandmarks()).filter((l) => l.featured);
}

/** True if any content source already uses this slug. */
export async function slugTaken(
  kind: 'news' | 'landmark',
  slug: string,
  exceptId?: number,
): Promise<boolean> {
  const curated =
    kind === 'news'
      ? curatedNews.some((n) => n.slug === slug)
      : curatedLandmarks.some((l) => l.slug === slug);
  if (curated) return true;

  const client = await db();
  const rows =
    kind === 'news'
      ? await client`SELECT id FROM cms_news WHERE slug = ${slug}`
      : await client`SELECT id FROM cms_landmarks WHERE slug = ${slug}`;

  const row = rows[0] as { id: string | number } | undefined;
  return row !== undefined && Number(row.id) !== exceptId;
}

/* ------------------------------------------------------------------ writing */

export type NewsInput = {
  slug: string;
  titleAr: string;
  titleEn: string;
  date: string;
  category: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  published: boolean;
};

export async function createNews(input: NewsInput): Promise<number> {
  const client = await db();
  const [row] = await client`
    INSERT INTO cms_news
      (slug, title_ar, title_en, date, category, summary_ar, summary_en, body_ar, body_en, published)
    VALUES (
      ${input.slug}, ${input.titleAr}, ${input.titleEn}, ${input.date}, ${input.category},
      ${input.summaryAr}, ${input.summaryEn}, ${input.bodyAr}, ${input.bodyEn}, ${input.published}
    )
    RETURNING id
  `;
  return Number(row.id);
}

export async function updateNews(id: number, input: NewsInput): Promise<void> {
  const client = await db();
  await client`
    UPDATE cms_news SET
      slug = ${input.slug}, title_ar = ${input.titleAr}, title_en = ${input.titleEn},
      date = ${input.date}, category = ${input.category},
      summary_ar = ${input.summaryAr}, summary_en = ${input.summaryEn},
      body_ar = ${input.bodyAr}, body_en = ${input.bodyEn},
      published = ${input.published}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deleteNews(id: number): Promise<void> {
  const client = await db();
  await client`DELETE FROM cms_news WHERE id = ${id}`;
}

export async function getNewsById(id: number) {
  const client = await db();
  const [row] = await client`SELECT * FROM cms_news WHERE id = ${id}`;
  return row ? toNews(row as Row) : undefined;
}

export type LandmarkInput = {
  slug: string;
  nameAr: string;
  nameEn: string;
  category: string;
  sectionAr: string;
  sectionEn: string;
  motif: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  lat: number | null;
  lng: number | null;
  published: boolean;
};

export async function createLandmark(input: LandmarkInput): Promise<number> {
  const client = await db();
  const [row] = await client`
    INSERT INTO cms_landmarks
      (slug, name_ar, name_en, category, section_ar, section_en, motif,
       summary_ar, summary_en, body_ar, body_en, lat, lng, published)
    VALUES (
      ${input.slug}, ${input.nameAr}, ${input.nameEn}, ${input.category},
      ${input.sectionAr}, ${input.sectionEn}, ${input.motif},
      ${input.summaryAr}, ${input.summaryEn}, ${input.bodyAr}, ${input.bodyEn},
      ${input.lat}, ${input.lng}, ${input.published}
    )
    RETURNING id
  `;
  return Number(row.id);
}

export async function updateLandmark(id: number, input: LandmarkInput): Promise<void> {
  const client = await db();
  await client`
    UPDATE cms_landmarks SET
      slug = ${input.slug}, name_ar = ${input.nameAr}, name_en = ${input.nameEn},
      category = ${input.category}, section_ar = ${input.sectionAr},
      section_en = ${input.sectionEn}, motif = ${input.motif},
      summary_ar = ${input.summaryAr}, summary_en = ${input.summaryEn},
      body_ar = ${input.bodyAr}, body_en = ${input.bodyEn},
      lat = ${input.lat}, lng = ${input.lng},
      published = ${input.published}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deleteLandmark(id: number): Promise<void> {
  const client = await db();
  await client`DELETE FROM cms_landmarks WHERE id = ${id}`;
}

export async function getLandmarkById(id: number) {
  const client = await db();
  const [row] = await client`SELECT * FROM cms_landmarks WHERE id = ${id}`;
  return row ? toLandmark(row as Row) : undefined;
}
