import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { examples } from '../src/lib/examples';
import { parseVcd, type VcdTrace } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';
import type { SimulationConfig, SimulationResult } from '../shared/types';

// Verify the example contracts through the app's real Yosys → Icarus → VCD
// pipeline. No sources or hardware parameters are changed for these checks.
const origin = process.env.YOSIS_API ?? 'http://127.0.0.1:3001';
const selectedIds = process.argv.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
const active = new Set<string>();
const checks: Array<{ id: string; simulationId: string; samples: number; contract: string }> = [];
const startedAt = new Date().toISOString();
const periodNs = 10;

async function request<T>(route: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${origin}${route}`, { ...init, signal: AbortSignal.timeout(60_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result as T;
}

async function simulate(id: string, config: SimulationConfig) {
  const example = examples.find(item => item.id === id);
  assert.ok(example, `Missing example ${id}`);
  let result = await request<SimulationResult>('/api/simulations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: example.project, config }),
  });
  active.add(result.id);
  const deadline = Date.now() + 90_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, `${id}: simulation timeout`);
    await sleep(200);
    result = await request<SimulationResult>(`/api/simulations/${result.id}`);
  }
  active.delete(result.id);
  assert.equal(result.status, 'success', `${id}: ${result.error ?? ''}\n${result.logs.slice(-4000)}`);
  assert.match(result.engine, /icarus|iverilog/i, `${id}: expected real Icarus`);
  assert.ok(result.vcd, `${id}: missing VCD`);
  const trace = parseVcd(result.vcd);
  assert.deepEqual(trace.warnings, [], `${id}: unexpected VCD warnings`);
  return { trace, simulationId: result.id };
}

function rootSignal(trace: VcdTrace, name: string) {
  const signal = trace.signals.find(item => item.scope.join('.') === '__yosis_testbench.dut'
    && (item.name === name || item.name.startsWith(`${name}[`)));
  assert.ok(signal, `Missing DUT signal ${name}`);
  return signal;
}

function numberAt(trace: VcdTrace, name: string, time: number): number {
  const value = valueAt(rootSignal(trace, name), time);
  assert.match(value, /^[01]+$/, `${name} must have a known value at time ${time}: ${value}`);
  return Number.parseInt(value, 2);
}

function clockSamples(trace: VcdTrace, name: string, cycles: number): number[] {
  const rising = rootSignal(trace, 'clk').changes.filter(change => change.value === '1');
  assert.equal(rising.length, cycles, `${name}: expected ${cycles} rising edges`);
  const settle = 1000 / trace.timescaleFs; // One picosecond after NBA/delta updates.
  rising.slice(1).forEach((edge, index) => assert.equal(
    (edge.time - rising[index].time) * trace.timescaleFs, periodNs * 1e6, 'Clock period must remain 10 ns'));
  return rising.map(edge => numberAt(trace, name, edge.time + settle));
}

function sequential(cycles: number, inputs: SimulationConfig['inputs'], stimuli: SimulationConfig['stimuli'] = []): SimulationConfig {
  return { clock: 'clk', reset: 'reset', resetActiveLow: false, resetCycles: 2, cycles, periodNs, inputs, stimuli };
}

function report(id: string, simulationId: string, samples: number, contract: string) {
  checks.push({ id, simulationId, samples, contract });
  console.log(`PASS ${id}: ${contract}; simulation ${simulationId}`);
}

function enabledCount(index: number, pauseStart: number, pauseEnd: number, modulo: number): number {
  const workingEdges = Math.max(0, index - 1);
  const pausedEdges = Math.max(0, Math.min(index + 1, pauseEnd) - pauseStart);
  return (workingEdges - pausedEdges) % modulo;
}

const jobs: Record<string, () => Promise<void>> = {};

const combinational = [
  { id: 'inverse-gates', inputs: ['button_a', 'button_b'], expected: [3, 6, 6, 0, 3], contract: 'NAND/NOR/XNOR: all four input combinations and return' },
  { id: 'half-adder', inputs: ['button_a', 'button_b'], expected: [1, 2, 2, 3, 1], contract: '0+0/0+1/1+0/1+1: independent sum and carry' },
  { id: 'comparator', inputs: ['button_a', 'button_b'], expected: [5, 6, 3, 5, 5], contract: 'less/equal/greater: exactly one active-low LED' },
  { id: 'decoder', inputs: ['button0', 'button1'], expected: [7, 11, 13, 14, 7], contract: 'addresses 3/2/1/0 select four distinct LEDs' },
  { id: 'priority', inputs: ['button0', 'button1'], expected: [0, 0, 1, 3, 0], contract: 'higher request wins; valid clears with both released' },
] as const;
for (const test of combinational) jobs[test.id] = async () => {
  const rows = [0, 1, 2, 3, 0];
  // Rows keep their old meaning (bit = 0 means pressed); board buttons give 1 when pressed.
  const inputRow = (row: number) => ({ [test.inputs[0]]: String(1 - (row & 1)), [test.inputs[1]]: String(1 - ((row >> 1) & 1)) });
  const config: SimulationConfig = { clock: null, reset: null, resetActiveLow: true, resetCycles: 0,
    cycles: rows.length, periodNs, inputs: inputRow(rows[0]),
    stimuli: rows.slice(1).map((row, index) => ({ cycle: index + 1, inputs: inputRow(row) })) };
  const { trace, simulationId } = await simulate(test.id, config);
  const samples = rows.map((_row, cycle) => numberAt(trace, 'led_n', (cycle + .5) * periodNs * 1e6 / trace.timescaleFs));
  assert.deepEqual(samples, [...test.expected], `${test.id}: truth table or active-low LED contract`);
  report(test.id, simulationId, samples.length, test.contract);
};

jobs.parity = async () => {
  const cycles = 40;
  const { trace, simulationId } = await simulate('parity', sequential(cycles, { pause: '0' }, [
    { cycle: 9, inputs: { pause: '1' } }, { cycle: 12, inputs: { pause: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles);
  const visited = new Set<number>();
  samples.forEach((led, index) => {
    const data = enabledCount(index, 9, 12, 32);
    const ones = data.toString(2).replace(/0/g, '').length;
    assert.equal(led ^ 63, ((ones % 2) << 5) | data, `parity: five data bits and even-parity extension at edge ${index}`);
    visited.add(data);
  });
  assert.equal(visited.size, 32, 'parity: exercise all 32 five-bit words');
  assert.deepEqual(samples.slice(8, 13), [24, 24, 24, 24, 23], 'parity: pause preserves both data and parity');
  report('parity', simulationId, samples.length, 'all 32 words have even total parity; pause and wrap');
};

jobs.shift = async () => {
  const cycles = 16;
  const { trace, simulationId } = await simulate('shift', sequential(cycles, { button: '0' }, [
    { cycle: 3, inputs: { button: '1' } }, { cycle: 7, inputs: { button: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  assert.deepEqual(samples, [0, 0, 0, 0, 0, 1, 3, 7, 15, 30, 60, 56, 48, 32, 0, 0],
    'shift: delayed four-bit packet must move through all six register positions and leave');
  assert.deepEqual(clockSamples(trace, 'meta', cycles).slice(2, 6), [1, 0, 0, 0], 'shift: first synchronizer samples button');
  assert.deepEqual(clockSamples(trace, 'synced', cycles).slice(2, 6), [1, 1, 0, 0], 'shift: second synchronizer is delayed one edge');
  report('shift', simulationId, samples.length, 'four pressed samples traverse six bits after two-stage synchronization');
};

jobs.capture = async () => {
  const cycles = 18;
  const { trace, simulationId } = await simulate('capture', sequential(cycles, { button_load: '0' }, [
    { cycle: 4, inputs: { button_load: '1' } }, { cycle: 8, inputs: { button_load: '0' } },
    { cycle: 12, inputs: { button_load: '1' } }, { cycle: 14, inputs: { button_load: '0' } },
  ]));
  const saved = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  assert.deepEqual(saved, [0, 0, 0, 0, 0, 0, 4, 5, 6, 7, 7, 7, 7, 7, 12, 13, 13, 13],
    'capture: load latency, previous running value and hold after release');
  assert.deepEqual(clockSamples(trace, 'running', cycles), [0, 0, ...Array.from({ length: 16 }, (_, index) => index + 1)],
    'capture: live counter must continue while the snapshot is held');
  report('capture', simulationId, saved.length, 'two delayed loads capture previous count; snapshot holds while counter continues');
};

jobs.updown = async () => {
  const cycles = 18;
  const { trace, simulationId } = await simulate('updown', sequential(cycles, { button_direction: '0' }, [
    { cycle: 4, inputs: { button_direction: '1' } }, { cycle: 10, inputs: { button_direction: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  assert.deepEqual(samples, [0, 0, 1, 2, 3, 4, 3, 2, 1, 0, 63, 62, 63, 0, 1, 2, 3, 4],
    'updown: delayed direction changes and both 0→63 / 63→0 wraps');
  report('updown', simulationId, samples.length, 'two-stage direction delay; upward and downward wrap at six-bit boundaries');
};

jobs.saturating = async () => {
  const cycles = 78;
  const { trace, simulationId } = await simulate('saturating', sequential(cycles, { pause: '0' }, [
    { cycle: 10, inputs: { pause: '1' } }, { cycle: 13, inputs: { pause: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  assert.deepEqual(samples.slice(0, 2), [0, 0], 'saturating: reset clears count');
  assert.deepEqual(samples.slice(9, 14), [8, 8, 8, 8, 9], 'saturating: pause before saturation');
  samples.slice(2, 10).forEach((value, index) => assert.equal(value, index + 1));
  samples.slice(13, 68).forEach((value, index) => assert.equal(value, index + 9));
  assert.deepEqual(samples.slice(68), Array(10).fill(63), 'saturating: at least ten enabled edges remain at 63, never wrap');
  report('saturating', simulationId, samples.length, '78 edges: pause, reach 63, hold for ten further enabled edges');
};

jobs.gray = async () => {
  const cycles = 72;
  const { trace, simulationId } = await simulate('gray', sequential(cycles, { pause: '0' }, [
    { cycle: 20, inputs: { pause: '1' } }, { cycle: 23, inputs: { pause: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  const visited = new Set<number>();
  samples.forEach((gray, index) => {
    const binary = enabledCount(index, 20, 23, 64);
    assert.equal(gray, binary ^ (binary >> 1), `gray: value for binary ${binary}`);
    visited.add(gray);
    if (index >= 2) {
      const difference = gray ^ samples[index - 1];
      if (index >= 20 && index < 23) assert.equal(difference, 0, 'gray: pause keeps the code');
      else assert.ok(difference > 0 && (difference & (difference - 1)) === 0, `gray: exactly one bit changes at edge ${index}, including wrap`);
    }
  });
  assert.equal(visited.size, 64, 'gray: full six-bit cycle visits every code');
  report('gray', simulationId, samples.length, 'all 64 codes; one changed bit per step including wrap; pause');
};

jobs.johnson = async () => {
  const cycles = 31;
  const sequence = [0, 1, 3, 7, 15, 31, 63, 62, 60, 56, 48, 32];
  const { trace, simulationId } = await simulate('johnson', sequential(cycles, { pause: '0' }, [
    { cycle: 14, inputs: { pause: '1' } }, { cycle: 17, inputs: { pause: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles).map(value => value ^ 63);
  samples.forEach((state, index) => assert.equal(state, sequence[enabledCount(index, 14, 17, 12)], `johnson: known state at edge ${index}`));
  assert.deepEqual(samples.slice(2, 14), [...sequence.slice(1), 0], 'johnson: full 12-state cycle returns to zero');
  assert.deepEqual(samples.slice(13, 18), [0, 0, 0, 0, 1], 'johnson: enabled state is held while paused');
  assert.equal(new Set(samples).size, 12, 'johnson: no states outside the reset-established 12-state cycle');
  report('johnson', simulationId, samples.length, 'complete 12-state fill/clear cycle, repeat, and pause at zero');
};

jobs['edge-toggle'] = async () => {
  const cycles = 25;
  const { trace, simulationId } = await simulate('edge-toggle', sequential(cycles, { button: '0' }, [
    { cycle: 3, inputs: { button: '1' } }, { cycle: 9, inputs: { button: '0' } },
    { cycle: 14, inputs: { button: '1' } }, { cycle: 20, inputs: { button: '0' } },
  ]));
  const samples = clockSamples(trace, 'led_n', cycles);
  assert.deepEqual(samples, [...Array(5).fill(1), ...Array(11).fill(0), ...Array(9).fill(1)],
    'edge-toggle: each delayed press toggles once; long holds and release never toggle');
  const changes = samples.filter((value, index) => index > 0 && value !== samples[index - 1]);
  assert.equal(changes.length, 2, 'edge-toggle: two presses must cause exactly two LED changes');
  assert.deepEqual(clockSamples(trace, 'meta', cycles).slice(3, 6), [0, 0, 0]);
  assert.deepEqual(clockSamples(trace, 'synced', cycles).slice(3, 6), [1, 0, 0]);
  report('edge-toggle', simulationId, samples.length, 'two delayed presses toggle twice; holds and releases keep LED state');
};

try {
  if (selectedIds) assert.ok(selectedIds.every(id => jobs[id]), 'Unknown example ID in --only');
  for (const [id, run] of Object.entries(jobs)) {
    if (!selectedIds || selectedIds.includes(id)) await run();
  }
  assert.equal(checks.length, selectedIds?.length ?? 13, 'All requested example contracts must run');
  const reportPath = path.resolve('.simulations', 'new-example-behavior-report.json');
  await writeFile(reportPath, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), engine: 'Yosys → Icarus Verilog → VCD', checks }, null, 2), 'utf8');
  console.log(`Verified ${checks.length} example contracts. Report: ${reportPath}`);
} finally {
  await Promise.allSettled([...active].map(id => request(`/api/simulations/${id}/cancel`, { method: 'POST' })));
}
