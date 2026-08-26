#!/usr/bin/env node
/**
 * Crawls a running instance and checks the things unit tests cannot see.
 *
 * Unit tests prove a function behaves. They cannot tell you that a link in the
 * footer 404s, that an Arabic page is serving English, or that a photograph
 * lost its alt text in a refactor — those only appear once the pages are
 * assembled and served. This walks every URL in the sitemap, follows every
 * internal link it finds, and asserts the things a resident would notice.
 *
 *   node scripts/audit.mjs http://localhost:3200
 *
 * Exits non-zero if anything fails, so it can gate a deploy.
 */

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

const problems = [];
const notes = [];
const fail = (url, what) => problems.push({ url, what });
const note = (url, what) => notes.push({ url, what });

const text = (html, re) => (html.match(re) ?? [])[1] ?? '';
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

/* ------------------------------------------------------------- collect URLs */

async function sitemapUrls() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) {
    fail('/sitemap.xml', `returned ${res.status}`);
    return [];
  }
  const xml = await res.text();
  return all(xml, /<loc>([^<]+)<\/loc>/g)
    .map((u) => u.replace(/^https?:\/\/[^/]+/, ''))
    .filter((p) => p.startsWith('/'));
}

/* ------------------------------------------------------------- page checks */

const PLACEHOLDER_LEAKS = [
  'PLACEHOLDER',
  'lorem ipsum',
  'TODO',
  'undefined',
  'NaN',
  '[object Object]',
];

function checkPage(path, html, status) {
  if (status !== 200) {
    fail(path, `HTTP ${status}`);
    return;
  }

  const locale = path.split('/')[1];
  const isLocalised = locale === 'ar' || locale === 'en';

  // --- document basics
  const title = text(html, /<title>([^<]*)<\/title>/);
  if (!title.trim()) fail(path, 'no <title>');

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count === 0) fail(path, 'no <h1>');
  if (h1Count > 1) fail(path, `${h1Count} <h1> elements — a page has one main heading`);

  const description = text(html, /<meta name="description" content="([^"]*)"/);
  if (!description.trim()) note(path, 'no meta description');

  // --- language and direction
  if (isLocalised) {
    const lang = text(html, /<html[^>]*lang="([^"]*)"/);
    const dir = text(html, /<html[^>]*dir="([^"]*)"/);
    if (lang !== locale) fail(path, `lang="${lang}" on a /${locale}/ page`);
    const wanted = locale === 'ar' ? 'rtl' : 'ltr';
    if (dir !== wanted) fail(path, `dir="${dir}" but should be ${wanted}`);
  }

  // --- the theme must be resolved before paint
  if (isLocalised && !/data-theme="(light|dark)"/.test(html)) {
    fail(path, 'no resolved data-theme on <html> — the page will flash the wrong theme');
  }

  // --- untranslated content
  const arabic = /[؀-ۿ]/;
  if (locale === 'en') {
    // The chrome is generated from the same bilingual content, so any Arabic in
    // a heading on an English page is a missing translation, not decoration.
    for (const heading of all(html, /<h[12][^>]*>([^<]{3,})<\/h[12]>/g)) {
      if (arabic.test(heading)) fail(path, `Arabic heading on an English page: "${heading.trim()}"`);
    }
  }
  if (locale === 'ar') {
    const h1 = text(html, /<h1[^>]*>([^<]{3,})<\/h1>/);
    // A Latin-only h1 on an Arabic page usually means a fallback slipped through.
    if (h1 && !arabic.test(h1) && /^[A-Za-z ,.'’&-]+$/.test(h1.trim())) {
      note(path, `English-only h1 on an Arabic page: "${h1.trim()}"`);
    }
  }

  // --- images
  for (const img of html.matchAll(/<img\b([^>]*)>/g)) {
    const attrs = img[1];
    if (!/\balt=/.test(attrs)) fail(path, 'an <img> with no alt attribute');
  }

  // --- development leftovers
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const leak of PLACEHOLDER_LEAKS) {
    if (body.includes(leak)) fail(path, `the string "${leak}" is visible in the page`);
  }

  // --- skip link, for keyboard users
  if (isLocalised && !html.includes('skip-link')) note(path, 'no skip-to-content link');
}

/* ------------------------------------------------------------------- crawl */

const internalLinks = new Map(); // href -> Set(found on)

function collectLinks(path, html) {
  for (const href of all(html, /<a\b[^>]*href="([^"]+)"/g)) {
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const clean = href.split('#')[0];
    if (!clean) continue;
    if (!internalLinks.has(clean)) internalLinks.set(clean, new Set());
    internalLinks.get(clean).add(path);
  }
}

