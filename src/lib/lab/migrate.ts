import { LED_COLORS, partById, partPins } from './catalog';
import { defaultRot } from './bench';
import type { Options } from './devices';
import type { LabLayout, LabPart, LabWire, Rot } from './runtime';

const color = (name: string) => LED_COLORS.find((item) => item.label === name)!.value;
const CAPS = { red: '#e5484d', green: '#30a46c', blue: '#3e63dd', yellow: '#f5c518' };

interface Legacy {
  def: string;
  opts?: Options;
  /** Pins that were renamed when the variants merged. */
  pins?: Record<string, string>;
}
/** Parts that were separate variants before they became properties of one part. */
export const LEGACY_PARTS: Record<string, Legacy> = {
  'led-red': { def: 'led', opts: { color: color('Красный') } },
  'led-green': { def: 'led', opts: { color: color('Зелёный') } },
  'led-yellow': { def: 'led', opts: { color: color('Жёлтый') } },
  'led-blue': { def: 'led', opts: { color: color('Синий') } },
  'led-white': { def: 'led', opts: { color: color('Белый') } },
  'led-orange': { def: 'led', opts: { color: color('Оранжевый') } },
  'led-pink': { def: 'led', opts: { color: color('Розовый') } },
  'led-ir': { def: 'led', opts: { color: color('Инфракрасный') } },
  'rgb-cc': { def: 'rgb', opts: { common: 'cathode' } },
  'rgb-ca': { def: 'rgb', opts: { common: 'anode' } },
  bar8: { def: 'bar', opts: { count: 8, color: color('Зелёный') } },
  bar10: { def: 'bar', opts: { count: 10, color: color('Оранжевый') } },
  'seg1-red-cc': { def: 'seg1', opts: { color: color('Красный'), common: 'cathode' } },
  'seg1-red-ca': { def: 'seg1', opts: { color: color('Красный'), common: 'anode' } },
  'seg1-green-cc': { def: 'seg1', opts: { color: color('Зелёный'), common: 'cathode' } },
  'seg1-blue-cc': { def: 'seg1', opts: { color: color('Синий'), common: 'cathode' } },
  'seg2-cc': { def: 'segn', opts: { digits: 2, common: 'cathode' } },
  'seg4-cc': { def: 'segn', opts: { digits: 4, common: 'cathode' } },
  'seg4-ca': { def: 'segn', opts: { digits: 4, common: 'anode' } },
  matrix8: { def: 'matrix', opts: { size: '8x8', color: color('Красный') } },
  matrix5x7: { def: 'matrix', opts: { size: '5x7', color: color('Зелёный') } },
  'btn-red': { def: 'button', opts: { color: CAPS.red } },
  'btn-green': { def: 'button', opts: { color: CAPS.green } },
  'btn-blue': { def: 'button', opts: { color: CAPS.blue } },
  'btn-yellow': { def: 'button', opts: { color: CAPS.yellow } },
  'btn-arcade': { def: 'button', opts: { color: CAPS.red, size: 'large' } },
  dip4: { def: 'dip', opts: { count: 4 } },
  dip8: { def: 'dip', opts: { count: 8 } },
  keypad4x4: { def: 'keypad', opts: { layout: '4x4' } },
  keypad3x4: { def: 'keypad', opts: { layout: '3x4' } },
  thumbwheel: { def: 'rotary', opts: { range: 9 } },
  'hex-switch': { def: 'rotary', opts: { range: 15 } },
  'const-1': { def: 'const', opts: { level: '1' }, pins: { '1': 'OUT' } },
  'const-0': { def: 'const', opts: { level: '0' }, pins: { '0': 'OUT' } },
  'buzzer-active': { def: 'buzzer', opts: { type: 'active' } },
  'buzzer-passive': { def: 'buzzer', opts: { type: 'passive' } },
  analyzer4: { def: 'analyzer', opts: { channels: 4 } },
  analyzer8: { def: 'analyzer', opts: { channels: 8 } },
};

const isRot = (value: unknown): value is Rot =>
  value === 0 || value === 90 || value === 180 || value === 270;

/**
 * A saved bench in any earlier format, turned into the current one: variants are mapped to
 * their merged part with properties, parts get a rotation, wires follow renamed pins.
 * Returns null when the value is not a bench at all.
 */
export function migrateLayout(raw: unknown): LabLayout | null {
  const value = raw as { parts?: unknown; wires?: unknown; zoom?: unknown } | null;
  if (!value || !Array.isArray(value.parts) || !Array.isArray(value.wires)) return null;
  const renamed = new Map<string, Record<string, string>>();
  const parts: LabPart[] = [];
  for (const item of value.parts as Partial<LabPart>[]) {
    if (typeof item?.def !== 'string' || typeof item.uid !== 'string') continue;
    const legacy = LEGACY_PARTS[item.def];
    const def = partById.get(legacy?.def ?? item.def);
    if (!def) continue;
    // The saved state wins over what the old variant implied (an edited polarity, say).
    const opts: Options = { ...legacy?.opts, ...(item.opts as Options | undefined) };
    const x = Number.isFinite(item.x) ? item.x! : 0;
    const y = Number.isFinite(item.y) ? item.y! : 0;
    if (legacy?.pins) renamed.set(item.uid, legacy.pins);
    parts.push({
      uid: item.uid,
      def: def.id,
      x,
      y,
      // Before rotation existed, parts below the board turned their pins up.
      rot: isRot(item.rot) ? item.rot : defaultRot(def, opts, y),
      ...(typeof item.label === 'string' && item.label ? { label: item.label } : {}),
      opts,
    });
  }
  const wires: LabWire[] = [];
  for (const wire of value.wires as Partial<LabWire>[]) {
    const part = parts.find((item) => item.uid === wire?.part);
    if (!part || typeof wire.pin !== 'string' || typeof wire.fpga !== 'number') continue;
    const pin = renamed.get(part.uid)?.[wire.pin] ?? wire.pin;
    const def = partById.get(part.def)!;
    if (!partPins(def, part.opts).some((item) => item[0] === pin)) continue;
    wires.push({
      id: String(wire.id),
      part: part.uid,
      pin,
      fpga: wire.fpga,
      ...(typeof wire.color === 'string' ? { color: wire.color } : {}),
      ...(Array.isArray(wire.bends) &&
      wire.bends.length &&
      wire.bends.every((bend) => Number.isFinite(bend?.x) && Number.isFinite(bend?.y))
        ? { bends: wire.bends.map((bend) => ({ x: bend.x, y: bend.y })) }
        : {}),
    });
  }
  const zoom = typeof value.zoom === 'number' && value.zoom > 0 ? value.zoom : undefined;
  const manual = (value as { autoPower?: unknown }).autoPower === false;
  return { parts, wires, ...(zoom ? { zoom } : {}), ...(manual ? { autoPower: false } : {}) };
}
