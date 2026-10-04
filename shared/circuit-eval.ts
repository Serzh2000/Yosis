import { blocks, circuitPins } from './circuit-registry';
import type { CircuitDocument, CircuitNode, EvalContext, Params, State } from './circuit-types';
import { resolveSource } from './schematic';
import { mask, Unknown } from './circuit-util';

/**
 * Быстрый предпросмотр схемы в браузере. Двузначная модель (0/1) плюс «неизвестно» (null)
 * для триггеров без начального значения. Настоящая проверка — симуляция Icarus на вкладках
 * «Диаграммы» и «Виртуальная»; тесты сравнивают этот вычислитель с Verilog.
 */
export type PreviewState = Record<string, State>;
export interface PreviewOptions {
  /** Ускорить делители и антидребезг: период становится несколькими тактами. */
  fast?: boolean;
}
export type PreviewValues = Map<string, bigint | null>;

function effectiveParams(node: CircuitNode, options: PreviewOptions): Params {
  if (!options.fast) return node.params;
  if (node.kind === 'divider') {
    const hz = node.params.hz as number;
    return { ...node.params, clockHz: Math.max(1, Math.round(hz * 4)) };
  }
  if (node.kind === 'debounce')
    return { ...node.params, clockHz: Math.max(1, Math.round(3000 / (node.params.ms as number))) };
  return node.params;
}

const orders = new WeakMap<CircuitDocument, CircuitNode[]>();
function order(doc: CircuitDocument): CircuitNode[] {
  const cached = orders.get(doc);
  if (cached) return cached;
  const byId = new Map(doc.nodes.map((node) => [node.id, node])),
    next = new Map(doc.nodes.map((node) => [node.id, [] as string[]]));
  const tagOuts = new Map(
    doc.nodes.filter((node) => node.kind === 'tag_out').map((node) => [node.name, node.id]),
  );
  for (const node of doc.nodes.filter((value) => value.kind === 'tag_in')) {
    const out = tagOuts.get(node.name);
    if (out) next.get(out)!.push(node.id);
  }
  for (const wire of doc.wires) {
    const target = byId.get(wire.to.node);
    if (!target || !next.has(wire.from.node)) continue;
    const comb =
      blocks[target.kind].comb?.(target.params) ?? circuitPins(target).map((pin) => pin.name);
    if (comb.includes(wire.to.pin)) next.get(wire.from.node)!.push(target.id);
  }
  const seen = new Set<string>(),
    result: CircuitNode[] = [];
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const child of next.get(id) ?? []) visit(child);
    result.push(byId.get(id)!);
  };
  for (const node of doc.nodes) visit(node.id);
  result.reverse();
  orders.set(doc, result);
  return result;
}

export function previewInit(doc: CircuitDocument, options: PreviewOptions = {}): PreviewState {
  return Object.fromEntries(
    doc.nodes.map((node) => [
      node.id,
      blocks[node.kind].init?.(effectiveParams(node, options)) ?? {},
    ]),
  );
}
export function previewSetInput(
  state: PreviewState,
  nodeId: string,
  value: bigint,
  width: number,
): PreviewState {
  return { ...state, [nodeId]: { v: value & mask(width) } };
}
function context(
  doc: CircuitDocument,
  node: CircuitNode,
  state: PreviewState,
  values: PreviewValues,
  options: PreviewOptions,
  sources: Map<string, string>,
): EvalContext {
  const pins = circuitPins(node);
  return {
    p: effectiveParams(node, options),
    state: state[node.id] ?? {},
    in: (pin) => {
      const from = sources.get(`${node.id}.${pin}`);
      return from === undefined ? null : (values.get(from) ?? null);
    },
    width: (pin) => pins.find((value) => value.name === pin)?.width ?? 1,
  };
}
function evaluate(
  doc: CircuitDocument,
  state: PreviewState,
  options: PreviewOptions,
): { values: PreviewValues; sources: Map<string, string> } {
  const values: PreviewValues = new Map(),
    tags = new Map<string, bigint | null>(),
    sources = new Map(
      doc.wires.map((wire) => [
        `${wire.to.node}.${wire.to.pin}`,
        `${wire.from.node}.${wire.from.pin}`,
      ]),
    );
  for (const node of order(doc)) {
    const ctx = context(doc, node, state, values, options, sources);
    if (node.kind === 'tag_out') {
      tags.set(node.name, ctx.in('A'));
      continue;
    }
    if (node.kind === 'tag_in') {
      values.set(`${node.id}.Y`, tags.get(node.name) ?? null);
      continue;
    }
    for (const [pin, value] of Object.entries(blocks[node.kind].outputs(ctx)))
      values.set(`${node.id}.${pin}`, value);
  }
  return { values, sources };
}
/** Применяет асинхронные сбросы и возвращает установившиеся значения. */
export function previewSettle(
  doc: CircuitDocument,
  state: PreviewState,
  options: PreviewOptions = {},
): { state: PreviewState; values: PreviewValues } {
  let current = state;
  for (let round = 0; round < 6; round++) {
    const { values, sources } = evaluate(doc, current, options);
    let changed = false;
    const updated = { ...current };
    for (const node of doc.nodes) {
      const def = blocks[node.kind];
      if (!def.async) continue;
      const ctx = context(doc, node, current, values, options, sources),
        result = def.async(ctx);
      if (!result) continue;
      const before = current[node.id] ?? {};
      if (Object.keys(result).some((key) => before[key] !== result[key])) {
        updated[node.id] = { ...before, ...result };
        changed = true;
      }
    }
    if (!changed) return { state: current, values };
    current = updated;
  }
  return { state: current, values: evaluate(doc, current, options).values };
}
/** Узлы-входы, от которых работают триггеры: можно «подавать такт». */
export function previewClockSources(doc: CircuitDocument): string[] {
  const result = new Set<string>();
  for (const wire of doc.wires) {
    const target = doc.nodes.find((node) => node.id === wire.to.node);
    if (!target || !circuitPins(target).some((pin) => pin.name === wire.to.pin && pin.clock))
      continue;
    const origin = resolveSource(doc, wire.from);
    if (origin) result.add(origin.node);
  }
  return [...result];
}
/** Один положительный фронт такта: новые состояния считаются по значениям до фронта. */
export function previewStep(
  doc: CircuitDocument,
  state: PreviewState,
  clockNode?: string,
  options: PreviewOptions = {},
): PreviewState {
  const { state: settled, values } = previewSettle(doc, state, options);
  const sources = new Map(
    doc.wires.map((wire) => [
      `${wire.to.node}.${wire.to.pin}`,
      `${wire.from.node}.${wire.from.pin}`,
    ]),
  );
  const updated: PreviewState = { ...settled };
  for (const node of doc.nodes) {
    const def = blocks[node.kind];
    if (!def.next) continue;
    const wire = doc.wires.find((value) => value.to.node === node.id && value.to.pin === 'CLK');
    if (!wire) continue;
    if (clockNode && resolveSource(doc, wire.from)?.node !== clockNode) continue;
    const ctx = context(doc, node, settled, values, options, sources);
    try {
      updated[node.id] = { ...(settled[node.id] ?? {}), ...def.next(ctx) };
    } catch (error) {
      if (!(error instanceof Unknown)) throw error;
      updated[node.id] = Object.fromEntries(
        Object.keys(settled[node.id] ?? {}).map((key) => [key, null]),
      );
    }
  }
  return previewSettle(doc, updated, options).state;
}
export function previewValues(
  doc: CircuitDocument,
  state: PreviewState,
  options: PreviewOptions = {},
): PreviewValues {
  return previewSettle(doc, state, options).values;
}
