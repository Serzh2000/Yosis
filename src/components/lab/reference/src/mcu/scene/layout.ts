// Physical layout of the bench in millimetres. Pure data, no three.js, so it can be unit-tested.
// World axes: x to the right, y up, z towards the viewer. Project coordinates (part.x/part.y)
// keep their historic units; PX converts them to millimetres on the table.
import { headerPins } from '../../../shared/pin-layout';
import { partPinNames, partSize, type PartKind, lookOf } from '../../../shared/catalog';
import {
  breadboardRows,
  breadboardSize,
  breadboardStrip,
  parseHole,
} from '../../../shared/breadboard';
import { discreteKinds, leadHoles, leadOffsets, contactHoles } from '../../../shared/mount';
import {
  cabledKinds,
  moduleProfiles,
  benchAdapterKinds,
  benchAdapterSizes,
} from '../../../shared/physical';
import { boardPackages, decorativeHeaders } from './board-packages';
import { scopeTip } from './scope-layout';
import {
  boardTerminal,
  mcuBoards,
  partCatalog,
  partTerminal,
  type CircuitPart,
  type McuBoardId,
  type McuProject,
} from '../../../shared/mcu';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export const PX = 0.16;
export const PITCH = 2.54;
/** Height of a Dupont housing that sits on a socket or covers a male pin. */
export const HOUSING = 8.5;
export const PCB = 1.6;
/** Every board and module stands on short feet so its shadow separates from the table. */
export const STANDOFF = 2;
export const HEADER = 8.5;
export const MALE_BASE = 2.5;
/** A part never moves closer than this to the table edge, in project units. */
const LIMIT = { x: 2200, y: 1400 };

export type HeaderKind = 'female' | 'male';
export interface PinSpot extends Vec3 {
  /** Terminal id such as `board:D13`; empty for decorative holes. */
  terminal: string;
  label: string;
  /** How far a female jumper slides over an exposed male contact. */
  insertion?: number;
}
export interface BoardLayout {
  board: McuBoardId;
  center: Vec3;
  /** Natural PCB size: width along the long edge, depth across it. */
  width: number;
  depth: number;
  /** The board is turned so its long edge runs away from the viewer (see boardToWorld). */
  rotation: number;
  pins: PinSpot[];
}
export interface PartLayout {
  contacts?: PinSpot[];
  adapter?: boolean;
  part: CircuitPart;
  center: Vec3;
  width: number;
  depth: number;
  /** Top surface of the body the pins stand on. */
  top: number;
  turn: number;
  header: HeaderKind;
  /** True when the leads sit in breadboard holes. */
  mounted?: boolean;
  pins: PinSpot[];
}

