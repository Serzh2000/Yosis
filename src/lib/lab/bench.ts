import { headerPins } from '../../components/lab/reference/shared/pin-layout';
import { partSize } from '../../components/lab/reference/shared/catalog';
import type { BoardDock } from '../../components/lab/reference/shared/mcu';
import { boardPackages } from '../../components/lab/reference/src/mcu/scene/board-packages';
import { PITCH, PX, boardLayout } from '../../components/lab/reference/src/mcu/scene/layout';
import type { LabLayout } from './runtime';

/** The breadboard every bench starts with, and under the FPGA board. */
export const BENCH_BREADBOARD = 'bb1';
/** Column of the breadboard in which the first pin of the board stands. */
export const DOCK_COLUMN = 3;
const COLUMNS = 63;

/**
 * The bench a pupil starts with, as on a real desk: the FPGA board plugged into a breadboard,
 * its pins in the holes, with room along the same board for parts. Everything that is wired
 * goes to holes: the pins of the board are under it and need not be reached.
 */
export function defaultBench(): LabLayout {
  const anchor = boardLayout('tangnano20k').center,
    pack = boardPackages.tangnano20k,
    size = partSize('breadboard'),
    // The breadboard is placed so that the board, which follows it, stays where the bench is framed.
    centre = {
      x: anchor.x + pack.first - (DOCK_COLUMN - (COLUMNS + 1) / 2) * PITCH,
      z: anchor.z + 1.27,
    };
  return {
    parts: [
      {
        uid: BENCH_BREADBOARD,
        def: 'breadboard',
        x: Math.round(centre.x / PX - size.width / 2),
        y: Math.round(centre.z / PX - size.height / 2),
        turn: 0,
        opts: { columns: COLUMNS },
      },
    ],
    wires: [],
    dock: { on: BENCH_BREADBOARD, column: DOCK_COLUMN },
  };
}

/** What a pad is called on the board: `75`, `3V3`, `GND`. */
export const padName = (terminal: string) => terminal.slice(terminal.indexOf(':') + 1);

/**
 * The hole of the breadboard in the strip of a pin of the docked board that a jumper can reach:
 * in the row at the edge of the board, not under it. Undefined for a pad the board does not have.
 */
export function padHole(dock: BoardDock, name: string): string | undefined {
  const pack = boardPackages.tangnano20k,
    layout = headerPins.tangnano20k;
  for (const [labels, row] of [
    [layout.left, 'j'],
    [layout.right, 'a'],
  ] as const) {
    const index = labels.indexOf(name);
    if (index >= 0) return `${dock.on}:${row}${dock.column + pack.direction * index}`;
  }
  return undefined;
}
