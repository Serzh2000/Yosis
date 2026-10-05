import { HEADER_PINS } from '../board-parts';
import { partPins, resolvePart, type PartDef, type PartOptions, type Resolved } from './catalog';
import { busBodySize } from './catalog-bus';
import type { LabPart, LabWire, Rot } from './runtime';

/** The bench is a fixed drawing; the board sits in its middle and parts go around it. */
export const BENCH = { w: 1280, h: 990 };
export const BOARD = { x: 270, y: 330, w: 740, h: 340 };
/** Parts snap to this grid; the dots of the bench mat are every second step. */
export const GRID = 11;
export const PIN_PITCH = 24;
const PIN_PAD = 10;
/** A wire leaves a pin straight for this long before it turns. */
export const STUB = 14;

export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  w: number;
  h: number;
}

/** Supply pads of the headers. Their place is from Sipeed's pinout card of the board. */
export type Rail = '5V' | '3V3' | 'GND';
const RAILS: Record<'top' | 'bottom', Record<number, Rail>> = {
  top: { 0: '5V', 1: 'GND', 14: 'GND', 15: '3V3' },
  bottom: { 18: '3V3', 19: 'GND' },
};
export interface HeaderPin {
  /** FPGA pin number; a supply pad has a negative number of its own so wires can name it. */
  fpga: number;
  rail?: Rail;
  row: 'top' | 'bottom';
  index: number;
  x: number;
  y: number;
}
/** Pads of the two headers as they sit on the real board, pin 1 at the USB end. */
export const HEADER: HeaderPin[] = (['top', 'bottom'] as const).flatMap((row) =>
  HEADER_PINS[row === 'top' ? 'J5' : 'J6'].map((fpga, index) => ({
    fpga: fpga ?? -(row === 'top' ? 1 : 101) - index,
    ...(fpga === null ? { rail: RAILS[row][index] } : {}),
    row,
    index,
    x: BOARD.x + 37 + index * 34.63,
    y: BOARD.y + (row === 'top' ? 30 : 308),
  })),
);
export const headerByFpga = new Map(HEADER.map((pin) => [pin.fpga, pin] as const));
/** A wire leaves a pad away from the board. */
export const padExit = (row: HeaderPin['row']): Point => ({ x: 0, y: row === 'top' ? -1 : 1 });

/** Height of the strip that carries the part's name. */
export const TITLE_H = 20;
/** Height of a row of pins with their labels (pins at the top or bottom). */
export const PINS_H = 26;
/** Width of a column of pins with their labels (pins at the left or right). */
export const PINS_W = 44;

function bodySize(def: PartDef, resolved: Resolved): [number, number] {
  if (def.kind === 'bus') return busBodySize(resolved);
  const count = resolved.pins.length;
  switch (resolved.shape) {
    case 'led':
      return [56, 66];
    case 'rgb':
      return [76, 66];
    case 'bicolor':
      return [64, 66];
    case 'bar':
      return [count * PIN_PITCH + 16, 56];
    case 'ring':
      return [96, 96];
    case 'traffic':
      return [76, 112];
    case 'laser':
      return [84, 56];
    case 'seg':
      return [def.kind === 'scan' ? (count - 8) * 49 + 24 : 76, 118];
    case 'matrix':
      return [(resolved.params.lines as number) * 17 + 24, 176];
    case 'hex':
      return [100, 92];
    case 'bcd7':
      return [76, 118];
    case 'byte':
      return [150, 92];
    case 'counter':
      return [(resolved.params.digits as number) * 22 + 34, 76];
    case 'button':
      return [64, 64];
    case 'arcade':
      return [86, 84];
    case 'slide':
      return [72, 60];
    case 'toggle':
      return [72, 68];
    case 'rocker':
      return [72, 64];
    case 'dip':
      return [count * PIN_PITCH + 16, 62];
    case 'keypad':
      return [
        (resolved.params.keys as string[])[0].length * 37 + 28,
        (resolved.params.keys as string[]).length * 37 + 38,
      ];
    case 'encoder':
      return [96, 92];
    case 'joystick':
      return [126, 112];
    case 'thumbwheel':
      return [104, 84];
    case 'const':
      return [56, 48];
    case 'sensor':
      return [112, 74];
    case 'buzzer':
      return [76, 72];
    case 'relay':
      return [100, 70];
    case 'motor':
    case 'fan':
      return [100, 96];
    case 'vibro':
      return [88, 70];
    case 'servo':
      return [120, 100];
    case 'stepper':
      return [116, 104];
    case 'sr595':
      return [200, 78];
    case 'sr165':
      return [200, 84];
    case 'probe':
      return [124, 70];
    case 'freq':
      return [136, 62];
    case 'volt':
      return [124, 62];
    case 'analyzer':
      return [320, 40 + count * 27];
    case 'pulse':
      return [150, 70];
    case 'uart':
      return [300, 176];
    default:
      return [96, 70];
  }
}

