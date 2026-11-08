import type { Project } from '../../../shared/types';
import { CLOCK_PIN, LED_PINS } from '../board-parts';
import { readCst } from '../pin-planner';
import { busMoreBenches } from '../examples-lab-bus2';
import { partBenches } from '../examples-lab-parts';
import { partById, partPins } from './catalog';
import type { Options } from './devices';
import { BENCH_BREADBOARD, defaultBench, padHole } from './bench';
import { clearMount, freeSpot, newUid } from './layout-ops';
import type { LabLayout, LabPart, LabWire } from './runtime';
import { benchOverlaps, boardRect, type Rect } from './footprints';
import { circuitPart, toProject } from '../../components/lab/reference/bridge';
import { lookOf } from '../../components/lab/reference/shared/catalog';
import {
  benchLayout,
  dockedHoles,
  type PartLayout,
} from '../../components/lab/reference/src/mcu/scene/layout';
import { breadboardStrip, parseHole } from '../../components/lab/reference/shared/breadboard';
import { mountLinks } from '../../components/lab/reference/shared/mount';

/**
 * Benches that come ready with an example: the parts it needs, placed above the board with
 * their pins wired to the header contacts the example's .cst uses. A project made from the
 * example opens with this bench until the pupil changes it.
 */
export interface PresetPart {
  def: string;
  /** Left edge on the bench; the part stands above the board with its pins towards it. */
  x: number;
  opts?: Options;
  /** Part pin -> FPGA pin number. */
  pins: Record<string, number>;
}

const i2c = { SDA: 75, SCL: 80 };
const PRESETS: Record<string, PresetPart[]> = {
  'oled-hello': [{ def: 'oled-ssd1306', x: 330, pins: i2c }],
  'lcd-i2c': [{ def: 'lcd-i2c', x: 330, pins: i2c }],
  'lcd-direct': [
    { def: 'lcd-parallel', x: 330, pins: { RS: 75, E: 80, D4: 42, D5: 41, D6: 56, D7: 54 } },
  ],
  'lm75-uart': [{ def: 'lm75', x: 330, opts: { temp: 25.5 }, pins: i2c }],
  'rtc-clock': [
    { def: 'rtc-ds1307', x: 220, opts: { warp: 1000 }, pins: i2c },
    { def: 'tm1637', x: 520, pins: { CLK: 42, DIO: 41 } },
  ],
  'eeprom-counter': [{ def: 'eeprom-24c02', x: 330, pins: i2c }],
  'max7219-matrix': [{ def: 'max7219', x: 330, pins: { DIN: 75, CLK: 80, CS: 42 } }],
  'tm1637-stopwatch': [{ def: 'tm1637', x: 330, pins: { CLK: 75, DIO: 80 } }],
  'ws2812-rainbow': [{ def: 'ws2812', x: 330, opts: { pixels: 8 }, pins: { DIN: 75 } }],
  'hcsr04-display': [
    { def: 'hc-sr04', x: 220, opts: { distance: 60 }, pins: { TRIG: 75, ECHO: 80 } },
    { def: 'tm1637', x: 560, pins: { CLK: 42, DIO: 41 } },
  ],
  'dht11-uart': [{ def: 'dht11', x: 330, opts: { temp: 24, humidity: 45 }, pins: { DATA: 75 } }],
  'ir-remote-leds': [{ def: 'ir-receiver', x: 330, pins: { OUT: 75 } }],
  'ps2-uart': [{ def: 'ps2-keyboard', x: 330, pins: { CLK: 75, DATA: 80 } }],
  'adc-pwm': [
    {
      def: 'adc-mcp3008',
      x: 220,
      opts: { value: 512 },
      pins: { CS: 75, CLK: 80, DIN: 42, DOUT: 41 },
    },
    { def: 'led', x: 660, pins: { A: 56 } },
  ],
};

/** Margin in millimetres around a part's body within which a jumper plug would be hidden by it. */
const BODY_MARGIN = 2;

