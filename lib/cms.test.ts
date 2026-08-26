import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

/**
 * The publishing tests need a real Postgres — see lib/db.test.ts for the same
 * reasoning. TEST_DATABASE_URL must name a THROWAWAY database: the suite
 * truncates cms_news and cms_landmarks before it runs.
 *
 * The pure text handling below (paragraphs, slugs) needs no database and runs
 * either way, which is most of what actually breaks in this module.
 */
const TEST_DB = process.env.TEST_DATABASE_URL ?? '';
const skip = TEST_DB
  ? false
  : 'set TEST_DATABASE_URL to a throwaway Postgres to run the publishing tests';

if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const cms = await import('@/lib/cms');
const { closeDb } = await import('@/lib/db');
const { news: curatedNews } = await import('@/content/news');
const { landmarks: curatedLandmarks } = await import('@/content/landmarks');

before(async () => {
  if (!TEST_DB) return;
  const { ensureSchema, sql } = await import('@/lib/sql');
  await ensureSchema();
  await sql()`TRUNCATE cms_news, cms_landmarks RESTART IDENTITY`;
});

after(async () => {
  if (TEST_DB) await closeDb();
});

const newsInput = (over: Partial<Parameters<typeof cms.createNews>[0]> = {}) => ({
  slug: 'a-test-item',
  titleAr: 'عنوان تجريبي',
  titleEn: 'A test item',
  date: '2026-09-01',
  category: 'announcement',
  summaryAr: 'ملخص عربي كافٍ الطول',
  summaryEn: 'An English summary of sufficient length',
  bodyAr: 'فقرة أولى بالعربية.\n\nفقرة ثانية بالعربية.',
  bodyEn: 'First paragraph in English.\n\nSecond paragraph in English.',
  published: true,
  ...over,
});

/* ------------------------------------------------------------ text handling */

test('paragraphs split on a blank line and survive a round trip', () => {
  const text = 'الفقرة الأولى.\n\nالفقرة الثانية.';
  const parts = cms.splitParagraphs(text);
  assert.deepEqual(parts, ['الفقرة الأولى.', 'الفقرة الثانية.']);
  assert.equal(cms.joinParagraphs(parts), text);
});

test('a single newline inside a paragraph is a wrap, not a break', () => {
  // Someone pasting from Word gets soft-wrapped lines; those are one paragraph.
  assert.deepEqual(cms.splitParagraphs('سطر أول\nتكملة السطر'), ['سطر أول تكملة السطر']);
});

test('blank and whitespace-only input yields no paragraphs', () => {
  assert.deepEqual(cms.splitParagraphs(''), []);
  assert.deepEqual(cms.splitParagraphs('   \n\n  \n '), []);
});

test('slugify produces a URL-safe slug from an English title', () => {
  assert.equal(cms.slugify('Night Market Returns!'), 'night-market-returns');
  assert.equal(cms.slugify('  Spaces   and---dashes  '), 'spaces-and-dashes');
  assert.equal(cms.slugify('Café Façade'), 'cafe-facade', 'accents fold to ASCII');
});

test('slugify yields an empty string for text with nothing latin in it', () => {
  // The caller must then fall back or reject — it must not produce '---'.
  assert.equal(cms.slugify('عنوان عربي بالكامل'), '');
});

test('slugify caps length so a URL stays usable', () => {
  assert.ok(cms.slugify('word '.repeat(60)).length <= 70);
});

/* ------------------------------------------------------------------ writing */

test('a published news item is readable back with its paragraphs', { skip }, async () => {
  const id = await cms.createNews(newsInput({ slug: 'roundtrip-item' }));
  const item = await cms.getNewsById(id);
  assert.equal(item?.title.ar, 'عنوان تجريبي');
  assert.deepEqual(item?.body.ar, ['فقرة أولى بالعربية.', 'فقرة ثانية بالعربية.']);
  assert.equal(item?.published, true);
});

test('published news joins the public list, newest first', { skip }, async () => {
  await cms.createNews(newsInput({ slug: 'newest-item', date: '2030-01-01' }));
  const all = await cms.allNews();
  assert.equal(all[0]?.slug, 'newest-item', 'the newest date must sort to the front');
  assert.ok(all.length > curatedNews.length, 'curated items are still present');
});

test('a draft is hidden from the public list but visible in the dashboard', { skip }, async () => {
  await cms.createNews(newsInput({ slug: 'draft-item', published: false }));
  assert.equal(await cms.findNews('draft-item'), undefined, 'a draft must not be public');
  assert.ok(
    (await cms.listPublishedNews(true)).some((n) => n.slug === 'draft-item'),
    'the dashboard must still show it',
  );
});

