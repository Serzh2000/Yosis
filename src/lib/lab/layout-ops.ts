import {
  GRID,
  HEADER,
  defaultRot,
  fitOnBench,
  freeSpot,
  headerByFpga,
  nextWireColor,
  partBox,
  partLayout,
  snap,
  turn,
  type Point,
} from './bench';
import { POWER_PINS, partById, partPins, type PartOptions } from './catalog';
import type { LabLayout, LabPart, LabWire } from './runtime';

/** Pure edits of a bench. Each returns a new layout and leaves its argument alone. */
export const newUid = () => Math.random().toString(36).slice(2, 10);

const mapParts = (
  layout: LabLayout,
  uids: readonly string[],
  change: (part: LabPart) => LabPart,
): LabLayout => ({
  ...layout,
  parts: layout.parts.map((part) => (uids.includes(part.uid) ? change(part) : part)),
});

/** Put a new part on the bench: at the first free place, or centred on `at` when dropped. */
export function addPart(
  layout: LabLayout,
  defId: string,
  at?: { x: number; y: number },
): { layout: LabLayout; uid: string } {
  const def = partById.get(defId)!;
  const size = partLayout(def, {});
  let spot = freeSpot(
    size,
    layout.parts.map((part) => partBox(part, partById.get(part.def)!)),
  );
  if (at) {
    const wanted = { x: snap(at.x - size.w / 2), y: snap(at.y - size.h / 2), w: size.w, h: size.h };
    // A drop over the board or past the edge lands at the nearest place a part may stand.
    const shift = fitOnBench(wanted);
    spot = { x: wanted.x + shift.x, y: wanted.y + shift.y };
  }
  const part: LabPart = {
    uid: newUid(),
    def: defId,
    ...spot,
    rot: defaultRot(def, {}, spot.y),
    opts: layout.autoPower === false ? { power: true } : {},
  };
  return { layout: { ...layout, parts: [...layout.parts, part] }, uid: part.uid };
}

export function moveParts(
  layout: LabLayout,
  origins: ReadonlyMap<string, Point>,
  dx: number,
  dy: number,
): LabLayout {
  return {
    ...layout,
    parts: layout.parts.map((part) => {
      const origin = origins.get(part.uid);
      return origin ? { ...part, x: origin.x + dx, y: origin.y + dy } : part;
    }),
  };
}

/** The part turns about its centre, so it does not jump away from where it was. */
export function rotateParts(
  layout: LabLayout,
  uids: readonly string[],
  clockwise: boolean,
): LabLayout {
  return mapParts(layout, uids, (part) => {
    const def = partById.get(part.def)!;
    const before = partBox(part, def);
    const turned = { ...part, rot: turn(part.rot, clockwise) };
    const after = partBox(turned, def);
    const x = snap(part.x + (before.w - after.w) / 2);
    const y = snap(part.y + (before.h - after.h) / 2);
    const shift = fitOnBench({ x, y, w: after.w, h: after.h });
    return { ...turned, x: x + shift.x, y: y + shift.y };
  });
}

/**
 * New properties and/or name for a part. Wires to pins the new properties no longer have
 * are dropped, and a part that grew is kept on the bench.
 */
export function setPartProps(
  layout: LabLayout,
  uid: string,
  change: { opts?: PartOptions; label?: string },
): LabLayout {
  const next = mapParts(layout, [uid], (part) => {
    const opts = { ...part.opts, ...change.opts };
    const label = change.label ?? part.label;
    const { label: _old, ...rest } = part;
    const resized: LabPart = { ...rest, opts, ...(label ? { label } : {}) };
    const shift = fitOnBench(partBox(resized, partById.get(part.def)!));
    return { ...resized, x: part.x + shift.x, y: part.y + shift.y };
  });
  const part = next.parts.find((item) => item.uid === uid);
  if (!part) return layout;
  const pins = new Set(partPins(partById.get(part.def)!, part.opts).map((pin) => pin[0]));
  return { ...next, wires: next.wires.filter((wire) => wire.part !== uid || pins.has(wire.pin)) };
}

export function removeItems(
  layout: LabLayout,
  parts: readonly string[],
  wire: string | null,
): LabLayout {
  return {
    ...layout,
    parts: layout.parts.filter((part) => !parts.includes(part.uid)),
    wires: layout.wires.filter((item) => item.id !== wire && !parts.includes(item.part)),
  };
}

/** A pin of a part holds one jumper; a header pad may hold several. */
export function connectWire(
  layout: LabLayout,
  end: { part: string; pin: string; fpga: number },
): { layout: LabLayout; wire: LabWire } {
  const wire: LabWire = { id: newUid(), ...end, color: nextWireColor(layout.wires) };
  return {
    layout: {
      ...layout,
      wires: [
        ...layout.wires.filter((item) => item.part !== end.part || item.pin !== end.pin),
        wire,
      ],
    },
    wire,
  };
}

