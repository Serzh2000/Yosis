import type { Project } from '../../../shared/types';
import { CLOCK_PIN, LED_PINS } from '../board-parts';
import { readCst } from '../pin-planner';
import { busMoreBenches } from '../examples-lab-bus2';
import { partBenches } from '../examples-lab-parts';
import { BOARD, GRID, headerByFpga, partLayout } from './bench';
import { partById } from './catalog';
import type { Options } from './devices';
import type { LabLayout, LabPart, LabWire } from './runtime';

/**
 * Benches that come ready with an example: the parts it needs, placed above the board with
 * their pins wired to the header contacts the example's .cst uses. A project made from the
 * example opens with this bench until the pupil changes it.
 */
interface PresetPart {
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

/** The ready bench of an example, or undefined when the example has none. */
export function examplePreset(exampleId: string): LabLayout | undefined {
  const list = PRESETS[exampleId] ?? busMoreBenches[exampleId] ?? partBenches[exampleId];
  if (!list) return undefined;
  const parts: LabPart[] = [];
  const wires: LabWire[] = [];
  list.forEach((item, index) => {
    const def = partById.get(item.def);
    if (!def) return;
    const opts: Options = { ...item.opts };
    const { h } = partLayout(def, opts, 0, def.title);
    // Snap to the bench grid and leave room for the wires between the part and the header.
    const y = Math.max(GRID, Math.floor((BOARD.y - 33 - h) / GRID) * GRID);
    const uid = `p${index + 1}`;
    parts.push({ uid, def: item.def, x: item.x, y, rot: 0, opts });
    for (const [pin, fpga] of Object.entries(item.pins))
      wires.push({ id: `${uid}-${pin}`, part: uid, pin, fpga });
  });
  return { parts, wires };
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
  const size = partLayout(def, opts, 180, def.title);
  const pads = used.map((pin) => headerByFpga.get(pin)!.x);
  const centre = (Math.min(...pads) + Math.max(...pads)) / 2;
  const x = Math.round(Math.max(GRID, centre - size.w / 2) / GRID) * GRID;
  const y = Math.ceil((BOARD.y + BOARD.h + 66) / GRID) * GRID;
  return {
    parts: [{ uid: 'p1', def: def.id, x, y, rot: 180, opts }],
    wires: used.map((fpga, index) => ({
      id: `p1-${index + 1}`,
      part: 'p1',
      pin: `${index + 1}`,
      fpga,
    })),
  };
}
