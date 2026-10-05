import type { LabProbe } from './engine';
import { deviceFactories } from './bus/registry';
import { resolvePart, type PartDef, type PartOptions, type PinDef } from './catalog';

export const BOARD_CLOCK_HZ = 27_000_000;

/** What a device may ask of the laboratory it is plugged into. */
export interface DeviceHost {
  cycle(): number;
  /** Drive one of the device's `out` pins; `at` schedules the change for a later cycle. */
  out(device: Device, pin: number, level: 0 | 1, at?: number): void;
  /** Cycles the probe has been high so far. */
  high(probe: LabProbe): number;
}
export type Options = PartOptions;

/** Behaviour of one part on the bench. `view` is what its picture is drawn from. */
export abstract class Device {
  /** One entry per pin of the part; null where nothing from the FPGA arrives. */
  probes: (LabProbe | null)[];
  /** Share of the last frame each pin spent high (its level while time stands still). */
  duty: number[];
  view: Record<string, unknown> = {};
  /** Pins, parameters and picture for this part's property values at the time it was built. */
  readonly pins: readonly PinDef[];
  readonly params: Readonly<Record<string, unknown>>;
  readonly shape: string;
  private lastHigh: number[];
  constructor(
    readonly def: PartDef,
    /** Saved properties and state; the laboratory re-points it when the layout is edited. */
    public opts: Options,
    protected host: DeviceHost,
  ) {
    const resolved = resolvePart(def, opts);
    this.pins = resolved.pins;
    this.params = resolved.params;
    this.shape = resolved.shape;
    this.probes = this.pins.map(() => null);
    this.duty = this.pins.map(() => 0);
    this.lastHigh = this.pins.map(() => 0);
  }
  get activeLow(): boolean {
    return (
      (this.opts.activeLow as boolean | undefined) ??
      (this.params.activeLow as boolean | undefined) ??
      this.def.activeLow ??
      false
    );
  }
  level(pin: number): 0 | 1 {
    return this.probes[pin]?.level ?? 0;
  }
  /** Outputs take their starting levels here, once the wires are known. */
  start(): void {}
  pinChanged(_pin: number, _level: 0 | 1, _cycle: number): void {}
  act(_name: string, _value?: unknown): void {}
  frame(cycle: number, elapsed: number): void {
    this.probes.forEach((probe, pin) => {
      if (!probe) {
        this.duty[pin] = 0;
        return;
      }
      const high = this.host.high(probe);
      this.duty[pin] = elapsed > 0 ? (high - this.lastHigh[pin]) / elapsed : probe.level;
      this.lastHigh[pin] = high;
    });
    this.update(cycle, elapsed);
  }
  protected update(_cycle: number, _elapsed: number): void {}
  /** How lit an input is, taking the part's polarity into account. Unwired pins are dark. */
  protected lit(pin: number): number {
    if (!this.probes[pin]) return 0;
    return this.activeLow ? 1 - this.duty[pin] : this.duty[pin];
  }
  /** Frequency on a pin in hertz of board time; 0 when it has stopped toggling. */
  protected frequency(pin: number, cycle: number): number {
    const probe = this.probes[pin];
    if (!probe || probe.period <= 0 || cycle - probe.lastRise > probe.period * 2 + 2) return 0;
    return BOARD_CLOCK_HZ / probe.period;
  }
}

class Light extends Device {
  protected update() {
    this.view = { b: this.pins.map((_, pin) => this.lit(pin)) };
  }
}

