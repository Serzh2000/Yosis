import type { Project, SimulationConfig, YosysNetlist } from '../../shared/types';
import { BUTTON_PINS, CLOCK_PIN, LED_PINS } from './board-parts';
import { readCst } from './pin-planner';
import { portBitName, simulationDefaults, type BoardPort, type LogicLevel } from './virtual-board';

/** One bit of a top-level port. */
export interface BitRef {
  port: string;
  bit: number;
  /** The name as it is written in the .cst file (`led_n[0]`). */
  signal: string;
}
export interface LedBinding {
  index: number;
  pin: number;
  ref: BitRef | null;
  /** The LED lights when the pin is 0. */
  activeLow: boolean;
}
export type ButtonId = 'S1' | 'S2';
export interface BoardWiring {
  leds: LedBinding[];
  buttons: Record<ButtonId, BitRef | null>;
  /** Input port wired to the 27 MHz oscillator (pin 4). */
  clock: string | null;
  /** The .cst file assigns at least one board part. */
  fromConstraints: boolean;
}

/** Every spelling of a bit that a .cst file may use, for the ports of the top module. */
export function signalIndex(ports: BoardPort[]): Map<string, BitRef> {
  const result = new Map<string, BitRef>();
  for (const port of ports) {
    for (let bit = 0; bit < port.width; bit++) {
      const signal = portBitName(port, bit);
      const ref = { port: port.name, bit, signal };
      result.set(signal, ref);
      if (port.width === 1) result.set(`${port.name}[${port.offset ?? 0}]`, ref);
    }
  }
  return result;
}

/** Ports connected to board pins by the project's .cst files. */
export function deriveWiring(project: Project, ports: BoardPort[]): BoardWiring {
  const index = signalIndex(ports);
  const direction = new Map(ports.map((port) => [port.name, port.direction]));
  const pins = new Map<number, BitRef>();
  for (const directive of readCst(project)) {
    if (directive.kind !== 'IO_LOC' || !/^\d+$/.test(directive.value)) continue;
    const ref = index.get(directive.signal);
    const pin = Number(directive.value);
    if (ref && !pins.has(pin)) pins.set(pin, ref);
  }
  const wired = (pin: number, wanted: 'input' | 'output') => {
    const ref = pins.get(pin);
    return ref && direction.get(ref.port) === wanted ? ref : null;
  };
  const leds = LED_PINS.map((pin, i) => ({
    index: i,
    pin,
    ref: wired(pin, 'output'),
    activeLow: true,
  }));
  const buttons = { S1: wired(BUTTON_PINS.S1, 'input'), S2: wired(BUTTON_PINS.S2, 'input') };
  const clockRef = wired(CLOCK_PIN, 'input');
  const clockPort = clockRef && ports.find((port) => port.name === clockRef.port)?.width === 1;
  return {
    leds,
    buttons,
    clock: clockPort ? clockRef.port : null,
    fromConstraints: leds.some((led) => led.ref) || !!buttons.S1 || !!buttons.S2 || !!clockPort,
  };
}

/** Manual override: show consecutive bits of one output on the six LEDs. */
export function manualLeds(
  ports: BoardPort[],
  output: string,
  firstBit: number,
  activeLow: boolean,
): LedBinding[] {
  const port = ports.find((item) => item.name === output && item.direction === 'output');
  return LED_PINS.map((pin, i) => {
    const bit = firstBit + i;
    return {
      index: i,
      pin,
      activeLow,
      ref:
        port && bit >= 0 && bit < port.width
          ? { port: port.name, bit, signal: portBitName(port, bit) }
          : null,
    };
  });
}

export type LedState = 'on' | 'off' | 'unknown';
/** `unknown` covers X and Z: the LED is neither clearly on nor off. */
export function ledState(level: LogicLevel | null, activeLow: boolean): LedState {
  if (level === null || level === 'x' || level === 'z') return 'unknown';
  return (level === '0') === activeLow ? 'on' : 'off';
}