/** Where the parts of a part sit, relative to its top left corner. */
export interface PartLayout {
  w: number;
  h: number;
  title: Box;
  body: Box;
  /** The strip the pins stand in, along the side the part's pins are on. */
  pins: Box;
  vertical: boolean;
  rot: Rot;
}
/**
 * The body stays upright whatever the rotation; only the pin row moves around it. With the
 * pins at the top or bottom the name goes on the opposite side, with the pins at a side it
 * stays on top.
 */
export function partLayout(
  def: PartDef,
  opts: PartOptions,
  rot: Rot = 0,
  title: string = def.title,
): PartLayout {
  const resolved = resolvePart(def, opts);
  const count = partPins(def, opts).length;
  const [bodyW, bodyH] = bodySize(def, resolved);
  // Names are estimated, not measured: a long one is cut with an ellipsis.
  const titleW = Math.min(190, 18 + title.length * 7);
  if (rot === 0 || rot === 180) {
    const w = Math.max(bodyW, count * PIN_PITCH + PIN_PAD * 2, titleW);
    const h = TITLE_H + bodyH + PINS_H;
    return rot === 0
      ? {
          w,
          h,
          rot,
          vertical: false,
          title: { x: 0, y: 0, w, h: TITLE_H },
          body: { x: 0, y: TITLE_H, w, h: bodyH },
          pins: { x: 0, y: TITLE_H + bodyH, w, h: PINS_H },
        }
      : {
          w,
          h,
          rot,
          vertical: false,
          pins: { x: 0, y: 0, w, h: PINS_H },
          body: { x: 0, y: PINS_H, w, h: bodyH },
          title: { x: 0, y: PINS_H + bodyH, w, h: TITLE_H },
        };
  }
  const height = Math.max(bodyH, count * PIN_PITCH + PIN_PAD * 2);
  const width = Math.max(bodyW, titleW - PINS_W);
  const w = width + PINS_W;
  const h = TITLE_H + height;
  const titleBox = { x: 0, y: 0, w, h: TITLE_H };
  return rot === 90
    ? {
        w,
        h,
        rot,
        vertical: true,
        title: titleBox,
        pins: { x: 0, y: TITLE_H, w: PINS_W, h: height },
        body: { x: PINS_W, y: TITLE_H, w: width, h: height },
      }
    : {
        w,
        h,
        rot,
        vertical: true,
        title: titleBox,
        body: { x: 0, y: TITLE_H, w: width, h: height },
        pins: { x: width, y: TITLE_H, w: PINS_W, h: height },
      };
}
export function partBox(part: LabPart, def: PartDef): Box {
  const { w, h } = partLayout(def, part.opts, part.rot, part.label || def.title);
  return { x: part.x, y: part.y, w, h };
}
export const partSize = (def: PartDef, opts: PartOptions, rot: Rot = 0) => {
  const { w, h } = partLayout(def, opts, rot);
  return { w, h };
};

