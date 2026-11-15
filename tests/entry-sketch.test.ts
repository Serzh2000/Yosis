import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSketch, splitColumns } from '../src/components/EntrySketch';
import { library } from '../shared/schematic';

test('waveform lines, tables and remarks of the library cards are told apart', () => {
  const parts = parseSketch([
    String.raw`CLK  _/‾\_/‾\_/‾\_`,
    String.raw`Q    ____/‾‾‾‾‾\_`,
    'Q повторяет D после фронта CLK',
    'A B │ Y',
    '0 1 │ 1',
  ]);
  assert.deepEqual(
    parts.map((part) => part.kind),
    ['waves', 'note', 'table'],
  );
  assert.equal(parts[0].kind === 'waves' && parts[0].rows.length, 2);
  assert.deepEqual(parts[2].kind === 'table' && splitColumns(parts[2].rows), [
    ['A', 'B', 'Y'],
    ['0', '1', '1'],
  ]);
});

test('every example of the library is drawn as something, none is left as raw art', () => {
  for (const entry of library)
    for (const part of entry.sketch ? parseSketch(entry.sketch) : [])
      if (part.kind === 'note') assert.doesNotMatch(part.text, /[_‾]{3,}/, entry.id);
});
