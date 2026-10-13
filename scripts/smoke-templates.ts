import assert from 'node:assert/strict';
import path from 'node:path';
import { BuildManager } from '../server/builds';
import { SimulationManager } from '../server/simulations';
import { PhysicalManager } from '../server/physical';
import { createProject } from '../src/lib/project-templates';
import { boardPorts, simulationDefaults, topSignal } from '../src/lib/virtual-board';
import { parseVcd } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';
import { parsePlacement } from '../src/lib/physical';

const builds = new BuildManager(path.resolve('.builds'));
const simulations = new SimulationManager(path.resolve('.simulations'));
const physical = new PhysicalManager(path.resolve('.physical'), builds);
async function complete<T extends {id:string;status:string;error?:string;logs:string}>(result:T, get:(id:string)=>Promise<T>) {
  const deadline = Date.now() + 300_000;
  while (['queued','running'].includes(result.status)) {
    assert.ok(Date.now() < deadline, 'Template check exceeded its deadline');
    await new Promise(resolve => setTimeout(resolve, 200)); result = await get(result.id);
  }
  assert.equal(result.status, 'success', `${result.error}\n${result.logs.slice(-5000)}`);
  return result;
}
try {
  for (const template of ['blank','logic','counter'] as const) {
    const project = createProject(`template-${template}`, template);
    const build = await complete(await builds.create(project), id => builds.get(id));
    const config = { ...simulationDefaults(boardPorts(project, build.rtl)), cycles:8 };
    if (template === 'logic') config.inputs.c = '1';
    const simulated = await complete(await simulations.create(project, config), id => simulations.get(id));
    const trace = parseVcd(simulated.vcd!);
    const name = template === 'counter' ? 'count' : template === 'logic' ? 'y' : 'led';
    const signal = topSignal(trace, name); assert.ok(signal);
    assert.equal(BigInt(`0b${valueAt(signal, trace.endTime)}`), template === 'counter' ? 6n : template === 'logic' ? 1n : 0n);
    const placed = await complete(await physical.create(project, build.id, {cstFile:'board.cst', frequencyMHz:27}), id => physical.get(id));
    assert.ok(placed.placed); assert.ok(placed.bitstreamAvailable);
    const map = parsePlacement(placed.placed);
    assert.ok(map.cells.length); assert.equal(map.unplaced, 0);
    assert.ok((await physical.artifact(placed.id, 'design.fs')).content.length > 1000);
    console.log(`PASS ${template}: new project → RTL simulation → CST → ${map.cells.length} placed cells → bitstream (${placed.id})`);
  }
} finally { await Promise.allSettled([physical.close(), simulations.close(), builds.close()]); }
