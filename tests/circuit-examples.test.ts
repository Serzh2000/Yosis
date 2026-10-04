import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BuildManager } from '../server/builds';
import { circuitExamples } from '../shared/circuit-examples';
import {
  boardAssignments,
  circuitIssues,
  compileCircuit,
  type CircuitDocument,
} from '../shared/schematic';
import { syncBoardConstraints } from '../src/lib/circuit-board';
import { createWizardProject } from '../src/lib/project-wizard';
import type { Project } from '../shared/types';
import { runVerilog } from './circuit-harness';

const example = (id: string) => circuitExamples.find((item) => item.id === id)!;
/** Ускоряет делители и антидребезг: тот же чертёж, но такты считаются десятками, а не миллионами. */
function scaled(doc: CircuitDocument, cyclesPerPeriod: number): CircuitDocument {
  const copy = structuredClone(doc);
  for (const node of copy.nodes) {
    if (node.kind === 'divider') node.params.clockHz = (node.params.hz as number) * cyclesPerPeriod;
    if (node.kind === 'debounce')
      node.params.clockHz = Math.round((5 / (node.params.ms as number)) * 1000);
  }
  return copy;
}
async function simulate(doc: CircuitDocument, bench: string, declarations: string) {
  const output = await runVerilog(
    `${compileCircuit(doc, 'dut')}\nmodule tb;\n${declarations}\ndut u(.*);\ninitial begin\n${bench}\n$display("PASS"); $finish;\nend\nendmodule`,
  );
  assert.match(output, /PASS/);
}
const check = (expression: string, expected: string, label: string) =>
  `if (${expression} !== ${expected}) $fatal(1, "${label}: %b", ${expression});`;