/** Moves one end of a wire: to another pad, or to another pin (which is then taken over). */
export function replugWire(
  layout: LabLayout,
  id: string,
  to: { fpga: number } | { part: string; pin: string },
): LabLayout {
  const wire = layout.wires.find((item) => item.id === id);
  if (!wire) return layout;
  const moved = { ...wire, ...to };
  return {
    ...layout,
    wires: layout.wires
      .filter((item) => item.id === id || item.part !== moved.part || item.pin !== moved.pin)
      .map((item) => (item.id === id ? moved : item)),
  };
}

/**
 * Connects pin `pin` to the pad `fpga`, and each following pin of the part to the next free
 * pad of the same header row, skipping power pads. Returns the wires made.
 */
export function busConnect(
  layout: LabLayout,
  part: string,
  pin: number,
  fpga: number,
): { layout: LabLayout; wires: LabWire[] } {
  const placed = layout.parts.find((item) => item.uid === part);
  const def = placed && partById.get(placed.def);
  const pins = def && placed ? partPins(def, placed.opts) : [];
  const start = headerByFpga.get(fpga);
  if (!start || !pins[pin]) return { layout, wires: [] };
  const taken = new Set(layout.wires.map((wire) => wire.fpga));
  const pads = [
    start,
    ...HEADER.filter(
      (item) =>
        item.row === start.row && item.index > start.index && !item.rail && !taken.has(item.fpga),
    ),
  ];
  let next = layout;
  const wires: LabWire[] = [];
  for (let index = 0; index < pads.length && pin + index < pins.length; index++) {
    const made = connectWire(next, {
      part,
      pin: pins[pin + index][0],
      fpga: pads[index].fpga!,
    });
    next = made.layout;
    wires.push(made.wire);
  }
  return { layout: next, wires };
}

export const disconnectParts = (layout: LabLayout, uids: readonly string[]): LabLayout => ({
  ...layout,
  wires: layout.wires.filter((wire) => !uids.includes(wire.part)),
});
export const disconnectPad = (layout: LabLayout, fpga: number): LabLayout => ({
  ...layout,
  wires: layout.wires.filter((wire) => wire.fpga !== fpga),
});
/**
 * Switch between parts powered by the bench itself and parts with supply pins of their own.
 * Going back to automatic power removes the supply wires with the pins.
 */
export function setAutoPower(layout: LabLayout, auto: boolean): LabLayout {
  const parts = layout.parts.map((part) => {
    const { power: _power, ...opts } = part.opts;
    return { ...part, opts: auto ? opts : { ...opts, power: true } };
  });
  const supply = new Set(POWER_PINS.map((pin) => pin[0]));
  return {
    ...layout,
    autoPower: auto,
    parts,
    wires: auto ? layout.wires.filter((wire) => !supply.has(wire.pin)) : layout.wires,
  };
}
/** Replace the hand-made bends of a wire; an empty list returns it to the automatic route. */
export const setWireBends = (
  layout: LabLayout,
  id: string,
  bends: { x: number; y: number }[],
): LabLayout => ({
  ...layout,
  wires: layout.wires.map((wire) =>
    wire.id === id ? { ...wire, bends: bends.length ? bends : undefined } : wire,
  ),
});
export const setWireColor = (layout: LabLayout, id: string, color: string): LabLayout => ({
  ...layout,
  wires: layout.wires.map((wire) => (wire.id === id ? { ...wire, color } : wire)),
});

export const PASTE_OFFSET = GRID * 3;
/** Copies of parts, moved by `offset`; wires are not copied. */
export function pasteParts(
  layout: LabLayout,
  parts: readonly LabPart[],
  offset: number,
): { layout: LabLayout; uids: string[] } {
  const copies = parts.map((part) => {
    const box = partBox(part, partById.get(part.def)!);
    const shift = fitOnBench({ ...box, x: part.x + offset, y: part.y + offset });
    return {
      ...part,
      uid: newUid(),
      x: part.x + offset + shift.x,
      y: part.y + offset + shift.y,
      opts: JSON.parse(JSON.stringify(part.opts)) as PartOptions,
    };
  });
  return {
    layout: { ...layout, parts: [...layout.parts, ...copies] },
    uids: copies.map((part) => part.uid),
  };
}

export function nudgeParts(
  layout: LabLayout,
  uids: readonly string[],
  dx: number,
  dy: number,
): LabLayout {
  const moving = layout.parts.filter((part) => uids.includes(part.uid));
  if (!moving.length) return layout;
  const boxes = moving.map((part) => partBox(part, partById.get(part.def)!));
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const shift = fitOnBench({
    x: left + dx,
    y: top + dy,
    w: Math.max(...boxes.map((box) => box.x + box.w)) - left,
    h: Math.max(...boxes.map((box) => box.y + box.h)) - top,
  });
  return mapParts(layout, uids, (part) => ({
    ...part,
    x: part.x + dx + shift.x,
    y: part.y + dy + shift.y,
  }));
}