async function main() {
  console.log(`\nSite audit — ${BASE}\n${'─'.repeat(72)}`);

  const paths = await sitemapUrls();
  // Pages that are deliberately not in the sitemap but must still work.
  const extra = ['/ar/search', '/en/search', '/ar/appointments', '/en/appointments'];
  const toVisit = [...new Set([...paths, ...extra])];

  if (toVisit.length === 0) {
    console.error('No URLs found — is the server running?');
    process.exit(1);
  }

  console.log(`Visiting ${toVisit.length} pages from the sitemap…\n`);

  for (const path of toVisit) {
    let res;
    try {
      res = await fetch(`${BASE}${path}`);
    } catch (error) {
      fail(path, `request failed: ${error.message}`);
      continue;
    }
    const html = await res.text();
    checkPage(path, html, res.status);
    collectLinks(path, html);
  }

  // Every internal link discovered must resolve.
  console.log(`Following ${internalLinks.size} distinct internal links…\n`);
  for (const [href, sources] of internalLinks) {
    if (toVisit.includes(href)) continue;
    let res;
    try {
      res = await fetch(`${BASE}${href}`, { redirect: 'manual' });
    } catch (error) {
      fail(href, `link target unreachable: ${error.message}`);
      continue;
    }
    // 2xx and redirects are both fine; 404/500 are not.
    if (res.status >= 400) {
      const from = [...sources].slice(0, 3).join(', ');
      fail(href, `link target returns ${res.status} (linked from ${from})`);
    }
  }

  /* -------------------------------------------------------------- reporting */

  const grouped = new Map();
  for (const { url, what } of problems) {
    if (!grouped.has(what)) grouped.set(what, []);
    grouped.get(what).push(url);
  }

  if (notes.length) {
    console.log(`Notes (${notes.length}):`);
    const seen = new Map();
    for (const { url, what } of notes) {
      if (!seen.has(what)) seen.set(what, []);
      seen.get(what).push(url);
    }
    for (const [what, urls] of seen) {
      console.log(`  · ${what}  (${urls.length}: ${urls.slice(0, 3).join(', ')}${urls.length > 3 ? ', …' : ''})`);
    }
    console.log('');
  }

  if (problems.length === 0) {
    console.log(`✓ ${toVisit.length} pages and ${internalLinks.size} links checked — no problems.\n`);
    return;
  }

  console.log(`✗ ${problems.length} problem(s):\n`);
  for (const [what, urls] of grouped) {
    console.log(`  ${what}`);
    for (const url of urls.slice(0, 6)) console.log(`      ${url}`);
    if (urls.length > 6) console.log(`      … and ${urls.length - 6} more`);
    console.log('');
  }
  process.exit(1);
}

/* ------------------------------------------------------------- self-test */

/**
 * A checker that never fires is worse than no checker: it reports "clean" and
 * everyone believes it. `--self-test` runs the page checks over deliberately
 * broken fixtures and asserts each one is caught, so the green result above
 * means something.
 */
function selfTest() {
  const good = `<html lang="ar" dir="rtl" data-theme="light"><head><title>عنوان</title>
    <meta name="description" content="وصف"></head>
    <body><a class="skip-link" href="#main">تخط</a><h1>عنوان الصفحة</h1>
    <img src="/a.jpg" alt="وصف الصورة"></body></html>`;

  const cases = [
    ['a good page passes', good, '/ar/x', 200, 0],
    ['a non-200 is caught', good, '/ar/x', 500, 1],
    ['a missing title is caught', good.replace('<title>عنوان</title>', ''), '/ar/x', 200, 1],
    ['a missing h1 is caught', good.replace(/<h1[\s\S]*?<\/h1>/, ''), '/ar/x', 200, 1],
    ['two h1s are caught', good.replace('</h1>', '</h1><h1>ثانٍ</h1>'), '/ar/x', 200, 1],
    ['a wrong lang is caught', good.replace('lang="ar"', 'lang="en"'), '/ar/x', 200, 1],
    ['a wrong dir is caught', good.replace('dir="rtl"', 'dir="ltr"'), '/ar/x', 200, 1],
    ['an unresolved theme is caught', good.replace(' data-theme="light"', ''), '/ar/x', 200, 1],
    ['an img without alt is caught', good.replace('alt="وصف الصورة"', ''), '/ar/x', 200, 1],
    ['a visible PLACEHOLDER is caught', good.replace('عنوان الصفحة', 'PLACEHOLDER'), '/ar/x', 200, 1],
    [
      'an Arabic heading on an English page is caught',
      good.replace('lang="ar"', 'lang="en"').replace('dir="rtl"', 'dir="ltr"'),
      '/en/x',
      200,
      1,
    ],
  ];

  let failures = 0;
  console.log(`\nAudit self-test\n${'─'.repeat(72)}`);
  for (const [name, html, path, status, expected] of cases) {
    problems.length = 0;
    notes.length = 0;
    checkPage(path, html, status);
    const caught = problems.length;
    const ok = expected === 0 ? caught === 0 : caught >= 1;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` (caught ${caught}, expected ${expected ? '≥1' : '0'})`}`);
  }
  problems.length = 0;
  notes.length = 0;
  console.log(
    failures === 0
      ? `\nThe checks fire. Results above can be trusted.\n`
      : `\n${failures} check(s) do not fire.\n`,
  );
  if (failures) process.exit(1);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  await main();
}
