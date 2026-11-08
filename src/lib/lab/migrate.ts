import { padTerminal } from './pads';
import { addMissing, withSupply } from './supply';
import { LED_COLORS, partById, partPins } from './catalog';
import type { Options } from './devices';
import type { LabLayout, LabPart, LabWire, Turn } from './runtime';

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

const isTurn = (value: unknown): value is Turn =>
  value === 0 || value === 1 || value === 2 || value === 3;

/** A wire of the first format: a pin of a part and a contact of the board by its number. */
interface OldWire {
  id?: unknown;
  part?: unknown;
  pin?: unknown;
  fpga?: unknown;
  color?: unknown;
}

/**
 * A saved bench in any earlier format, turned into the current one: variants are mapped to
 * their merged part with properties, wires become wires between terminals, and a bench that
 * was powered by the table gets its supply wired. Benches of the first format had their own
 * coordinates (a flat table), which have no meaning on the new one: their parts are set out
 * again, keeping which pin is wired to which contact. Returns null when the value is not a
 * bench at all.
 */
export function migrateLayout(raw: unknown): LabLayout | null {
  const value = raw as { parts?: unknown; wires?: unknown } | null;
  if (!value || !Array.isArray(value.parts) || !Array.isArray(value.wires)) return null;
  const renamed = new Map<string, Record<string, string>>();
  const parts: LabPart[] = [];
  let flat = false;
  for (const item of value.parts as (Partial<LabPart> & { rot?: unknown })[]) {
    if (typeof item?.def !== 'string' || typeof item.uid !== 'string') continue;
    const legacy = LEGACY_PARTS[item.def];
    const def = partById.get(legacy?.def ?? item.def);
    if (!def) continue;
    // The saved state wins over what the old variant implied (an edited polarity, say).
    const { power: _power, ...kept } = { ...legacy?.opts, ...(item.opts as Options | undefined) };
    const opts: Options = kept;
    if (legacy?.pins) renamed.set(item.uid, legacy.pins);
    if (item.rot !== undefined) flat = true;
    const mount =
      typeof item.mount?.on === 'string' && typeof item.mount.hole === 'string'
        ? { on: item.mount.on, hole: item.mount.hole }
        : undefined;
    parts.push({
      uid: item.uid,
      def: def.id,
      x: Number.isFinite(item.x) ? item.x! : 0,
      y: Number.isFinite(item.y) ? item.y! : 0,
      turn: isTurn(item.turn) ? item.turn : 0,
      ...(typeof item.label === 'string' && item.label ? { label: item.label } : {}),
      ...(mount && !flat ? { mount } : {}),
      opts,
    });
  }
  const wires: LabWire[] = [];
  const known = new Set(parts.map((part) => part.uid));
  for (const wire of value.wires as (Partial<LabWire> & OldWire)[]) {
    const color = typeof wire?.color === 'string' ? { color: wire.color } : {};
    const id = typeof wire?.id === 'string' ? wire.id : `wire-${wires.length}`;
    if (typeof wire.from === 'string' && typeof wire.to === 'string') {
      // Both ends have to be somewhere: a part that is gone takes its wires with it.
      const owners = [wire.from, wire.to].map((end) => end.slice(0, end.indexOf(':')));
      if (owners.every((owner) => owner === 'board' || known.has(owner)))
        wires.push({ id, from: wire.from, to: wire.to, ...color });
      continue;
    }
    // The first format.
    const part = parts.find((item) => item.uid === wire.part);
    if (!part || typeof wire.pin !== 'string' || typeof wire.fpga !== 'number') continue;
    const pin = renamed.get(part.uid)?.[wire.pin] ?? wire.pin;
    const def = partById.get(part.def)!;
    if (!partPins(def, part.opts).some((item) => item[0] === pin)) continue;
    wires.push({ id, from: `${part.uid}:${pin}`, to: padTerminal(wire.fpga), ...color });
  }
  const dock = (value as { dock?: { on?: unknown; column?: unknown } }).dock;
  const docked =
    typeof dock?.on === 'string' &&
    Number.isInteger(dock.column) &&
    parts.some((part) => part.uid === dock.on);
  const layout: LabLayout = {
    parts,
    wires,
    ...(docked ? { dock: { on: dock.on as string, column: dock.column as number } } : {}),
  };
  // A flat bench is set out again; one in the current format stays as it is.
  return flat ? withSupply(addMissing(layout)) : layout;
}
