import type { LabDesign } from '../../../shared/lab';
import type { Project } from '../../../shared/types';
import { BUTTON_PINS, CLOCK_PIN, LED_PINS, UART_RX_PIN, UART_TX_PIN } from '../board-parts';
import { readCst } from '../pin-planner';
import { POWER_PINS, partById, type PartDef } from './catalog';
import { headerByFpga } from './pads';
import { defaultBench } from './bench';
import { migrateLayout } from './migrate';
import { resolveConnections, type Connections } from '../../components/lab/reference/bridge';
import type { BoardDock } from '../../components/lab/reference/shared/mcu';
import type { Mount, Turn } from '../../components/lab/reference/shared/mount';
import { createDevice, type Device, type DeviceHost, type Options } from './devices';
import { LabSim, type LabProbe } from './engine';
import { registerBusDevices } from './bus';
import { PadWiring } from './bus/pads';
import { boardPreset, examplePreset } from './presets';
import { localStore, STORAGE_KEYS } from '../storage';
import { t } from '../../../shared/i18n';

registerBusDevices();

export type { Turn };
/**
 * A part on the bench. Its place is in the units of the reference's scene (see `partCenter`
 * there); `turn` counts quarter turns.
 */
export interface LabPart {
  uid: string;
  def: string;
  x: number;
  y: number;
  turn: Turn;
  /** Replaces the part's name on the bench. */
  label?: string;
  /** Plugged into a breadboard: its pins are in neighbouring holes of one row, from `hole`. */
  mount?: Mount;
  /** Saved properties (see the part's schema) and the state a running part keeps. */
  opts: Options;
}
/**
 * A jumper between two terminals: a pin of a part (`led1:A`), a hole of a breadboard
 * (`bb1:e12`) or a contact of the FPGA board (`board:75`, `board:3V3`).
 */
export interface LabWire {
  id: string;
  from: string;
  to: string;
  color?: string;
}
export interface LabLayout {
  parts: LabPart[];
  wires: LabWire[];
  /** The FPGA board stands on this breadboard with its pins in the holes; loose when absent. */
  dock?: BoardDock;
}
/** What the simulation sees of the wires: a pin of a part and the contact of the board it is joined to. */
export interface ResolvedWire {
  id: string;
  part: string;
  pin: string;
  fpga: number;
}
export interface PinTarget {
  net: number;
  direction: 'input' | 'output' | 'inout';
  signal: string;
}
export type WireState = 'ok' | 'unassigned' | 'direction';