test('editing changes the stored item without creating a second one', { skip }, async () => {
  const id = await cms.createNews(newsInput({ slug: 'edit-me' }));
  const existing = (await cms.listPublishedNews(true)).length;
  await cms.updateNews(id, newsInput({ slug: 'edit-me', titleAr: 'عنوان معدّل' }));
  assert.equal((await cms.listPublishedNews(true)).length, existing);
  assert.equal((await cms.getNewsById(id))?.title.ar, 'عنوان معدّل');
});

test('deleting removes it from the public site', { skip }, async () => {
  const id = await cms.createNews(newsInput({ slug: 'delete-me' }));
  assert.ok(await cms.findNews('delete-me'));
  await cms.deleteNews(id);
  assert.equal(await cms.findNews('delete-me'), undefined);
});

/* ------------------------------------------------------------------- slugs */

test('a slug already used by curated content is refused', { skip }, async () => {
  const existing = curatedNews[0]!.slug;
  assert.equal(await cms.slugTaken('news', existing), true);

  const existingLandmark = curatedLandmarks[0]!.slug;
  assert.equal(await cms.slugTaken('landmark', existingLandmark), true);
});

test('a slug used by another published item is refused', { skip }, async () => {
  await cms.createNews(newsInput({ slug: 'taken-slug' }));
  assert.equal(await cms.slugTaken('news', 'taken-slug'), true);
});

test('an item does not collide with its own slug when edited', { skip }, async () => {
  const id = await cms.createNews(newsInput({ slug: 'my-own-slug' }));
  assert.equal(
    await cms.slugTaken('news', 'my-own-slug', id),
    false,
    'editing an item must not report its own slug as taken',
  );
});

test('a free slug is free', { skip }, async () => {
  assert.equal(await cms.slugTaken('news', 'nothing-uses-this-slug'), false);
});

/* --------------------------------------------------------------- landmarks */

const landmarkInput = (over: Partial<Parameters<typeof cms.createLandmark>[0]> = {}) => ({
  slug: 'a-test-landmark',
  nameAr: 'معلم تجريبي',
  nameEn: 'A test landmark',
  category: 'urban',
  sectionAr: 'طوسون',
  sectionEn: 'Toussoun',
  motif: 'square',
  summaryAr: 'وصف عربي كافٍ الطول للاختبار',
  summaryEn: 'An English description of sufficient length',
  bodyAr: 'فقرة عن المعلم.',
  bodyEn: 'A paragraph about the landmark.',
  lat: 31.1975,
  lng: 29.9097,
  published: true,
  ...over,
});

test('a published landmark joins the public guide', { skip }, async () => {
  await cms.createLandmark(landmarkInput({ slug: 'public-landmark' }));
  assert.ok((await cms.allLandmarks()).some((l) => l.slug === 'public-landmark'));
  assert.equal((await cms.findLandmark('public-landmark'))?.name.ar, 'معلم تجريبي');
});

test('a landmark without coordinates still renders', { skip }, async () => {
  // The map falls back to 0,0 rather than throwing — the guide must not break
  // just because the district has not surveyed the pin yet.
  await cms.createLandmark(landmarkInput({ slug: 'no-coords', lat: null, lng: null }));
  const found = await cms.findLandmark('no-coords');
  assert.equal(found?.coords.lat, 0);
  assert.equal(found?.coords.lng, 0);
});

test('a published landmark carries empty visit info rather than undefined', { skip }, async () => {
  // The detail page reads visit.hours[locale] unconditionally; undefined there
  // is a crash on a public page.
  const found = await cms.findLandmark('public-landmark');
  assert.equal(typeof found?.visit.hours.ar, 'string');
  assert.equal(typeof found?.visit.tickets.en, 'string');
  assert.deepEqual(found?.highlights.ar, []);
});

test('a landmark draft stays out of the public guide', { skip }, async () => {
  await cms.createLandmark(landmarkInput({ slug: 'landmark-draft', published: false }));
  assert.equal(await cms.findLandmark('landmark-draft'), undefined);
});

test('curated landmarks are never lost when published ones exist', { skip }, async () => {
  const all = await cms.allLandmarks();
  for (const curated of curatedLandmarks) {
    assert.ok(all.some((l) => l.slug === curated.slug), `${curated.slug} disappeared`);
  }
});
