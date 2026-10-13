import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Project, SimulationConfig, SimulationResult } from '../shared/types';
import { SimulationManager } from '../server/simulations';
import { generateTestbench } from '../server/simulation-testbench';
import { validateSimulationConfig } from '../server/validation';
import { parseVcd } from '../src/lib/vcd';

const config: SimulationConfig = {
  clock: 'clk',
  reset: 'rst',
  resetActiveLow: false,
  resetCycles: 2,
  cycles: 8,
  periodNs: 10,
  inputs: { enable: '1' },
};
const project: Project = {
  name: 'simulation-counter',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content:
        'module top(input clk, rst, enable, output reg [3:0] count); always @(posedge clk) if(rst) count<=0; else if(enable) count<=count+1; endmodule',
    },
  ],
};

async function wait(manager: SimulationManager, result: SimulationResult) {
  const deadline = Date.now() + 20_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, 'Simulation must complete before test deadline');
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', result.error + '\n' + result.logs);
  return result;
}

test('simulation configuration rejects injection, conflicting controls and invalid numeric limits', () => {
  assert.deepEqual({ ...validateSimulationConfig(config), inputs: { ...config.inputs } }, config);
  for (const bad of [
    { clock: 'clk; shell ls' },
    { reset: 'clk' },
    { cycles: 0 },
    { cycles: 10001 },
    { resetCycles: 9 },
    { periodNs: 0 },
    { inputs: { enable: '1; $system()' } },
  ])
    assert.throws(() => validateSimulationConfig({ ...config, ...bad }));
  const ports = {
    clk: { direction: 'input' as const, bits: [2] },
    rst: { direction: 'input' as const, bits: [3] },
    enable: { direction: 'input' as const, bits: [4] },
    count: { direction: 'output' as const, bits: [5, 6, 7, 8] },
  };
  assert.throws(
    () => generateTestbench('top', ports, { ...config, inputs: { enable: '2' } }),
    /не помещается/,
  );
  assert.throws(
    () => generateTestbench('top', ports, { ...config, clock: 'missing' }),
    /должен существовать/,
  );
  assert.match(generateTestbench('top', ports, config), /#20;\n {4}#0\.001;/);
  for (const stimuli of [
    [{ cycle: -1, inputs: { enable: '1' } }],
    [{ cycle: 8, inputs: { enable: '1' } }],
    [
      { cycle: 2, inputs: { enable: '1' } },
      { cycle: 2, inputs: { enable: '0' } },
    ],
    [{ cycle: 0, inputs: { clk: '0' } }],
    [{ cycle: 0, inputs: { enable: '-1' } }],
  ])
    assert.throws(() => validateSimulationConfig({ ...config, stimuli }));
  assert.throws(
    () =>
      generateTestbench('top', ports, {
        ...config,
        stimuli: [{ cycle: 0, inputs: { enable: '2' } }],
      }),
    /не помещается/,
  );
});

test('real Icarus simulation emits reset, clock, enabled counter and saved VCD', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-real-simulation-'));
  const manager = new SimulationManager(directory);
  try {
    const health = await manager.health();
    assert.equal(
      health.available,
      true,
      'Portable Icarus must be prepared with npm run setup:iverilog',
    );
    const result = await wait(manager, await manager.create(project, config));
    const trace = parseVcd(result.vcd!);
    const count = trace.signals.find((signal) => /\bcount\b/.test(signal.name));
    assert.ok(count, 'counter signal exists in real VCD');
    const values = count.changes
      .map((change) => change.value)
      .filter((value) => /^[01]+$/.test(value))
      .map((value) => parseInt(value, 2));
    assert.deepEqual(values, [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(await readFile(await manager.artifact(result.id, 'wave.vcd'), 'utf8'), result.vcd);
    const restored = await new SimulationManager(directory).get(result.id);
    assert.equal(restored.vcd, result.vcd);
    const stopped = await wait(
      manager,
      await manager.create(project, { ...config, inputs: { enable: '0' } }),
    );
    const held = parseVcd(stopped.vcd!).signals.find((signal) => /\bcount\b/.test(signal.name));
    assert.ok(held);
    assert.deepEqual(
      held.changes
        .filter((change) => /^[01]+$/.test(change.value))
        .map((change) => parseInt(change.value, 2)),
      [0],
    );
    const negative = await wait(
      manager,
      await manager.create(
        {
          ...project,
          files: [
            { name: 'top.v', content: project.files[0].content.replace('posedge', 'negedge') },
          ],
        },
        config,
      ),
    );
    const negativeCount = parseVcd(negative.vcd!).signals.find((signal) =>
      /\bcount\b/.test(signal.name),
    );
    assert.ok(negativeCount);
    assert.deepEqual(
      negativeCount.changes
        .filter((change) => /^[01]+$/.test(change.value))
        .map((change) => parseInt(change.value, 2)),
      [0, 1, 2, 3, 4, 5, 6],
    );
    const inputsChanged = await wait(
      manager,
      await manager.create(project, {
        ...config,
        stimuli: [
          { cycle: 4, inputs: { enable: '0' } },
          { cycle: 6, inputs: { enable: '1' } },
        ],
      }),
    );
    const changedTrace = parseVcd(inputsChanged.vcd!);
    const changedCount = changedTrace.signals.find((signal) => /\bcount\b/.test(signal.name));
    assert.ok(changedCount);
    assert.deepEqual(
      changedCount.changes
        .filter((change) => /^[01]+$/.test(change.value))
        .map((change) => parseInt(change.value, 2)),
      [0, 1, 2, 3, 4],
    );
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});
