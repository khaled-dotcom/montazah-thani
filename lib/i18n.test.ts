import assert from 'node:assert/strict';
import test from 'node:test';

import { dir, formatDate, isLocale, link, locales, t, tBlock } from '@/lib/i18n';

test('only ar and en are locales', () => {
  assert.deepEqual([...locales], ['ar', 'en']);
  assert.equal(isLocale('ar'), true);
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(isLocale(''), false);
  assert.equal(isLocale('AR'), false, 'the locale segment is lower-case in every URL');
});

test('Arabic is right-to-left, English is not', () => {
  assert.equal(dir('ar'), 'rtl');
  assert.equal(dir('en'), 'ltr');
});

test('link builds a locale-prefixed path', () => {
  assert.equal(link('/landmarks', 'en'), '/en/landmarks');
  assert.equal(link('/landmarks', 'ar'), '/ar/landmarks');
  assert.equal(link('/', 'ar'), '/ar', 'the root must not become /ar/');
  assert.equal(link('landmarks', 'ar'), '/ar/landmarks', 'a missing leading slash is tolerated');
});

test('link keeps query strings intact', () => {
  assert.equal(link('/services?for=business', 'en'), '/en/services?for=business');
});

test('link never doubles a locale prefix', () => {
  // Guards against link(link(x)) creeping in during a refactor.
  const once = link('/news', 'ar');
  assert.equal(once.startsWith('/ar/'), true);
  assert.equal(once.split('/ar/').length, 2);
});

test('dates are formatted in the reader’s calendar conventions', () => {
  const ar = formatDate('2026-08-25', 'ar');
  const en = formatDate('2026-08-25', 'en');
  assert.match(ar, /[٠-٩]/, 'Arabic should use Arabic-Indic digits');
  assert.match(en, /2026/, 'English should use Latin digits');
  assert.notEqual(ar, en);
});

test('a date is not shifted by the host timezone', () => {
  // Parsed as UTC midnight; a naive local parse turns this into the 24th west
  // of Greenwich and the 26th east of it.
  assert.match(formatDate('2026-08-25', 'en'), /25/);
});

test('t and tBlock pick the requested language', () => {
  assert.equal(t({ ar: 'مرحبا', en: 'Hello' }, 'ar'), 'مرحبا');
  assert.equal(t({ ar: 'مرحبا', en: 'Hello' }, 'en'), 'Hello');
  assert.deepEqual(tBlock({ ar: ['أ', 'ب'], en: ['a', 'b'] }, 'en'), ['a', 'b']);
});
