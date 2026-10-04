import type { Project, SourceFile } from './types';
import { validIdentifier } from './verilog-identifiers';
import { RequestError } from './errors';

export const blockCatalog = [
  ['input', 'Вход', 'Внешний сигнал, кнопка или такт.'],
  ['output', 'Выход', 'Сигнал для LED или другого устройства.'],
  ['constant', 'Константа', 'Постоянное беззнаковое число.'],
  ['not', 'NOT', 'Инверсия каждого бита.'],
  ['and', 'AND', '1, когда оба соответствующих бита равны 1.'],
  ['or', 'OR', '1, когда хотя бы один бит равен 1.'],
  ['xor', 'XOR', '1, когда биты отличаются.'],
  ['nand', 'NAND', 'Инверсия AND.'],
  ['nor', 'NOR', 'Инверсия OR.'],
  ['xnor', 'XNOR', '1, когда биты одинаковые.'],
  ['mux', 'Мультиплексор', 'S=0 выбирает A; S=1 выбирает B.'],
  ['add', 'Сумматор', 'A+B; перенос за пределами ширины теряется.'],
  ['sub', 'Вычитатель', 'A−B по модулю 2 в степени ширины.'],
  ['eq', 'Сравнение =', 'Однобитный результат A==B.'],
  ['slice', 'Срез шины', 'Выбирает биты от lo до hi включительно.'],
  ['concat', 'Объединение', 'A — старшие биты; B — младшие.'],
  ['extend', 'Дополнение нулями', 'Добавляет нули в старшие биты.'],
  ['register', 'Регистр', 'Положительный фронт CLK. Синхронный RST имеет приоритет над EN.'],
] as const;
export type BlockKind = (typeof blockCatalog)[number][0];
export interface CircuitNode {
  id: string;
  kind: BlockKind;
  name: string;
  width: number;
  x: number;
  y: number;
  value: string;
  inputWidth: number;
  lo: number;
  hi: number;
  reset: boolean;
  enable: boolean;
}
export interface Endpoint {
  node: string;
  pin: string;
}
export interface CircuitWire {
  id: string;
  from: Endpoint;
  to: Endpoint;
}
export interface CircuitDocument {
  format: 'yosis-schematic';
  version: 1;
  nodes: CircuitNode[];
  wires: CircuitWire[];
}
export interface CircuitPin {
  name: string;
  direction: 'input' | 'output';
  width: number;
}
export interface CircuitIssue {
  node?: string;
  wire?: string;
  message: string;
}
const fail = (message: string): never => {
  throw new RequestError(`Схема: ${message}`);
};
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
export function parseCircuit(content: string): CircuitDocument {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return fail('файл .ysch должен содержать JSON.');
  }
  if (!value || typeof value !== 'object') return fail('нет документа.');
  const doc = value as CircuitDocument;
  if (doc.format !== 'yosis-schematic' || doc.version !== 1)
    return fail('неподдерживаемый формат или версия .ysch.');
  if (
    !Array.isArray(doc.nodes) ||
    doc.nodes.length > 200 ||
    !Array.isArray(doc.wires) ||
    doc.wires.length > 2000
  )
    return fail('максимум 200 элементов и 2000 соединений.');
  const ids = new Set<string>();
  for (const node of doc.nodes) {
    if (
      !node ||
      typeof node !== 'object' ||
      typeof node.id !== 'string' ||
      !/^n[0-9]{1,9}$/.test(node.id) ||
      ids.has(node.id)
    )
      return fail('неверный или повторяющийся ID элемента.');
    ids.add(node.id);
    if (
      !blockCatalog.some(([kind]) => kind === node.kind) ||
      typeof node.name !== 'string' ||
      !validIdentifier(node.name) ||
      !integer(node.width, 1, 64) ||
      !integer(node.inputWidth, 1, 64) ||
      !integer(node.lo, 0, 63) ||
      !integer(node.hi, 0, 63) ||
      typeof node.value !== 'string' ||
      !/^[0-9]{1,20}$/.test(node.value) ||
      typeof node.reset !== 'boolean' ||
      typeof node.enable !== 'boolean' ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      Math.abs(node.x) > 10000 ||
      Math.abs(node.y) > 10000
    )
      return fail(`неверные свойства элемента ${node.id}.`);
  }
  ids.clear();
  for (const wire of doc.wires) {
    if (
      !wire ||
      typeof wire !== 'object' ||
      typeof wire.id !== 'string' ||
      !/^w[0-9]{1,9}$/.test(wire.id) ||
      ids.has(wire.id)
    )
      return fail('неверный или повторяющийся ID соединения.');
    ids.add(wire.id);
    for (const endpoint of [wire.from, wire.to])
      if (
        !endpoint ||
        typeof endpoint.node !== 'string' ||
        !/^n[0-9]{1,9}$/.test(endpoint.node) ||
        typeof endpoint.pin !== 'string' ||
        !/^[A-Z][A-Z0-9]*$/.test(endpoint.pin)
      )
        return fail(`неверный контакт в ${wire.id}.`);
  }
  // Construct a clean data-only representation; unknown imported fields never become code.
  return {
    format: 'yosis-schematic',
    version: 1,
    nodes: doc.nodes.map(
      ({ id, kind, name, width, x, y, value, inputWidth, lo, hi, reset, enable }) => ({
        id,
        kind,
        name,
        width,
        x,
        y,
        value,
        inputWidth,
        lo,
        hi,
        reset,
        enable,
      }),
    ),
    wires: doc.wires.map(({ id, from, to }) => ({
      id,
      from: { node: from.node, pin: from.pin },
      to: { node: to.node, pin: to.pin },
    })),
  };
}
export function circuitPins(node: CircuitNode): CircuitPin[] {
  const input = (name: string, width = node.width): CircuitPin => ({
    name,
    width,
    direction: 'input',
  });
  const output = (name = 'Y', width = node.width): CircuitPin => ({
    name,
    width,
    direction: 'output',
  });
  switch (node.kind) {
    case 'input':
    case 'constant':
      return [output()];
    case 'output':
      return [input('A')];
    case 'not':
      return [input('A'), output()];
    case 'mux':
      return [input('A'), input('B'), input('S', 1), output()];
    case 'eq':
      return [input('A'), input('B'), output('Y', 1)];
    case 'slice':
      return [input('A', node.inputWidth), output('Y', node.hi - node.lo + 1)];
    case 'concat':
      return [input('A'), input('B', node.inputWidth), output('Y', node.width + node.inputWidth)];
    case 'extend':
      return [input('A', node.inputWidth), output()];
    case 'register':
      return [
        input('D'),
        input('CLK', 1),
        ...(node.reset ? [input('RST', 1)] : []),
        ...(node.enable ? [input('EN', 1)] : []),
        output('Q'),
      ];
    default:
      return [input('A'), input('B'), output()];
  }
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
export function circuitIssues(doc: CircuitDocument): CircuitIssue[] {
  const issues: CircuitIssue[] = [],
    nodes = new Map(doc.nodes.map((node) => [node.id, node])),
    drivers = new Map<string, number>(),
    names = new Set<string>();
  for (const node of doc.nodes) {
    if (names.has(node.name))
      issues.push({ node: node.id, message: `Имя ${node.name} повторяется.` });
    names.add(node.name);
    if ((node.kind === 'input' || node.kind === 'output') && /^__ys_n[0-9]+$/.test(node.name))
      issues.push({
        node: node.id,
        message: `${node.name}: префикс __ys_n зарезервирован для внутренних связей.`,
      });
    if (
      (node.kind === 'constant' || (node.kind === 'register' && node.reset)) &&
      BigInt(node.value) >= 1n << BigInt(node.width)
    )
      issues.push({
        node: node.id,
        message: `${node.name}: число не помещается в ${node.width} бит.`,
      });
    if (node.kind === 'slice' && (node.lo > node.hi || node.hi >= node.inputWidth))
      issues.push({ node: node.id, message: `${node.name}: срез выходит за входную шину.` });
    if (node.kind === 'concat' && node.width + node.inputWidth > 64)
      issues.push({ node: node.id, message: `${node.name}: объединённая шина шире 64 бит.` });
    if (node.kind === 'extend' && node.width <= node.inputWidth)
      issues.push({ node: node.id, message: `${node.name}: выход должен быть шире входа.` });
  }
  const adjacency = new Map(doc.nodes.map((node) => [node.id, new Set<string>()]));
  for (const wire of doc.wires) {
    const a = nodes.get(wire.from.node),
      b = nodes.get(wire.to.node),
      source = a && circuitPins(a).find((pin) => pin.name === wire.from.pin),
      target = b && circuitPins(b).find((pin) => pin.name === wire.to.pin);
    if (!source || !target) {
      issues.push({ wire: wire.id, message: `${wire.id}: контакт отсутствует.` });
      continue;
    }
    if (source.direction !== 'output' || target.direction !== 'input') {
      issues.push({ wire: wire.id, message: `${wire.id}: соединяйте выход с входом.` });
      continue;
    }
    if (source.width !== target.width)
      issues.push({
        wire: wire.id,
        message: `${a!.name} → ${b!.name}.${target.name}: ${source.width} и ${target.width} бит. Нужен срез или дополнение.`,
      });
    if (b!.kind === 'register' && target.name === 'CLK' && a!.kind !== 'input')
      issues.push({
        wire: wire.id,
        message: `${b!.name}.CLK: в первой версии такт должен приходить непосредственно с внешнего входа.`,
      });
    const key = endpointKey(wire.to);
    drivers.set(key, (drivers.get(key) ?? 0) + 1);
    if (b!.kind !== 'register') adjacency.get(a!.id)!.add(b!.id);
  }
  for (const node of doc.nodes)
    for (const pin of circuitPins(node).filter((pin) => pin.direction === 'input')) {
      const count = drivers.get(`${node.id}.${pin.name}`) ?? 0;
      if (count !== 1)
        issues.push({
          node: node.id,
          message: `${node.name}.${pin.name}: ${count ? 'несколько источников' : 'вход не соединён'}.`,
        });
    }
  const visited = new Set<string>(),
    active = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    active.delete(id);
    visited.add(id);
    return false;
  }
  if (doc.nodes.some((node) => visit(node.id)))
    issues.push({
      message: 'Комбинационная петля. Обратная связь должна проходить через регистр.',
    });
  if (!doc.nodes.some((node) => node.kind === 'output'))
    issues.push({ message: 'Добавьте хотя бы один выход устройства.' });
  return issues;
}
export function connectCircuit(
  doc: CircuitDocument,
  from: Endpoint,
  to: Endpoint,
): CircuitDocument {
  const a = doc.nodes.find((node) => node.id === from.node),
    b = doc.nodes.find((node) => node.id === to.node),
    source = a && circuitPins(a).find((pin) => pin.name === from.pin),
    target = b && circuitPins(b).find((pin) => pin.name === to.pin);
  if (!source || !target || source.direction !== 'output' || target.direction !== 'input')
    return fail('выберите выход, затем вход.');
  if (source.width !== target.width)
    return fail(`ширины ${source.width} и ${target.width} не совпадают.`);
  if (doc.wires.some((wire) => endpointKey(wire.to) === endpointKey(to)))
    return fail('этот вход уже соединён. Удалите старое соединение.');
  if (doc.wires.length >= 2000) return fail('достигнут предел соединений.');
  const next = {
    ...doc,
    wires: [
      ...doc.wires,
      {
        id: `w${freeIndex(
          doc.wires.map((wire) => wire.id),
          'w',
        )}`,
        from,
        to,
      },
    ],
  };
  if (circuitIssues(next).some((issue) => issue.message.startsWith('Комбинационная петля')))
    return fail('это соединение создаёт комбинационную петлю.');
  return next;
}
export function removeCircuitNode(doc: CircuitDocument, id: string): CircuitDocument {
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => node.id !== id),
    wires: doc.wires.filter((wire) => wire.from.node !== id && wire.to.node !== id),
  };
}
export function newCircuitNode(doc: CircuitDocument, kind: BlockKind): CircuitNode {
  if (doc.nodes.length >= 200) return fail('достигнут предел 200 элементов.');
  const index = freeIndex(
    doc.nodes.map((node) => node.id),
    'n',
  );
  let name = `${kind}_${index}`;
  while (doc.nodes.some((node) => node.name === name)) name += '_';
  return {
    id: `n${index}`,
    kind,
    name,
    width: 1,
    x: 80 + ((index - 1) % 5) * 170,
    y: 90 + (Math.floor((index - 1) / 5) % 4) * 145,
    value: '0',
    inputWidth: 1,
    lo: 0,
    hi: 0,
    reset: false,
    enable: false,
  };
}
const range = (width: number) => (width === 1 ? '' : `[${width - 1}:0] `);
export function compileCircuit(doc: CircuitDocument, top: string): string {
  if (!validIdentifier(top)) return fail('неверное имя верхнего модуля.');
  const issues = circuitIssues(doc);
  if (issues.length) return fail(issues.map((issue) => issue.message).join('\n'));
  const ports = doc.nodes.filter((node) => node.kind === 'input' || node.kind === 'output');
  const internal = (node: CircuitNode) => `__ys_${node.id}`;
  // Port names cannot collide with generated nets.
  if (ports.some((node) => /^__ys_n[0-9]+$/.test(node.name)))
    return fail('префикс __ys_n зарезервирован для внутренних связей.');
  const signal = (endpoint: Endpoint) => {
    const node = doc.nodes.find((node) => node.id === endpoint.node)!;
    return node.kind === 'input' ? node.name : internal(node);
  };
  const input = (node: CircuitNode, pin: string) =>
    signal(doc.wires.find((wire) => wire.to.node === node.id && wire.to.pin === pin)!.from);
  const lines = [
    '// Создано Yosis из исходной схемы .ysch.',
    '// Редактируйте элементы в конструкторе. Все шины беззнаковые.',
    `module ${top} (`,
    ports.map((node) => `    ${node.kind} wire ${range(node.width)}${node.name}`).join(',\n'),
    ');',
  ];
  for (const node of doc.nodes) {
    if (node.kind === 'input' || node.kind === 'output') continue;
    const pin = circuitPins(node).find((pin) => pin.direction === 'output')!;
    lines.push(
      `    ${node.kind === 'register' ? 'reg' : 'wire'} ${range(pin.width)}${internal(node)}; // ${node.name}`,
    );
  }
  const operators: Partial<Record<BlockKind, string>> = {
    and: '&',
    or: '|',
    xor: '^',
    nand: '&',
    nor: '|',
    xnor: '^',
    add: '+',
    sub: '-',
    eq: '==',
  };
  for (const node of doc.nodes) {
    if (node.kind === 'input') continue;
    const y = node.kind === 'output' ? node.name : internal(node);
    if (node.kind === 'register') {
      lines.push(`    always @(posedge ${input(node, 'CLK')}) begin`);
      const assign = `${y} <= ${input(node, 'D')};`;
      if (node.reset)
        lines.push(
          `        if (${input(node, 'RST')}) ${y} <= ${node.width}'d${BigInt(node.value)};`,
        );
      lines.push(
        `        ${node.reset ? 'else ' : ''}${node.enable ? `if (${input(node, 'EN')}) ` : ''}${assign}`,
        '    end',
      );
      continue;
    }
    let expression: string;
    switch (node.kind) {
      case 'constant':
        expression = `${node.width}'d${BigInt(node.value)}`;
        break;
      case 'output':
        expression = input(node, 'A');
        break;
      case 'not':
        expression = `~${input(node, 'A')}`;
        break;
      case 'mux':
        expression = `${input(node, 'S')} ? ${input(node, 'B')} : ${input(node, 'A')}`;
        break;
      case 'slice':
        expression =
          node.inputWidth === 1 ? input(node, 'A') : `${input(node, 'A')}[${node.hi}:${node.lo}]`;
        break;
      case 'concat':
        expression = `{${input(node, 'A')}, ${input(node, 'B')}}`;
        break;
      case 'extend':
        expression = `{{${node.width - node.inputWidth}{1'b0}}, ${input(node, 'A')}}`;
        break;
      default:
        expression = `${input(node, 'A')} ${operators[node.kind]} ${input(node, 'B')}`;
        if (['nand', 'nor', 'xnor'].includes(node.kind)) expression = `~(${expression})`;
    }
    lines.push(`    assign ${y} = ${expression};`);
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
export function starterCircuit(): CircuitDocument {
  const doc: CircuitDocument = { format: 'yosis-schematic', version: 1, nodes: [], wires: [] };
  for (const [kind, name, x] of [
    ['input', 'button', 80],
    ['not', 'invert', 340],
    ['output', 'led_n', 600],
  ] as const) {
    doc.nodes.push({ ...newCircuitNode(doc, kind), name, x, y: 220 });
  }
  doc.wires = [
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
    { id: 'w2', from: { node: 'n2', pin: 'Y' }, to: { node: 'n3', pin: 'A' } },
  ];
  return doc;
}
