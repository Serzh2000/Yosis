import type { Project, SourceFile } from './types';
import { validIdentifier } from './verilog-identifiers';
import { RequestError } from './errors';
import { blocks, circuitPins, libraryEntry } from './circuit-registry';
import { migrateV1 } from './circuit-migrate';
import {
  blockKinds,
  type BoardAssignment,
  type CircuitDocument,
  type CircuitIssue,
  type CircuitNode,
  type CircuitWire,
  type Endpoint,
  type ParamSpec,
  type Params,
  type BlockKind,
} from './circuit-types';
import { lit, range } from './circuit-util';

export * from './circuit-types';
export {
  circuitPins,
  blocks,
  blockDef,
  library,
  libraryEntry,
  categories,
} from './circuit-registry';
export { dividerPlan, formatHz, formatSeconds } from './circuit-blocks-memory';

export const MAX_NODES = 400;
export const MAX_WIRES = 3000;
/** Каталог в прежнем виде: (вид, название, пояснение). */
export const blockCatalog = blockKinds.map(
  (kind) => [kind, blocks[kind].title, blocks[kind].help] as const,
);

export const fail = (message: string): never => {
  throw new RequestError(`Схема: ${message}`);
};
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

function paramError(spec: ParamSpec, value: unknown, params: Params): string | null {
  const bad = `неверное значение параметра «${spec.label}»`;
  switch (spec.type) {
    case 'int': {
      const max = typeof spec.max === 'function' ? spec.max(params) : spec.max;
      return integer(value, spec.min, max) ? null : `${bad}: нужно целое от ${spec.min} до ${max}`;
    }
    case 'float':
      return typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= spec.min &&
        value <= spec.max
        ? null
        : `${bad}: нужно число от ${spec.min} до ${spec.max}`;
    case 'bool':
      return typeof value === 'boolean' ? null : bad;
    case 'select':
      return (typeof value === 'string' || typeof value === 'number') &&
        spec.options.some(([key]) => key === String(value))
        ? null
        : bad;
    case 'multi':
      return Array.isArray(value) &&
        new Set(value).size === value.length &&
        value.every((item) => spec.options.some(([key]) => key === item))
        ? null
        : bad;
    case 'mask':
      return integer(value, 0, 255) ? null : bad;
    case 'big':
      return typeof value === 'string' && /^[0-9]{1,20}$/.test(value) ? null : bad;
    case 'table':
      return Array.isArray(value) &&
        value.length <= 64 &&
        value.every((item) => typeof item === 'string' && /^[0-9]{1,20}$/.test(item))
        ? null
        : bad;
    case 'text':
      return typeof value === 'string' &&
        value.length <= spec.maxLength &&
        !Array.from(value).some((char) => char.charCodeAt(0) < 9)
        ? null
        : bad;
  }
}
function checkParams(kind: BlockKind, params: unknown): Params {
  const def = blocks[kind];
  if (!params || typeof params !== 'object' || Array.isArray(params))
    return fail('нет параметров элемента.');
  const given = params as Record<string, unknown>,
    keys = Object.keys(def.defaults);
  if (Object.keys(given).some((key) => !keys.includes(key)))
    return fail(`неизвестные параметры элемента ${def.title}.`);
  for (const key of keys) {
    const spec = def.params.find((value) => value.key === key);
    if (!spec || !(key in given)) return fail(`у элемента ${def.title} нет параметра ${key}.`);
    const error =
      spec.type === 'select' && typeof given[key] !== typeof def.defaults[key]
        ? `неверное значение параметра «${spec.label}»`
        : paramError(spec, given[key], given as Params);
    if (error) return fail(`${def.title}: ${error}.`);
  }
  return Object.fromEntries(keys.map((key) => [key, structuredClone(given[key])])) as Params;
}

const nodeId = /^n[0-9]{1,9}$/,
  wireId = /^w[0-9]{1,9}$/,
  pinName = /^[A-Z][A-Z0-9]*$/;
