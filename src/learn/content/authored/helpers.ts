import type { LessonCase } from '../../../lib/lessons';
import { t } from '../../../lib/i18n';

/**
 * The cases of a circuit without a clock: one case per combination of its inputs, in the order of
 * the truth table (the first name is the most significant bit), the cycle counting from 0.
 * `expected[row]` is the output for that row, as a binary string (`'1'`, `'0110'`).
 */
export function table(names: string[], expected: string[]): LessonCase[] {
  if (expected.length !== 2 ** names.length)
    throw new Error(`table of ${names.length} inputs needs ${2 ** names.length} rows`);
  return expected.map((value, row) => {
    const inputs = Object.fromEntries(
      names.map((name, at) => [name, String((row >> (names.length - 1 - at)) & 1)]),
    );
    return {
      title: t('Строка {n}', { n: row + 1 }),
      cycle: row,
      inputs,
      expected: value,
    };
  });
}