const unoTop = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
const unoBottom = ['', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'];
/** Arduino Uno R3 header holes, millimetres from the lower-left corner of the PCB. */
function unoHoles() {
  const holes: { x: number; y: number; label: string }[] = [];
  unoTop.forEach((label, i) => holes.push({ x: 18.796 + i * PITCH, y: 50.8, label }));
  for (let i = 0; i < 8; i++) holes.push({ x: 45.72 + i * PITCH, y: 50.8, label: `D${7 - i}` });
  unoBottom.forEach((label, i) => holes.push({ x: 27.94 + i * PITCH, y: 2.54, label }));
  for (let i = 0; i < 6; i++) holes.push({ x: 50.8 + i * PITCH, y: 2.54, label: `A${i}` });
  return holes;
}
/** Board body as the schematic drew it: parts in saved projects are laid out around this box. */
function boardBox(board: McuBoardId) {
  const layout = headerPins[board],
    bottom = 93 + Math.max(layout.left.length, layout.right.length) * 30 + 148;
  return { x: ((83 + 359) / 2) * PX, z: ((93 + bottom) / 2) * PX };
}
/**
 * Boards lie with their long edge running away from the viewer, digital pins facing the parts on
 * the right and power/analog pins on the left, like the schematic always drew them. Local x runs
 * along the long edge, local z across it.
 */
export const BOARD_ROTATION = 0;
export function boardToWorld(center: Vec3, x: number, z: number) {
  return { x: center.x + x, z: center.z + z };
}

export function boardLayout(board: McuBoardId, shift?: Vec3): BoardLayout {
  const known = new Set(mcuBoards[board].pins.map((pin) => pin.id));
  const claimed = new Set<string>();
  const anchor = boardBox(board),
    center = { x: anchor.x + (shift?.x ?? 0), y: shift?.y ?? 0, z: anchor.z + (shift?.z ?? 0) },
    y = (shift?.y ?? 0) + STANDOFF + PCB + (board === 'uno' ? HEADER : MALE_BASE + 6);
  const spot = (label: string, x: number, z: number): PinSpot => {
    // A board exposes one terminal per signal; repeated GND holes stay decorative.
    const terminal = known.has(label) && !claimed.has(label) ? boardTerminal(label) : '';
    if (terminal) claimed.add(label);
    return {
      terminal,
      label,
      y,
      insertion: board === 'uno' ? 0 : 5,
      ...boardToWorld(center, x, z),
    };
  };
  if (board === 'uno') {
    const width = 68.58,
      depth = 53.34;
    return {
      board,
      width,
      depth,
      center,
      rotation: BOARD_ROTATION,
      pins: unoHoles().map((hole) => spot(hole.label, hole.x - width / 2, depth / 2 - hole.y)),
    };
  }
  const { width, depth, spacing, first, direction } = boardPackages[board],
    layout = headerPins[board],
    printed = decorativeHeaders[board];
  return {
    board,
    width,
    depth,
    center,
    rotation: BOARD_ROTATION,
    pins: [
      ...layout.left.map((label, i) =>
        spot(label || printed?.left[i] || '', first + direction * i * PITCH, spacing / 2),
      ),
      ...layout.right.map((label, i) =>
        spot(label || printed?.right[i] || '', first + direction * i * PITCH, -spacing / 2),
      ),
    ],
  };
}

const RAIL_Z: Record<string, number> = { P: -21.59, N: -19.05, Nb: 19.05, Pb: 21.59 };
const BOARD_DEPTH = 54.6;
/** Breadboard body: one or two stacked boards, each with a rail pair along both long edges. */
export function breadboardGeometry(value: number) {
  const { columns, boards } = breadboardSize(value);
  return {
    columns,
    boards,
    width: columns * PITCH + 8,
    boardDepth: BOARD_DEPTH,
    depth: boards * BOARD_DEPTH,
    height: 8.5,
    /** z of each board's centre relative to the part centre. */
    offsetZ: (board: number) => (board - (boards - 1) / 2) * BOARD_DEPTH,
  };
}
/** Hole position relative to the breadboard centre. */
export function breadboardOffset(pin: string, value = 0) {
  const hole = parseHole(pin),
    geometry = breadboardGeometry(value);
  if (!hole) return { x: 0, z: 0 };
  const x = (hole.column - (geometry.columns + 1) / 2) * PITCH,
    row = breadboardRows.indexOf(hole.row),
    z =
      row < 0 ? RAIL_Z[hole.row]! : row < 5 ? -3.81 - (4 - row) * PITCH : 3.81 + (row - 5) * PITCH;
  return { x, z: z + geometry.offsetZ(hole.board) };
}

/** Footprint of a module on the table, derived from its schematic box so layouts keep their spacing. */
export function partFootprint(part: Pick<CircuitPart, 'kind'> & { value?: number }) {
  if (lookOf(part.kind) === 'breadboard') {
    const geometry = breadboardGeometry(part.value ?? 0);
    return { width: geometry.width, depth: geometry.depth };
  }
  const size = partSize(part.kind),
    pins = partCatalog[part.kind].pins.length;
  const adapterSize = benchAdapterSizes[lookOf(part.kind)];
  if (adapterSize) return { width: adapterSize[0], depth: adapterSize[1] };
  const profile = moduleProfiles[part.kind];
  if (profile) return { width: profile.size[0], depth: profile.size[1] };
  if (splitHeaders(lookOf(part.kind)))
    return {
      width: Math.max(Math.ceil(pins / 2) * PITCH + 8, Math.min(size.width * 0.155, 70)),
      depth: Math.max(26, Math.min(size.height * 0.2, 42)),
    };
  return {
    width: Math.max(pins * PITCH + 6, Math.min(size.width * 0.155, 70)),
    depth: Math.max(14, Math.min(size.height * 0.2, 42)),
  };
}
/**
 * Modules with many contacts carry a header on each long edge, the way real breakouts do: half of
 * the pins in the front row and the other half in the back row.
 */
export function splitHeaders(kind: PartKind) {
  if (!twoRowModules.has(kind)) return false;
  const profile = moduleProfiles[kind];
  return !profile || profile.size[1] >= 18;
}
/** Chip-style modules whose real boards break the pins out along two edges. */
const twoRowModules = new Set<PartKind>([
  'pcf8574',
  'pcf8591',
  'shift595',
  'shift165',
  'mcp23017',
  'pca9685',
  'ads1115',
  'levelshift',
  'nrf24',
]);
/** Position of pin `i` of `count` in a two-row header, centred on the module. */
export function splitPin(i: number, count: number, depth: number) {
  const front = Math.ceil(count / 2),
    row = i < front ? 0 : 1,
    n = row ? count - front : front,
    k = row ? i - front : i;
  return { x: (k - (n - 1) / 2) * PITCH, z: row ? -depth / 2 + 2.5 : depth / 2 - 2.5 };
}

export function partCenter(part: Pick<CircuitPart, 'kind' | 'x' | 'y'>): Vec3 {
  const size = partSize(part.kind);
  return { x: (part.x + size.width / 2) * PX, y: 0, z: (part.y + size.height / 2) * PX };
}
/** Inverse of partCenter, clamped to the editable area. */
export function partOrigin(part: Pick<CircuitPart, 'kind'>, center: { x: number; z: number }) {
  const size = partSize(part.kind),
    snap = (value: number) => Math.round(value / PITCH) * PITCH;
  return {
    x: Math.round(Math.max(0, Math.min(LIMIT.x, snap(center.x) / PX - size.width / 2))),
    y: Math.round(Math.max(0, Math.min(LIMIT.y, snap(center.z) / PX - size.height / 2))),
  };
}
/** Rotates a local offset by quarter turns, matching group.rotation.y = -turn·90°. */
export function turnOffset(x: number, z: number, turn = 0) {
  switch (turn & 3) {
    case 1:
      return { x: -z, z: x };
    case 2:
      return { x: -x, z: -z };
    case 3:
      return { x: z, z: -x };
    default:
      return { x, z };
  }
}

export function partLayout(part: CircuitPart, center = partCenter(part), bare = false): PartLayout {
  const { width, depth } = partFootprint(part),
    pins = partPinNames(part),
    turn = part.turn ?? 0;
  if (lookOf(part.kind) === 'breadboard') {
    const top = breadboardGeometry(part.value).height;
    return {
      part,
      center,
      width,
      depth,
      top,
      turn: 0,
      header: 'female',
      pins: pins.map((pin) => {
        const offset = breadboardOffset(pin, part.value);
        return {
          terminal: partTerminal(part.id, pin),
          label: pin,
          x: center.x + offset.x,
          y: top,
          z: center.z + offset.z,
        };
      }),
    };
  }
  if (lookOf(part.kind) === 'scope') {
    // An instrument, not a module: no PCB, and its pins are the probe pucks in front of it.
    return {
      part,
      center,
      width,
      depth,
      top: 0,
      turn,
      header: 'male',
      pins: pins.map((pin, i) => {
        const tip = scopeTip(depth, i),
          offset = turnOffset(tip.x, tip.z, turn);
        return {
          terminal: partTerminal(part.id, pin),
          label: pin,
          x: center.x + offset.x,
          y: 1.8,
          z: center.z + offset.z,
        };
      }),
    };
  }
  const adapter = !bare && benchAdapterKinds.has(lookOf(part.kind));
  const top = STANDOFF + PCB,
    y = top + MALE_BASE,
    ends = partCatalog[part.kind].layout === 'ends';
  const physical = leadOffsets(lookOf(part.kind)).map(([c, r]) => ({ x: c * PITCH, z: r * 7.62 }));
  const meanX = physical.reduce((sum, p) => sum + p.x, 0) / physical.length,
    meanZ = physical.reduce((sum, p) => sum + p.z, 0) / physical.length;
  const tactile = !adapter && ['button', 'tact12', 'latchbtn'].includes(lookOf(part.kind));
  const physicalPins = pins.map((pin, i) => {
    // A part of the laboratory can have more pins than the picture it borrows.
    const p = physical[i] ?? { x: i * PITCH, z: 0 },
      offset = turnOffset(p.x - meanX, p.z - meanZ - (tactile ? 3.81 : 0), turn);
    return {
      terminal: partTerminal(part.id, pin),
      label: pin,
      x: center.x + offset.x,
      y: 1.8,
      insertion: 0.6,
      z: center.z + offset.z,
    };
  });
  return {
    part,
    center,
    width,
    depth,
    top,
    turn,
    header: 'male',
    adapter,
    contacts: tactile
      ? [
          ...physicalPins,
          ...physicalPins.map((p) => {
            const delta = turnOffset(0, 7.62, turn);
            return { ...p, x: p.x + delta.x, z: p.z + delta.z };
          }),
        ]
      : undefined,
    pins: pins.map((pin, i) => {
      if (tactile) return physicalPins[i]!;
      const local =
        adapter && lookOf(part.kind) !== 'resistor'
          ? { x: (i - (pins.length - 1) / 2) * PITCH, z: depth / 2 - 2.5 }
          : lookOf(part.kind) === 'resistor'
            ? { x: (i === 0 ? -1 : 1) * (width / 2 - 2.5), z: 0 }
            : discreteKinds.has(lookOf(part.kind))
              ? { x: (physical[i]?.x ?? i * PITCH) - meanX, z: (physical[i]?.z ?? 0) - meanZ }
              : cabledKinds.has(lookOf(part.kind))
                ? { x: (i - (pins.length - 1) / 2) * PITCH, z: depth / 2 - 2.5 }
                : ends
                  ? { x: (i === 0 ? -1 : 1) * (width / 2 - 2.5), z: 0 }
                  : splitHeaders(lookOf(part.kind))
                    ? splitPin(i, pins.length, depth)
                    : {
                        x: (i - (pins.length - 1) / 2) * PITCH,
                        z: lookOf(part.kind) === 'ws2812ring' ? 12.5 : depth / 2 - 2.5,
                      };
      const offset = turnOffset(local.x, local.z, turn);
      return {
        terminal: partTerminal(part.id, pin),
        label: pin,
        x: center.x + offset.x,
        y: adapter
          ? top + MALE_BASE + 6
          : discreteKinds.has(lookOf(part.kind))
            ? 1.8
            : lookOf(part.kind) === 'ws2812ring'
              ? top + 0.15
              : cabledKinds.has(lookOf(part.kind))
                ? y
                : y + 6,
        insertion:
          adapter ||
          (!discreteKinds.has(lookOf(part.kind)) &&
            !cabledKinds.has(lookOf(part.kind)) &&
            lookOf(part.kind) !== 'ws2812ring')
            ? 5
            : discreteKinds.has(lookOf(part.kind))
              ? 0.6
              : 0,
        z: center.z + offset.z,
      };
    }),
  };
}

/** Height at which a module's PCB floats over the breadboard on its header pins. */
export const MOUNT_LIFT = 8.5 + MALE_BASE - STANDOFF;
/** Layout of a part plugged into breadboard holes; its leads are the hole positions. */
function mountedLayout(part: CircuitPart, board: PartLayout): PartLayout | null {
  const holes = part.mount && leadHoles(part, part.mount.hole, board.part.value);
  if (!holes) return null;
  const spots = new Map(board.pins.map((pin) => [pin.label, pin]));
  const leads = holes.map((hole) => spots.get(hole)!);
  const contacts = (
    contactHoles(part, part.mount!.hole, board.part.value) ??
    holes.map((hole, pin) => ({ hole, pin }))
  ).map(({ hole, pin }) => ({
    ...spots.get(hole)!,
    terminal: partTerminal(part.id, partPinNames(part)[pin]!),
    label: partPinNames(part)[pin]!,
  }));
  const { width, depth } = partFootprint(part),
    turn = part.turn ?? 0,
    mean = {
      x: contacts.reduce((sum, lead) => sum + lead.x, 0) / contacts.length,
      z: contacts.reduce((sum, lead) => sum + lead.z, 0) / contacts.length,
    };
  // Modules hang their body behind the header row; bare components sit centred on their leads.
  const behind = discreteKinds.has(lookOf(part.kind))
    ? { x: 0, z: 0 }
    : turnOffset(0, -(depth / 2 - 2.5), turn);
  return {
    part,
    center: { x: mean.x + behind.x, y: board.top, z: mean.z + behind.z },
    width,
    depth,
    top: STANDOFF + PCB,
    turn,
    header: 'male',
    mounted: true,
    contacts,
    pins: partPinNames(part).map((pin, i) => ({
      terminal: partTerminal(part.id, pin),
      label: pin,
      x: leads[i]!.x,
      y: board.top,
      z: leads[i]!.z,
    })),
  };
}

export interface Moved {
  id: string;
  center: Vec3;
  /** Lift while dragging, in millimetres. */
  lift?: number;
}
/** Layout of every part, resolving parts that ride on a breadboard. */
export function benchLayout(project: McuProject, moved?: Moved) {
  const layouts = new Map<string, PartLayout>();
  for (const part of project.parts)
    if (lookOf(part.kind) === 'breadboard' || !part.mount || moved?.id === part.id)
      layouts.set(
        part.id,
        partLayout(
          part,
          moved?.id === part.id ? moved.center : undefined,
          moved?.id === part.id && Boolean(moved.lift),
        ),
      );
  for (const part of project.parts) {
    if (layouts.has(part.id)) continue;
    const board = layouts.get(part.mount!.on),
      mounted = board && mountedLayout(part, board);
    layouts.set(part.id, mounted || partLayout(part));
  }
  return layouts;
}

/**
 * Where the board stands when it is plugged into a breadboard: its two rows of pins go into the
 * holes b and h of the strips, the first pin in `dock.column`, and it floats over the breadboard
 * on its pins. Undefined when it is not docked, or the breadboard is gone.
 */
export function dockShift(project: Pick<McuProject, 'board' | 'parts' | 'dock'>): Vec3 | undefined {
  const dock = project.dock,
    breadboard = dock && project.parts.find((part) => part.id === dock.on);
  if (!dock || !breadboard || lookOf(breadboard.kind) !== 'breadboard') return undefined;
  const base = boardLayout(project.board),
    pack = boardPackages[project.board],
    geometry = breadboardGeometry(breadboard.value),
    placed = partLayout(breadboard),
    holeX = placed.center.x + (dock.column - (geometry.columns + 1) / 2) * PITCH,
    holeZ = placed.center.z + geometry.offsetZ(0) + 3.81 + 2 * PITCH;
  return {
    x: holeX - (base.center.x + pack.first),
    y: MOUNT_LIFT,
    z: holeZ - pack.spacing / 2 - base.center.z,
  };
}
/** The holes a docked board's pins stand in: `[terminal of the pin, hole of the breadboard]`. */
export function dockLinks(
  project: Pick<McuProject, 'board' | 'parts' | 'dock'>,
): [string, string][] {
  const dock = project.dock;
  if (!dock || !dockShift(project)) return [];
  const known = new Set(mcuBoards[project.board].pins.map((pin) => pin.id)),
    pack = boardPackages[project.board],
    { columns } = breadboardSize(project.parts.find((part) => part.id === dock.on)!.value),
    layout = headerPins[project.board],
    links: [string, string][] = [];
  const row = (labels: readonly string[], hole: string) =>
    labels.forEach((label, i) => {
      const column = dock.column + pack.direction * i;
      if (!known.has(label) || column < 1 || column > columns) return;
      links.push([boardTerminal(label), `${dock.on}:${hole}${column}`]);
    });
  row(layout.left, 'h');
  row(layout.right, 'b');
  return links;
}
/**
 * The pad of the docked board that a hole of the breadboard is one with, if any: a hole shares its
 * strip with the hole a pin of the board stands in. Returns the name of the pad, `75` or `3V3`.
 */
export function padOfHole(
  project: Pick<McuProject, 'board' | 'parts' | 'dock'>,
  terminal: string,
): string | undefined {
  const dock = project.dock;
  if (!dock || !terminal.startsWith(`${dock.on}:`)) return undefined;
  const breadboard = project.parts.find((part) => part.id === dock.on);
  if (!breadboard) return undefined;
  const strip = new Set(
    breadboardStrip(breadboard.value, terminal.slice(dock.on.length + 1)).map(
      (hole) => `${dock.on}:${hole}`,
    ),
  );
  return dockLinks(project)
    .find(([, hole]) => strip.has(hole))?.[0]
    .slice('board:'.length);
}
/** Holes of a docked board that its pins take, as `{breadboard}:{hole}` names. */
export const dockedHoles = (project: Pick<McuProject, 'board' | 'parts' | 'dock'>) => {
  const dock = project.dock;
  if (!dock || !dockShift(project)) return [];
  const pack = boardPackages[project.board],
    layout = headerPins[project.board];
  return [
    ...layout.left.map((_, i) => `${dock.on}:h${dock.column + pack.direction * i}`),
    ...layout.right.map((_, i) => `${dock.on}:b${dock.column + pack.direction * i}`),
  ];
};

export function terminalSpots(project: McuProject, layouts = benchLayout(project)) {
  const spots = new Map<string, PinSpot>();
  for (const pin of boardLayout(project.board, dockShift(project)).pins)
    if (pin.terminal) spots.set(pin.terminal, pin);
  for (const layout of layouts.values())
    for (const pin of layout.pins) spots.set(pin.terminal, pin);
  return spots;
}

/** The housing bottom sits over a male pin, not balanced on its tip. */
export function wireSeat(point: Vec3 & { insertion?: number }): Vec3 {
  return { x: point.x, y: point.y - (point.insertion ?? 0), z: point.z };
}

export interface WireCurve {
  start: Vec3;
  c1: Vec3;
  c2: Vec3;
  end: Vec3;
}
/** A jumper leaves the top of each housing and arches over the bench like a stiff cable. */
export function wireCurve(a: Vec3, b: Vec3, lane = 0): WireCurve {
  const start = { x: a.x, y: a.y + HOUSING, z: a.z },
    end = { x: b.x, y: b.y + HOUSING, z: b.z },
    distance = Math.hypot(b.x - a.x, b.z - a.z),
    arch = Math.min(46, 6 + distance * 0.22 + (lane % 5) * 2.2),
    top = Math.max(start.y, end.y) + arch,
    lean = 0.18;
  return {
    start,
    c1: { x: a.x + (b.x - a.x) * lean, y: top, z: a.z + (b.z - a.z) * lean },
    c2: { x: b.x + (a.x - b.x) * lean, y: top, z: b.z + (a.z - b.z) * lean },
    end,
  };
}
export function bezier(curve: WireCurve, t: number): Vec3 {
  const u = 1 - t,
    k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t],
    points = [curve.start, curve.c1, curve.c2, curve.end];
  return {
    x: points.reduce((sum, p, i) => sum + p.x * k[i]!, 0),
    y: points.reduce((sum, p, i) => sum + p.y * k[i]!, 0),
    z: points.reduce((sum, p, i) => sum + p.z * k[i]!, 0),
  };
}

export const wirePalette = [
  '#f0a53a',
  '#3fae6a',
  '#3d6fc4',
  '#8a63c9',
  '#ee7f62',
  '#f0c93a',
  '#2fa3a0',
  '#7a5034',
];
export function wireColor(id: string, role?: string, chosen?: string) {
  if (chosen) return chosen;
  if (role === 'power') return '#d64a3a';
  if (role === 'ground') return '#2f3547';
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return wirePalette[hash % wirePalette.length]!;
}
