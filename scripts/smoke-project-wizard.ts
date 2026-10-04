import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import type { BuildResult, Project, SimulationConfig, SimulationResult } from '../shared/types';
import type { PhysicalConfig, PhysicalResult } from '../shared/physical';
import { createWizardProject } from '../src/lib/project-wizard';
import { parseCstPins, parsePlacement } from '../src/lib/physical';
import { boardPorts, portBitName, simulationDefaults, topSignal } from '../src/lib/virtual-board';
import { parseVcd } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';

// Test the actual output of the project wizard, including custom top names and
// a multi-file hierarchy, through the same local HTTP endpoints as the IDE.
const origin = process.env.YOSIS_API ?? 'http://127.0.0.1:3001';
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${origin}${url}`, { ...init, signal: AbortSignal.timeout(60_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result as T;
}
function post(body: unknown): RequestInit { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }
const builds = {
  create: (project: Project) => request<BuildResult>('/api/builds', post({ project })),
  get: (id: string) => request<BuildResult>(`/api/builds/${id}`),
};
const simulations = {
  create: (project: Project, config: SimulationConfig) => request<SimulationResult>('/api/simulations', post({ project, config })),
  get: (id: string) => request<SimulationResult>(`/api/simulations/${id}`),
};
const physical = {
  create: (project: Project, buildId: string, config: PhysicalConfig) => request<PhysicalResult>('/api/physical', post({ project, buildId, config })),
  get: (id: string) => request<PhysicalResult>(`/api/physical/${id}`),
};
async function complete<T extends { id: string; status: string; error?: string; logs: string }>(job: T, get: (id: string) => Promise<T>) {
  const deadline = Date.now() + 180_000;
  while (job.status === 'queued' || job.status === 'running') {
    assert.ok(Date.now() < deadline, `Wizard smoke exceeded its deadline (${job.id})`);
    await sleep(250);
    job = await get(job.id);
  }
  assert.equal(job.status, 'success', `${job.error ?? 'Job failed'}\n${job.logs.slice(-6000)}`);
  return job;
}

for (const start of ['blank', 'alu']) {
    const project = createWizardProject({ start, name: `wizard-${start}-check`, top: `school_${start}` });
    const build = await complete(await builds.create(project), id => builds.get(id));
    assert.ok(build.rtl && build.technology);
    assert.ok(build.rtl.modules[project.top]);
    if (start === 'alu') assert.ok(build.rtl.modules.alu, 'Custom top must preserve the child hierarchy');
    const ports = boardPorts(project, build.rtl);
    const bits = ports.flatMap(port => Array.from({ length: port.width }, (_, bit) => portBitName(port, bit))).sort();
    assert.deepEqual(parseCstPins(project.files).map(pin => pin.signal).sort(), bits);
    const config = { ...simulationDefaults(ports), cycles: 8 };
    if (start === 'alu') config.inputs.button = '1';
    const simulation = await complete(await simulations.create(project, config), id => simulations.get(id));
    const trace = parseVcd(simulation.vcd!);
    const leds = topSignal(trace, 'led_n'); assert.ok(leds);
    const actual = Number.parseInt(valueAt(leds, trace.endTime), 2);
    assert.equal(actual, start === 'blank' ? 63 : 55, `${start}: expected known LED output after reset and six active edges`);
    const result = await complete(await physical.create(project, build.id, { cstFile: 'board.cst', frequencyMHz: 27 }), id => physical.get(id));
    assert.ok(result.placed && result.bitstreamAvailable);
    const map = parsePlacement(result.placed);
    assert.equal(map.unplaced, 0);
    assert.equal(map.fullChipBounds, true);
    assert.ok(map.cells.length && map.routingPips);
    const fsResponse = await fetch(`${origin}/api/physical/${result.id}/artifacts/design.fs`, { signal: AbortSignal.timeout(60_000) });
    assert.equal(fsResponse.status, 200);
    const bitstream = await fsResponse.arrayBuffer();
    assert.ok(bitstream.byteLength > 1000);
    console.log(`PASS wizard ${start}: ${project.top} → Yosys → Icarus led_n=${actual} → CST → ${map.cells.length} cells, ${map.routingPips} PIPs → ${bitstream.byteLength} byte bitstream (${result.id})`);
}
