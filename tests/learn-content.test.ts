import test from 'node:test';
import assert from 'node:assert/strict';
import { books } from '../src/learn/content/books';
import { flattenBook } from '../src/learn/content/schema';
import { checkBook } from '../src/learn/content/validate';

test('every book of the shelf passes its integrity rules', () => {
  for (const book of books) assert.deepEqual(checkBook(book), [], book.id);
});

test('the shelf has a book for each way to learn', () => {
  assert.deepEqual(books.map((book) => book.mode).sort(), ['schematic', 'verilog']);
  assert.equal(new Set(books.map((book) => book.id)).size, books.length);
});

test('the Verilog book carries every practice of the course as a checked task', () => {
  const book = books.find((item) => item.mode === 'verilog')!;
  const sims = flattenBook(book).filter(({ page }) => page.task?.kind === 'sim');
  assert.ok(sims.length >= 10, `only ${sims.length} practice tasks`);
});

test('the schematic book has circuits to draw and a bench to wire', () => {
  const book = books.find((item) => item.mode === 'schematic')!;
  const kinds = flattenBook(book).map(({ page }) => page.task?.kind);
  assert.ok(kinds.filter((kind) => kind === 'circuit').length >= 4);
  assert.ok(kinds.includes('build'));
});