export function parseCircuit(content: string): CircuitDocument {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return fail('файл .ysch должен содержать JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('нет документа.');
  const raw = value as Record<string, unknown>;
  if (raw.format !== 'yosis-schematic' || (raw.version !== 1 && raw.version !== 2))
    return fail('неподдерживаемый формат или версия .ysch.');
  const doc = (raw.version === 1 ? migrateV1(raw) : raw) as unknown as CircuitDocument;
  if (raw.version === 2) {
    const allowed = ['format', 'version', 'nodes', 'wires'];
    if (Object.keys(raw).some((key) => !allowed.includes(key)))
      return fail('в документе есть неизвестные поля.');
  }
  if (
    !Array.isArray(doc.nodes) ||
    doc.nodes.length > MAX_NODES ||
    !Array.isArray(doc.wires) ||
    doc.wires.length > MAX_WIRES
  )
    return fail(`максимум ${MAX_NODES} элементов и ${MAX_WIRES} соединений.`);
  const ids = new Set<string>(),
    nodes: CircuitNode[] = [];
  const nodeKeys = ['id', 'kind', 'name', 'x', 'y', 'rot', 'flip', 'params'];
  for (const node of doc.nodes) {
    if (
      !node ||
      typeof node !== 'object' ||
      typeof node.id !== 'string' ||
      !nodeId.test(node.id) ||
      ids.has(node.id)
    )
      return fail('неверный или повторяющийся ID элемента.');
    ids.add(node.id);
    if (
      Object.keys(node).some((key) => !nodeKeys.includes(key)) ||
      nodeKeys.some((key) => !(key in node))
    )
      return fail(`неверные свойства элемента ${node.id}.`);
    if (
      !(blockKinds as readonly string[]).includes(node.kind) ||
      typeof node.name !== 'string' ||
      !validIdentifier(node.name) ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      Math.abs(node.x) > 10000 ||
      Math.abs(node.y) > 10000 ||
      ![0, 90, 180, 270].includes(node.rot) ||
      typeof node.flip !== 'boolean'
    )
      return fail(`неверные свойства элемента ${node.id}.`);
    nodes.push({
      id: node.id,
      kind: node.kind,
      name: node.name,
      x: node.x,
      y: node.y,
      rot: node.rot,
      flip: node.flip,
      params: checkParams(node.kind, node.params),
    });
  }
  ids.clear();
  const wires: CircuitWire[] = [];
  for (const wire of doc.wires) {
    if (
      !wire ||
      typeof wire !== 'object' ||
      typeof wire.id !== 'string' ||
      !wireId.test(wire.id) ||
      ids.has(wire.id)
    )
      return fail('неверный или повторяющийся ID соединения.');
    ids.add(wire.id);
    for (const endpoint of [wire.from, wire.to])
      if (
        !endpoint ||
        typeof endpoint.node !== 'string' ||
        !nodeId.test(endpoint.node) ||
        typeof endpoint.pin !== 'string' ||
        !pinName.test(endpoint.pin)
      )
        return fail(`неверный контакт в ${wire.id}.`);
    wires.push({
      id: wire.id,
      from: { node: wire.from.node, pin: wire.from.pin },
      to: { node: wire.to.node, pin: wire.to.pin },
    });
  }
  return { format: 'yosis-schematic', version: 2, nodes, wires };
}

const endpointKey = (endpoint: Endpoint) => `${endpoint.node}.${endpoint.pin}`;
function freeIndex(ids: string[], prefix: string): number {
  const used = new Set(ids);
  const next = Math.max(0, ...ids.map((id) => Number(id.slice(1)))) + 1;
  if (next <= 999999999 && !used.has(`${prefix}${next}`)) return next;
  let index = 1;
  while (used.has(`${prefix}${index}`)) index++;
  return index;
}
export const nextWireId = (doc: CircuitDocument) =>
  `w${freeIndex(
    doc.wires.map((wire) => wire.id),
    'w',
  )}`;

/** Источник сигнала с учётом меток: метка «принять» берёт сигнал у одноимённой метки «передать». */
export function resolveSource(
  doc: CircuitDocument,
  endpoint: Endpoint,
  depth = 0,
): Endpoint | null {
  const node = doc.nodes.find((value) => value.id === endpoint.node);
  if (!node) return null;
  if (node.kind !== 'tag_in') return endpoint;
  const out = doc.nodes.find((value) => value.kind === 'tag_out' && value.name === node.name);
  const wire = out && doc.wires.find((value) => value.to.node === out.id && value.to.pin === 'A');
  return wire && depth < 32 ? resolveSource(doc, wire.from, depth + 1) : null;
}

/** Имя цепи Verilog для вывода (или внутренней цепи, если pin начинается с «_»). */
function netName(node: CircuitNode, pin: string): string {
  const def = blocks[node.kind];
  if (def.port?.direction === 'input') return node.name;
  const outs = def.pins(node.params).filter((value) => value.direction === 'output');
  return outs.length === 1 ? node.name : `${node.name}_${pin.toLowerCase()}`;
}
const internalName = (node: CircuitNode, suffix: string) =>
  suffix === '' ? node.name : `${node.name}_${suffix}`;

interface NetDecl {
  name: string;
  width: number;
  reg: boolean;
  init?: bigint;
}
function declaredNets(node: CircuitNode): NetDecl[] {
  const def = blocks[node.kind];
  if (def.virtual || def.port) return [];
  const regs = def.regs?.(node.params) ?? [],
    result: NetDecl[] = [];
  for (const pin of def.pins(node.params).filter((value) => value.direction === 'output')) {
    const decl = regs.find((value) => !value.internal && value.key === pin.name);
    result.push({ name: netName(node, pin.name), width: pin.width, reg: !!decl, init: decl?.init });
  }
  for (const decl of regs.filter((value) => value.internal))
    result.push({
      name: internalName(node, decl.key),
      width: decl.width,
      reg: true,
      init: decl.init,
    });
  for (const wire of def.wires?.(node.params) ?? [])
    result.push({ name: internalName(node, wire.key), width: wire.width, reg: false });
  return result;
}

export function boardAssignments(doc: CircuitDocument): BoardAssignment[] {
  return doc.nodes.flatMap((node) => blocks[node.kind].port?.board?.(node.params, node.name) ?? []);
}

const sourceClockKinds: BlockKind[] = ['input', 'button', 'clock27'];
export function circuitProblems(doc: CircuitDocument): CircuitIssue[] {
  const issues: CircuitIssue[] = [],
    nodes = new Map(doc.nodes.map((node) => [node.id, node])),
    drivers = new Map<string, number>(),
    used = new Map<string, string>();
  const error = (issue: Omit<CircuitIssue, 'severity'>) =>
    issues.push({ ...issue, severity: 'error' });
  const warning = (issue: Omit<CircuitIssue, 'severity'>) =>
    issues.push({ ...issue, severity: 'warning' });
  const seenNames = new Map<string, CircuitNode>();
  for (const node of doc.nodes) {
    const def = blocks[node.kind];
    for (const message of def.check?.(node.params) ?? [])
      error({ node: node.id, message: `${node.name}: ${message}.` });
    if (def.virtual && node.kind !== 'tag_in') continue;
    if (/^__ys_/.test(node.name))
      error({
        node: node.id,
        message: `${node.name}: префикс __ys_ зарезервирован для внутренних связей.`,
      });
    if (node.kind !== 'tag_in') {
      if (seenNames.has(node.name))
        error({
          node: node.id,
          message: `Имя ${node.name} повторяется. Дайте элементам разные имена: двойным щелчком по элементу.`,
        });
      seenNames.set(node.name, node);
    }
    for (const decl of [
      ...declaredNets(node),
      ...(def.port ? [{ name: node.name, width: 0, reg: false }] : []),
    ]) {
      const other = used.get(decl.name);
      if (other && other !== node.id && node.kind !== 'tag_in')
        error({
          node: node.id,
          message: `Имя цепи ${decl.name} получается у двух элементов (${nodes.get(other)?.name} и ${node.name}). Переименуйте один из них.`,
        });
      used.set(decl.name, node.id);
    }
  }
  // Ресурсы платы можно занять только один раз.
  const pins = new Map<number, CircuitNode>();
  for (const node of doc.nodes)
    for (const item of blocks[node.kind].port?.board?.(node.params, node.name) ?? []) {
      const other = pins.get(item.pin);
      if (other && other.id !== node.id)
        error({
          node: node.id,
          message: `${node.name}: вывод платы ${item.pin} уже занят элементом ${other.name}. Каждую кнопку и светодиод можно использовать один раз.`,
        });
      pins.set(item.pin, node);
    }
  const outputsByName = new Map(
    doc.nodes.filter((node) => node.kind === 'tag_out').map((node) => [node.name, node]),
  );
  for (const node of doc.nodes.filter((node) => node.kind === 'tag_in')) {
    const out = outputsByName.get(node.name);
    if (!out)
      error({
        node: node.id,
        message: `Метка «принять» ${node.name} не нашла метку «передать» с таким именем. Поставьте метку «передать» на нужный провод.`,
      });
    else if (out.params.width !== node.params.width)
      error({
        node: node.id,
        message: `Метки ${node.name} имеют разную ширину: ${out.params.width} и ${node.params.width} бит.`,
      });
  }
  const adjacency = new Map(doc.nodes.map((node) => [node.id, new Set<string>()]));
  for (const node of doc.nodes.filter((node) => node.kind === 'tag_in')) {
    const out = outputsByName.get(node.name);
    if (out) adjacency.get(out.id)!.add(node.id);
  }
  for (const wire of doc.wires) {
    const a = nodes.get(wire.from.node),
      b = nodes.get(wire.to.node),
      source = a && circuitPins(a).find((pin) => pin.name === wire.from.pin),
      target = b && circuitPins(b).find((pin) => pin.name === wire.to.pin);
    if (!source || !target) {
      error({
        wire: wire.id,
        message: `${wire.id}: контакт отсутствует. Удалите этот провод и проведите его заново.`,
      });
      continue;
    }
    if (source.direction !== 'output' || target.direction !== 'input') {
      error({ wire: wire.id, message: `${wire.id}: соединяйте выход с входом.` });
      continue;
    }
    if (source.width !== target.width)
      error({
        wire: wire.id,
        node: b!.id,
        pin: target.name,
        message: `${a!.name}.${source.name} (${source.width} бит) → ${b!.name}.${target.name} (${target.width} бит): ширины не совпадают. Вставьте «Срез шины» или «Расширение шины» либо поменяйте ширину.`,
      });
    if (target.clock) {
      const origin = resolveSource(doc, wire.from),
        originNode = origin && nodes.get(origin.node);
      if (!originNode || !sourceClockKinds.includes(originNode.kind))
        error({
          wire: wire.id,
          node: b!.id,
          pin: target.name,
          message: `${b!.name}.${target.name}: такт должен приходить непосредственно со входа устройства или «Такта 27 МГц». Для медленной работы используйте «Делитель частоты» и вход разрешения EN.`,
        });
    }
    const key = endpointKey(wire.to);
    drivers.set(key, (drivers.get(key) ?? 0) + 1);
    const combinational =
      blocks[b!.kind].comb?.(b!.params) ?? circuitPins(b!).map((pin) => pin.name);
    if (combinational.includes(target.name)) adjacency.get(a!.id)!.add(b!.id);
  }
  for (const node of doc.nodes)
    for (const pin of circuitPins(node).filter((pin) => pin.direction === 'input')) {
      const count = drivers.get(`${node.id}.${pin.name}`) ?? 0;
      if (count !== 1)
        error({
          node: node.id,
          pin: pin.name,
          message: count
            ? `${node.name}.${pin.name}: несколько источников. К одному входу можно подключить только один провод.`
            : `${node.name}.${pin.name}: вход не соединён. Протяните провод от выхода другого элемента к этому входу.`,
        });
    }
  const visited = new Set<string>(),
    active = new Set<string>();
  let loopNode = '';
  function visit(id: string): boolean {
    if (active.has(id)) {
      loopNode = id;
      return true;
    }
    if (visited.has(id)) return false;
    active.add(id);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    active.delete(id);
    visited.add(id);
    return false;
  }
  if (doc.nodes.some((node) => visit(node.id)))
    error({
      node: loopNode,
      message:
        'Комбинационная петля. Выход элемента возвращается на его же вход без триггера. Обратная связь должна проходить через регистр или счётчик.',
    });
  if (!doc.nodes.some((node) => blocks[node.kind].port?.direction === 'output'))
    error({ message: 'Добавьте хотя бы один выход устройства или светодиод.' });
  // Предупреждения: схема соберётся, но, скорее всего, это недосмотр.
  const connectedOut = new Set(doc.wires.map((wire) => endpointKey(wire.from)));
  for (const node of doc.nodes) {
    const def = blocks[node.kind];
    if (def.virtual && node.kind !== 'tag_in') continue;
    const outs = circuitPins(node).filter((pin) => pin.direction === 'output');
    if (outs.length && !outs.some((pin) => connectedOut.has(`${node.id}.${pin.name}`)))
      warning({
        node: node.id,
        message: def.port
          ? `${node.name}: вход устройства нигде не используется.`
          : `${node.name}: выход никуда не подключён, элемент ничего не делает. Подключите его или удалите.`,
      });
  }
  return issues;
}
/** Ошибки, мешающие сборке (без предупреждений). */
export const circuitIssues = (doc: CircuitDocument): CircuitIssue[] =>
  circuitProblems(doc).filter((issue) => issue.severity !== 'warning');

export function connectCircuit(
  doc: CircuitDocument,
  from: Endpoint,
  to: Endpoint,
  replace?: string,
): CircuitDocument {
  const base = replace ? { ...doc, wires: doc.wires.filter((wire) => wire.id !== replace) } : doc;
  const a = base.nodes.find((node) => node.id === from.node),
    b = base.nodes.find((node) => node.id === to.node),
    source = a && circuitPins(a).find((pin) => pin.name === from.pin),
    target = b && circuitPins(b).find((pin) => pin.name === to.pin);
  if (!source || !target || source.direction !== 'output' || target.direction !== 'input')
    return fail('выберите выход, затем вход.');
  if (source.width !== target.width)
    return fail(`ширины ${source.width} и ${target.width} не совпадают.`);
  if (base.wires.some((wire) => endpointKey(wire.to) === endpointKey(to)))
    return fail('этот вход уже соединён. Удалите старое соединение.');
  if (base.wires.length >= MAX_WIRES) return fail('достигнут предел соединений.');
  const next = {
    ...base,
    wires: [...base.wires, { id: replace ?? nextWireId(base), from, to }],
  };
  if (circuitIssues(next).some((issue) => issue.message.startsWith('Комбинационная петля')))
    return fail('это соединение создаёт комбинационную петлю.');
  return next;
}
export function removeCircuitNodes(doc: CircuitDocument, ids: Iterable<string>): CircuitDocument {
  const removed = new Set(ids);
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => !removed.has(node.id)),
    wires: doc.wires.filter((wire) => !removed.has(wire.from.node) && !removed.has(wire.to.node)),
  };
}
export const removeCircuitNode = (doc: CircuitDocument, id: string): CircuitDocument =>
  removeCircuitNodes(doc, [id]);

