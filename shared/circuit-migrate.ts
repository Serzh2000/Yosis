import { RequestError } from './errors';
import { validIdentifier } from './verilog-identifiers';

/**
 * Миграция документов .ysch версии 1 в версию 2.
 * Возвращает «сырой» документ версии 2: полную проверку выполняет parseCircuit.
 * В версии 1 неизвестные поля молча отбрасывались; это поведение сохранено.
 */
const fail = (message: string): never => {
  throw new RequestError(`Схема: ${message}`);
};
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

interface V1Node {
  id: string;
  kind: string;
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
const gateKinds: Record<string, { op: string; invert: boolean }> = {
  and: { op: 'and', invert: false },
  or: { op: 'or', invert: false },
  xor: { op: 'xor', invert: false },
  nand: { op: 'and', invert: true },
  nor: { op: 'or', invert: true },
  xnor: { op: 'xor', invert: true },
};
const v1Kinds = [
  'input',
  'output',
  'constant',
  'not',
  'and',
  'or',
  'xor',
  'nand',
  'nor',
  'xnor',
  'mux',
  'add',
  'sub',
  'eq',
  'slice',
  'concat',
  'extend',
  'register',
];

export function migrateV1(raw: Record<string, unknown>): Record<string, unknown> {
  const nodes = raw.nodes as V1Node[],
    wires = raw.wires as {
      id: string;
      from: { node: string; pin: string };
      to: { node: string; pin: string };
    }[];
  if (!Array.isArray(nodes) || nodes.length > 200 || !Array.isArray(wires) || wires.length > 2000)
    return fail('максимум 200 элементов и 2000 соединений.');
  const kinds = new Map<string, string>();
  const migrated = nodes.map((node) => {
    if (
      !node ||
      typeof node !== 'object' ||
      typeof node.id !== 'string' ||
      !/^n[0-9]{1,9}$/.test(node.id)
    )
      return fail('неверный или повторяющийся ID элемента.');
    if (kinds.has(node.id)) return fail('неверный или повторяющийся ID элемента.');
    kinds.set(node.id, node.kind);
    if (
      !v1Kinds.includes(node.kind) ||
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
    const { id, name, x, y, width } = node,
      base = { id, name, x, y, rot: 0, flip: false };
    switch (node.kind) {
      case 'input':
      case 'output':
        return { ...base, kind: node.kind, params: { width } };
      case 'constant':
        return { ...base, kind: 'const', params: { width, value: node.value } };
      case 'not':
        return { ...base, kind: 'buf', params: { width, invert: true } };
      case 'mux':
        return { ...base, kind: 'mux', params: { inputs: 2, width } };
      case 'add':
      case 'sub':
        return {
          ...base,
          kind: 'addsub',
          params: { width, mode: node.kind, cin: false, cout: false },
        };
      case 'eq':
        return { ...base, kind: 'cmp', params: { width, signed: false, outs: ['eq'] } };
      case 'slice':
        return {
          ...base,
          kind: 'slice',
          params: { inWidth: node.inputWidth, lo: node.lo, hi: node.hi },
        };
      case 'concat':
        return {
          ...base,
          kind: 'concat',
          params: {
            parts: 2,
            w0: width,
            w1: node.inputWidth,
            w2: 1,
            w3: 1,
            w4: 1,
            w5: 1,
            w6: 1,
            w7: 1,
          },
        };
      case 'extend':
        return {
          ...base,
          kind: 'extend',
          params: { inWidth: node.inputWidth, outWidth: width, signed: false },
        };
      case 'register':
        return {
          ...base,
          kind: 'reg',
          params: {
            width,
            sreset: node.reset,
            resetValue: node.value,
            enable: node.enable,
            aclr: false,
            apre: false,
            init: false,
          },
        };
      default:
        return {
          ...base,
          kind: 'gate',
          params: { ...gateKinds[node.kind], inputs: 2, width, inverted: 0 },
        };
    }
  });
  const renamed = wires.map((wire) => {
    if (!wire || typeof wire !== 'object' || typeof wire.id !== 'string' || !wire.from || !wire.to)
      return fail('неверный или повторяющийся ID соединения.');
    const from = { node: wire.from.node, pin: wire.from.pin },
      to = { node: wire.to.node, pin: wire.to.pin };
    if (kinds.get(to.node) === 'mux')
      to.pin = to.pin === 'A' ? 'D0' : to.pin === 'B' ? 'D1' : to.pin;
    if (kinds.get(from.node) === 'eq' && from.pin === 'Y') from.pin = 'EQ';
    return { id: wire.id, from, to };
  });
  return { format: 'yosis-schematic', version: 2, nodes: migrated, wires: renamed };
}