/** Multiplexed displays: an element glows while its line and its select are active together. */
class Scan extends Device {
  private lines = this.params.lines as number;
  private selects = this.pins.length - this.lines;
  private lineActive = this.params.lineActive as number;
  private selectActive = this.params.selectActive as number;
  private levels = this.pins.map(() => 0);
  private glow = new Float64Array(this.lines * this.selects);
  private since = 0;
  start() {
    this.levels = this.pins.map((_, pin) => this.level(pin));
    this.since = this.host.cycle();
  }
  private collect(cycle: number) {
    const span = cycle - this.since;
    this.since = cycle;
    if (span <= 0) return;
    for (let select = 0; select < this.selects; select++) {
      if (
        !this.probes[this.lines + select] ||
        this.levels[this.lines + select] !== this.selectActive
      )
        continue;
      for (let line = 0; line < this.lines; line++)
        if (this.probes[line] && this.levels[line] === this.lineActive)
          this.glow[select * this.lines + line] += span;
    }
  }
  pinChanged(pin: number, level: 0 | 1, cycle: number) {
    this.collect(cycle);
    this.levels[pin] = level;
  }
  protected update(cycle: number, elapsed: number) {
    this.collect(cycle);
    const b: number[][] = [];
    for (let select = 0; select < this.selects; select++) {
      const row: number[] = [];
      for (let line = 0; line < this.lines; line++) {
        const index = select * this.lines + line;
        // A fully scanned display shows each element 1/selects of the time at full brightness.
        row.push(
          elapsed > 0
            ? Math.min(1, (this.glow[index] / elapsed) * this.selects)
            : this.probes[line] &&
                this.probes[this.lines + select] &&
                this.levels[line] === this.lineActive &&
                this.levels[this.lines + select] === this.selectActive
              ? 1
              : 0,
        );
        this.glow[index] = 0;
      }
      b.push(row);
    }
    this.view = { b };
  }
}

class NumberDisplay extends Device {
  protected update() {
    let value = 0;
    this.pins.forEach((_, pin) => {
      if (this.duty[pin] > 0.5) value += 2 ** pin;
    });
    this.view = { value, wired: this.probes.some(Boolean) };
  }
}

/** Two back-to-back LEDs on two pins: current flows, and one colour shows, when they differ. */
class Bicolor extends Device {
  protected update() {
    // Lit shares assume the two pins switch independently, which is exact for steady levels.
    const [p, n] = [this.duty[0], this.duty[1]];
    this.view = { b: [this.probes[0] ? p * (1 - n) : 0, this.probes[1] ? n * (1 - p) : 0] };
  }
}

/** Counts rising edges of CLK; a high RST holds the count at zero. */
class Counter extends Device {
  private count = 0;
  private get modulus() {
    return 10 ** (this.params.digits as number);
  }
  pinChanged(pin: number, level: 0 | 1) {
    if (pin === 0 && level === 1 && this.level(1) === 0)
      this.count = (this.count + 1) % this.modulus;
    else if (pin === 1 && level === 1) this.count = 0;
  }
  protected update() {
    this.view = { count: this.count, digits: this.params.digits, wired: this.probes.some(Boolean) };
  }
}

class Switch extends Device {
  private on = this.pins.map(() => false);
  start() {
    this.on = (this.opts.on as boolean[] | undefined)?.slice(0, this.on.length) ?? this.on;
    while (this.on.length < this.pins.length) this.on.push(false);
    this.pins.forEach((_, pin) => this.drive(pin));
    this.update();
  }
  private drive(pin: number) {
    const fixed = this.params.fixed as number | undefined;
    const level = fixed !== undefined ? fixed : this.on[pin] !== this.activeLow ? 1 : 0;
    this.host.out(this, pin, level as 0 | 1);
  }
  act(name: string, value?: unknown) {
    const { pin, on } = value as { pin: number; on?: boolean };
    if (name !== 'set' || this.params.fixed !== undefined) return;
    this.on[pin] = on ?? !this.on[pin];
    if (!this.params.momentary) this.opts.on = [...this.on];
    this.drive(pin);
    this.update();
  }
  protected update() {
    this.view = { on: [...this.on] };
  }
}