test('button → LED: pressing S1 lights LED0 (the pin goes low) and releasing turns it off', async () => {
  await simulate(
    example('button-led').build(),
    `s1=0; #1; ${check('led0', "1'b1", 'released')} s1=1; #1; ${check('led0', "1'b0", 'pressed')} s1=0; #1; ${check('led0', "1'b1", 'released again')}`,
    'reg s1; wire led0;',
  );
});
test('two buttons: AND, OR and XOR LEDs follow the truth table for all four combinations', async () => {
  const lines = [0, 1, 2, 3].map((value) => {
    const a = value & 1,
      b = value >> 1;
    return `s1=${a}; s2=${b}; #1; ${check('led0', `1'b${1 - (a & b)}`, 'and')} ${check('led1', `1'b${1 - (a | b)}`, 'or')} ${check('led2', `1'b${1 - (a ^ b)}`, 'xor')}`;
  });
  await simulate(
    example('two-buttons-gates').build(),
    lines.join('\n'),
    'reg s1, s2; wire led0, led1, led2;',
  );
});
test('blinker: the LED level changes exactly every half period of the divider', async () => {
  const half = 4,
    doc = scaled(example('blinker').build(), 2 * half);
  const steps = Array.from({ length: 40 }, (_, edge) => {
    const level = Math.floor((edge + 1) / half) % 2;
    return `clk=1; #1; clk=0; #1; ${check('led0', `1'b${1 - level}`, `edge ${edge + 1}`)}`;
  });
  await simulate(doc, `clk=0; #1; ${steps.join('\n')}`, 'reg clk; wire led0;');
});
test('LED counter counts every period, wraps at 64 and S1 clears it', async () => {
  const period = 4,
    doc = scaled(example('led-counter').build(), period);
  const lines = [`clk=0; s1=0; #1;`];
  let expected = 0;
  for (let edge = 1; edge <= 4 * 70; edge++) {
    if (edge === 4 * 67 + 2) lines.push('s1=1;');
    if (edge === 4 * 67 + 3) lines.push('s1=0;');
    lines.push('clk=1; #1; clk=0; #1;');
    if (edge === 4 * 67 + 2) expected = 0;
    else if (edge % period === 0 && edge !== 4 * 67 + 3) expected = (expected + 1) % 64;
    else if (edge === 4 * 67 + 3) expected = 0;
    lines.push(check('leds', `6'd${63 - expected}`, `edge ${edge}`));
  }
  void expected;
  await simulate(doc, lines.join('\n'), 'reg clk, s1; wire [5:0] leds;');
});
test('running light: one lit LED walks from LED0 to LED5 and returns', async () => {
  const period = 3,
    doc = scaled(example('running-light').build(), period);
  const lines = ['clk=0; #1;'];
  for (let edge = 1; edge <= period * 14; edge++) {
    lines.push('clk=1; #1; clk=0; #1;');
    const ticks = Math.floor(edge / period);
    const pattern = ticks === 0 ? 0 : 1 << ((ticks - 1) % 6);
    lines.push(check('leds', `6'd${63 - pattern}`, `edge ${edge}`));
  }
  await simulate(doc, lines.join('\n'), 'reg clk; wire [5:0] leds;');
});
test('debounced toggle switches once per clean press and ignores bounce and short glitches', async () => {
  const doc = scaled(example('debounced-toggle').build(), 1);
  const cycle = (count: number, level: number) =>
    `s1=${level}; repeat (${count}) begin clk=1; #1; clk=0; #1; end`;
  await simulate(
    doc,
    [
      'clk=0; s1=0; #1;',
      cycle(20, 0),
      check('led0', "1'b1", 'dark at start'),
      // дребезг: короткие всплески не дают срабатывания
      cycle(1, 1),
      cycle(2, 0),
      cycle(2, 1),
      cycle(1, 0),
      cycle(3, 1),
      cycle(3, 0),
      cycle(20, 0),
      check('led0', "1'b1", 'bounce ignored'),
      cycle(40, 1),
      check('led0', "1'b0", 'first press lights the LED'),
      cycle(40, 0),
      check('led0', "1'b0", 'release keeps the state'),
      cycle(40, 1),
      check('led0', "1'b1", 'second press turns it off'),
      cycle(40, 0),
    ].join('\n'),
    'reg clk, s1; wire led0;',
  );
});
test('examples assign board pins automatically and keep manual assignments', () => {
  for (const item of circuitExamples) {
    const doc = item.build();
    const base = createWizardProject({ start: 'schematic', name: item.title, top: 'top' });
    const project: Project = {
      ...base,
      files: base.files.map((file) =>
        file.name.endsWith('.cst')
          ? { ...file, content: `${file.content}\nIO_LOC "manual" 30;\n` }
          : file,
      ),
    };
    const synced = syncBoardConstraints(project, null, doc).project;
    const cst = synced.files.find((file) => file.name.endsWith('.cst'))!.content;
    for (const assignment of boardAssignments(doc))
      assert.match(
        cst,
        new RegExp(`IO_LOC "${assignment.signal.replace(/[[\]]/g, '\\$&')}" ${assignment.pin};`),
        item.title,
      );
    assert.match(cst, /IO_LOC "manual" 30;/);
    assert.deepEqual(circuitIssues(doc), []);
  }
});

const SYNTHESIS_TIMEOUT = 180_000;
async function synthesize(project: Project) {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-circuit-synth-'));
  const manager = new BuildManager(directory);
  try {
    let result = await manager.create(project);
    const deadline = Date.now() + SYNTHESIS_TIMEOUT - 10_000;
    while (result.status === 'queued' || result.status === 'running') {
      assert.ok(Date.now() < deadline, 'Yosys не уложился во время');
      await new Promise((resolve) => setTimeout(resolve, 100));
      result = await manager.get(result.id);
    }
    return result;
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
}
for (const item of circuitExamples)
  test(
    `example "${item.title}" passes real Yosys synthesis for Gowin`,
    { timeout: SYNTHESIS_TIMEOUT },
    async () => {
      const doc = item.build();
      const base = createWizardProject({ start: 'schematic', name: item.title, top: 'top' });
      const project: Project = syncBoardConstraints(
        {
          ...base,
          files: base.files.map((file) =>
            file.name.endsWith('.ysch') ? { ...file, content: JSON.stringify(doc) } : file,
          ),
        },
        null,
        doc,
      ).project;
      const result = await synthesize(project);
      assert.equal(result.status, 'success', `${result.error}\n${result.logs.slice(-3000)}`);
      assert.ok(Object.keys(result.technology!.modules.top.cells).length > 0);
    },
  );
