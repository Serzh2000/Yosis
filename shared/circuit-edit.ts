import {
  MAX_NODES,
  MAX_WIRES,
  blocks,
  circuitPins,
  fail,
  nextWireId,
  parseCircuit,
  type CircuitDocument,
  type CircuitNode,
  type CircuitWire,
  type Params,
} from './schematic';

/** Приводит параметры к допустимым: меняет размеры таблицы, обрезает числа по границам. */
export function normalizeParams(
  node: Pick<CircuitNode, 'kind' | 'params'>,
  changes: Params,
): Params {
  const def = blocks[node.kind],
    next: Params = { ...node.params, ...changes };
  for (let round = 0; round < 2; round++)
    for (const spec of def.params) {
      const value = next[spec.key];
      if (spec.type === 'int' && typeof value === 'number') {
        const max = typeof spec.max === 'function' ? spec.max(next) : spec.max;
        next[spec.key] = Math.min(max, Math.max(spec.min, Math.round(value)));
      } else if (spec.type === 'table') {
        const size = 2 ** (next[spec.lengthKey] as number),
          words = (value as string[]).slice(0, size);
        while (words.length < size) words.push('0');
        next[spec.key] = words;
      }
    }
  return next;
}

/** Удаляет провода, у которых контакта больше нет (например, после уменьшения числа входов). */
export function dropDanglingWires(doc: CircuitDocument): CircuitDocument {
  const pins = new Map(
    doc.nodes.map((node) => [node.id, new Set(circuitPins(node).map((pin) => pin.name))]),
  );
  return {
    ...doc,
    wires: doc.wires.filter(
      (wire) =>
        pins.get(wire.from.node)?.has(wire.from.pin) && pins.get(wire.to.node)?.has(wire.to.pin),
    ),
  };
}
export function updateNode(
  doc: CircuitDocument,
  id: string,
  changes: { name?: string; params?: Params; x?: number; y?: number },
): CircuitDocument {
  const nodes = doc.nodes.map((node) =>
    node.id === id
      ? {
          ...node,
          ...(changes.name !== undefined ? { name: changes.name } : {}),
          ...(changes.x !== undefined ? { x: changes.x } : {}),
          ...(changes.y !== undefined ? { y: changes.y } : {}),
          params: changes.params ? normalizeParams(node, changes.params) : node.params,
        }
      : node,
  );
  return dropDanglingWires(parseCircuit(JSON.stringify({ ...doc, nodes })));
}
export function moveNodes(
  doc: CircuitDocument,
  ids: Iterable<string>,
  dx: number,
  dy: number,
): CircuitDocument {
  const set = new Set(ids),
    clamp = (value: number) => Math.max(-10000, Math.min(10000, value));
  return {
    ...doc,
    nodes: doc.nodes.map((node) =>
      set.has(node.id) ? { ...node, x: clamp(node.x + dx), y: clamp(node.y + dy) } : node,
    ),
  };
}
export function rotateNodes(
  doc: CircuitDocument,
  ids: Iterable<string>,
  flip = false,
): CircuitDocument {
  const set = new Set(ids);
  return {
    ...doc,
    nodes: doc.nodes.map((node) =>
      set.has(node.id)
        ? flip
          ? { ...node, flip: !node.flip }
          : { ...node, rot: ((node.rot + 90) % 360) as CircuitNode['rot'] }
        : node,
    ),
  };
}
export type AlignMode =
  'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter' | 'hdistribute' | 'vdistribute';
