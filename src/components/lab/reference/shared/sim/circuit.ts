import { reservedPins } from '../pin-layout';
import {
  allTerminals,
  boardTerminal,
  mcuBoards,
  partCatalog,
  partTerminal,
  type BoardPin,
  type GpioState,
  type DeviceState,
  type McuProject,
} from '../mcu';
import { partContext, partPinNames } from '../catalog';
import { mountLinks } from '../mount';

export interface NetValue {
  level: 0 | 1 | null;
  voltage: number | null;
  duty: number;
  conflict: boolean;
  driven: boolean;
}
export interface CircuitSolution {
  values: Map<string, NetValue>;
  nets: Map<string, string[]>;
  inputs: Record<string, number | null>;
  leds: Record<string, number[]>;
  diagnostics: string[];
}
interface Topology {
  nets: Map<string, string[]>;
  roots: Map<string, string>;
  boardPins: Map<string, BoardPin[]>;
}
const topologies = new WeakMap<McuProject, Topology>();
/** Resistors from this value up act as pull-ups/pull-downs rather than as a link. */
export const PULL_OHMS = 2000;
function topologyOf(project: McuProject): Topology {
  const cached = topologies.get(project);
  if (cached) return cached;
  const board = mcuBoards[project.board],
    terminals = allTerminals(project),
    parent = new Map(terminals.map((id) => [id, id]));
  function find(id: string): string {
    const root = parent.get(id);
    if (!root || root === id) return id;
    const result = find(root);
    parent.set(id, result);
    return result;
  }
  function join(a: string, b: string) {
    if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  }
  project.wires.forEach((wire) => join(wire.from, wire.to));
  for (const [lead, hole] of mountLinks(project)) join(lead, hole);
  for (const part of project.parts)
    for (const [a, b] of partCatalog[part.kind].joins?.(partContext(part)) ?? [])
      join(partTerminal(part.id, a), partTerminal(part.id, b));
  const nets = new Map<string, string[]>(),
    roots = new Map<string, string>(),
    boardPins = new Map<string, BoardPin[]>();
  terminals.forEach((id) => {
    const root = find(id);
    const members = nets.get(root) ?? [];
    members.push(id);
    nets.set(root, members);
    roots.set(id, root);
  });
  for (const pin of board.pins) {
    const root = roots.get(boardTerminal(pin.id))!,
      pins = boardPins.get(root) ?? [];
    pins.push(pin);
    boardPins.set(root, pins);
  }
  const topology = { nets, roots, boardPins };
  topologies.set(project, topology);
  return topology;
}
export function solveCircuit(
  project: McuProject,
  pins: GpioState[],
  devices?: Record<string, Pick<DeviceState, 'outputs' | 'pullups' | 'analog'>>,
): CircuitSolution {
  const board = mcuBoards[project.board],
    { nets, roots, boardPins } = topologyOf(project),
    find = (id: string) => roots.get(id) ?? id;
  const values = new Map<string, NetValue>(),
    diagnostics: string[] = [];
  const state = new Map(pins.map((pin) => [pin.id, pin]));
  /** Nets held only by pull-up/down resistors; any real output overrides them. */
  const weakRoots = new Set<string>();
  for (const [root, members] of nets) {
    const strong: { voltage: number; duty: number }[] = [],
      weak: number[] = [];
    for (const pin of boardPins.get(root) ?? []) {
      const current = state.get(pin.id);
      if (pin.supply !== undefined) strong.push({ voltage: pin.supply, duty: pin.supply ? 1 : 0 });
      else if (current?.mode === 'OUTPUT' && current.level !== null)
        strong.push({ voltage: current.level * board.voltage, duty: current.duty });
      else if (current?.mode === 'INPUT_PULLUP') weak.push(board.voltage);
      else if (current?.mode === 'INPUT_PULLDOWN') weak.push(0);
    }
    const conflict = strong.some((a) => strong.some((b) => Math.abs(a.voltage - b.voltage) > 0.1));
    const voltage = conflict ? null : (strong[0]?.voltage ?? weak[0] ?? null);
    const value: NetValue = {
      voltage,
      level: voltage === null ? null : voltage >= board.voltage * 0.5 ? 1 : 0,
      duty: conflict ? 0 : (strong[0]?.duty ?? (weak[0] ? 1 : 0)),
      conflict,
      driven: strong.length > 0 || weak.length > 0,
    };
    if (conflict)
      diagnostics.push(
        `Конфликт источников: ${members
          .filter((id) => id.startsWith('board:'))
          .map((id) => id.slice(6))
          .join(', ')}.`,
      );
    if (!strong.length && weak.length) weakRoots.add(root);
    values.set(root, value);
    members.forEach((id) => values.set(id, value));
  }
  function force(terminal: string, voltage: number, label: string, weak = false) {
    const root = find(terminal),
      existing = values.get(root)!;
    if (weak && existing.driven) return;
    const conflict =
      existing.conflict ||
      (existing.driven &&
        !weakRoots.has(root) &&
        existing.voltage !== null &&
        Math.abs(existing.voltage - voltage) > 0.1);
    if (weak) weakRoots.add(root);
    else weakRoots.delete(root);
    const value: NetValue = {
      voltage: conflict ? null : voltage,
      duty: Math.max(0, Math.min(1, voltage / board.voltage)),
      level: conflict ? null : voltage >= board.voltage / 2 ? 1 : 0,
      conflict,
      driven: true,
    };
    values.set(root, value);
    nets.get(root)?.forEach((id) => values.set(id, value));
    if (conflict) diagnostics.push(`Выход «${label}» соединён с другим источником.`);
  }
  /**
   * Pull resistors (2 kΩ and up) do not join their ends: a firmly driven end lends its level to
   * an undriven one as a weak source, which any output then overrides.
   */
  const pulls = project.parts.filter((part) => part.kind === 'resistor' && part.value >= PULL_OHMS);
  function pull() {
    for (let pass = 0; pass < 2; pass++)
      for (const part of pulls) {
        const ends = ['1', '2'].map((pin) => find(partTerminal(part.id, pin)));
        for (const [from, to] of [ends, [...ends].reverse()] as [string, string][]) {
          const source = values.get(from),
            target = values.get(to);
          if (!source?.driven || source.conflict || weakRoots.has(from) || target?.driven) continue;
          const value: NetValue = { ...source, driven: true, conflict: false };
          weakRoots.add(to);
          values.set(to, value);
          nets.get(to)?.forEach((id) => values.set(id, value));
        }
      }
  }
  pull();
  for (const part of project.parts) {
    const definition = partCatalog[part.kind];
    if (!definition.drive && !definition.outputs && !devices?.[part.id]?.analog) continue;
    const supply = definition.supply,
      high = values.get(partTerminal(part.id, supply?.vcc ?? 'VCC'))?.voltage,
      low = values.get(partTerminal(part.id, supply?.gnd ?? 'GND'))?.voltage;
    if (high == null || low == null || (supply && high - low < supply.min)) continue;
    const context = partContext(part);
    for (const [pin, drive] of Object.entries(definition.drive ?? {}))
      force(partTerminal(part.id, pin), drive(context, high, low), part.label);
    for (const [pin, fraction] of Object.entries(devices?.[part.id]?.analog ?? {}))
      if (fraction !== null)
        force(partTerminal(part.id, pin), low + (high - low) * fraction, part.label);
    const latched = devices?.[part.id]?.outputs,
      pullups = devices?.[part.id]?.pullups;
    if (definition.outputs && latched)
      definition.outputs.pins.forEach((pin, index) => {
        const level = latched[index];
        if (level === null || level === undefined) {
          if (pullups?.[index]) force(partTerminal(part.id, pin), high, part.label, true);
          return;
        }
        force(
          partTerminal(part.id, pin),
          level ? high : low,
          part.label,
          Boolean(level) && definition.outputs!.weakHigh,
        );
      });
  }
  pull();
  const inputs: Record<string, number | null> = {};
  for (const pin of board.pins)
    if (pin.gpio !== undefined || pin.adc !== undefined)
      inputs[pin.id] = values.get(boardTerminal(pin.id))?.voltage ?? null;
  for (const pin of board.pins) {
    const voltage = inputs[pin.id],
      current = state.get(pin.id);
    if (pin.supply === undefined && voltage != null && voltage > board.voltage + 0.2)
      diagnostics.push(pin.id + ': напряжение превышает ' + board.voltage + ' В.');
    if (pin.inputOnly && current?.mode === 'OUTPUT')
      diagnostics.push(pin.id + ': контакт поддерживает только вход.');
    if (
      reservedPins(project.board, project.module).includes(pin.id) &&
      project.wires.some((w) => w.from === boardTerminal(pin.id) || w.to === boardTerminal(pin.id))
    )
      diagnostics.push(pin.id + ': зарезервирован для PSRAM выбранного модуля.');
  }
  const leds: Record<string, number[]> = {};
  const hasResistor = (terminal: string) =>
    (nets.get(find(terminal)) ?? []).some((id) =>
      project.parts.some(
        (candidate) => candidate.kind === 'resistor' && id.startsWith(`${candidate.id}:`),
      ),
    );
  for (const part of project.parts) {
    const emit = partCatalog[part.kind].emit;
    if (!emit) continue;
    const common = values.get(partTerminal(part.id, emit.cathode)),
      swapped = emit.swappable === true && part.value === 1;
    leds[part.id] = emit.anodes.map((pin) => {
      const own = values.get(partTerminal(part.id, pin)),
        anode = swapped ? common : own,
        cathode = swapped ? own : common;
      if (!anode?.driven || !cathode?.driven || anode.conflict || cathode.conflict) return 0;
      return Math.max(0, anode.duty - cathode.duty);
    });
    if (
      emit.resistor &&
      emit.anodes.some(
        (pin, index) =>
          leds[part.id][index] > 0 &&
          !hasResistor(partTerminal(part.id, pin)) &&
          !hasResistor(partTerminal(part.id, emit.cathode)),
      )
    )
      diagnostics.push(`LED «${part.label}»: добавьте последовательный резистор.`);
  }
  return { values, nets, inputs, leds, diagnostics };
}
export function connectedTerminals(project: McuProject, terminal: string) {
  const result = new Set([terminal]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const wire of project.wires)
      if (result.has(wire.from) || result.has(wire.to))
        for (const id of [wire.from, wire.to])
          if (!result.has(id)) {
            result.add(id);
            changed = true;
          }
  }
  return result;
}
export type WireRole = 'power' | 'ground';
export function wireRoles(project: McuProject): Map<string, WireRole> {
  const parent = new Map<string, string>(),
    find = (id: string): string => {
      const next = parent.get(id);
      if (!next || next === id) return id;
      const root = find(next);
      parent.set(id, root);
      return root;
    };
  for (const wire of project.wires) parent.set(find(wire.from), find(wire.to));
  for (const [lead, hole] of mountLinks(project)) parent.set(find(lead), find(hole));
  const marks = new Map<string, Set<WireRole>>(),
    mark = (terminal: string, role: WireRole) => {
      const root = find(terminal);
      marks.set(root, (marks.get(root) ?? new Set()).add(role));
    };
  for (const pin of mcuBoards[project.board].pins)
    if (pin.supply !== undefined) mark(boardTerminal(pin.id), pin.supply > 0 ? 'power' : 'ground');
  for (const part of project.parts) {
    const supply = partCatalog[part.kind].supply;
    if (supply?.vcc) mark(partTerminal(part.id, supply.vcc), 'power');
    if (supply?.gnd) mark(partTerminal(part.id, supply.gnd), 'ground');
  }
  const roles = new Map<string, WireRole>();
  for (const wire of project.wires) {
    const found = marks.get(find(wire.from));
    if (found?.size === 1) roles.set(wire.id, [...found][0]);
  }
  return roles;
}
export function partPins(project: McuProject, partId: string) {
  const part = project.parts.find((part) => part.id === partId);
  return part ? partPinNames(part).map((pin) => partTerminal(part.id, pin)) : [];
}