/** The unit vector a wire leaves a part's pins in. */
export const EXIT: Record<Rot, Point> = {
  0: { x: 0, y: 1 },
  90: { x: -1, y: 0 },
  180: { x: 0, y: -1 },
  270: { x: 1, y: 0 },
};
export const turn = (rot: Rot, clockwise: boolean): Rot =>
  ((rot + (clockwise ? 90 : 270)) % 360) as Rot;

/** Pins turn towards the board: bottom for parts above its middle, top for parts below. */
export function defaultRot(def: PartDef, opts: PartOptions, y: number): Rot {
  return y + partLayout(def, opts, 0).h / 2 > BOARD.y + BOARD.h / 2 ? 180 : 0;
}

/** Where pin `pin` starts, relative to the part's corner: the end of the pin on its edge. */
export function pinOffset(layout: PartLayout, count: number, pin: number): Point {
  const strip = layout.pins;
  if (layout.vertical)
    return {
      x: layout.rot === 90 ? 0 : layout.w,
      y: strip.y + (strip.h - count * PIN_PITCH) / 2 + pin * PIN_PITCH + PIN_PITCH / 2,
    };
  return {
    x: strip.x + (strip.w - count * PIN_PITCH) / 2 + pin * PIN_PITCH + PIN_PITCH / 2,
    y: layout.rot === 0 ? layout.h : 0,
  };
}
export function pinPoint(part: LabPart, def: PartDef, pin: number): Point {
  const layout = partLayout(def, part.opts, part.rot, part.label || def.title);
  const offset = pinOffset(layout, partPins(def, part.opts).length, pin);
  return { x: part.x + offset.x, y: part.y + offset.y };
}

export const snap = (value: number) => Math.round(value / GRID) * GRID;
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * How far a box must move to be on the bench and off the board picture: pushed out through
 * the nearest side that fits.
 */
export function fitOnBench(box: Box): Point {
  const place = (value: Box): Box => ({
    ...value,
    x: Math.max(0, Math.min(BENCH.w - value.w, value.x)),
    y: Math.max(0, Math.min(BENCH.h - value.h, value.y)),
  });
  let placed = place(box);
  if (intersects(placed, BOARD)) {
    const candidates: Box[] = [
      { ...placed, x: Math.floor((BOARD.x - placed.w) / GRID) * GRID },
      { ...placed, x: Math.ceil((BOARD.x + BOARD.w) / GRID) * GRID },
      { ...placed, y: Math.floor((BOARD.y - placed.h) / GRID) * GRID },
      { ...placed, y: Math.ceil((BOARD.y + BOARD.h) / GRID) * GRID },
    ].filter(
      (item) =>
        item.x >= 0 && item.y >= 0 && item.x + item.w <= BENCH.w && item.y + item.h <= BENCH.h,
    );
    const distance = (item: Box) => Math.abs(item.x - box.x) + Math.abs(item.y - box.y);
    placed = candidates.sort((a, b) => distance(a) - distance(b))[0] ?? placed;
  }
  return { x: placed.x - box.x, y: placed.y - box.y };
}

/** First free place for a new part: rows above the board first, then below it. */
export function freeSpot(size: { w: number; h: number }, taken: Box[]): Point {
  const gap = 18;
  const rows = [22, 154, BOARD.y + BOARD.h + 78, BOARD.y + BOARD.h + 190];
  const blocked = [
    ...taken,
    // Keep the lanes next to the headers free for wires.
    { x: BOARD.x - 60, y: BOARD.y - 60, w: BOARD.w + 120, h: BOARD.h + 120 },
  ];
  for (const y of rows)
    for (let x = 33; x + size.w <= BENCH.w - 30; x += GRID)
      if (
        y + size.h <= BENCH.h - 10 &&
        !blocked.some(
          (item) =>
            x < item.x + item.w + gap &&
            x + size.w + gap > item.x &&
            y < item.y + item.h + gap &&
            y + size.h + gap > item.y,
        )
      )
        return { x, y };
  return { x: 33 + (taken.length % 12) * 22, y: 33 + (taken.length % 7) * 22 };
}