/** Whether something put at (x, z) would stand under the body of a part, or of the board. */
function underBody(
  layouts: Map<string, PartLayout>,
  cover: Rect,
  owner: string,
  x: number,
  z: number,
) {
  if (
    x > cover.x0 - BODY_MARGIN &&
    x < cover.x1 + BODY_MARGIN &&
    z > cover.z0 + BODY_MARGIN &&
    z < cover.z1 - BODY_MARGIN
  )
    return true;
  for (const [uid, item] of layouts) {
    if (uid === owner || lookOf(item.part.kind) === 'breadboard') continue;
    const sideways = (item.turn & 1) === 1,
      half = {
        x: (sideways ? item.depth : item.width) / 2 + BODY_MARGIN,
        z: (sideways ? item.width : item.depth) / 2 + BODY_MARGIN,
      };
    if (Math.abs(x - item.center.x) <= half.x && Math.abs(z - item.center.z) <= half.z) return true;
  }
  return false;
}

/** The names of the pins of a part. */
const partPinsOf = (part: LabPart) =>
  partPins(partById.get(part.def)!, part.opts).map((pin) => pin[0]);

/**
 * A hole on the same strip as `hole` for a jumper: free, and not under the body of any part,
 * or the plug would stand through the part. The end of the strip away from the part first.
 */
function jumperHole(
  board: PartLayout,
  layouts: Map<string, PartLayout>,
  cover: Rect,
  value: number,
  hole: string,
  taken: Set<string>,
) {
  const spots = new Map(board.pins.map((pin) => [pin.label, pin]));
  const own = parseHole(hole)!;
  const far = 'abcde'.includes(own.row) ? 'a' : 'j';
  const free = breadboardStrip(value, hole).filter((item) => {
    const spot = spots.get(item);
    return !taken.has(item) && spot && !underBody(layouts, cover, board.part.id, spot.x, spot.z);
  });
  return free.find((item) => item.replace(/\d+$/, '').endsWith(far)) ?? free[0];
}

/** A hole of a power rail, near `column`, that no body covers and no wire uses yet. */
function railHole(
  board: PartLayout,
  layouts: Map<string, PartLayout>,
  cover: Rect,
  rail: 'P' | 'N',
  column: number,
  taken: Set<string>,
) {
  const spots = new Map(board.pins.map((pin) => [pin.label, pin]));
  return board.pins
    .map((pin) => pin.label)
    .filter((label) => label.startsWith(rail) && /^[PN]\d+$/.test(label))
    .filter((label) => {
      const spot = spots.get(label)!;
      return !taken.has(label) && !underBody(layouts, cover, board.part.id, spot.x, spot.z);
    })
    .sort(
      (a, b) => Math.abs(parseHole(a)!.column - column) - Math.abs(parseHole(b)!.column - column),
    )[0];
}

/**
 * Builds a bench from parts and the board contacts their pins go to. The FPGA board stands on a
 * breadboard; the parts are plugged into the same breadboard further along, and every wire goes
 * from hole to hole: from the strip of a pin to the strip of the board pad it belongs to, and
 * from the strips of VCC and GND to the power rails, which the board's 3V3 and GND feed.
 * A part that cannot be plugged in stands on the table and is wired from its own pins.
 * Every plug of a jumper stands in a hole that no body covers.
 */
