import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  compileCircuit,
  circuitPins,
  newCircuitNode,
  type BlockKind,
  type CircuitDocument,
  type CircuitNode,
} from '../shared/schematic';

const workspace = fileURLToPath(new URL('../', import.meta.url)),
  portable = path.join(workspace, '.tools/iverilog/mingw64');
const compiler =
  process.env.IVERILOG_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin/iverilog.exe') : 'iverilog');
const runtime =
  process.env.VVP_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin/vvp.exe') : 'vvp');
const library =
  process.env.IVERILOG_LIB ??
  (process.platform === 'win32' ? path.join(portable, 'lib/ivl') : undefined);
const env = { ...process.env },
  pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
env[pathKey] = `${path.join(portable, 'bin')}${path.delimiter}${env[pathKey] ?? ''}`;
function empty(): CircuitDocument {
  return { format: 'yosis-schematic', version: 1, nodes: [], wires: [] };
}
function append(doc: CircuitDocument, kind: BlockKind, properties: Partial<CircuitNode> = {}) {
  const node = { ...newCircuitNode(doc, kind), ...properties };
  doc.nodes.push(node);
  return node;
}
function wire(
  doc: CircuitDocument,
  from: CircuitNode,
  output: string,
  to: CircuitNode,
  input: string,
) {
  doc.wires.push({
    id: `w${doc.wires.length + 1}`,
    from: { node: from.id, pin: output },
    to: { node: to.id, pin: input },
  });
}
async function runVerilog(source: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-circuit-'));
  try {
    const filename = path.join(directory, 'test.v'),
      output = path.join(directory, 'test.vvp');
    await writeFile(filename, source);
    const compiled = spawnSync(
      compiler,
      [...(library ? ['-B', library] : []), '-g2012', '-s', 'tb', '-o', output, filename],
      { env, windowsHide: true, encoding: 'utf8', timeout: 30000 },
    );
    assert.equal(compiled.status, 0, String(compiled.error ?? compiled.stderr));
    const result = spawnSync(runtime, [output], {
      env,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.equal(result.status, 0, String(result.error ?? result.stderr) + result.stdout);
    assert.match(result.stdout, /PASS/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('generated Verilog matches independent integer models for 16 operators, six widths and 6144 vectors', async () => {
  const kinds: BlockKind[] = [
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
      const doc = empty(),
        a = append(doc, 'input', { name: 'a', width }),
        b = append(doc, 'input', { name: 'b', width: kind === 'concat' ? 1 : width }),
        s = append(doc, 'input', { name: 's' });
      const operation =
        kind === 'input'
          ? a
          : append(doc, kind, {
              name: 'operation',
              width: kind === 'extend' ? Math.min(width + 1, 64) : width,
              inputWidth: kind === 'concat' ? 1 : kind === 'extend' ? Math.min(width, 63) : width,
              lo: 0,
              hi: Math.max(0, width - 2),
              value: '1',
            });
      // concat has a separate 1-bit B; keep the output within 64 bits.
      if (kind === 'concat' && width === 64) {
        a.width = 63;
        operation.width = 63;
      }
      if (kind === 'extend') a.width = operation.inputWidth;
      for (const pin of circuitPins(operation).filter((pin) => pin.direction === 'input'))
        wire(doc, pin.name === 'B' ? b : pin.name === 'S' ? s : a, 'Y', operation, pin.name);
      const out = append(doc, 'output', {
        name: 'y',
        width: circuitPins(operation).find((pin) => pin.direction === 'output')!.width,
      });
      wire(doc, operation, 'Y', out, 'A');
      const id = `m${count++}`;
      modules.push(compileCircuit(doc, id));
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
  await runVerilog(
    `${modules.join('\n')}\nmodule tb; ${declarations.join('\n')} initial begin ${assertions.join('\n')} $display("PASS 6144"); $finish; end endmodule`,
  );
});
test('register counter feedback wraps, holds on EN=0 and gives synchronous reset priority', async () => {
  const doc = empty(),
    clk = append(doc, 'input', { name: 'clk' }),
    reset = append(doc, 'input', { name: 'reset' }),
    enable = append(doc, 'input', { name: 'enable' });
  const storage = append(doc, 'register', {
      name: 'count',
      width: 3,
      reset: true,
      enable: true,
      value: '5',
    }),
    add = append(doc, 'add', { width: 3 }),
    one = append(doc, 'constant', { width: 3, value: '1' }),
    out = append(doc, 'output', { name: 'q', width: 3 });
  wire(doc, clk, 'Y', storage, 'CLK');
  wire(doc, reset, 'Y', storage, 'RST');
  wire(doc, enable, 'Y', storage, 'EN');
  wire(doc, storage, 'Q', add, 'A');
  wire(doc, one, 'Y', add, 'B');
  wire(doc, add, 'Y', storage, 'D');
  wire(doc, storage, 'Q', out, 'A');
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
  await runVerilog(
    `${compileCircuit(doc, 'counter')} module tb; reg clk,reset,enable; wire [2:0] q; counter dut(.*); initial begin clk=0; reset=0; enable=0; #1; if(q !== 3'bxxx) $fatal(1,"initial state must be X"); ${program} $display("PASS"); $finish; end endmodule`,
  );
});