export interface WireEnds {
  wire: LabWire;
  from: Point;
  /** The direction the pin points in, away from its part. */
  exit: Point;
  /** The part the wire starts on. */
  rect: Box;
  to: HeaderPin;
}
/**
 * Jumper routes: straight runs with rounded corners. A wire leaves its pin by a short stub,
 * travels in a lane of its own beside the header, and drops onto its pad. Wires to the far
 * header go around the end of the board. Longer wires take the outer lanes, so wires to
 * neighbouring pads nest instead of crossing.
 */
export function routeWires(ends: WireEnds[]): Map<string, string> {
  const nearOf = (end: WireEnds): 'top' | 'bottom' =>
    end.rect.y + end.rect.h / 2 > BOARD.y + BOARD.h / 2 ? 'bottom' : 'top';
  const lanes = { top: new Map<string, number>(), bottom: new Map<string, number>() };
  const sides = { left: 0, right: 0 };
  for (const side of ['top', 'bottom'] as const) {
    // A wire uses the lane beside the header it reaches and, when it goes around, also one
    // on the side of the board it starts from.
    const users = ends.filter((end) => end.to.row === side || nearOf(end) === side);
    users
      .sort((a, b) => Math.abs(a.from.x - a.to.x) - Math.abs(b.from.x - b.to.x))
      .forEach((end, index) => lanes[side].set(end.wire.id, index));
  }
  const laneY = (side: 'top' | 'bottom', id: string) => {
    const offset = 18 + (lanes[side].get(id) ?? 0) * 6;
    return side === 'top' ? BOARD.y - offset : BOARD.y + BOARD.h + offset;
  };
  const result = new Map<string, string>();
  for (const end of ends) {
    if (end.wire.bends?.length) {
      result.set(end.wire.id, smoothPath(bentPoints(end), 9));
      continue;
    }
    const near = nearOf(end);
    const nearY = laneY(near, end.wire.id);
    const { from, exit, rect } = end;
    const points: [number, number][] = [[from.x, from.y]];
    // Get from the pin to the lane on the part's side of the board.
    if (exit.x !== 0) {
      const x = from.x + exit.x * STUB;
      points.push([x, from.y], [x, nearY]);
    } else if ((nearY - from.y) * exit.y > 0) points.push([from.x, nearY]);
    else {
      // The pin points away from the lane: go round the part.
      const y = from.y + exit.y * STUB;
      const x = end.to.x < from.x ? rect.x - STUB : rect.x + rect.w + STUB;
      points.push([from.x, y], [x, y], [x, nearY]);
    }
    if (end.to.row === near) points.push([end.to.x, nearY]);
    else {
      // Go around the end of the board that makes the shorter trip.
      const startX = points[points.length - 1][0];
      const left =
        startX - BOARD.x + (end.to.x - BOARD.x) <
        BOARD.x + BOARD.w - startX + (BOARD.x + BOARD.w - end.to.x);
      const x = left ? BOARD.x - 58 - sides.left++ * 6 : BOARD.x + BOARD.w + 58 + sides.right++ * 6;
      const farY = laneY(end.to.row, end.wire.id);
      points.push([x, nearY], [x, farY], [end.to.x, farY]);
    }
    points.push([end.to.x, end.to.y]);
    result.set(end.wire.id, roundedPath(points, 7));
  }
  return result;
}

/**
 * A wire the pupil has bent by hand: out of the pin by a stub, through the bends in order,
 * and onto the pad by a stub. The automatic lanes no longer apply to it.
 */