function uniqueName(doc: CircuitDocument, base: string): string {
  const names = new Set(doc.nodes.map((node) => node.name));
  for (let index = 1; ; index++) if (!names.has(`${base}${index}`)) return `${base}${index}`;
}
export function newCircuitNode(
  doc: CircuitDocument,
  kind: BlockKind,
  params: Partial<Params> = {},
  base: string = kind,
): CircuitNode {
  if (doc.nodes.length >= MAX_NODES) return fail(`достигнут предел ${MAX_NODES} элементов.`);
  const index = freeIndex(
    doc.nodes.map((node) => node.id),
    'n',
  );
  return {
    id: `n${index}`,
    kind,
    name: uniqueName(doc, base),
    x: 80 + ((index - 1) % 5) * 170,
    y: 90 + (Math.floor((index - 1) / 5) % 4) * 145,
    rot: 0,
    flip: false,
    params: { ...structuredClone(blocks[kind].defaults), ...params } as Params,
  };
}
/** Новый элемент из библиотеки; кнопки и светодиоды сразу получают свободный номер. */
export function newLibraryNode(doc: CircuitDocument, entryId: string): CircuitNode {
  const entry = libraryEntry(entryId);
  if (!entry) return fail(`в библиотеке нет элемента ${entryId}.`);
  const node = newCircuitNode(doc, entry.kind, entry.params ?? {}, entry.base);
  if (entry.kind === 'led') {
    const used = new Set(
      doc.nodes.filter((value) => value.kind === 'led').map((value) => value.params.index),
    );
    const free = [0, 1, 2, 3, 4, 5].find((value) => !used.has(value));
    if (free !== undefined) {
      node.params.index = free;
      node.name = uniqueName(doc, `led${free}_`).replace(/_1$/, '');
    }
  } else if (entry.kind === 'button') {
    const taken = new Set(
      doc.nodes.filter((value) => value.kind === 'button').map((value) => value.params.which),
    );
    node.params.which = taken.has('s1') ? 's2' : 's1';
    node.name = uniqueName(doc, `${node.params.which as string}_`).replace(/_1$/, '');
  } else if (entry.kind === 'clock27') node.name = uniqueName(doc, 'clk_').replace(/_1$/, '');
  return node;
}

