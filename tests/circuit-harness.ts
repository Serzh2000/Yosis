import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  circuitPins,
  compileCircuit,
  emptyCircuit,
  newCircuitNode,
  type BlockKind,
  type CircuitDocument,
  type CircuitNode,
  type Params,
} from '../shared/schematic';
import { previewInit, previewSetInput, previewSettle, previewStep } from '../shared/circuit-eval';

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

export async function runVerilog(source: string, tops: string[] = ['tb']): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-circuit-'));
  try {
    const filename = path.join(directory, 'test.v'),
      output = path.join(directory, 'test.vvp');
    await writeFile(filename, source);
    const compiled = spawnSync(
      compiler,
      [
        ...(library ? ['-B', library] : []),
        '-g2012',
        ...tops.flatMap((top) => ['-s', top]),
        '-o',
        output,
        filename,
      ],
      { env, windowsHide: true, encoding: 'utf8', timeout: 60000 },
    );
    assert.equal(compiled.status, 0, String(compiled.error ?? compiled.stderr));
    const result = spawnSync(runtime, [output], {
      env,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 64 * 1024 * 1024,
    });
    assert.equal(result.status, 0, String(result.error ?? result.stderr) + result.stdout);
    return result.stdout;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function append(
  doc: CircuitDocument,
  kind: BlockKind,
  name: string,
  params: Partial<Params> = {},
) {
  const node = { ...newCircuitNode(doc, kind, params), name };
  doc.nodes.push(node);
  return node;
}
export function wire(
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

let seed = 12345n;
export const random = (bits: number): bigint => {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n);
  return (seed >> 11n) & ((1n << BigInt(bits)) - 1n);
};
export const reseed = (value: bigint) => {
  seed = value;
};

export interface Case {
  title: string;
  kind: BlockKind;
  params: Partial<Params>;
  steps?: number;
  /** Сколько шагов держать значения входов. */
  hold?: number;
  /** Не подавать такт на этих шагах (только комбинационные изменения). */
  noEdgeEvery?: number;
}
interface Dut {
  doc: CircuitDocument;
  dut: CircuitNode;
  inputs: { pin: string; width: number; node: CircuitNode; clock: boolean }[];
  outputs: { pin: string; width: number }[];
}
export function buildDut(item: Case): Dut {
  const doc = emptyCircuit(),
    dut = append(doc, item.kind, 'dut', item.params),
    inputs: Dut['inputs'] = [],
    outputs: Dut['outputs'] = [];
  for (const pin of circuitPins(dut)) {
    if (pin.direction === 'input') {
      const node = append(doc, 'input', pin.clock ? 'clk' : `i_${pin.name.toLowerCase()}`, {
        width: pin.width,
      });
      wire(doc, node, 'Y', dut, pin.name);
      inputs.push({ pin: pin.name, width: pin.width, node, clock: !!pin.clock });
    } else {
      const node = append(doc, 'output', `o_${pin.name.toLowerCase()}`, { width: pin.width });
      wire(doc, dut, pin.name, node, 'A');
      outputs.push({ pin: pin.name, width: pin.width });
    }
  }
  return { doc, dut, inputs, outputs };
}
const hex = (value: bigint, width: number) =>
  value.toString(16).padStart(Math.ceil(width / 4), '0');

export interface Mismatch {
  title: string;
  step: string;
  pin: string;
  expected: string;
  actual: string;
}
/** Прогоняет одинаковые стимулы через вычислитель предпросмотра и сгенерированный Verilog. */
export async function compareWithVerilog(cases: Case[]): Promise<Mismatch[]> {
  const modules: string[] = [],
    benches: string[] = [],
    tops: string[] = [],
    expected = new Map<string, string>(),
    order: string[] = [];
  cases.forEach((item, index) => {
    const { doc, dut, inputs, outputs } = buildDut(item),
      module = `c${index}`;
    modules.push(compileCircuit(doc, module));
    const data = inputs.filter((value) => !value.clock);
    let state = previewInit(doc);
    const code: string[] = [];
    let held: Record<string, bigint> = {};
    let holdLeft = 0;
    const steps = item.steps ?? 48;
    const options = { fast: false };
    for (let step = 0; step < steps; step++) {
      if (holdLeft <= 0) {
        held = {};
        for (const input of data) {
          const roll = random(3);
          held[input.pin] =
            input.width === 1
              ? random(1)
              : roll === 0n
                ? 0n
                : roll === 1n
                  ? (1n << BigInt(input.width)) - 1n
                  : random(input.width);
        }
        holdLeft = item.hold ? Number(random(4)) + item.hold : 1;
      }
      holdLeft--;
      for (const input of data) {
        state = previewSetInput(state, input.node.id, held[input.pin], input.width);
        code.push(
          `i_${input.pin.toLowerCase()} = ${input.width}'h${held[input.pin].toString(16)};`,
        );
      }
      const clockInput = inputs.find((value) => value.clock);
      if (clockInput) code.push("clk = 1'b0;");
      const record = (phase: string) => {
        // Как в редакторе: после каждого изменения входов асинхронные сбросы сохраняются в состоянии.
        const settled = previewSettle(doc, state, options);
        state = settled.state;
        const values = settled.values;
        code.push(
          `#1; $display("${module} ${step} ${phase} ${outputs.map((out) => `${out.pin}=%h`).join(' ')}", ${outputs.map((out) => `o_${out.pin.toLowerCase()}`).join(', ')});`,
        );
        order.push(`${module} ${step} ${phase}`);
        expected.set(
          `${module} ${step} ${phase}`,
          outputs
            .map((out) => {
              const value = values.get(`${dut.id}.${out.pin}`) ?? null;
              return `${out.pin}=${value === null ? '?' : hex(value, out.width)}`;
            })
            .join(' '),
        );
      };
      record('pre');
      if (clockInput && !(item.noEdgeEvery && step % item.noEdgeEvery === 0)) {
        code.push("clk = 1'b1;");
        state = previewStep(doc, state, clockInput.node.id, options);
        record('post');
        code.push("clk = 1'b0;");
      }
    }
    const declared = [
      ...inputs.map(
        (input) =>
          `reg ${input.width > 1 ? `[${input.width - 1}:0] ` : ''}${input.clock ? 'clk' : `i_${input.pin.toLowerCase()}`};`,
      ),
      ...outputs.map(
        (out) => `wire ${out.width > 1 ? `[${out.width - 1}:0] ` : ''}o_${out.pin.toLowerCase()};`,
      ),
    ];
    benches.push(
      `module tb${index};\n${declared.join('\n')}\n${module} u(${[
        ...inputs.map(
          (input) =>
            `.${input.clock ? 'clk' : `i_${input.pin.toLowerCase()}`}(${input.clock ? 'clk' : `i_${input.pin.toLowerCase()}`})`,
        ),
        ...outputs.map((out) => `.o_${out.pin.toLowerCase()}(o_${out.pin.toLowerCase()})`),
      ].join(', ')});\ninitial begin\n#1;\n${code.join('\n')}\nend\nendmodule`,
    );
    tops.push(`tb${index}`);
  });
  const stdout = await runVerilog(`${modules.join('\n')}\n${benches.join('\n')}`, tops);
  const actual = new Map<string, string>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^(c\d+ \d+ (?:pre|post)) (.*)$/.exec(line);
    if (match) actual.set(match[1], match[2]);
  }
  const mismatches: Mismatch[] = [];
  for (const key of order) {
    const want = expected.get(key)!,
      got = actual.get(key);
    // Формат Icarus: неизвестные биты — x/z. Предпросмотр: ?.
    const normalized = got
      ?.split(' ')
      .map((part) => {
        const [pin, value] = part.split('=');
        return `${pin}=${/[xz]/i.test(value) ? '?' : value}`;
      })
      .join(' ');
    if (normalized !== want) {
      const index = Number(/^c(\d+)/.exec(key)![1]);
      mismatches.push({
        title: cases[index].title,
        step: key,
        pin: '',
        expected: want,
        actual: String(got),
      });
    }
  }
  return mismatches;
}
