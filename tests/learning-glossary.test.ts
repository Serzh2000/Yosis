import test from 'node:test';
import assert from 'node:assert/strict';
import { glossary, searchGlossary, splitGlossary } from '../src/lib/learning-glossary';

const marked = (text: string) =>
  splitGlossary(text).flatMap((part) => (typeof part === 'string' ? [] : [part.term.id]));

test('Russian word forms are recognised, whole words only', () => {
  assert.deepEqual(marked('ПЛИС — это микросхема.'), ['fpga']);
  assert.deepEqual(marked('Схема хранит бит в регистре на каждом фронте такта.'), [
    'bit',
    'register',
    'edge',
    'clock',
  ]);
  assert.deepEqual(marked('Нажми кнопку, и битстрим загрузится.'), ['bitstream']);
  assert.deepEqual(marked('Рабочий стол и автобус'), []);
  assert.deepEqual(marked("Запиши 4'b1010 в шину."), ['literal', 'bus']);
  assert.deepEqual(marked('Открой файл pins.cst'), ['cst']);
});

test('only the first mention of a term is marked and the text is preserved', () => {
  const parts = splitGlossary('Бит — это 0 или 1. Один бит, два бита.');
  assert.equal(parts.filter((part) => typeof part !== 'string').length, 1);
  const rebuilt = parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');
  assert.equal(rebuilt, 'Бит — это 0 или 1. Один бит, два бита.');
  assert.deepEqual(
    splitGlossary('Бит и такт', { skip: new Set(['bit']) }).flatMap((part) =>
      typeof part === 'string' ? [] : [part.term.id],
    ),
    ['clock'],
  );
});

test('every glossary entry has a plain definition and is found by search', () => {
  const ids = new Set<string>();
  for (const term of glossary) {
    assert.ok(!ids.has(term.id), `duplicate id ${term.id}`);
    ids.add(term.id);
    assert.ok(term.meaning.length > 20, term.id);
  }
  assert.ok(searchGlossary('мультиплексор').some((term) => term.id === 'mux'));
  assert.equal(searchGlossary('').length, glossary.length);
  assert.equal(searchGlossary('zzzz-нет-такого').length, 0);
});
