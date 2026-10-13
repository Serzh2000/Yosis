import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCircuit, parseCircuit, starterCircuit } from '../shared/schematic';
import { runVerilog } from './circuit-harness';

/**
 * Эти проверки работают с документами версии 1 (формат до библиотеки блоков).
 * Они доказывают, что старые схемы открываются, мигрируют в версию 2 и по-прежнему ведут себя так же в Icarus.
 */
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
interface V1Doc {
  format: 'yosis-schematic';
  version: 1;
  nodes: V1Node[];
  wires: { id: string; from: { node: string; pin: string }; to: { node: string; pin: string } }[];
}
const v1Empty = (): V1Doc => ({ format: 'yosis-schematic', version: 1, nodes: [], wires: [] });
function v1Append(doc: V1Doc, kind: string, properties: Partial<V1Node> = {}): V1Node {
  const id = `n${doc.nodes.length + 1}`;
  const node: V1Node = {
    id,
    kind,
    name: `${kind}_${doc.nodes.length + 1}`,
    width: 1,
    x: 0,
    y: 0,
    value: '0',
    inputWidth: 1,
    lo: 0,
    hi: 0,
    reset: false,
    enable: false,
    ...properties,
  };
  doc.nodes.push(node);
  return node;
}
function v1Pins(node: V1Node): { name: string; direction: 'input' | 'output'; width: number }[] {
  const input = (name: string, width = node.width) => ({
    name,
    width,
    direction: 'input' as const,
  });
  const output = (name = 'Y', width = node.width) => ({
    name,
    width,
    direction: 'output' as const,
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
function v1Wire(doc: V1Doc, from: V1Node, output: string, to: V1Node, input: string) {
  doc.wires.push({
    id: `w${doc.wires.length + 1}`,
    from: { node: from.id, pin: output },
    to: { node: to.id, pin: input },
  });
}
const migrated = (doc: V1Doc) => parseCircuit(JSON.stringify(doc));

test('version 1 documents migrate to version 2 and the old starter circuit is unchanged in meaning', () => {
  const doc = v1Empty();
  const a = v1Append(doc, 'input', { name: 'button', x: 80, y: 220 }),
    b = v1Append(doc, 'not', { name: 'invert', x: 340, y: 220 }),
    c = v1Append(doc, 'output', { name: 'led_n', x: 600, y: 220 });
  v1Wire(doc, a, 'Y', b, 'A');
  v1Wire(doc, b, 'Y', c, 'A');
  assert.deepEqual(migrated(doc), starterCircuit());
  assert.match(compileCircuit(migrated(doc), 'top'), /assign invert = ~button;/);
});
test('migrated v1 circuits generate Verilog that matches independent integer models for 16 operators, six widths and 6144 vectors', async () => {
  const kinds = [
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
    'input',
  ];
  const modules: string[] = [],
    declarations: string[] = ['reg [63:0] A, B; reg S;'],
    assertions: string[] = [];
  let count = 0;
  for (const width of [1, 2, 3, 8, 32, 64])
    for (const kind of kinds) {
      const doc = v1Empty(),
        a = v1Append(doc, 'input', { name: 'a', width }),
        b = v1Append(doc, 'input', { name: 'b', width: kind === 'concat' ? 1 : width }),
        s = v1Append(doc, 'input', { name: 's' });
      const operation =
        kind === 'input'
          ? a
          : v1Append(doc, kind, {
              name: 'operation',
              width: kind === 'extend' ? Math.min(width + 1, 64) : width,
              inputWidth: kind === 'concat' ? 1 : kind === 'extend' ? Math.min(width, 63) : width,
              lo: 0,
              hi: Math.max(0, width - 2),
              value: '1',
            });
      if (kind === 'concat' && width === 64) {
        a.width = 63;
        operation.width = 63;
      }
      if (kind === 'extend') a.width = operation.inputWidth;
      for (const pin of v1Pins(operation).filter((pin) => pin.direction === 'input'))
        v1Wire(doc, pin.name === 'B' ? b : pin.name === 'S' ? s : a, 'Y', operation, pin.name);
      const out = v1Append(doc, 'output', {
        name: 'y',
        width: v1Pins(operation).find((pin) => pin.direction === 'output')!.width,
      });
      v1Wire(doc, operation, 'Y', out, 'A');
      const id = `m${count++}`;
      modules.push(compileCircuit(migrated(doc), id));
      declarations.push(
        `wire [${out.width - 1}:0] ${id}_y; ${id} ${id}_dut(.a(A[${a.width - 1}:0]), .b(B[${b.width - 1}:0]), .s(S), .y(${id}_y));`,
      );
      const mask = (1n << BigInt(out.width)) - 1n,
        inputMask = (1n << BigInt(a.width)) - 1n,
        bMask = (1n << BigInt(b.width)) - 1n;
      for (let vector = 0; vector < 64; vector++) {
        const av = BigInt.asUintN(64, BigInt(vector) * 0x9e3779b97f4a7c15n),
          bv = BigInt.asUintN(64, BigInt(63 - vector) * 0xbf58476d1ce4e5b9n),
          aValue = av & inputMask,
          bValue = bv & bMask,
          selector = vector % 2;
        const expected: Record<string, bigint> = {
          constant: 1n,
          input: aValue,
          not: ~aValue,
          and: aValue & bValue,
          or: aValue | bValue,
          xor: aValue ^ bValue,
          nand: ~(aValue & bValue),
          nor: ~(aValue | bValue),
          xnor: ~(aValue ^ bValue),
          mux: selector ? bValue : aValue,
          add: aValue + bValue,
          sub: aValue - bValue,
          eq: aValue === bValue ? 1n : 0n,
          slice: aValue & mask,
          concat: (aValue << 1n) | bValue,
          extend: aValue,
        };
        assertions.push(
          `A=64'd${av}; B=64'd${bv}; S=1'b${selector}; #1; if (${id}_y !== ${out.width}'d${expected[kind] & mask}) $fatal(1,"${kind} width ${width} vector ${vector}: %h",${id}_y);`,
        );
      }
    }
  const output = await runVerilog(
    `${modules.join('\n')}\nmodule tb; ${declarations.join('\n')} initial begin ${assertions.join('\n')} $display("PASS 6144"); $finish; end endmodule`,
  );
  assert.match(output, /PASS/);
});
test('a migrated v1 register counter wraps, holds on EN=0 and gives synchronous reset priority', async () => {
  const doc = v1Empty(),
    clk = v1Append(doc, 'input', { name: 'clk' }),
    reset = v1Append(doc, 'input', { name: 'reset' }),
    enable = v1Append(doc, 'input', { name: 'enable' });
  const storage = v1Append(doc, 'register', {
      name: 'count',
      width: 3,
      reset: true,
      enable: true,
      value: '5',
    }),
    add = v1Append(doc, 'add', { width: 3 }),
    one = v1Append(doc, 'constant', { width: 3, value: '1' }),
    out = v1Append(doc, 'output', { name: 'q', width: 3 });
  v1Wire(doc, clk, 'Y', storage, 'CLK');
  v1Wire(doc, reset, 'Y', storage, 'RST');
  v1Wire(doc, enable, 'Y', storage, 'EN');
  v1Wire(doc, storage, 'Q', add, 'A');
  v1Wire(doc, one, 'Y', add, 'B');
  v1Wire(doc, add, 'Y', storage, 'D');
  v1Wire(doc, storage, 'Q', out, 'A');
  const program = [
    [1, 0, 5],
    [0, 1, 6],
    [0, 1, 7],
    [0, 1, 0],
    [0, 0, 0],
    [1, 1, 5],
    [0, 0, 5],
    [0, 1, 6],
  ]
    .map(
      ([reset, enable, expected]) =>
        `clk=0; reset=${reset}; enable=${enable}; #1; clk=1; #1; if(q!==3'd${expected}) $fatal(1,"counter %d",q);`,
    )
    .join('\n');
  const output = await runVerilog(
    `${compileCircuit(migrated(doc), 'counter')} module tb; reg clk,reset,enable; wire [2:0] q; counter dut(.*); initial begin clk=0; reset=0; enable=0; #1; if(q !== 3'bxxx) $fatal(1,"initial state must be X"); ${program} $display("PASS"); $finish; end endmodule`,
  );
  assert.match(output, /PASS/);
});
