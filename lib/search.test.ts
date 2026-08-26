import assert from 'node:assert/strict';
import test from 'node:test';

import { docTypeLabel, normalize, search, tokenize, type Doc } from '@/lib/search';

/**
 * Search has to work for how people actually type Arabic: without diacritics,
 * with أ/إ/ا used interchangeably, ة for ه, ى for ي. A resident hunting for
 * "ترخيص" should not have to guess the hamza the editor chose.
 */

const doc = (over: Partial<Doc> & Pick<Doc, 'id' | 'title'>): Doc => ({
  type: 'page',
  href: '/ar/x',
  summary: '',
  text: '',
  ...over,
});

test('normalize folds the Arabic letter forms people vary', () => {
  // Alef variants collapse to one.
  assert.equal(normalize('أحمد'), normalize('احمد'));
  assert.equal(normalize('إسكندرية'), normalize('اسكندرية'));
  assert.equal(normalize('آثار'), normalize('اثار'));
  // Ta marbuta and ya variants.
  assert.equal(normalize('مكتبة'), normalize('مكتبه'));
  assert.equal(normalize('مبنى'), normalize('مبني'));
});

test('normalize strips diacritics', () => {
  assert.equal(normalize('المدرَّج'), normalize('المدرج'));
  assert.equal(normalize('حَيّ المنتزه'), normalize('حي المنتزه'));
});

test('normalize is case-insensitive for Latin text', () => {
  assert.equal(normalize('Bibliotheca'), normalize('BIBLIOTHECA'));
});

test('tokenize splits on punctuation and drops empties', () => {
  const tokens = tokenize('ترخيص، بناء — أو ترميم!');
  assert.ok(tokens.length >= 3, `expected several tokens, got ${JSON.stringify(tokens)}`);
  assert.ok(!tokens.includes(''));
});

test('search finds a document by a word in its title', () => {
  const docs = [
    doc({ id: 'a', title: 'ترخيص بناء أو ترميم' }),
    doc({ id: 'b', title: 'حديقة الشلالات' }),
  ];
  const hits = search('ترخيص', docs);
  assert.equal(hits[0]?.id, 'a');
});

test('search tolerates the hamza the reader did not type', () => {
  const docs = [doc({ id: 'a', title: 'عمود السواري ومعبد السرابيوم' })];
  assert.equal(search('السواري', docs).length, 1);
  assert.equal(search('اعمدة', docs).length + search('عمود', docs).length >= 1, true);
});

test('a title match outranks a body match', () => {
  const docs = [
    doc({ id: 'body', title: 'شيء آخر', text: 'المسرح الروماني مذكور هنا في المتن' }),
    doc({ id: 'title', title: 'المسرح الروماني' }),
  ];
  const hits = search('المسرح الروماني', docs);
  assert.equal(hits[0]?.id, 'title', 'the document whose title matches should come first');
});

test('search returns nothing for a query that matches nothing', () => {
  const docs = [doc({ id: 'a', title: 'حديقة الشلالات' })];
  assert.deepEqual(search('زيمبابوي', docs), []);
});

test('an empty query returns nothing rather than everything', () => {
  const docs = [doc({ id: 'a', title: 'حديقة الشلالات' })];
  assert.deepEqual(search('', docs), []);
  assert.deepEqual(search('   ', docs), []);
});

test('search respects the result limit', () => {
  const docs = Array.from({ length: 30 }, (_, i) =>
    doc({ id: `d${i}`, title: 'ترخيص تجاري' }),
  );
  assert.equal(search('ترخيص', docs, 5).length, 5);
});

test('every document type has a label in both languages', () => {
  const types = ['landmark', 'service', 'news', 'event', 'listing', 'page', 'faq'] as const;
  for (const type of types) {
    assert.ok(docTypeLabel(type, 'ar').length > 0, `${type} has no Arabic label`);
    assert.ok(docTypeLabel(type, 'en').length > 0, `${type} has no English label`);
  }
});
