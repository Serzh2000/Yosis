import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { SimulationConfig, SimulationResult, Project } from '../shared/types';
import {
  expectedValueBits,
  readSimulationChecks,
  simulationTimePs,
  simulationScenarioSnapshot,
} from '../shared/simulation-scenario';
import { validateSimulationConfig } from '../server/validation';
import { SimulationManager } from '../server/simulations';
import { generateTestbench } from '../server/simulation-testbench';
import { parseVcd } from '../src/lib/vcd';

const base: SimulationConfig = {
  clock: null,
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 8,
  periodNs: 10,
  inputs: { a: '0', b: '0' },
};
const ports = {
  a: { direction: 'input' as const, bits: [2] },
  b: { direction: 'input' as const, bits: [3] },
  y: { direction: 'output' as const, bits: [4] },
};

test('scenario freshness compares canonical settings and every kind of event, independent of JSON key order', () => {
  const reordered = { ...base, inputs: { b: '0', a: '0' }, stimuli: [], expectations: [] };
  assert.equal(simulationScenarioSnapshot(base), simulationScenarioSnapshot(reordered));
  for (const changed of [
    { ...base, periodNs: 20 },
    { ...base, inputs: { ...base.inputs, a: '1' } },
    { ...base, timedStimuli: [{ timeNs: 1, inputs: { a: '1' } }] },
    { ...base, expectations: [{ timeNs: 0, signal: 'y', value: '1' }] },
  ])
    assert.notEqual(simulationScenarioSnapshot(base), simulationScenarioSnapshot(changed));
});

test('exact times have ps resolution and reject fractions, injection and invalid bounds', () => {
  assert.equal(simulationTimePs(0.029), 29);
  assert.equal(simulationTimePs(2.125), 2125);
  for (const value of [-1, Infinity, NaN, '1', 0.0001])
    assert.throws(() => simulationTimePs(value));
  const valid = validateSimulationConfig({
    ...base,
    timedStimuli: [{ timeNs: 2.125, inputs: { a: '1' } }],
    expectations: [{ timeNs: 80, signal: 'y', value: 'x' }],
  });
  assert.equal(valid.timedStimuli?.[0].timeNs, 2.125);
  for (const bad of [
    { timedStimuli: [{ timeNs: 80, inputs: { a: '1' } }] },
    {
      timedStimuli: [
        { timeNs: 2, inputs: { a: '1' } },
        { timeNs: 2, inputs: { b: '1' } },
      ],
    },
    {
      timedStimuli: [{ timeNs: 3, inputs: { a: '1' } }],
      stimuli: [{ cycle: 0, inputs: { b: '1' } }],
    },
    { timedStimuli: [{ timeNs: 0, inputs: { a: '1; $system()' } }] },
    { expectations: [{ timeNs: 81, signal: 'y', value: '1' }] },
    { expectations: [{ timeNs: 0, signal: 'y);$finish', value: '1' }] },
    { expectations: [{ timeNs: 0, signal: 'y', value: '-1' }] },
    { expectations: Array.from({ length: 2049 }, () => ({ timeNs: 0, signal: 'y', value: '1' })) },
  ])
    assert.throws(() => validateSimulationConfig({ ...base, ...bad }));
});

test('expected values compare every bit including X and Z; numeric overflow is rejected', () => {
  assert.equal(expectedValueBits('0xF', 8), '00001111');
  assert.equal(expectedValueBits('X', 3), 'xxx');
  assert.equal(expectedValueBits('Z', 3), 'zzz');
  assert.equal(expectedValueBits('0b1Xz', 4), '01xz');
  assert.equal(expectedValueBits('18446744073709551615', 64), '1'.repeat(64));
  for (const [value, width] of [
    ['2', 1],
    ['0b00', 1],
    ['-1', 4],
    ['1; $system()', 4],
  ] as const)
    assert.throws(() => expectedValueBits(value, width));
  assert.throws(
    () =>
      generateTestbench('top', ports, {
        ...base,
        expectations: [{ timeNs: 0, signal: 'y', value: '2' }],
      }),
    /не помещается/,
  );
  assert.throws(
    () =>
      generateTestbench('top', ports, {
        ...base,
        expectations: [{ timeNs: 0, signal: 'missing', value: '0' }],
      }),
    /отсутствует/,
  );
});

