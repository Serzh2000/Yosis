import { partById, partPins, type PartOptions } from './catalog';
import { padTerminal } from './pads';
import type { LabLayout, LabPart, LabWire, Turn } from './runtime';
import { circuitPart, toProject } from '../../components/lab/reference/bridge';
import { boardRect, collides, meets, rectOf } from './footprints';
import { partFootprint } from '../../components/lab/reference/src/mcu/scene/layout';
import { partSize } from '../../components/lab/reference/shared/catalog';
import { freeMount, type Mount } from '../../components/lab/reference/shared/mount';
import { PX, benchLayout, dockedHoles } from '../../components/lab/reference/src/mcu/scene/layout';

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

/** The terminal of a pin of a part, as a wire names it. */
export const pinTerminal = (uid: string, pin: string) => `${uid}:${pin}`;
export const terminalOwner = (terminal: string) => terminal.slice(0, terminal.indexOf(':'));
export const terminalPin = (terminal: string) => terminal.slice(terminal.indexOf(':') + 1);

/** Where the middle of a part stands, in the millimetres of the scene. */
export function centreOf(part: Pick<LabPart, 'def' | 'x' | 'y'>) {
  const size = partSize(circuitPart({ ...(part as LabPart), opts: {}, turn: 0, uid: '' }).kind);
  return { x: (part.x + size.width / 2) * PX, z: (part.y + size.height / 2) * PX };
}
/** The place for a part of `kind` whose middle should be at `centre` millimetres. */
function placeCentred(def: string, centre: { x: number; z: number }) {
  const probe = circuitPart({ uid: '', def, x: 0, y: 0, turn: 0, opts: {} });
  const size = partSize(probe.kind);
  return {
    x: Math.round(centre.x / PX - size.width / 2),
    y: Math.round(centre.z / PX - size.height / 2),
  };
}

/** Where the body of a part of `def` would stand if its middle were at (x, z): its rectangle. */
function bodyAt(def: string, x: number, z: number) {
  const { width, depth } = partFootprint(
    circuitPart({ uid: '', def, x: 0, y: 0, turn: 0, opts: {} }),
  );
  return { x0: x - width / 2, x1: x + width / 2, z0: z - depth / 2, z1: z + depth / 2 };
}

/** A little more air than the check asks for: a place is rounded to the grid of the bench. */
const SEARCH_GAP = 2.5;

/**
 * First place for a new loose part where it stands on nothing: not on the board, not on a
 * breadboard, not on another part. The table is searched in rows, from its far corner.
 */
export function freeSpot(layout: LabLayout, def: string) {
  const bodies = [...benchLayout(toProject(layout)).values()].map(rectOf);
  const board = boardRect(layout);
  const left = Math.min(board.x0, ...bodies.map((body) => body.x0)) - 20,
    top = Math.min(board.z0, ...bodies.map((body) => body.z0)) - 60;
  for (let z = top; z < top + 800; z += 8)
    for (let x = left; x < left + 1000; x += 8) {
      const body = bodyAt(def, x, z);
      if (!meets(body, board, 0) && !bodies.some((other) => meets(body, other, SEARCH_GAP)))
        return placeCentred(def, {
          x: (body.x0 + body.x1) / 2,
          z: (body.z0 + body.z1) / 2,
        });
    }
  return placeCentred(def, { x: left, z: top });
}

/**
 * A place in the holes of a breadboard for `part`: free holes, none that the docked board takes,
 * and a body that stands on neither the board nor another part. Null when there is none.
 */
export function clearMount(layout: LabLayout, part: LabPart): Mount | null {
  const taken = dockedHoles(toProject(layout)).map((hole, index) => ({
    id: `dock${index}`,
    from: hole,
    to: 'x:x',
  }));
  const accept = (found: Mount) => {
    const next = { ...layout, parts: [...layout.parts, { ...part, mount: found }] };
    return !collides(benchLayout(toProject(next)), part.uid, boardRect(next), next.dock?.on);
  };
  return freeMount(
    { parts: layout.parts.map(circuitPart), wires: [...layout.wires, ...taken] },
    circuitPart(part),
    accept,
  );
}

/** Put a new part on the bench: on a breadboard when there is room, else at the first free place. */
export function addPart(layout: LabLayout, defId: string): { layout: LabLayout; uid: string } {
  const def = partById.get(defId)!;
  const part: LabPart = {
    uid: newUid(),
    def: defId,
    ...freeSpot(layout, defId),
    turn: 0,
    opts: {},
  };
  const mount = def.kind === 'breadboard' ? null : clearMount(layout, part);
  return {
    layout: { ...layout, parts: [...layout.parts, mount ? { ...part, mount } : part] },
    uid: part.uid,
  };
}

/** A new part let go at a place of the bench (and, maybe, in the holes of a breadboard). */
export function addPartAt(
  layout: LabLayout,
  defId: string,
  spot: { x: number; y: number; mount: Mount | null },
): { layout: LabLayout; uid: string } {
  const part: LabPart = {
    uid: newUid(),
    def: defId,
    x: spot.x,
    y: spot.y,
    turn: 0,
    opts: {},
    ...(spot.mount ? { mount: spot.mount } : {}),
  };
  return { layout: { ...layout, parts: [...layout.parts, part] }, uid: part.uid };
}

