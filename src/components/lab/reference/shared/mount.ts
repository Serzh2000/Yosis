// Parts plugged straight into breadboard holes. A mounted part's leads join the hole nets, so
// it needs no jumpers; its position on the bench follows the breadboard.
import {
  breadboardRows,
  breadboardSize,
  holeName,
  parseHole,
  type BreadboardRow,
} from './breadboard';
import { lookOf, partCatalog, partPinNames, type PartKind } from './catalog';
import type { CircuitPart, McuProject } from './mcu';
import { canMount } from './physical';

export interface Mount {
  /** Id of the breadboard part. */
  on: string;
  /** Hole of the first lead, e.g. "e12". */
  hole: string;
}
export type Turn = 0 | 1 | 2 | 3;

/**
 * Lead positions of discrete components relative to the first lead: a column offset, or
 * [column, row] for packages that straddle the centre gap (DIP). Modules use one column per
 * header pin.
 */
type Lead = number | [number, number];
/** DIP package: pin 1 bottom-left (row f side), counting anticlockwise seen from above. */
const dip = (pins: number): Lead[] =>
  Array.from({ length: pins }, (_, i) =>
    i < pins / 2 ? [i, 0] : ([pins - 1 - i, -1] as [number, number]),
  );
const leadColumns: Partial<Record<PartKind, Lead[]>> = {
  led: [0, 1],
  resistor: [0, 4],
  button: [0, 2],
  potentiometer: [0, 2, 4],
  buzzer: [0, 3],
  rgb: [0, 1, 2, 3],
  tact12: [0, 2],
  latchbtn: [0, 2],
  slideswitch: [0, 1, 2],
  trimpot: [0, 1, 2],
  piezo: [0, 3],
  switch: [0, 2],
  // Common-cathode digit, pins A..G, DP, COM; top row G F COM A B, bottom row E D COM C DP.
  seg7: [0, 1, [0, 1], [-2, 1], [-3, 1], -2, -3, [1, 1], -1],
  // Switch n joins nA (top row) with nB straight across the gap.
  dip: [0, [0, 1], 1, [1, 1], 2, [2, 1], 3, [3, 1]],
  chip595: dip(16),
  chip165: dip(16),
};
/** Modules that can stand on their edge, sensor side forward, on a right-angle header. */
export const uprightKinds = new Set<PartKind>(['hcsr04', 'pir', 'irobstacle', 'flame', 'ldr']);
/** Instruments that stand on the table by themselves and are never plugged in. */
export const standaloneKinds = new Set<PartKind>(['scope']);
/** Components drawn bare (leads in the holes) rather than as a module on header pins. */
export const discreteKinds = new Set<PartKind>(Object.keys(leadColumns) as PartKind[]);
export function leadOffsets(kind: PartKind): [number, number][] {
  return (leadColumns[kind] ?? partCatalog[kind].pins.map((_, i) => i)).map((lead) =>
    typeof lead === 'number' ? [lead, 0] : lead,
  );
}

/** Holes taken by each lead, in pin order, or null if the part does not fit there. */
export function leadHoles(
  part: Pick<CircuitPart, 'kind' | 'turn'>,
  hole: string,
  boardValue: number,
): string[] | null {
  const anchor = parseHole(hole);
  if (!anchor || part.kind === 'breadboard' || standaloneKinds.has(part.kind)) return null;
  const { columns, boards } = breadboardSize(boardValue);
  if (anchor.board >= boards) return null;
  const turn = (part.turn ?? 0) & 3,
    rowIndex = breadboardRows.indexOf(anchor.row);
  const holes: string[] = [];
  for (const [c, r] of leadOffsets(part.kind)) {
    // Quarter turns rotate the (column, row) offset; rows grow towards j.
    const [dc, dr] = turn === 0 ? [c, r] : turn === 1 ? [-r, c] : turn === 2 ? [-c, -r] : [r, -c];
    const column = anchor.column + dc;
    let row: BreadboardRow = anchor.row;
    if (dr) {
      // Across the rows a–j only; rails run the other way.
      const next = rowIndex + dr;
      if (rowIndex < 0 || next < 0 || next >= breadboardRows.length) return null;
      row = breadboardRows[next] as BreadboardRow;
    }
    if (column < 1 || column > columns) return null;
    holes.push(holeName({ board: anchor.board, row, column }));
  }
  // A package that spans two rows must straddle the centre gap, or its pins would short.
  if (leadOffsets(part.kind).some(([, r]) => r !== 0)) {
    const strips = holes.map((hole) => strip(hole));
    if (new Set(strips).size !== strips.length) return null;
  }
  return holes;
}

/** Physical tactile switch legs: two pairs internally tied to the two logical contacts. */
export function contactHoles(
  part: Pick<CircuitPart, 'kind' | 'turn'>,
  hole: string,
  value: number,
) {
  const holes = leadHoles(part, hole, value);
  if (!holes) return null;
  const contacts = holes.map((hole, pin) => ({ hole, pin }));
  if (!['button', 'tact12', 'latchbtn'].includes(part.kind)) return contacts;
  const sideways = ((part.turn ?? 0) & 1) === 1;
  for (const direction of [3, -3]) {
    const extra = holes.map((h, pin) => {
      const parsed = parseHole(h)!;
      if (sideways) parsed.column += direction;
      else {
        const row = breadboardRows.indexOf(parsed.row),
          next = row + direction;
        if (row < 0 || next < 0 || next >= 10 || Math.floor(row / 5) !== Math.floor(next / 5))
          return null;
        parsed.row = breadboardRows[next] as BreadboardRow;
      }
      if (parsed.column < 1 || parsed.column > breadboardSize(value).columns) return null;
      return { hole: holeName(parsed), pin };
    });
    if (extra.every((p) => p !== null)) return [...contacts, ...extra];
  }
  return null;
}