export function buildBench(list: PresetPart[]): LabLayout {
  const base = defaultBench(),
    dock = base.dock!,
    value = 1;
  const parts: LabPart[] = [...base.parts];
  const wires: LabWire[] = [];
  const wire = (from: string, to: string) =>
    wires.push({ id: `w${wires.length + 1}-${newUid()}`, from, to });
  const bench = () => ({ parts, wires, dock });
  // First all the parts are put down, then the jumpers are laid knowing where every body is.
  const placed: { uid: string; item: PresetPart; mounted: boolean }[] = [];
  for (const [index, item] of list.entries()) {
    if (!partById.get(item.def)) continue;
    const uid = `p${index + 1}`;
    const part: LabPart = {
      uid,
      def: item.def,
      ...freeSpot(bench(), item.def),
      turn: 0,
      opts: { ...item.opts },
    };
    const mount = clearMount(bench(), part);
    parts.push(mount ? { ...part, mount } : part);
    placed.push({ uid, item, mounted: Boolean(mount) });
  }
  const project = toProject(bench()),
    layouts = benchLayout(project),
    board = layouts.get(BENCH_BREADBOARD)!,
    cover = boardRect(bench());
  const taken = new Set<string>(
    dockedHoles(project).map((hole) => hole.slice(hole.indexOf(':') + 1)),
  );
  const links = mountLinks({ parts: parts.map(circuitPart) });
  for (const [, hole] of links) taken.add(hole.slice(hole.indexOf(':') + 1));
  // The first plug of every signal goes to its pad; the others join the first one's strip.
  const nets = new Map<number, string>();
  let supplied = false;
  const rail = (kind: 'P' | 'N', column: number) => {
    const point = railHole(board, layouts, cover, kind, column, taken);
    if (point) taken.add(point);
    return point;
  };
  for (const { uid, item, mounted } of placed) {
    const own = links.filter(([name]) => name.startsWith(`${uid}:`));
    const pins = mounted
      ? own.map(([lead, at]) => ({
          pin: lead.slice(uid.length + 1),
          hole: at.slice(at.indexOf(':') + 1),
        }))
      : partPinsOf(parts.find((part) => part.uid === uid)!).map((pin) => ({ pin, hole: '' }));
    for (const { pin, hole } of pins) {
      const power = pin === 'VCC' || pin === 'GND';
      const fpga = item.pins[pin];
      if (!power && fpga === undefined) continue;
      const column = hole ? parseHole(hole)!.column : 3;
      // Where this wire starts: the strip of the pin in the breadboard, or the pin itself.
      let from = `${uid}:${pin}`;
      if (hole) {
        const target = jumperHole(board, layouts, cover, value, hole, taken);
        if (!target) return buildLoose(list);
        taken.add(target);
        from = `${BENCH_BREADBOARD}:${target}`;
      }
      if (power) {
        const point = rail(pin === 'VCC' ? 'P' : 'N', column);
        if (!point) return buildLoose(list);
        wire(from, `${BENCH_BREADBOARD}:${point}`);
        supplied = true;
        continue;
      }
      const first = nets.get(fpga!);
      if (first === undefined) {
        const pad = padHole(dock, String(fpga));
        if (!pad) continue;
        wire(from, pad);
        nets.set(fpga!, from);
      } else wire(from, first);
    }
  }
  if (supplied) {
    const plus = rail('P', 1),
      minus = rail('N', 1),
      power = padHole(dock, '3V3'),
      ground = padHole(dock, 'GND');
    if (!plus || !minus || !power || !ground) return buildLoose(list);
    wire(`${BENCH_BREADBOARD}:${plus}`, power);
    wire(`${BENCH_BREADBOARD}:${minus}`, ground);
  }
  return bench();
}

/** The same bench with every part on the table, if the breadboard cannot take the wiring. */
function buildLoose(list: PresetPart[]): LabLayout {
  const base = defaultBench(),
    dock = base.dock!;
  const parts: LabPart[] = [...base.parts],
    wires: LabWire[] = [];
  const nets = new Map<number, string>();
  for (const [index, item] of list.entries()) {
    if (!partById.get(item.def)) continue;
    const uid = `p${index + 1}`;
    parts.push({
      uid,
      def: item.def,
      ...freeSpot({ parts, wires, dock }, item.def),
      turn: 0,
      opts: { ...item.opts },
    });
    for (const [pin, fpga] of Object.entries(item.pins)) {
      const first = nets.get(fpga),
        pad = padHole(dock, String(fpga));
      if (first) wires.push({ id: `${uid}-${pin}`, from: `${uid}:${pin}`, to: first });
      else if (pad) {
        wires.push({ id: `${uid}-${pin}`, from: `${uid}:${pin}`, to: pad });
        nets.set(fpga, `${uid}:${pin}`);
      }
    }
    for (const [pin, name] of [
      ['VCC', '3V3'],
      ['GND', 'GND'],
    ] as const) {
      const first = nets.get(name === '3V3' ? -3 : -4),
        pad = padHole(dock, name);
      if (first) wires.push({ id: `${uid}-${pin}`, from: `${uid}:${pin}`, to: first });
      else if (pad) {
        wires.push({ id: `${uid}-${pin}`, from: `${uid}:${pin}`, to: pad });
        nets.set(name === '3V3' ? -3 : -4, `${uid}:${pin}`);
      }
    }
  }
  return { parts, wires, dock };
}