export function bentPoints(end: WireEnds): Point[] {
  const exit = padExit(end.to.row);
  return [
    end.from,
    { x: end.from.x + end.exit.x * STUB, y: end.from.y + end.exit.y * STUB },
    ...(end.wire.bends ?? []),
    { x: end.to.x + exit.x * STUB, y: end.to.y + exit.y * STUB },
    { x: end.to.x, y: end.to.y },
  ];
}
/** Where in the list of bends a new one at `point` belongs: on the run closest to it. */
export function bendIndex(end: WireEnds, point: Point): number {
  const points = bentPoints(end);
  let best = 0;
  let distance = Infinity;
  // Runs 1..n-2 lie between the two stubs; run i ends at bend i-1.
  for (let index = 1; index < points.length - 2; index++) {
    const a = points[index];
    const b = points[index + 1];
    const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const along = length
      ? Math.max(
          0,
          Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length),
        )
      : 0;
    const away = Math.hypot(
      point.x - (a.x + along * (b.x - a.x)),
      point.y - (a.y + along * (b.y - a.y)),
    );
    if (away < distance) {
      distance = away;
      best = index - 1;
    }
  }
  return best;
}
/** A polyline at any angles with rounded corners. */
function smoothPath(points: Point[], radius: number): string {
  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const here = points[index];
    const next = points[index + 1];
    const before = Math.hypot(here.x - previous.x, here.y - previous.y);
    const after = Math.hypot(next.x - here.x, next.y - here.y);
    if (!before || !after) continue;
    const r1 = Math.min(radius, before / 2);
    const r2 = Math.min(radius, after / 2);
    const ax = here.x - ((here.x - previous.x) / before) * r1;
    const ay = here.y - ((here.y - previous.y) / before) * r1;
    const bx = here.x + ((next.x - here.x) / after) * r2;
    const by = here.y + ((next.y - here.y) / after) * r2;
    path += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${here.x} ${here.y} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  return `${path} L${last.x} ${last.y}`;
}

/** A simple elbow from a contact to the cursor, drawn while a wire is being dragged. */
export function rubberPath(from: Point, exit: Point, cursor: Point): string {
  const stub: [number, number] = [from.x + exit.x * STUB, from.y + exit.y * STUB];
  const corner: [number, number] = exit.x !== 0 ? [stub[0], cursor.y] : [cursor.x, stub[1]];
  return roundedPath([[from.x, from.y], stub, corner, [cursor.x, cursor.y]], 7);
}

function roundedPath(points: [number, number][], radius: number): string {
  const clean = points.filter(
    (point, index) =>
      index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1],
  );
  let path = `M${clean[0][0]} ${clean[0][1]}`;
  for (let index = 1; index < clean.length - 1; index++) {
    const [px, py] = clean[index - 1];
    const [x, y] = clean[index];
    const [nx, ny] = clean[index + 1];
    const before = Math.min(radius, Math.hypot(x - px, y - py) / 2);
    const after = Math.min(radius, Math.hypot(nx - x, ny - y) / 2);
    const ax = x - Math.sign(x - px) * before;
    const ay = y - Math.sign(y - py) * before;
    const bx = x + Math.sign(nx - x) * after;
    const by = y + Math.sign(ny - y) * after;
    path += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  const last = clean[clean.length - 1];
  return `${path} L${last[0]} ${last[1]}`;
}

export const WIRE_COLORS = [
  '#e5484d',
  '#f5a524',
  '#f2d024',
  '#30a46c',
  '#3e9bff',
  '#8e6ee6',
  '#e879c9',
  '#d6d3d1',
  '#b9772a',
  '#2fb8b0',
];
export const WIRE_COLOR_NAMES = [
  'Красный',
  'Оранжевый',
  'Жёлтый',
  'Зелёный',
  'Синий',
  'Фиолетовый',
  'Розовый',
  'Белый',
  'Коричневый',
  'Бирюзовый',
];
/** Wires made before colours were stored get one from their name. */
export function wireColor(wire: LabWire): string {
  if (wire.color) return wire.color;
  let hash = 0;
  for (const char of wire.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return WIRE_COLORS[hash % WIRE_COLORS.length];
}
/** New wires cycle through the palette by creation order, so neighbours differ. */
export function nextWireColor(wires: readonly LabWire[]): string {
  const last = wires.at(-1);
  const index = last ? WIRE_COLORS.indexOf(wireColor(last)) : -1;
  return WIRE_COLORS[(index + 1) % WIRE_COLORS.length];
}