/** A part let go at a place: unplugged, or plugged into the holes it is over. */
export function movePart(
  layout: LabLayout,
  uid: string,
  x: number,
  y: number,
  mount: Mount | null,
): LabLayout {
  return mapParts(layout, [uid], (part) => {
    const { mount: _old, ...loose } = part;
    return mount ? { ...loose, x, y, mount } : { ...loose, x, y };
  });
}

/** A quarter turn; a plugged part keeps its holes, so its turn is the pins' direction. */
export function turnPart(layout: LabLayout, uid: string, clockwise = true): LabLayout {
  return mapParts(layout, [uid], (part) => ({
    ...part,
    turn: ((part.turn + (clockwise ? 1 : 3)) % 4) as Turn,
  }));
}

/**
 * New properties and/or name for a part. Wires to pins the new properties no longer have are
 * dropped.
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
    return { ...rest, opts, ...(label ? { label } : {}) };
  });
  const part = next.parts.find((item) => item.uid === uid);
  if (!part) return layout;
  const def = partById.get(part.def)!;
  const pins = new Set(partPins(def, part.opts).map((pin) => pin[0]));
  const gone = (terminal: string) =>
    terminalOwner(terminal) === uid && !pins.has(terminalPin(terminal));
  return {
    ...next,
    // A breadboard that got smaller loses the parts and the wires on its missing columns.
    wires: next.wires.filter(
      (wire) => def.kind === 'breadboard' || !(gone(wire.from) || gone(wire.to)),
    ),
  };
}

export function removeItems(
  layout: LabLayout,
  parts: readonly string[],
  wire: string | null,
): LabLayout {
  const goes = (terminal: string) => parts.includes(terminalOwner(terminal));
  return {
    ...layout,
    parts: layout.parts
      .filter((part) => !parts.includes(part.uid))
      // What stood on a removed breadboard stays on the table.
      .map((part) => {
        if (!part.mount || !parts.includes(part.mount.on)) return part;
        const { mount: _gone, ...loose } = part;
        return loose;
      }),
    wires: layout.wires.filter((item) => item.id !== wire && !goes(item.from) && !goes(item.to)),
  };
}

/** A jumper between two terminals, unless the same two are already joined. */
export function addWire(
  layout: LabLayout,
  from: string,
  to: string,
  color?: string,
): { layout: LabLayout; wire?: LabWire } {
  if (from === to) return { layout };
  if (
    layout.wires.some(
      (wire) => (wire.from === from && wire.to === to) || (wire.from === to && wire.to === from),
    )
  )
    return { layout };
  const wire: LabWire = { id: `wire-${newUid()}`, from, to, ...(color ? { color } : {}) };
  return { layout: { ...layout, wires: [...layout.wires, wire] }, wire };
}

/** Moves one end of a wire to another terminal. */
export function replugWire(
  layout: LabLayout,
  id: string,
  end: 'from' | 'to',
  terminal: string,
): LabLayout {
  const wire = layout.wires.find((item) => item.id === id);
  if (!wire) return layout;
  const other = end === 'from' ? wire.to : wire.from;
  if (
    other === terminal ||
    layout.wires.some(
      (item) =>
        item.id !== id &&
        ((item.from === other && item.to === terminal) ||
          (item.to === other && item.from === terminal)),
    )
  )
    return layout;
  return {
    ...layout,
    wires: layout.wires.map((item) => (item.id === id ? { ...item, [end]: terminal } : item)),
  };
}

export const setWireColor = (layout: LabLayout, id: string, color: string): LabLayout => ({
  ...layout,
  wires: layout.wires.map((wire) => (wire.id === id ? { ...wire, color } : wire)),
});

/** Takes every wire off the pins of some parts. */
export const disconnectParts = (layout: LabLayout, uids: readonly string[]): LabLayout => ({
  ...layout,
  wires: layout.wires.filter(
    (wire) => !uids.includes(terminalOwner(wire.from)) && !uids.includes(terminalOwner(wire.to)),
  ),
});
/** Takes every wire off a contact of the board. */
export const disconnectPad = (layout: LabLayout, fpga: number): LabLayout => {
  const terminal = padTerminal(fpga);
  return {
    ...layout,
    wires: layout.wires.filter((wire) => wire.from !== terminal && wire.to !== terminal),
  };
};

/** A copy of a part a little aside; its wires and its place in the holes are not copied. */
export function duplicatePart(layout: LabLayout, uid: string): { layout: LabLayout; uid?: string } {
  const source = layout.parts.find((part) => part.uid === uid);
  if (!source) return { layout };
  const { mount: _mount, ...bare } = source;
  const copy: LabPart = {
    ...bare,
    uid: newUid(),
    ...freeSpot(layout, source.def),
    opts: JSON.parse(JSON.stringify(source.opts)) as PartOptions,
  };
  return { layout: { ...layout, parts: [...layout.parts, copy] }, uid: copy.uid };
}
