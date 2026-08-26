'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { landmarkCategories } from '@/content/landmarks';
import { newsCategories } from '@/content/news';
import {
  createLandmark,
  createNews,
  deleteLandmark,
  deleteNews,
  slugify,
  slugTaken,
  type LandmarkInput,
  type NewsInput,
  updateLandmark,
  updateNews,
} from '@/lib/cms';

/**
 * Publishing from the dashboard.
 *
 * Public pages are statically rendered, so a write is only half the job — the
 * pages built from that content have to be rebuilt too. `revalidatePath('/',
 * 'layout')` is a blunt instrument that discards the whole cached tree, and
 * that is the right trade here: a district publishes a handful of items a week,
 * the site is 107 small pages, and the alternative is enumerating every route a
 * news item touches (the list, its own page, the home page, search, the
 * sitemap) and quietly missing one.
 */

const MOTIFS = [
  'theatre', 'column', 'catacomb', 'library', 'museum', 'book', 'stage', 'synagogue',
  'square', 'tram', 'train', 'garden', 'street', 'market', 'palette', 'sea', 'shop', 'compass',
];

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

function republish() {
  revalidatePath('/', 'layout');
}

/* ------------------------------------------------------------------- news */

function readNewsForm(form: FormData): { input: NewsInput; errors: string[] } {
  const titleAr = str(form, 'titleAr');
  const titleEn = str(form, 'titleEn');
  const errors: string[] = [];

  if (titleAr.length < 4) errors.push('titleAr');
  if (titleEn.length < 4) errors.push('titleEn');
  if (str(form, 'summaryAr').length < 10) errors.push('summaryAr');
  if (str(form, 'summaryEn').length < 10) errors.push('summaryEn');
  if (str(form, 'bodyAr').length < 20) errors.push('bodyAr');
  if (str(form, 'bodyEn').length < 20) errors.push('bodyEn');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(form, 'date'))) errors.push('date');
  if (!newsCategories.some((c) => c.id === str(form, 'category'))) errors.push('category');

  // A slug the editor typed wins; otherwise it comes from the English title,
  // which is the only field guaranteed to be URL-safe.
  const slug = str(form, 'slug') || slugify(titleEn);
  if (!slug) errors.push('slug');

  return {
    errors,
    input: {
      slug,
      titleAr,
      titleEn,
      date: str(form, 'date'),
      category: str(form, 'category'),
      summaryAr: str(form, 'summaryAr'),
      summaryEn: str(form, 'summaryEn'),
      bodyAr: str(form, 'bodyAr'),
      bodyEn: str(form, 'bodyEn'),
      published: form.get('published') === 'on',
    },
  };
}

export async function saveNews(form: FormData) {
  const id = Number(form.get('id') ?? 0) || undefined;
  const { input, errors } = readNewsForm(form);

  if (errors.length) redirect(`/admin/news?error=${errors.join(',')}${id ? `&edit=${id}` : ''}`);
  if (await slugTaken('news', input.slug, id))
    redirect(`/admin/news?error=slug${id ? `&edit=${id}` : ''}`);

  if (id) await updateNews(id, input);
  else await createNews(input);

  republish();
  redirect(`/admin/news?saved=${encodeURIComponent(input.slug)}`);
}

export async function removeNews(form: FormData) {
  const id = Number(form.get('id') ?? 0);
  if (id) {
    await deleteNews(id);
    republish();
  }
  redirect('/admin/news?deleted=1');
}

/* -------------------------------------------------------------- landmarks */

function readLandmarkForm(form: FormData): { input: LandmarkInput; errors: string[] } {
  const nameAr = str(form, 'nameAr');
  const nameEn = str(form, 'nameEn');
  const errors: string[] = [];

  if (nameAr.length < 2) errors.push('nameAr');
  if (nameEn.length < 2) errors.push('nameEn');
  if (str(form, 'summaryAr').length < 10) errors.push('summaryAr');
  if (str(form, 'summaryEn').length < 10) errors.push('summaryEn');
  if (str(form, 'bodyAr').length < 20) errors.push('bodyAr');
  if (str(form, 'bodyEn').length < 20) errors.push('bodyEn');
  if (!str(form, 'sectionAr')) errors.push('sectionAr');
  if (!str(form, 'sectionEn')) errors.push('sectionEn');
  if (!landmarkCategories.some((c) => c.id === str(form, 'category'))) errors.push('category');
  if (!MOTIFS.includes(str(form, 'motif'))) errors.push('motif');

  const lat = str(form, 'lat') ? Number(str(form, 'lat')) : null;
  const lng = str(form, 'lng') ? Number(str(form, 'lng')) : null;
  // Loose bounds around Alexandria: a transposed pair or a stray digit puts the
  // pin in the sea off Somalia, and nobody notices until a visitor follows it.
  if (lat !== null && (Number.isNaN(lat) || lat < 30.9 || lat > 31.4)) errors.push('lat');
  if (lng !== null && (Number.isNaN(lng) || lng < 29.5 || lng > 30.3)) errors.push('lng');

  const slug = str(form, 'slug') || slugify(nameEn);
  if (!slug) errors.push('slug');

  return {
    errors,
    input: {
      slug,
      nameAr,
      nameEn,
      category: str(form, 'category'),
      sectionAr: str(form, 'sectionAr'),
      sectionEn: str(form, 'sectionEn'),
      motif: str(form, 'motif'),
      summaryAr: str(form, 'summaryAr'),
      summaryEn: str(form, 'summaryEn'),
      bodyAr: str(form, 'bodyAr'),
      bodyEn: str(form, 'bodyEn'),
      lat,
      lng,
      published: form.get('published') === 'on',
    },
  };
}

export async function saveLandmark(form: FormData) {
  const id = Number(form.get('id') ?? 0) || undefined;
  const { input, errors } = readLandmarkForm(form);

  if (errors.length)
    redirect(`/admin/landmarks?error=${errors.join(',')}${id ? `&edit=${id}` : ''}`);
  if (await slugTaken('landmark', input.slug, id))
    redirect(`/admin/landmarks?error=slug${id ? `&edit=${id}` : ''}`);

  if (id) await updateLandmark(id, input);
  else await createLandmark(input);

  republish();
  redirect(`/admin/landmarks?saved=${encodeURIComponent(input.slug)}`);
}

export async function removeLandmark(form: FormData) {
  const id = Number(form.get('id') ?? 0);
  if (id) {
    await deleteLandmark(id);
    republish();
  }
  redirect('/admin/landmarks?deleted=1');
}
