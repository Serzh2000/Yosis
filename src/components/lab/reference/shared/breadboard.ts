// Solderless breadboard geometry shared by the solver and the bench. Hole names follow the
// printed labels: rows a–j, power rails P/N along the far edge and Pb/Nb along the near edge.
// A second stacked board prefixes its holes with "2" (2a1, 2P1, ...).

export const breadboardSizes = [
  { value: 0, label: 'Половинка · 30 столбцов', columns: 30, boards: 1 },
  { value: 1, label: 'Полноразмерная · 63 столбца', columns: 63, boards: 1 },
  { value: 2, label: 'Двойная · 2 × 63 столбца', columns: 63, boards: 2 },
] as const;
export const breadboardRows = 'abcdefghij';
export const breadboardRails = ['P', 'N', 'Pb', 'Nb'] as const;
export type BreadboardRow =
  (typeof breadboardRails)[number] | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';
export interface Hole {
  board: 0 | 1;
  row: BreadboardRow;
  column: number;
}

export function breadboardSize(value: number) {
  return breadboardSizes.find((size) => size.value === value) ?? breadboardSizes[0];
}
export function holeName(hole: Hole) {
  return `${hole.board ? '2' : ''}${hole.row}${hole.column}`;
}
export function parseHole(pin: string): Hole | null {
  const match = /^(2)?(Pb|Nb|P|N|[a-j])(\d{1,2})$/.exec(pin);
  if (!match) return null;
  return { board: match[1] ? 1 : 0, row: match[2] as BreadboardRow, column: Number(match[3]) };
}
const memo = new Map<number, { pins: string[]; joins: [string, string][] }>();
function build(value: number) {
  const cached = memo.get(value);
  if (cached) return cached;
  const { columns, boards } = breadboardSize(value),
    pins: string[] = [],
    joins: [string, string][] = [];
  for (let board = 0 as 0 | 1; board < boards; board = (board + 1) as 0 | 1) {
    const name = (row: BreadboardRow, column: number) => holeName({ board, row, column });
    for (const rail of breadboardRails) {
      for (let column = 1; column <= columns; column++) pins.push(name(rail, column));
      for (let column = 1; column < columns; column++)
        joins.push([name(rail, column), name(rail, column + 1)]);
    }
    for (const row of breadboardRows)
      for (let column = 1; column <= columns; column++)
        pins.push(name(row as BreadboardRow, column));
    for (const half of ['abcde', 'fghij'])
      for (let column = 1; column <= columns; column++)
        for (let i = 0; i < 4; i++)
          joins.push([
            name(half[i] as BreadboardRow, column),
            name(half[i + 1] as BreadboardRow, column),
          ]);
  }
  const result = { pins, joins };
  memo.set(value, result);
  return result;
}
export const breadboardPins = (value: number) => build(value).pins;
export const breadboardJoins = (value: number) => build(value).joins;
/**
 * Holes joined with `pin` inside the breadboard: the whole rail for P/N/Pb/Nb, otherwise the
 * five holes of its column half (a–e or f–j). Empty for anything that is not a hole.
 */
export function breadboardStrip(value: number, pin: string): string[] {
  const hole = parseHole(pin);
  if (!hole) return [];
  const { columns, boards } = breadboardSize(value);
  if (hole.board >= boards || hole.column < 1 || hole.column > columns) return [];
  if ((breadboardRails as readonly string[]).includes(hole.row))
    return Array.from({ length: columns }, (_, i) => holeName({ ...hole, column: i + 1 }));
  const half = 'abcde'.includes(hole.row) ? 'abcde' : 'fghij';
  return [...half].map((row) => holeName({ ...hole, row: row as BreadboardRow }));
}