export function alignNodes(
  doc: CircuitDocument,
  ids: Iterable<string>,
  mode: AlignMode,
  size: (node: CircuitNode) => { width: number; height: number },
): CircuitDocument {
  const set = new Set(ids),
    picked = doc.nodes.filter((node) => set.has(node.id));
  if (picked.length < 2) return doc;
  const box = (node: CircuitNode) => ({ ...size(node), x: node.x, y: node.y });
  const boxes = new Map(picked.map((node) => [node.id, box(node)]));
  const left = Math.min(...picked.map((node) => node.x)),
    right = Math.max(...picked.map((node) => node.x + boxes.get(node.id)!.width)),
    top = Math.min(...picked.map((node) => node.y)),
    bottom = Math.max(...picked.map((node) => node.y + boxes.get(node.id)!.height));
  const snap = (value: number) => Math.round(value / 10) * 10;
  const positions = new Map<string, { x?: number; y?: number }>();
  if (mode === 'hdistribute' || mode === 'vdistribute') {
    if (picked.length < 3) return doc;
    const horizontal = mode === 'hdistribute',
      sorted = [...picked].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y)),
      total = sorted.reduce(
        (sum, node) => sum + (horizontal ? boxes.get(node.id)!.width : boxes.get(node.id)!.height),
        0,
      ),
      span = horizontal ? right - left : bottom - top,
      gap = (span - total) / (sorted.length - 1);
    let cursor = horizontal ? left : top;
    for (const node of sorted) {
      positions.set(node.id, horizontal ? { x: snap(cursor) } : { y: snap(cursor) });
      cursor += (horizontal ? boxes.get(node.id)!.width : boxes.get(node.id)!.height) + gap;
    }
  } else
    for (const node of picked) {
      const b = boxes.get(node.id)!;
      positions.set(
        node.id,
        mode === 'left'
          ? { x: left }
          : mode === 'right'
            ? { x: snap(right - b.width) }
            : mode === 'top'
              ? { y: top }
              : mode === 'bottom'
                ? { y: snap(bottom - b.height) }
                : mode === 'hcenter'
                  ? { x: snap((left + right) / 2 - b.width / 2) }
                  : { y: snap((top + bottom) / 2 - b.height / 2) },
      );
    }
  return {
    ...doc,
    nodes: doc.nodes.map((node) =>
      positions.has(node.id) ? { ...node, ...positions.get(node.id) } : node,
    ),
  };
}

export const CLIPBOARD_FORMAT = 'yosis-schematic-clip';
/** Выделение → текст для буфера обмена. Проводы берутся только между выделенными элементами. */
export function serializeSelection(doc: CircuitDocument, ids: Iterable<string>): string {
  const set = new Set(ids);
  return JSON.stringify({
    format: CLIPBOARD_FORMAT,
    version: 2,
    nodes: doc.nodes.filter((node) => set.has(node.id)),
    wires: doc.wires.filter((wire) => set.has(wire.from.node) && set.has(wire.to.node)),
  });
}
export function isClipboardText(text: string): boolean {
  return text.trimStart().startsWith('{') && text.includes(CLIPBOARD_FORMAT);
}
/** Вставка из текста: элементы получают новые ID и уникальные имена. Возвращает новый документ и ID вставленного. */
export function pasteSelection(
  doc: CircuitDocument,
  text: string,
  dx: number,
  dy: number,
): { doc: CircuitDocument; ids: string[] } {
  let clip: { format?: string; version?: number; nodes?: unknown; wires?: unknown };
  try {
    clip = JSON.parse(text);
  } catch {
    return fail('в буфере обмена нет схемы.');
  }
  if (clip.format !== CLIPBOARD_FORMAT || clip.version !== 2)
    return fail('в буфере обмена нет схемы Yosis.');
  // Проверяем фрагмент теми же правилами, что и документ.
  const parsed = parseCircuit(
    JSON.stringify({ format: 'yosis-schematic', version: 2, nodes: clip.nodes, wires: clip.wires }),
  );
  if (doc.nodes.length + parsed.nodes.length > MAX_NODES)
    return fail(`достигнут предел ${MAX_NODES} элементов.`);
  if (doc.wires.length + parsed.wires.length > MAX_WIRES)
    return fail('достигнут предел соединений.');
  const idMap = new Map<string, string>(),
    used = new Set(doc.nodes.map((node) => node.id)),
    names = new Set(doc.nodes.map((node) => node.name));
  let counter = Math.max(0, ...doc.nodes.map((node) => Number(node.id.slice(1))));
  const nodes: CircuitNode[] = parsed.nodes.map((node) => {
    do counter++;
    while (used.has(`n${counter}`));
    const id = `n${counter}`;
    used.add(id);
    idMap.set(node.id, id);
    let name = node.name;
    if (node.kind !== 'tag_in' && names.has(name)) {
      const stem = name.replace(/_copy\d*$/, '');
      let index = 1;
      while (names.has(`${stem}_copy${index}`)) index++;
      name = `${stem}_copy${index}`;
    }
    names.add(name);
    return {
      ...node,
      id,
      name,
      x: Math.max(-10000, Math.min(10000, node.x + dx)),
      y: Math.max(-10000, Math.min(10000, node.y + dy)),
    };
  });
  let next: CircuitDocument = { ...doc, nodes: [...doc.nodes, ...nodes] };
  const wires: CircuitWire[] = [];
  for (const wire of parsed.wires) {
    const id = nextWireId({ ...next, wires: [...next.wires, ...wires] });
    wires.push({
      id,
      from: { node: idMap.get(wire.from.node)!, pin: wire.from.pin },
      to: { node: idMap.get(wire.to.node)!, pin: wire.to.pin },
    });
  }
  next = { ...next, wires: [...next.wires, ...wires] };
  return { doc: next, ids: nodes.map((node) => node.id) };
}