export function compileCircuit(doc: CircuitDocument, top: string): string {
  if (!validIdentifier(top)) return fail('неверное имя верхнего модуля.');
  const issues = circuitIssues(doc);
  if (issues.length) return fail(issues.map((issue) => issue.message).join('\n'));
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const signal = (endpoint: Endpoint): string => {
    const origin = resolveSource(doc, endpoint)!,
      node = byId.get(origin.node)!;
    return netName(node, origin.pin);
  };
  const tagNet = (node: CircuitNode) => node.name;
  const sourceOf = (node: CircuitNode, pin: string): string => {
    const wire = doc.wires.find((value) => value.to.node === node.id && value.to.pin === pin)!;
    const from = byId.get(wire.from.node)!;
    return from.kind === 'tag_in' ? tagNet(from) : signal(wire.from);
  };
  const ports = doc.nodes.filter((node) => blocks[node.kind].port);
  const portWidth = (node: CircuitNode) => circuitPins(node)[0].width;
  const lines = [
    '// Создано Yosis из исходной схемы .ysch. Не правьте этот файл: меняйте схему в Конструкторе.',
    '// Каждый элемент схемы описан отдельным разделом с комментарием: так видно, как рисунок превращается в Verilog.',
    `module ${top} (`,
    ports
      .map(
        (node) =>
          `    ${blocks[node.kind].port!.direction} wire ${range(portWidth(node))}${node.name}`,
      )
      .join(',\n'),
    ');',
  ];
  const declarations = doc.nodes.flatMap((node) =>
    declaredNets(node).map(
      (decl) =>
        `    ${decl.reg ? 'reg' : 'wire'} ${range(decl.width)}${decl.name}${decl.init !== undefined ? ` = ${lit(decl.width, decl.init)}` : ''}; // ${node.name}`,
    ),
  );
  if (declarations.length) lines.push('', '    // Цепи между элементами', ...declarations);
  for (const node of doc.nodes) {
    const def = blocks[node.kind];
    if (def.virtual || def.port?.direction === 'input') continue;
    lines.push('', `    // ${node.name}: ${def.describe(node.params)}`);
    if (def.port) {
      if (def.port.activeLow)
        lines.push(
          '    // На плате светодиод включается нулём, поэтому сигнал инвертируется: 1 в схеме = свет.',
        );
      lines.push(
        `    assign ${node.name} = ${def.port.activeLow ? '~' : ''}${sourceOf(node, 'A')};`,
      );
      continue;
    }
    const ctx = {
      p: node.params,
      name: node.name,
      in: (pin: string) => sourceOf(node, pin),
      out: (pin: string) => netName(node, pin),
      net: (suffix: string) => internalName(node, suffix),
      width: (pin: string) => circuitPins(node).find((value) => value.name === pin)!.width,
    };
    for (const line of def.emit(ctx)) lines.push(`    ${line.replace(/\n/g, '\n    ')}`);
  }
  return lines.concat('endmodule', '').join('\n');
}
/** Keep the source snapshot/hash. Only worker input receives generated Verilog. */
export function materializeCircuitProject(project: Project): Project {
  const sources = project.files.filter((file) => file.name.endsWith('.ysch'));
  if (!sources.length) return project;
  if (sources.length > 1) return fail('в первой версии допустим один документ .ysch на проект.');
  const source = sources[0],
    generated = source.name.replace(/\.ysch$/, '.v');
  if (project.files.some((file) => file.name.toLowerCase() === generated.toLowerCase()))
    return fail(`файл ${generated} уже существует и будет перезаписан. Переименуйте его.`);
  const file: SourceFile = {
    name: generated,
    content: compileCircuit(parseCircuit(source.content), project.top),
  };
  return {
    ...project,
    files: [...project.files.filter((file) => !file.name.endsWith('.ysch')), file],
  };
}
export function emptyCircuit(): CircuitDocument {
  return { format: 'yosis-schematic', version: 2, nodes: [], wires: [] };
}
export function starterCircuit(): CircuitDocument {
  const doc = emptyCircuit();
  for (const [kind, name, x, params] of [
    ['input', 'button', 80, {}],
    ['buf', 'invert', 340, { invert: true }],
    ['output', 'led_n', 600, {}],
  ] as const) {
    doc.nodes.push({ ...newCircuitNode(doc, kind, params), name, x, y: 220 });
  }
  doc.wires = [
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
    { id: 'w2', from: { node: 'n2', pin: 'Y' }, to: { node: 'n3', pin: 'A' } },
  ];
  return doc;
}