class Dial extends Device {
  private value = 0;
  start() {
    this.value = Math.min((this.opts.value as number | undefined) ?? 0, this.params.max as number);
    this.drive();
  }
  private drive() {
    this.pins.forEach((_, pin) => this.host.out(this, pin, ((this.value >> pin) & 1) as 0 | 1));
    this.view = { value: this.value };
  }
  act(name: string, value?: unknown) {
    if (name !== 'step') return;
    const size = (this.params.max as number) + 1;
    this.value = (this.value + (value as number) + size) % size;
    this.opts.value = this.value;
    this.drive();
  }
}

/** Matrix keypad: a pressed key connects its row to its column; columns are pulled up. */
class Keypad extends Device {
  private keys = this.params.keys as string[];
  private rows = this.keys.length;
  private pressed = new Set<string>();
  start() {
    this.solve();
  }
  private solve() {
    const columns = this.pins.length - this.rows;
    for (let column = 0; column < columns; column++) {
      let level: 0 | 1 = 1;
      for (let row = 0; row < this.rows; row++)
        if (this.pressed.has(`${row},${column}`) && this.probes[row] && this.level(row) === 0)
          level = 0;
      this.host.out(this, this.rows + column, level);
    }
    this.view = { pressed: [...this.pressed] };
  }
  pinChanged() {
    if (this.pressed.size) this.solve();
  }
  act(name: string, value?: unknown) {
    const { key, on } = value as { key: string; on: boolean };
    if (name !== 'key') return;
    if (on) this.pressed.add(key);
    else this.pressed.delete(key);
    this.solve();
  }
}

/** One detent is a full quadrature period; A leads when turning clockwise. */
class Encoder extends Device {
  private busyUntil = 0;
  private position = 0;
  start() {
    this.host.out(this, 0, 1);
    this.host.out(this, 1, 1);
    this.host.out(this, 2, 1);
    this.view = { position: 0, pressed: false };
  }
  act(name: string, value?: unknown) {
    if (name === 'press') {
      this.host.out(this, 2, value ? 0 : 1);
      this.view = { ...this.view, pressed: !!value };
      return;
    }
    if (name !== 'turn') return;
    const direction = value as number;
    const gap = (this.opts.gap as number | undefined) ?? 20_000;
    const [first, second] = direction > 0 ? [0, 1] : [1, 0];
    let at = Math.max(this.host.cycle() + 1, this.busyUntil);
    for (const [pin, level] of [
      [first, 0],
      [second, 0],
      [first, 1],
      [second, 1],
    ] as const) {
      this.host.out(this, pin, level, at);
      at += gap;
    }
    this.busyUntil = at;
    this.position += direction;
    this.view = { ...this.view, position: this.position };
  }
}

class Buzzer extends Device {
  protected update(cycle: number) {
    const active = !!this.params.active;
    const frequency = active ? (this.duty[0] > 0.02 ? 2700 : 0) : this.frequency(0, cycle);
    this.view = {
      frequency: frequency >= 20 && frequency <= 15000 ? frequency : 0,
      raw: frequency,
    };
  }
}

class Gauge extends Device {
  protected update(cycle: number) {
    const probe = this.probes[0];
    const frequency = this.frequency(0, cycle);
    const pulseMs = probe && frequency ? (probe.pulse / BOARD_CLOCK_HZ) * 1000 : 0;
    this.view = {
      wired: !!probe,
      level: this.level(0),
      duty: this.duty[0],
      frequency,
      pulseMs,
      // Hobby servo: 1 ms is one end of travel, 2 ms the other.
      angle: pulseMs ? Math.max(0, Math.min(180, (pulseMs - 1) * 180)) : null,
    };
  }
}

