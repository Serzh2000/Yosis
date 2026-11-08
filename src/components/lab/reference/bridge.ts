import { partById, propValue } from '../../../lib/lab/catalog';
import { terminalPad, padTerminal, BOARD_TERMINAL } from '../../../lib/lab/pads';
import type { LabLayout, LabPart, ResolvedWire } from '../../../lib/lab/runtime';
import { breadboardJoins } from './shared/breadboard';
import { partCatalog } from './shared/catalog';
import { mountLinks } from './shared/mount';
import type { CircuitPart, McuProject } from './shared/mcu';
import { kindFor } from './yosis-kinds';
import { dockLinks } from './src/mcu/scene/layout';

/** Quarter turns the way the reference counts them. */
export const breadboardValue = (opts: Record<string, unknown>) => (opts.columns === 63 ? 1 : 0);

/** A part of the laboratory as the reference's scene knows it. */
export function circuitPart(part: LabPart): CircuitPart {
  const def = partById.get(part.def)!;
  const kind = kindFor(def, part.opts);
  const catalogue = partCatalog[kind];
  const color = propValue(def, part.opts, 'color');
  return {
    id: part.uid,
    kind,
    label: part.label || def.title,
    x: part.x,
    y: part.y,
    value: def.kind === 'breadboard' ? breadboardValue(part.opts) : catalogue.defaultValue,
    ...(catalogue.defaultValues ? { values: [...catalogue.defaultValues] } : {}),
    color: typeof color === 'string' ? color : catalogue.color,
    turn: part.turn,
    ...(part.mount ? { mount: part.mount } : {}),
  };
}

export function toProject(layout: LabLayout, name = 'lab'): McuProject {
  return {
    version: 1,
    name,
    board: 'tangnano20k',
    source: '',
    ...(layout.dock ? { dock: layout.dock } : {}),
    parts: layout.parts.map(circuitPart),
    wires: layout.wires.map((wire) => ({
      id: wire.id,
      from: wire.from,
      to: wire.to,
      ...(wire.color ? { color: wire.color } : {}),
    })),
  };
}

/** What the wires and the breadboards join, as the simulation of the laboratory needs it. */
export interface Connections {
  /** Every pin of every part that is joined to a contact of the board, and which contact. */
  wires: ResolvedWire[];
  /** Contacts of the board that one net joins together: a short. */
  shorts: { nets: string[]; terminals: string[] }[];
  /** The wires of the bench that make up the net of each pin that is joined. */
  netWires: Map<string, string[]>;
}

export function resolveConnections(layout: LabLayout): Connections {
  const parts = layout.parts.map(circuitPart);
  const parent = new Map<string, string>();
  const find = (node: string): string => {
    let root = node;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(node, root);
    return root;
  };
  const join = (a: string, b: string) => {
    const left = find(a);
    parent.set(left, find(b));
  };
  for (const wire of layout.wires) join(wire.from, wire.to);
  // A part's leads stand in the holes of its breadboard; a hole is one with its strip.
  for (const [lead, hole] of mountLinks({ parts })) join(lead, hole);
  // A docked board has its pins in the holes: each pad is one with the strip it stands in.
  for (const [pad, hole] of dockLinks(toProject(layout))) join(pad, hole);
  for (const part of parts)
    if (part.kind === 'breadboard')
      for (const [a, b] of breadboardJoins(part.value)) join(`${part.id}:${a}`, `${part.id}:${b}`);
  const members = new Map<string, string[]>();
  for (const node of parent.keys()) {
    const root = find(node);
    const list = members.get(root);
    if (list) list.push(node);
    else members.set(root, [node]);
  }
  const wiresOf = new Map<string, string[]>();
  for (const wire of layout.wires) {
    const root = find(wire.from);
    wiresOf.set(root, [...(wiresOf.get(root) ?? []), wire.id]);
  }
  const wires: ResolvedWire[] = [];
  const shorts: Connections['shorts'] = [];
  const netWires = new Map<string, string[]>();
  const owners = new Set(layout.parts.map((part) => part.uid));
  for (const [root, nodes] of members) {
    const board = nodes.filter((node) => node.startsWith(`${BOARD_TERMINAL}:`));
    if (!board.length) continue;
    const signals = board.filter((node) => /^board:\d+$/.test(node));
    if (board.length > 1) shorts.push({ nets: wiresOf.get(root) ?? [], terminals: board });
    const chosen = terminalPad((signals[0] ?? board[0])!);
    if (!chosen) continue;
    for (const node of nodes) {
      const at = node.indexOf(':');
      const owner = node.slice(0, at);
      if (
        !owners.has(owner) ||
        partById.get(layout.parts.find((p) => p.uid === owner)!.def)?.kind === 'breadboard'
      )
        continue;
      const pin = node.slice(at + 1);
      const id = `${owner}:${pin}`;
      wires.push({ id, part: owner, pin, fpga: chosen.fpga });
      netWires.set(id, wiresOf.get(root) ?? []);
    }
  }
  return { wires, shorts, netWires };
}

export { padTerminal };
