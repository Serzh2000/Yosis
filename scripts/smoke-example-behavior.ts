import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { examples } from '../src/lib/examples';
import { parseVcd, type VcdTrace } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';
import type { Project, SimulationConfig, SimulationResult } from '../shared/types';

// Exercise the actual Yosys → Icarus pipeline, with the short simulation
// parameters described in each example. The board defaults stay unchanged.
const origin = process.env.YOSIS_API ?? 'http://127.0.0.1:3001';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${origin}${url}`, { ...init, signal: AbortSignal.timeout(60_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result as T;
}

async function simulate(id: string, parameter: string, value: number, config: Partial<SimulationConfig> = {}) {
  const source = examples.find(example => example.id === id);
  assert.ok(source, `Missing example ${id}`);
  const project: Project = structuredClone(source.project);
  const replacement = new RegExp(`(parameter integer ${parameter} = )[\\d_]+`);
  assert.match(project.files[0].content, replacement);
  project.files[0].content = project.files[0].content.replace(replacement, (_match, prefix: string) => `${prefix}${value}`);
  const settings: SimulationConfig = {
    clock: 'clk', reset: 'reset', resetActiveLow: false,
    resetCycles: 2, cycles: 42, periodNs: 10, inputs: {}, ...config,
  };
  let result = await request<SimulationResult>('/api/simulations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, config: settings }),
  });
  const deadline = Date.now() + 90_000;
  while (result.status === 'queued' || result.status === 'running') {
    if (Date.now() > deadline) {
      await request(`/api/simulations/${result.id}/cancel`, { method: 'POST' });
      throw new Error(`${id}: simulation timeout`);
    }
    await sleep(250);
    result = await request<SimulationResult>(`/api/simulations/${result.id}`);
  }
  assert.equal(result.status, 'success', `${id}: ${result.error}`);
  assert.ok(result.vcd, `${id}: VCD is missing`);
  const trace = parseVcd(result.vcd);
  return { trace, id: result.id, settings };
}

function rootSignal(trace: VcdTrace, name: string) {
  const signal = trace.signals.find(item => item.scope.join('.') === '__yosis_testbench.dut'
    && (item.name === name || item.name.startsWith(`${name}[`)));
  assert.ok(signal, `Missing root DUT signal ${name}`);
  return signal;
}

function ledSamples(trace: VcdTrace, name: string) {
  const clock = rootSignal(trace, 'clk');
  const output = rootSignal(trace, name);
  const settle = Math.max(1, 1000 / trace.timescaleFs); // Sample after the edge's delta updates.
  return clock.changes.filter(change => change.value === '1')
    .map(edge => Number.parseInt(valueAt(output, edge.time + settle), 2));
}

const blink = await simulate('blink', 'HALF_PERIOD', 4);
const blinkSamples = ledSamples(blink.trace, 'led_n');
assert.deepEqual(blinkSamples.slice(0, 2), [1, 1], 'blink: reset must turn the active-low LED off');
blinkSamples.slice(2).forEach((value, index) =>
  assert.equal(value, 1 - (Math.floor((index + 1) / 4) % 2), `blink: wrong half-period at active edge ${index + 1}`));
console.log(`PASS blink: toggle after exactly 4 edges, complete period 8; simulation ${blink.id}`);

const chaser = await simulate('chaser', 'STEP_TICKS', 4);
const chaserSamples = ledSamples(chaser.trace, 'led_n');
assert.deepEqual(chaserSamples.slice(0, 2), [62, 62], 'chaser: reset lights only LED0');
chaserSamples.slice(2).forEach((value, index) => {
  const position = Math.floor((index + 1) / 4) % 6;
  assert.equal(value, 63 ^ (1 << position), `chaser: wrong LED at active edge ${index + 1}`);
});
console.log(`PASS chaser: six one-hot steps and wrap to LED0; simulation ${chaser.id}`);

const pwm = await simulate('pwm', 'PWM_BITS', 3, {
  inputs: { button_bright: '0' }, stimuli: [{ cycle: 18, inputs: { button_bright: '1' } }],
});
const pwmSamples = ledSamples(pwm.trace, 'led_n');
assert.deepEqual(pwmSamples.slice(0, 2), [0, 0], 'PWM: reset holds phase 0 below the threshold');
const activePwm = pwmSamples.slice(2);
assert.equal(activePwm.slice(0, 16).filter(value => value === 0).length, 4, 'PWM: 25% light time across two periods');
assert.equal(activePwm.slice(16, 40).filter(value => value === 0).length, 18, 'PWM: 75% light time across three periods');
activePwm.forEach((value, index) => {
  const phase = (index + 1) % 8;
  assert.equal(value, phase < (index < 16 ? 2 : 6) ? 0 : 1, `PWM: incorrect threshold at active edge ${index + 1}`);
});
console.log(`PASS pwm: 8-edge period, 25% → 75% through a real input stimulus; simulation ${pwm.id}`);

const traffic = await simulate('traffic', 'SECOND_TICKS', 4);
const trafficSamples = ledSamples(traffic.trace, 'led_n');
assert.deepEqual(trafficSamples.slice(0, 2), [6, 6], 'traffic: reset starts with RED only');
trafficSamples.slice(2).forEach((value, index) => {
  const withinCycle = (index + 1) % 28;
  const expected = withinCycle < 12 ? 6 : withinCycle < 24 ? 5 : 3;
  assert.equal(value, expected, `traffic: incorrect state at active edge ${index + 1}`);
});
console.log(`PASS traffic: RED 12 edges → GREEN 12 → YELLOW 4 → RED; simulation ${traffic.id}`);