class Stepper extends Device {
  private step = -1;
  private angle = 0;
  private phase(): number {
    const on = [0, 1, 2, 3].filter((pin) => this.level(pin) === 1);
    if (on.length === 1) return on[0] * 2;
    if (on.length === 2 && (on[1] - on[0] === 1 || (on[0] === 0 && on[1] === 3)))
      return on[0] === 0 && on[1] === 3 ? 7 : on[0] * 2 + 1;
    return -1;
  }
  pinChanged() {
    const next = this.phase();
    if (next < 0) return;
    if (this.step >= 0) {
      let delta = (next - this.step + 8) % 8;
      if (delta > 4) delta -= 8;
      if (Math.abs(delta) <= 2) this.angle += delta * 3;
    }
    this.step = next;
  }
  protected update() {
    this.view = { angle: this.angle, coils: [0, 1, 2, 3].map((pin) => this.level(pin)) };
  }
}

class ShiftOut extends Device {
  private register = 0;
  private latch = 0;
  start() {
    this.host.out(this, 3, 0);
  }
  pinChanged(pin: number, level: 0 | 1) {
    if (!level) return;
    if (pin === 1) {
      this.register = ((this.register << 1) | this.level(0)) & 0xff;
      this.host.out(this, 3, ((this.register >> 7) & 1) as 0 | 1);
    } else if (pin === 2) this.latch = this.register;
  }
  protected update() {
    this.view = { latch: this.latch, register: this.register };
  }
}

class ShiftIn extends Device {
  private switches = 0;
  private register = 0;
  start() {
    this.switches = (this.opts.switches as number | undefined) ?? 0;
    this.load();
  }
  private load() {
    // PL is active low; an unwired PL keeps loading, as a floating pin with a pull-down would.
    if (this.level(0) === 0) this.register = this.switches;
    this.host.out(this, 2, ((this.register >> 7) & 1) as 0 | 1);
    this.view = { switches: this.switches, register: this.register };
  }
  pinChanged(pin: number, level: 0 | 1) {
    if (pin === 1 && level && this.level(0) === 1) this.register = (this.register << 1) & 0xff;
    this.load();
  }
  act(name: string, value?: unknown) {
    if (name !== 'toggle') return;
    this.switches ^= 1 << (value as number);
    this.opts.switches = this.switches;
    this.load();
  }
}

class Analyzer extends Device {
  private edges: { cycle: number; level: 0 | 1 }[][] = this.pins.map(() => []);
  pinChanged(pin: number, level: 0 | 1, cycle: number) {
    const list = this.edges[pin];
    list.push({ cycle, level });
    if (list.length > 6000) list.splice(0, 2000);
  }
  act(name: string, value?: unknown) {
    if (name === 'window') this.opts.window = value;
  }
  protected update(cycle: number) {
    const window = (this.opts.window as number | undefined) ?? 2000;
    const from = cycle - window;
    this.view = {
      window,
      from,
      to: cycle,
      channels: this.pins.map((_, pin) => {
        const list = this.edges[pin];
        let first = list.length;
        while (first > 0 && list[first - 1].cycle > from) first--;
        const inside = list.slice(first);
        // Too many edges to draw one by one: the picture shows a filled band instead.
        return {
          wired: !!this.probes[pin],
          start:
            first > 0
              ? list[first - 1].level
              : inside.length
                ? 1 - inside[0].level
                : this.level(pin),
          edges: inside.length > 400 ? null : inside,
        };
      }),
    };
  }
}

class Pulse extends Device {
  private next = 0;
  private levelNow: 0 | 1 = 0;
  start() {
    this.next = this.host.cycle();
    this.host.out(this, 0, 0);
  }
  act(name: string, value?: unknown) {
    if (name === 'hz') this.opts.hz = value;
  }
  protected update(cycle: number, elapsed: number) {
    const hz = Math.max(0.1, (this.opts.hz as number | undefined) ?? 2);
    const half = Math.max(1, Math.round(BOARD_CLOCK_HZ / hz / 2));
    if (this.next < cycle) this.next = cycle;
    // Keep the edges for the next couple of frames queued in the simulator.
    const horizon = cycle + Math.max(elapsed * 3, 1000);
    let queued = 0;
    while (this.next <= horizon && queued++ < 20000) {
      this.levelNow = (this.levelNow ^ 1) as 0 | 1;
      this.host.out(this, 0, this.levelNow, this.next);
      this.next += half;
    }
    this.view = { hz };
  }
}