test('missing, duplicate or wrong-width simulation samples fail rather than appear successful', () => {
  const expectations = [0, 1, 2, 3].map((timeNs) => ({ timeNs, signal: 'y', value: '1' }));
  const checks = readSimulationChecks('0 1\n1 1\n1 1\n2 01\nnoise\n', expectations, ports);
  assert.deepEqual(
    checks.map((entry) => entry.passed),
    [true, false, false, false],
  );
  assert.deepEqual(
    checks.map((entry) => entry.actual),
    ['1', null, null, null],
  );
});

async function finish(manager: SimulationManager, result: SimulationResult) {
  const deadline = Date.now() + 30000;
  while (result.status === 'running' || result.status === 'queued') {
    assert.ok(Date.now() < deadline, 'simulation deadline');
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', result.error + '\n' + result.logs);
  return result;
}

test('real Icarus applies sparse events at fractional ns, settles checks and persists mismatch evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-timed-'));
  const manager = new SimulationManager(root);
  try {
    const project: Project = {
      name: 'timed-AND',
      top: 'top',
      board: 'tangnano20k',
      files: [
        { name: 'top.v', content: 'module top(input a,b,output y); assign y=a&b; endmodule' },
      ],
    };
    const config = validateSimulationConfig({
      ...base,
      timedStimuli: [
        { timeNs: 2.125, inputs: { a: '1' } },
        { timeNs: 3.555, inputs: { b: '1' } },
        { timeNs: 4, inputs: { a: '0' } },
      ],
      expectations: [
        { timeNs: 0, signal: 'y', value: '0' },
        { timeNs: 2.125, signal: 'y', value: '0' },
        { timeNs: 3.555, signal: 'y', value: '1' },
        { timeNs: 4, signal: 'y', value: '0' },
        { timeNs: 80, signal: 'y', value: '1' },
      ],
    });
    const result = await finish(manager, await manager.create(project, config));
    assert.deepEqual(
      result.checks?.map((entry) => entry.passed),
      [true, true, true, true, false],
    );
    assert.equal(result.checks?.[4].actual, '0');
    const trace = parseVcd(result.vcd!);
    const y = trace.signals.find((signal) => signal.name === 'y')!;
    assert.ok(
      y.changes.some(
        (event) => (event.time * trace.timescaleFs) / 1e6 === 3.555 && event.value === '1',
      ),
    );
    const restored = await new SimulationManager(root).get(result.id);
    assert.deepEqual(restored.checks, result.checks);
  } finally {
    await manager.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('inputs driven on a clock edge settle after the register samples its previous input', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-edge-'));
  const manager = new SimulationManager(root);
  try {
    const project: Project = {
      name: 'edge-order',
      top: 'top',
      board: 'tangnano20k',
      files: [
        {
          name: 'top.v',
          content:
            'module top(input clk,rst,enable, output reg [3:0] count); always @(posedge clk) if(rst) count<=0; else if(enable) count<=count+1; endmodule',
        },
      ],
    };
    const config = validateSimulationConfig({
      ...base,
      clock: 'clk',
      reset: 'rst',
      resetCycles: 2,
      inputs: { enable: '1' },
      timedStimuli: [
        { timeNs: 25, inputs: { enable: '0' } },
        { timeNs: 65, inputs: { enable: '1' } },
      ],
      expectations: [
        { timeNs: 0, signal: 'count', value: 'x' },
        { timeNs: 5, signal: 'count', value: '0' },
        { timeNs: 25, signal: 'count', value: '1' },
        { timeNs: 35, signal: 'count', value: '1' },
        { timeNs: 65, signal: 'count', value: '1' },
        { timeNs: 75, signal: 'count', value: '2' },
        { timeNs: 80, signal: 'count', value: '2' },
      ],
    });
    const result = await finish(manager, await manager.create(project, config));
    assert.equal(
      result.checks?.every((entry) => entry.passed),
      true,
      JSON.stringify(result.checks),
    );
  } finally {
    await manager.close();
    await rm(root, { recursive: true, force: true });
  }
});
