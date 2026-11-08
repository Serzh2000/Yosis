// Where everything is on the bench oscilloscope. The 3D model, the painted front plate, the pin
// layout and the pointer handling all read these numbers (millimetres, measured from the top-left
// corner of the front plate unless noted), so they cannot drift apart.
import type { CircuitPart } from '../../../shared/mcu';

export const PANEL = { w: 78, h: 52 };
/** The CRT window. */
export const SCREEN = { x: 4, y: 4, w: 44, h: 27.5 };
/** How far a knob pointer swings either side of straight up, in degrees. */
export const SWEEP = 126;

/** What a knob changes: the part's main value or one of its extras, as steps or as a range. */
export interface Dial {
  /** Index into `part.values`; absent means `part.value`. */
  extra?: number;
  options?: number[];
  min?: number;
  max?: number;
  step?: number;
  /** How the current setting reads on the tooltip. */
  format: (value: number) => string;
}
export interface KnobSpec {
  x: number;
  y: number;
  radius: number;
  label: string;
  dial: Dial;
}
const percent = (value: number) => `${Math.round(value)} %`;
export const TIMEBASE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
export const VOLTS_PER_DIV = [0.5, 1, 2, 5];
export const KNOBS: KnobSpec[] = [
  {
    x: 59,
    y: 11,
    radius: 3,
    label: 'ЯРКОСТЬ',
    dial: { extra: 1, min: 0, max: 100, step: 5, format: percent },
  },
  {
    x: 71,
    y: 11,
    radius: 3,
    label: 'ФОКУС',
    dial: { extra: 2, min: 0, max: 100, step: 5, format: percent },
  },
  {
    x: 59,
    y: 25,
    radius: 3.7,
    label: 'ВРЕМЯ/ДЕЛ',
    dial: {
      options: TIMEBASE,
      format: (value) => (value >= 1000 ? `${value / 1000} с/дел` : `${value} мс/дел`),
    },
  },
  {
    x: 71,
    y: 25,
    radius: 3.7,
    label: 'В/ДЕЛ',
    dial: { extra: 0, options: VOLTS_PER_DIV, format: (value) => `${value} В/дел` },
  },
  {
    x: 59,
    y: 39,
    radius: 3,
    label: 'УРОВЕНЬ',
    dial: { extra: 3, min: 0, max: 5, step: 0.1, format: (value) => `${value.toFixed(1)} В` },
  },
  {
    x: 71,
    y: 39,
    radius: 3,
    label: 'СИНХР.',
    dial: {
      extra: 4,
      options: [0, 1],
      format: (value) => (value ? 'по каналу 2' : 'по каналу 1'),
    },
  },
];
export const PROBE_COLORS = { CH1: '#b8ff5c', CH2: '#4dffd0', GND: '#2a2f3a' } as const;
/** The three inputs under the screen; each has a probe lying on the table in front. */
export const SOCKETS = [
  { x: 22, y: 46.5, label: 'ВХОД 1', pin: 'CH1' },
  { x: 33, y: 46.5, label: 'ВХОД 2', pin: 'CH2' },
  { x: 44, y: 46.5, label: 'ЗЕМЛЯ', pin: 'GND' },
] as const;

/** Distance from the part's centre line to the front of the case, given the footprint depth. */
export const scopeFront = (depth: number) => depth / 2 - 13;
/** Where the probe `index` ends on the table, in the part's own frame. */
export const scopeTip = (depth: number, index: number) => ({
  x: SOCKETS[index]!.x - PANEL.w / 2,
  z: scopeFront(depth) + 8,
});

export function dialValue(part: Pick<CircuitPart, 'value' | 'values'>, dial: Dial) {
  return dial.extra === undefined ? part.value : (part.values?.[dial.extra] ?? 0);
}
/** Position of a setting along the knob's travel, 0 … 1. */
export function dialFraction(dial: Dial, value: number) {
  if (dial.options) {
    const index = Math.max(0, dial.options.indexOf(value));
    return dial.options.length > 1 ? index / (dial.options.length - 1) : 0;
  }
  const min = dial.min ?? 0,
    max = dial.max ?? 1;
  return max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
}
/** The setting a knob position stands for: a step of the list or a rounded value of the range. */
export function dialFromFraction(dial: Dial, fraction: number) {
  const f = Math.min(1, Math.max(0, fraction));
  if (dial.options) return dial.options[Math.round(f * (dial.options.length - 1))]!;
  const min = dial.min ?? 0,
    max = dial.max ?? 1,
    step = dial.step ?? 1;
  return Number((Math.round(((max - min) * f) / step) * step + min).toFixed(4));
}
/** Number of steps from one end of the travel to the other. */
export function dialSteps(dial: Dial) {
  if (dial.options) return dial.options.length - 1;
  return Math.max(1, Math.round(((dial.max ?? 1) - (dial.min ?? 0)) / (dial.step ?? 1)));
}
/** The setting at step `index` of the travel, clamped to its ends. */
export function dialAt(dial: Dial, index: number) {
  const i = Math.min(dialSteps(dial), Math.max(0, Math.round(index)));
  if (dial.options) return dial.options[i]!;
  return Number(((dial.min ?? 0) + i * (dial.step ?? 1)).toFixed(4));
}
/** Which step of the travel a setting is at. */
export function dialIndex(dial: Dial, value: number) {
  if (dial.options) return Math.max(0, dial.options.indexOf(value));
  return Math.min(
    dialSteps(dial),
    Math.max(0, Math.round((value - (dial.min ?? 0)) / (dial.step ?? 1))),
  );
}
/** One step further (1) or back (-1). */
export const dialStep = (dial: Dial, value: number, direction: 1 | -1) =>
  dialAt(dial, dialIndex(dial, value) + direction);
/** Drag distance for one step: the whole travel takes about 170 px, but never less than 3 px a step. */
export const dialPixelsPerStep = (dial: Dial) => Math.min(14, Math.max(3, 170 / dialSteps(dial)));
/** Pointer angle in radians for a setting; 0 is straight up, positive is clockwise. */
export const dialAngle = (dial: Dial, value: number) =>
  ((dialFraction(dial, value) * 2 - 1) * SWEEP * Math.PI) / 180;

/** The wire colour for a probe terminal such as "part-1:CH2", if it belongs to an oscilloscope. */
export function probeColor(
  project: { parts: Pick<CircuitPart, 'id' | 'kind'>[] },
  terminal: string,
): string | undefined {
  const split = terminal.indexOf(':'),
    id = terminal.slice(0, split),
    pin = terminal.slice(split + 1) as keyof typeof PROBE_COLORS;
  return project.parts.find((part) => part.id === id)?.kind === 'scope'
    ? PROBE_COLORS[pin]
    : undefined;
}