/** 8N1 serial terminal. Pin 0 listens to the FPGA, pin 1 talks to it. */
class Uart extends Device {
  private log: { cycle: number; level: 0 | 1 }[] = [];
  private startAt = -1;
  private text = '';
  private txFree = 0;
  private get bit() {
    return BOARD_CLOCK_HZ / ((this.opts.baud as number | undefined) ?? 115200);
  }
  start() {
    this.host.out(this, 1, 1);
    this.view = { text: '', baud: (this.opts.baud as number | undefined) ?? 115200 };
  }
  private levelAt(cycle: number): 0 | 1 {
    let level: 0 | 1 = 1;
    for (const item of this.log) {
      if (item.cycle > cycle) break;
      level = item.level;
    }
    return level;
  }
  pinChanged(pin: number, level: 0 | 1, cycle: number) {
    if (pin !== 0) return;
    this.receive(cycle);
    this.log.push({ cycle, level });
    if (this.startAt < 0 && level === 0) this.startAt = cycle;
  }
  private receive(now: number) {
    while (this.startAt >= 0 && now >= this.startAt + this.bit * 9.5) {
      let byte = 0;
      for (let index = 0; index < 8; index++)
        if (this.levelAt(this.startAt + this.bit * (1.5 + index))) byte |= 1 << index;
      const end = this.startAt + this.bit * 9.5;
      const framed = this.levelAt(end) === 1;
      this.text += !framed
        ? '□'
        : byte === 10 || byte === 13 || (byte >= 32 && byte < 127)
          ? String.fromCharCode(byte)
          : `\\x${byte.toString(16).padStart(2, '0')}`;
      if (this.text.length > 4000) this.text = this.text.slice(-3000);
      const tail = this.levelAt(end);
      this.log = this.log.filter((item) => item.cycle > end);
      this.startAt = -1;
      // A start bit may already have begun right after this stop bit.
      let level = tail;
      for (const item of this.log) {
        if (level === 1 && item.level === 0) {
          this.startAt = item.cycle;
          break;
        }
        level = item.level;
      }
      if (this.startAt < 0 && !framed && tail === 0) this.log = [];
    }
  }
  act(name: string, value?: unknown) {
    if (name === 'baud') this.opts.baud = value;
    else if (name === 'clear') this.text = '';
    else if (name === 'send') {
      let at = Math.max(this.host.cycle() + 1, this.txFree);
      for (const byte of new TextEncoder().encode(value as string)) {
        const frame = [0, ...Array.from({ length: 8 }, (_, index) => (byte >> index) & 1), 1];
        for (const level of frame) {
          this.host.out(this, 1, level as 0 | 1, Math.round(at));
          at += this.bit;
        }
      }
      this.txFree = at;
    }
  }
  protected update(cycle: number) {
    this.receive(cycle);
    this.view = {
      text: this.text,
      baud: (this.opts.baud as number | undefined) ?? 115200,
      sending: this.txFree > cycle,
    };
  }
}

const KINDS = {
  light: Light,
  bicolor: Bicolor,
  scan: Scan,
  number: NumberDisplay,
  counter: Counter,
  switch: Switch,
  dial: Dial,
  keypad: Keypad,
  encoder: Encoder,
  buzzer: Buzzer,
  gauge: Gauge,
  stepper: Stepper,
  sr595: ShiftOut,
  sr165: ShiftIn,
  analyzer: Analyzer,
  pulse: Pulse,
  uart: Uart,
} as const;

export function createDevice(def: PartDef, opts: Options, host: DeviceHost): Device {
  const custom = deviceFactories.get(def.kind);
  if (custom) return custom(def, opts, host);
  return new KINDS[def.kind as keyof typeof KINDS](def, opts, host);
}