export function levelOfBinary(binary: string | undefined, bit: number): LogicLevel {
  if (!binary || bit < 0 || bit >= binary.length) return 'x';
  const char = binary.toLowerCase().at(-(bit + 1));
  return char === '0' || char === '1' || char === 'z' ? char : 'x';
}

/** Port values are decimal strings (as in SimulationConfig.inputs). */
export function readInputBit(value: string | undefined, bit: number): 0 | 1 {
  try {
    return (BigInt(value ?? '0') >> BigInt(bit)) & 1n ? 1 : 0;
  } catch {
    return 0;
  }
}
export function writeInputBit(value: string | undefined, bit: number, level: 0 | 1): string {
  let number: bigint;
  try {
    number = BigInt(value ?? '0');
  } catch {
    number = 0n;
  }
  const mask = 1n << BigInt(bit);
  return (level ? number | mask : number & ~mask).toString();
}

/**
 * A button must stay pressed for at least one whole clock period, otherwise a quick click
 * pressed and released inside the same period would leave no trace in the simulation.
 */
export function releaseCycle(pressedAt: number | undefined, now: number): number {
  return pressedAt === undefined ? now : Math.max(now, pressedAt + 1);
}

/** Registers, latches and memories make the output depend on history, not only on the inputs. */
export function hasStateElements(
  rtl: YosysNetlist | undefined,
  top: string,
  seen = new Set<string>(),
): boolean {
  const module = rtl?.modules[top];
  if (!module || seen.has(top)) return false;
  seen.add(top);
  return Object.values(module.cells).some((cell) => {
    if (cell.type.startsWith('$')) return /dff|latch|^\$mem|^\$sr$/.test(cell.type);
    return hasStateElements(rtl, cell.type, seen);
  });
}

export function inputKey(values: Record<string, string>): string {
  return JSON.stringify(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
}

export interface BoardSimulationSetup {
  /** `null` for purely combinational designs: the board then reacts to inputs immediately. */
  clock: string | null;
  config: SimulationConfig;
  /** Reset is wired to S1/S2: the button supplies it instead of the testbench generator. */
  resetOnButton: string | null;
  seedStimuli: NonNullable<SimulationConfig['stimuli']>;
}

/** Simulation settings for the virtual board, taking the real board wiring into account. */
export function boardSimulationSetup(
  ports: BoardPort[],
  wiring: BoardWiring,
): BoardSimulationSetup {
  const defaults = simulationDefaults(ports);
  const clock = wiring.clock ?? defaults.clock;
  const resetPort = defaults.reset && defaults.reset !== clock ? defaults.reset : null;
  const resetButton = [wiring.buttons.S1, wiring.buttons.S2].find(
    (ref) => ref && ref.port === resetPort,
  );
  const inputs = Object.fromEntries(
    ports
      .filter((port) => port.direction === 'input' && port.name !== clock)
      .map((port) => [port.name, /^(enable|en|ce)$/i.test(port.name) ? '1' : '0']),
  );
  if (!clock) {
    return {
      clock: null,
      resetOnButton: null,
      seedStimuli: [],
      config: {
        clock: null,
        reset: null,
        resetActiveLow: false,
        resetCycles: 0,
        cycles: 2,
        periodNs: 10,
        inputs,
      },
    };
  }
  const resetOnButton = resetPort && resetButton ? resetPort : null;
  const generated = resetPort && !resetOnButton ? resetPort : null;
  if (generated) delete inputs[generated];
  const seedStimuli: BoardSimulationSetup['seedStimuli'] = [];
  if (resetOnButton && !defaults.resetActiveLow) {
    // Hold the reset button for the first cycles so registers start from a known state.
    inputs[resetOnButton] = '1';
    seedStimuli.push({ cycle: defaults.resetCycles, inputs: { [resetOnButton]: '0' } });
  }
  return {
    clock,
    resetOnButton,
    seedStimuli,
    config: {
      clock,
      reset: generated,
      resetActiveLow: defaults.resetActiveLow,
      resetCycles: generated ? defaults.resetCycles : 0,
      cycles: defaults.cycles,
      periodNs: defaults.periodNs,
      inputs,
    },
  };
}
