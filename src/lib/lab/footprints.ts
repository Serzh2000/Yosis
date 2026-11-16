import { toProject } from '../../components/lab/reference/bridge';
import {
  benchLayout,
  boardLayout,
  dockShift,
  type PartLayout,
} from '../../components/lab/reference/src/mcu/scene/layout';
import type { LabLayout } from './runtime';
import { t } from '../../../shared/i18n';

/** Where a body stands on the table, in millimetres. */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
/** Air that stays between two bodies, so that neither touches the other. */
const GAP = 1.5;

/** The rectangle a part's body takes; a quarter turn swaps its sides. */
export function rectOf(layout: Pick<PartLayout, 'center' | 'width' | 'depth' | 'turn'>): Rect {
  const sideways = (layout.turn & 1) === 1,
    halfX = (sideways ? layout.depth : layout.width) / 2,
    halfZ = (sideways ? layout.width : layout.depth) / 2;
  return {
    x0: layout.center.x - halfX,
    x1: layout.center.x + halfX,
    z0: layout.center.z - halfZ,
    z1: layout.center.z + halfZ,
  };
}

/**
 * The FPGA board lies with its long edge along x. On a breadboard it stands where its pins go
 * into the holes; the connector sticks out of the end of the board.
 */
export function boardRect(layout: Pick<LabLayout, 'parts' | 'wires' | 'dock'>): Rect {
  const board = boardLayout('tangnano20k', dockShift(toProject({ ...layout, wires: [] })));
  return {
    x0: board.center.x - board.width / 2 - 8,
    x1: board.center.x + board.width / 2 + GAP,
    z0: board.center.z - board.depth / 2 - GAP,
    z1: board.center.z + board.depth / 2 + GAP,
  };
}

export const meets = (a: Rect, b: Rect, gap = GAP) =>
  a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.z0 < b.z1 + gap && a.z1 > b.z0 - gap;

/**
 * Pairs of bodies that stand on one another: parts with the board, parts with parts. Only a part
 * and the breadboard it is plugged into may share a place, and the board with the breadboard it
 * is docked on.
 */
export function overlaps(
  layouts: Map<string, PartLayout>,
  board: Rect,
  dockOn?: string,
): { ids: string[]; text: string }[] {
  const found: { ids: string[]; text: string }[] = [];
  const items = [...layouts.values()];
  for (const item of items) {
    const rect = rectOf(item);
    if (item.part.id !== dockOn && meets(rect, board, 0))
      found.push({ ids: [item.part.id], text: t('«{id}» стоит на плате', { id: item.part.id }) });
    for (const other of items) {
      if (other.part.id <= item.part.id) continue;
      if (item.part.mount?.on === other.part.id || other.part.mount?.on === item.part.id) continue;
      if (meets(rect, rectOf(other)))
        found.push({
          ids: [item.part.id, other.part.id],
          text: t('«{a}» и «{b}» стоят друг на друге', { a: item.part.id, b: other.part.id }),
        });
    }
  }
  return found;
}

/** Whether the body of part `id` stands on the board or on another body. */
export const collides = (
  layouts: Map<string, PartLayout>,
  id: string,
  board: Rect,
  dockOn?: string,
) => overlaps(layouts, board, dockOn).some((item) => item.ids.includes(id));

/** Overlaps in a whole bench, as sentences. */
export const benchOverlaps = (bench: LabLayout) =>
  overlaps(benchLayout(toProject(bench)), boardRect(bench), bench.dock?.on).map(
    (item) => item.text,
  );
