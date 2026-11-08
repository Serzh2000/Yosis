import { BOARD_CLOCK_HZ, type Device } from '../../../lib/lab/devices';
import { headerByFpga } from '../../../lib/lab/pads';
import {
  BOARD_BUTTONS,
  BOARD_LEDS,
  type LabLayout,
  type LabPart,
  type LabRuntime,
} from '../../../lib/lab/runtime';
import type { Hd44780 } from '../../../lib/lab/bus/hd44780';
import { partCatalog } from './shared/catalog';
import type { DeviceState, GpioState, SimulationFrame } from './shared/mcu';
import type { CircuitSolution, NetValue } from './shared/sim/circuit';
import { circuitPart } from './bridge';

/** The supply of the board, in volts. */
const SUPPLY = 3.3;
const EMPTY: DeviceState = { powered: false };

/** Segments a..g (bits 0…6) of the hexadecimal digits, as a seven-segment display shows them. */
const SEGMENTS = [
  0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71,
];
const lit = (level: number | undefined) => ((level ?? 0) > 0.5 ? 1 : 0);
const bits = (levels: readonly number[]) =>
  levels.reduce((mask, level, index) => mask | (lit(level) << index), 0);

/** What the picture of a part shows right now, from the numbers the device keeps in its view. */
function stateOf(device: Device, part: LabPart, powered: boolean): DeviceState | undefined {
  const view = device.view as Record<string, unknown>;
  const def = device.def;
  const base: DeviceState = { powered };
  switch (def.kind) {
    case 'light': {
      const b = (view.b as number[] | undefined) ?? [];
      if (device.shape === 'ring') {
        const [r, g, bl] = rgb(partCatalog[circuitPart(part).kind].color);
        return {
          ...base,
          colors: b.map((value) => {
            const k = Math.min(1, Math.max(0, value));
            return (Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(bl * k);
          }),
        };
      }
      return base;
    }
    case 'scan': {
      const b = (view.b as number[][] | undefined) ?? [];
      const rows = b.map((levels) => bits(levels));
      if (device.shape === 'seg') return { ...base, displayOn: true, intensity: 7, matrix: rows };
      // A dot matrix: a row is its bits, the leftmost column the highest.
      const width = b[0]?.length ?? 8;
      return {
        ...base,
        displayOn: true,
        intensity: 15,
        matrix: b.map((levels) =>
          levels.reduce((mask, level, column) => mask | (lit(level) << (width - 1 - column)), 0),
        ),
      };
    }
    case 'number': {
      const value = (view.value as number | undefined) ?? 0;
      if (device.shape === 'bcd7') return base;
      if (device.shape === 'hex')
        return { ...base, displayOn: true, intensity: 7, matrix: [SEGMENTS[value & 15]] };
      const text = String(value).padStart(3, ' ');
      return {
        ...base,
        displayOn: true,
        intensity: 7,
        matrix: [...text].map((ch) => (ch === ' ' ? 0 : SEGMENTS[Number(ch)])).reverse(),
      };
    }
    case 'counter': {
      const digits = (view.digits as number | undefined) ?? 4;
      const text = String(view.count ?? 0).padStart(digits, '0');
      return {
        ...base,
        displayOn: true,
        intensity: 7,
        matrix: [...text.slice(-digits)].map((ch) => SEGMENTS[Number(ch)]),
      };
    }
    case 'buzzer': {
      const frequency = (view.frequency as number | undefined) ?? 0;
      return { ...base, frequencyHz: frequency, active: frequency > 0 ? 1 : 0 };
    }
    case 'gauge': {
      const duty = (view.duty as number | undefined) ?? 0;
      if (device.shape === 'servo') {
        const angle = view.angle as number | null;
        return { ...base, angle: angle ?? 90 };
      }
      return { ...base, motors: [duty], channels: [duty > 0.5 ? 1 : 0], active: duty };
    }
    case 'analyzer': {
      const window = (view.window as number | undefined) ?? 1;
      const from = (view.from as number | undefined) ?? 0;
      const channels =
        (view.channels as
          | { wired: boolean; start: number; edges: { cycle: number; level: number }[] | null }[]
          | undefined) ?? [];
      return {
        ...base,
        waves: channels.map((channel) => ({
          wired: channel.wired,
          start: channel.start ? 1 : 0,
          edges:
            channel.edges?.map((edge): [number, 0 | 1] => [
              Math.min(1, Math.max(0, (edge.cycle - from) / window)),
              edge.level ? 1 : 0,
            ]) ?? null,
        })),
      };
    }
    case 'stepper':
      return { ...base, angle: (view.angle as number | undefined) ?? 0, motors: [0] };
    case 'sr595': {
      const latch = (view.latch as number | undefined) ?? 0;
      return {
        ...base,
        displayOn: true,
        lights: Array.from({ length: 8 }, (_, i) => (latch >> i) & 1),
      };
    }
    case 'bus':
      return busState(device, view, base);
  }
  return base;
}

function rgb(color: string): [number, number, number] {
  const value = Number.parseInt(color.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function busState(device: Device, view: Record<string, unknown>, base: DeviceState): DeviceState {
  switch (device.params.model) {
    case 'ssd1306':
      return {
        ...base,
        displayOn: Boolean(view.awake && view.pump),
        pixels: Array.from(view.ram as Uint8Array),
      };
    case 'lcd-i2c':
    case 'lcd-parallel': {
      const lcd = view.lcd as Hd44780;
      const rows = view.rows as number;
      const columns = view.columns as number;
      const glyphs: number[] = [];
      for (let code = 0; code < 8; code++) glyphs.push(...lcd.glyph(code));
      const text = Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => {
          const code = lcd.charAt(row, column);
          return String.fromCharCode(code < 8 ? 0xe000 + code : code);
        }).join(''),
      );
      return {
        ...base,
        displayOn: Boolean(view.displayOn),
        backlight: Boolean(view.backlight),
        text,
        glyphs,
      };
    }
    case 'tm1637': {
      const digits = Array.from(view.digits as ArrayLike<number>);
      const intensity = (view.brightness as number | undefined) ?? 7;
      return { ...base, displayOn: Boolean(view.on), intensity, matrix: digits };
    }
    case 'max7219': {
      const intensity = (view.intensity as number | undefined) ?? 0;
      const on = !view.shutdown;
      if (device.shape === 'bus-digits')
        return {
          ...base,
          displayOn: on,
          intensity,
          matrix: Array.from(view.segments as ArrayLike<number>).reverse(),
        };
      return {
        ...base,
        displayOn: on,
        intensity,
        matrix: Array.from(view.rows as ArrayLike<number>),
      };
    }
    case 'ws2812': {
      const colors = view.colors as ArrayLike<number>;
      const count = view.count as number;
      return {
        ...base,
        colors: Array.from(
          { length: count },
          (_, i) => (colors[i * 3] << 16) | (colors[i * 3 + 1] << 8) | colors[i * 3 + 2],
        ),
      };
    }
  }
  return base;
}

/** How bright each LED of a part burns: the order the picture of the part takes them in. */
function ledsOf(device: Device): number[] {
  const view = device.view as Record<string, unknown>;
  if (device.def.kind === 'light' && device.shape !== 'ring')
    return [...((view.b as number[] | undefined) ?? [])];
  if (device.def.kind === 'bicolor') return [...((view.b as number[] | undefined) ?? [])];
  if (device.def.kind === 'number' && device.shape === 'bcd7') {
    const value = (view.value as number | undefined) ?? 0;
    const decoded = value < 10 && view.wired ? SEGMENTS[value] : 0;
    return Array.from({ length: 8 }, (_, bit) => (decoded >> bit) & 1);
  }
  return [];
}

export interface Live {
  frame: SimulationFrame;
  solution: CircuitSolution;
  boardLeds: number[];
  /** The keys of the board that are held down, S1 then S2. */
  boardKeys: boolean[];
  /** The part's value and values as the scene draws its controls; absent when the part has none. */
  inputs: Map<string, { value?: number; values?: number[] }>;
}

/** The range a control of the reference's part moves over. */
function range(part: LabPart) {
  const control = partCatalog[circuitPart(part).kind].control;
  return { min: control.min ?? 0, max: control.max ?? 1 };
}

/** The value the scene draws a part's control with, from the device's own state. */
export function inputOf(part: LabPart, device: Device | undefined): number | undefined {
  if (!device) return undefined;
  const view = device.view as Record<string, unknown>;
  switch (device.def.kind) {
    case 'switch': {
      const on = (view.on as boolean[] | undefined) ?? [];
      if (device.shape === 'sensor') {
        const { min, max } = range(part);
        return on[0] ? max : min;
      }
      return on.length > 1 ? bits(on.map(Number)) : on[0] ? 1 : 0;
    }
    case 'dial': {
      const { max } = range(part);
      const top = device.params.max as number;
      return Math.round(((view.value as number | undefined) ?? 0) * (max / top));
    }
  }
  const option = OPTIONS[device.params.model as string];
  if (option) return Number(device.opts[option.key] ?? option.value);
  return undefined;
}

/** Bus sensors whose value the scene sets with a slider: the option the device keeps it in. */
const OPTIONS: Record<string, { key: string; value: number; act: string }> = {
  lm75: { key: 'temp', value: 25, act: 'temp' },
  hcsr04: { key: 'distance', value: 50, act: 'distance' },
  mcp3008: { key: 'value', value: 512, act: 'value' },
};

/** A change of a control in the scene, as the action the device understands. */
export function actionFor(
  part: LabPart,
  device: Device,
  value: number,
  index?: number,
): [name: string, value: unknown][] {
  const view = device.view as Record<string, unknown>;
  switch (device.def.kind) {
    case 'switch': {
      const on = (view.on as boolean[] | undefined) ?? [];
      if (device.shape === 'sensor') {
        const { min, max } = range(part);
        return [['set', { pin: 0, on: value >= (min + max) / 2 }]];
      }
      if (on.length > 1) {
        const actions: [string, unknown][] = [];
        on.forEach((was, pin) => {
          const now = ((value >> pin) & 1) === 1;
          if (now !== was) actions.push(['set', { pin, on: now }]);
        });
        return actions;
      }
      return [['set', { pin: 0, on: value > 0 }]];
    }
    case 'dial': {
      const top = device.params.max as number;
      const scaled = Math.round((value * top) / range(part).max);
      return [['step', scaled - ((view.value as number | undefined) ?? 0)]];
    }
  }
  void index;
  const option = OPTIONS[device.params.model as string];
  return option ? [[option.act, value]] : [];
}

const gpio = (id: string, level: 0 | 1, mode: GpioState['mode']): GpioState => ({
  id,
  mode,
  level,
  duty: level,
});

/** The numbers the scene draws a moment of the running design from. */
export function liveOf(runtime: LabRuntime | null, layout: LabLayout): Live {
  const values = new Map<string, NetValue>();
  const leds: Record<string, number[]> = {};
  const devices: Record<string, DeviceState> = {};
  const inputs: Live['inputs'] = new Map();
  const pins: GpioState[] = [];
  if (runtime) {
    for (const [fpga, target] of runtime.targets) {
      if (!headerByFpga.has(fpga)) continue;
      const level = runtime.sim.values[target.net] ? 1 : 0;
      pins.push(gpio(String(fpga), level, target.direction === 'input' ? 'INPUT' : 'OUTPUT'));
    }
    for (const part of layout.parts) {
      const device = runtime.devices.get(part.uid);
      if (!device) continue;
      const powered = !runtime.unpowered.has(part.uid);
      const supply = powered ? SUPPLY : 0;
      values.set(`${part.uid}:VCC`, voltage(supply));
      values.set(`${part.uid}:GND`, voltage(0));
      devices[part.uid] = stateOf(device, part, powered) ?? EMPTY;
      leds[part.uid] = powered ? ledsOf(device) : [];
      const value = inputOf(part, device);
      if (value !== undefined) inputs.set(part.uid, { value });
    }
    for (const [pin, wires] of runtime.connections.netWires) {
      const wire = runtime.connections.wires.find((item) => item.id === pin);
      if (!wire || !wires.length) continue;
      const target = runtime.targets.get(wire.fpga);
      const level = target && runtime.sim.values[target.net] ? 1 : 0;
      if (wire.pin !== 'VCC' && wire.pin !== 'GND') values.set(pin, voltage(level * SUPPLY, level));
    }
  }
  const boardLeds = runtime
    ? [...((runtime.devices.get(BOARD_LEDS)?.view.b as number[] | undefined) ?? [])]
    : [];
  return {
    frame: {
      time: runtime ? (runtime.sim.cycle / BOARD_CLOCK_HZ) * 1000 : 0,
      pins,
      serial: '',
      edges: [],
      devices,
    },
    solution: { values, nets: new Map(), inputs: {}, leds, diagnostics: [] },
    boardLeds,
    boardKeys: runtime
      ? [...((runtime.devices.get(BOARD_BUTTONS)?.view.on as boolean[] | undefined) ?? [])]
      : [],
    inputs,
  };
}

function voltage(volts: number, level: 0 | 1 = volts > 1 ? 1 : 0): NetValue {
  return { level, voltage: volts, duty: level, conflict: false, driven: true };
}