/** The ready bench of an example, or undefined when the example has none. */
export function examplePreset(exampleId: string): LabLayout | undefined {
  const list = PRESETS[exampleId] ?? busMoreBenches[exampleId] ?? partBenches[exampleId];
  if (!list) return undefined;
  return buildBench(list);
}

/**
 * A bench for an example that needs nothing but the board: a logic analyser on the LED
 * contacts it drives, standing under the board next to them. The pupil sees the same
 * signals as the LEDs show, drawn over time, without placing anything first.
 */
export function boardPreset(project: Project): LabLayout | undefined {
  const def = partById.get('analyzer');
  if (!def) return undefined;
  const pins = new Map<number, string>();
  for (const directive of readCst(project)) {
    if (directive.kind !== 'IO_LOC') continue;
    const pin = Number(directive.value.split(',')[0].trim());
    if ((LED_PINS as readonly number[]).includes(pin)) pins.set(pin, directive.signal);
  }
  const used = LED_PINS.filter((pin) => pins.has(pin));
  if (!used.length) return undefined;
  // A clocked example blinks slowly: a second of board time on the screen shows it.
  const clocked = readCst(project).some(
    (directive) => directive.kind === 'IO_LOC' && Number(directive.value) === CLOCK_PIN,
  );
  const opts: Options = {
    channels: Math.max(2, used.length),
    ...(clocked ? { window: 27_000_000 } : {}),
  };
  const base = defaultBench(),
    dock = base.dock!;
  const parts: LabPart[] = [
    ...base.parts,
    { uid: 'p1', def: def.id, ...freeSpot(base, def.id), turn: 0, opts },
  ];
  const wires: LabWire[] = used.flatMap((fpga, index) => {
    const pad = padHole(dock, String(fpga));
    return pad ? [{ id: `p1-${index + 1}`, from: `p1:${index + 1}`, to: pad }] : [];
  });
  // The analyser takes its power from the 3V3 and GND holes of the board.
  for (const [pin, name] of [
    ['VCC', '3V3'],
    ['GND', 'GND'],
  ] as const) {
    const pad = padHole(dock, name);
    if (pad) wires.push({ id: `p1-${pin}`, from: `p1:${pin}`, to: pad });
  }
  return { parts, wires, dock };
}

/**
 * What is wrong with a bench built for a pupil: a jumper plug under the body of a part, which
 * would stand through it, or a wire to a hole that is not there. Empty when the bench is fine.
 */
export function benchProblems(bench: LabLayout): string[] {
  const layouts = benchLayout(toProject(bench));
  const spots = new Map<string, { x: number; z: number }>();
  for (const item of layouts.values()) for (const pin of item.pins) spots.set(pin.terminal, pin);
  const cover = boardRect(bench);
  const problems: string[] = benchOverlaps(bench);
  for (const wire of bench.wires)
    for (const end of [wire.from, wire.to]) {
      const owner = end.slice(0, end.indexOf(':'));
      if (
        owner === 'board' ||
        !layouts.get(owner) ||
        lookOf(layouts.get(owner)!.part.kind) !== 'breadboard'
      )
        continue;
      const spot = spots.get(end);
      if (!spot) problems.push(`${end}: такого отверстия нет`);
      else if (underBody(layouts, cover, owner, spot.x, spot.z))
        problems.push(`${end}: штекер провода стоит под корпусом детали`);
    }
  return problems;
}
