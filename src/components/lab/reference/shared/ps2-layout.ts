/** A key of the PS/2 keyboard as the scene draws it: `id` is the one the device knows it by. */
export type Ps2Cell = { id: string; label: string; width: number } | { gap: number };

const key = (id: string, label = id, width = 1): Ps2Cell => ({ id, label, width });
const letters = (text: string): Ps2Cell[] => text.split('').map((c) => key(c));

/** Rows of the keyboard from the back; the keys are numbered 1, 2, … in this order. */
export const PS2_KEY_LAYOUT: Ps2Cell[][] = [
  [key('Esc', 'Esc'), ...letters('1234567890'), key('Backspace', '⌫', 2)],
  [{ gap: 0.5 }, ...letters('QWERTYUIOP')],
  [{ gap: 0.75 }, ...letters('ASDFGHJKL'), key('Enter', '↵', 2)],
  [{ gap: 1.25 }, ...letters('ZXCVBNM'), { gap: 0.5 }, key('Up', '↑')],
  [
    { gap: 2.5 },
    key('Space', '', 5),
    { gap: 0.5 },
    key('Left', '←'),
    key('Down', '↓'),
    key('Right', '→'),
  ],
];

/** The ids of the keys in the order of their numbers: the key number n is `PS2_KEY_IDS[n - 1]`. */
export const PS2_KEY_IDS: string[] = PS2_KEY_LAYOUT.flat().flatMap((cell) =>
  'id' in cell ? [cell.id] : [],
);