/** Lead-to-hole connections of all mounted parts. */
export function mountLinks(project: Pick<McuProject, 'parts'>): [string, string][] {
  const boards = new Map(
    project.parts.filter((p) => p.kind === 'breadboard').map((p) => [p.id, p]),
  );
  const links: [string, string][] = [];
  for (const part of project.parts) {
    if (!part.mount) continue;
    const board = boards.get(part.mount.on);
    const holes = board && leadHoles(part, part.mount.hole, board.value);
    if (!holes) continue;
    const contacts =
      contactHoles(part, part.mount.hole, board!.value) ??
      holes.map((hole, pin) => ({ hole, pin }));
    const names = partPinNames(part);
    contacts.forEach(({ hole, pin }) =>
      links.push([`${part.id}:${names[pin]}`, `${board!.id}:${hole}`]),
    );
  }
  return links;
}

/** Holes already used by mounted leads, keyed by breadboard id. */
export function occupiedHoles(project: Pick<McuProject, 'parts'>, except = '') {
  const taken = new Map<string, Set<string>>();
  for (const [lead, hole] of mountLinks(project)) {
    if (except && lead.startsWith(`${except}:`)) continue;
    const [board, name] = [hole.slice(0, hole.indexOf(':')), hole.slice(hole.indexOf(':') + 1)];
    taken.set(board, (taken.get(board) ?? new Set()).add(name));
  }
  return taken;
}

/** Column strip a hole belongs to: one per column and half, or a whole rail. */
function strip(hole: string) {
  const parsed = parseHole(hole);
  if (!parsed) return '';
  if (!breadboardRows.includes(parsed.row)) return `${parsed.board}|${parsed.row}`;
  return `${parsed.board}|${'abcde'.includes(parsed.row) ? 0 : 1}|${parsed.column}`;
}
/** First free spot on a breadboard for a new part, keeping a free column between parts. */
export function freeMount(
  project: Pick<McuProject, 'parts'> & Partial<Pick<McuProject, 'wires'>>,
  part: Pick<CircuitPart, 'kind' | 'turn'>,
  /** Lets the caller refuse a place for reasons the holes do not show, such as a body in the way. */
  accept: (mount: Mount) => boolean = () => true,
): Mount | null {
  if (!canMount(part.kind)) return null;
  for (const board of project.parts.filter((p) => p.kind === 'breadboard')) {
    const wireHoles = (project.wires ?? [])
      .flatMap((wire) => [wire.from, wire.to])
      .filter((terminal) => terminal.startsWith(`${board.id}:`))
      .map((terminal) => terminal.slice(board.id.length + 1));
    const used = new Set(
        [...(occupiedHoles(project).get(board.id) ?? []), ...wireHoles].flatMap((hole) => {
          const parsed = parseHole(hole)!;
          return [-1, 0, 1].map((d) => strip(holeName({ ...parsed, column: parsed.column + d })));
        }),
      ),
      { columns, boards } = breadboardSize(board.value);
    for (let b = 0; b < boards; b++)
      // A module hangs its body behind its header, towards row a. Its header goes to the lower half,
      // so that the jumpers of its pins can use the holes in front of it, not those under its body.
      for (const row of (discreteKinds.has(lookOf(part.kind))
        ? ['e', 'f', 'j']
        : ['f', 'j', 'e']) as BreadboardRow[])
        for (let column = 2; column <= columns; column++) {
          const hole = holeName({ board: b as 0 | 1, row, column }),
            holes = contactHoles(part, hole, board.value);
          if (holes && holes.every((h) => !used.has(strip(h.hole)))) {
            const found = { on: board.id, hole };
            if (accept(found)) return found;
          }
        }
  }
  return null;
}

/** A valid physical placement can still join both ends of a component to one strip. */
export function mountWarning(part: CircuitPart, mount: Mount, boardValue: number) {
  if (!['led', 'resistor', 'rgb'].includes(part.kind)) return '';
  const holes = leadHoles(part, mount.hole, boardValue) ?? [];
  const names = partPinNames(part);
  for (let i = 0; i < holes.length; i++)
    for (let j = i + 1; j < holes.length; j++)
      if (strip(holes[i]!) === strip(holes[j]!))
        return `${names[i]} и ${names[j]} попадают в один электрический узел`;
  return '';
}

/** Drops jumpers and mounts that point at holes a smaller breadboard no longer has. */
export function pruneProject<T extends McuProject>(project: T, terminals: Set<string>): T {
  const boards = new Map(
    project.parts.filter((p) => p.kind === 'breadboard').map((p) => [p.id, p]),
  );
  const parts = project.parts.map((part) => {
    if (!part.mount) return part;
    const board = boards.get(part.mount.on);
    if (board && leadHoles(part, part.mount.hole, board.value)) return part;
    const { mount: _, ...rest } = part;
    void _;
    return rest;
  });
  return {
    ...project,
    parts,
    wires: project.wires.filter((wire) => terminals.has(wire.from) && terminals.has(wire.to)),
  };
}
