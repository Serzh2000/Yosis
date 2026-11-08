import { HEADER_PINS } from '../board-parts';

/** Supply pads of the headers. Their place is from Sipeed's pinout card of the board. */
export type Rail = '5V' | '3V3' | 'GND';
const RAILS: Record<'top' | 'bottom', Record<number, Rail>> = {
  top: { 0: '5V', 1: 'GND', 14: 'GND', 15: '3V3' },
  bottom: { 18: '3V3', 19: 'GND' },
};
export interface Pad {
  /** FPGA pin number; a supply pad has a negative number of its own so wires can name it. */
  fpga: number;
  rail?: Rail;
  row: 'top' | 'bottom';
  index: number;
}
/** Pads of the two headers as they sit on the real board, pin 1 at the USB end. */
export const HEADER: Pad[] = (['top', 'bottom'] as const).flatMap((row) =>
  HEADER_PINS[row === 'top' ? 'J5' : 'J6'].map((fpga, index) => ({
    fpga: fpga ?? -(row === 'top' ? 1 : 101) - index,
    ...(fpga === null ? { rail: RAILS[row][index] } : {}),
    row,
    index,
  })),
);
export const headerByFpga = new Map(HEADER.map((pad) => [pad.fpga, pad] as const));

/** The prefix of the terminals of the FPGA board in wires: `board:75`, `board:3V3`. */
export const BOARD_TERMINAL = 'board';
/** The terminal of a pad. Every supply pad of one kind is the same terminal: there is one 3V3. */
export const padTerminal = (fpga: number): string => {
  const rail = headerByFpga.get(fpga)?.rail;
  return `${BOARD_TERMINAL}:${rail ?? fpga}`;
};
/** The pad a board terminal stands for; a supply terminal stands for its first pad. */
export function terminalPad(terminal: string): Pad | undefined {
  if (!terminal.startsWith(`${BOARD_TERMINAL}:`)) return undefined;
  const name = terminal.slice(BOARD_TERMINAL.length + 1);
  const rail = HEADER.find((pad) => pad.rail === name);
  return rail ?? headerByFpga.get(Number(name));
}
export const padLabel = (pad: Pad) => pad.rail ?? String(pad.fpga);