/** Parts soldered on the board itself. They behave like bench parts with fixed wiring. */
export const BOARD_LEDS = '@leds';
export const BOARD_BUTTONS = '@buttons';
export const BOARD_UART = '@uart';
const builtinDefs: Record<string, PartDef> = {
  [BOARD_LEDS]: {
    id: BOARD_LEDS,
    title: t('Светодиоды платы'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'board',
    activeLow: true,
    pins: LED_PINS.map((_, index) => [`LED${index}`, `LED${index}`, 'in'] as const),
    note: '',
  },
  [BOARD_BUTTONS]: {
    id: BOARD_BUTTONS,
    title: t('Кнопки платы'),
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'board',
    pins: [
      ['S1', 'S1', 'out'],
      ['S2', 'S2', 'out'],
    ],
    params: { keys: ['S1', 'S2'], momentary: true },
    note: '',
  },
  [BOARD_UART]: {
    id: BOARD_UART,
    title: t('USB-терминал платы'),
    group: 'Приборы',
    kind: 'uart',
    shape: 'uart',
    pins: [
      ['RX', 'RX', 'in'],
      ['TX', 'TX', 'out'],
    ],
    note: '',
  },
};
const builtinWires: ResolvedWire[] = [
  ...LED_PINS.map((fpga, index) => ({
    id: `@led${index}`,
    part: BOARD_LEDS,
    pin: `LED${index}`,
    fpga,
  })),
  { id: '@s1', part: BOARD_BUTTONS, pin: 'S1', fpga: BUTTON_PINS.S1 },
  { id: '@s2', part: BOARD_BUTTONS, pin: 'S2', fpga: BUTTON_PINS.S2 },
  { id: '@rx', part: BOARD_UART, pin: 'RX', fpga: UART_TX_PIN },
  { id: '@tx', part: BOARD_UART, pin: 'TX', fpga: UART_RX_PIN },
];

/** Which bit of the design sits on each FPGA pin, according to the project's .cst. */
export function pinTargets(design: LabDesign, project: Project): Map<number, PinTarget> {
  const bits = new Map<string, Omit<PinTarget, 'signal'>>();
  for (const port of design.ports)
    port.bits.forEach((net, bit) => {
      const index = port.offset + (port.upto ? port.bits.length - 1 - bit : bit);
      const target = { net, direction: port.direction };
      bits.set(`${port.name}[${index}]`, target);
      if (port.bits.length === 1) bits.set(port.name, target);
    });
  const result = new Map<number, PinTarget>();
  for (const directive of readCst(project)) {
    if (directive.kind !== 'IO_LOC') continue;
    const target = bits.get(directive.signal);
    const pin = Number(directive.value.split(',')[0].trim());
    if (target && Number.isInteger(pin)) result.set(pin, { ...target, signal: directive.signal });
  }
  return result;
}

/** A design running on the bench: the simulator, the parts and the wires between them. */
export class LabRuntime implements DeviceHost {
  readonly sim: LabSim;
  readonly targets: Map<number, PinTarget>;
  readonly devices = new Map<string, Device>();
  readonly hasClock: boolean;
  private uids = new Map<Device, string>();
  private outputs = new Map<string, number[]>();
  private drivers = new Map<number, Map<string, 0 | 1>>();
  private pads: PadWiring;
  private states = new Map<string, WireState>();
  /** Parts whose supply pins are not both wired; they do nothing. */
  readonly unpowered = new Set<string>();

  /** Which pins are joined to what, from the wires and the breadboards of the bench. */
  readonly connections: Connections;

  constructor(design: LabDesign, project: Project, bench: LabLayout) {
    // Wires, breadboards and plugs all come down to: this pin is on that contact of the board.
    this.connections = resolveConnections(bench);
    const layout = { parts: bench.parts, wires: this.connections.wires };
    this.targets = pinTargets(design, project);
    const clock = this.targets.get(CLOCK_PIN);
    this.hasClock = clock?.direction === 'input';
    this.sim = new LabSim(design, this.hasClock ? clock!.net : null);
    this.pads = new PadWiring(this.sim);
    const parts: { uid: string; def: PartDef; opts: Options }[] = [
      ...Object.entries(builtinDefs).map(([uid, def]) => ({ uid, def, opts: {} })),
      ...layout.parts.flatMap((part) => {
        const def = partById.get(part.def);
        return def ? [{ uid: part.uid, def, opts: part.opts }] : [];
      }),
    ];
    for (const part of parts) {
      const device = createDevice(part.def, part.opts, this);
      this.devices.set(part.uid, device);
      this.uids.set(device, part.uid);
    }
    // Supply wires first: a part needs VCC on a supply pad and GND on a ground pad to live.
    const fed = new Map<string, Set<string>>();
    for (const wire of layout.wires) {
      const supply = POWER_PINS.find((pin) => pin[0] === wire.pin);
      if (!supply || !this.devices.has(wire.part)) continue;
      const rail = headerByFpga.get(wire.fpga)?.rail;
      const right = !!rail && (rail === 'GND') === (supply[2] === 'gnd');
      this.states.set(wire.id, right ? 'ok' : 'direction');
      if (right) fed.set(wire.part, (fed.get(wire.part) ?? new Set()).add(wire.pin));
    }
    // Every part needs both supply wires; a breadboard is not a part that runs.
    for (const part of layout.parts)
      if (
        partById.get(part.def)?.kind !== 'breadboard' &&
        (fed.get(part.uid)?.size ?? 0) < POWER_PINS.length
      )
        this.unpowered.add(part.uid);
    for (const wire of [...builtinWires, ...layout.wires]) {
      const device = this.devices.get(wire.part);
      if (!device) continue;
      if (
        POWER_PINS.some((pin) => pin[0] === wire.pin) &&
        layout.parts.some((part) => part.uid === wire.part)
      )
        continue;
      // A dead part neither listens nor drives; its signal wires are in place for later.
      if (this.unpowered.has(wire.part)) {
        this.states.set(wire.id, this.targets.has(wire.fpga) ? 'ok' : 'unassigned');
        continue;
      }
      const pin = device.pins.findIndex((item) => item[0] === wire.pin);
      if (pin < 0) continue;
      const target = this.targets.get(wire.fpga);
      const dir = device.pins[pin][2];
      const fromFpga = dir === 'in';
      if (!target) {
        this.states.set(wire.id, 'unassigned');
        continue;
      }
      if (
        dir !== 'io' &&
        target.direction !== 'inout' &&
        (target.direction === 'output') !== fromFpga
      ) {
        this.states.set(wire.id, 'direction');
        continue;
      }
      this.states.set(wire.id, 'ok');
      // A two-way pin both listens to the pad and may pull it low.
      if (fromFpga || dir === 'io')
        device.probes[pin] = this.sim.probe(target.net, (level, cycle) =>
          device.pinChanged(pin, level, cycle),
        );
      if (dir === 'io') this.pads.attach(`${wire.part}:${pin}`, target.net);
      else if (!fromFpga) {
        const key = `${wire.part}:${pin}`;
        this.outputs.set(key, [...(this.outputs.get(key) ?? []), target.net]);
      }
    }
    for (const device of this.devices.values()) device.start();
    this.sim.refresh();
    this.frame(0);
  }

  /** How a pin of a part (`uid:pin`) is joined, or how the net of a wire of the bench works. */
  wireState(id: string): WireState {
    const own = this.states.get(id);
    if (own) return own;
    // A wire is as good as the pins of the parts that its net joins to the board.
    const made = [...this.connections.netWires]
      .filter(([, wires]) => wires.includes(id))
      .flatMap(([pin]) => {
        const state = this.states.get(pin);
        return state ? [state] : [];
      });
    if (!made.length) return 'ok';
    return made.includes('direction')
      ? 'direction'
      : made.includes('unassigned')
        ? 'unassigned'
        : 'ok';
  }
  cycle() {
    return this.sim.cycle;
  }
  high(probe: LabProbe) {
    return this.sim.highUntilNow(probe);
  }
  /** Pull a two-way pin of a part low (0), push it high (1) or let go (null). */
  pad(device: Device, pin: number, level: 0 | 1 | null, at?: number) {
    this.pads.drive(`${this.uids.get(device)}:${pin}`, level, at);
  }
  out(device: Device, pin: number, level: 0 | 1, at?: number) {
    const key = `${this.uids.get(device)}:${pin}`;
    for (const net of this.outputs.get(key) ?? []) {
      let drivers = this.drivers.get(net);
      if (!drivers) this.drivers.set(net, (drivers = new Map()));
      drivers.set(key, level);
      if (at !== undefined && at > this.sim.cycle) {
        this.sim.setInputAt(at, net, level);
        continue;
      }
      // Several parts on one input: any of them at 1 wins.
      let resolved: 0 | 1 = 0;
      for (const value of drivers.values()) if (value) resolved = 1;
      this.sim.setInput(net, resolved);
    }
  }

  /** Advance the design and let every part update its picture. Returns cycles simulated. */
  advance(maxCycles: number, budgetMs: number): number {
    const done = maxCycles > 0 ? this.sim.run(maxCycles, budgetMs) : 0;
    this.frame(done);
    return done;
  }
  private frame(elapsed: number) {
    this.sim.refresh();
    for (const device of this.devices.values()) device.frame(this.sim.cycle, elapsed);
  }
}

const storageKey = (project: Project) => STORAGE_KEYS.labLayout(project.id ?? project.name);
export function loadLayout(project: Project): LabLayout {
  // Повреждённое или заблокированное хранилище начинает пустой стол.
  const layout = localStore.readJson(storageKey(project), migrateLayout, null);
  if (layout) return layout;
  // A project made from an example with a ready bench starts with that bench.
  const preset = project.origin
    ? (examplePreset(project.origin.exampleId) ?? boardPreset(project))
    : undefined;
  return preset ?? defaultBench();
}
export function saveLayout(project: Project, layout: LabLayout) {
  // Без хранилища стол работает в этой сессии.
  localStore.writeJson(storageKey(project), layout);
}
