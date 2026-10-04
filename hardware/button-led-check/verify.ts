import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildManager } from '../../server/builds';
import { PhysicalManager } from '../../server/physical';
import { validateProject, validateSimulationConfig, projectHash } from '../../server/validation';
import { parsePlacement } from '../../src/lib/physical';

const directory = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(directory, '../..');
const invoke = promisify(execFile);
const portable = path.join(workspace, '.tools/iverilog/mingw64');
const bin = path.join(portable, 'bin');
const env = { ...process.env };
const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH';
if (process.platform === 'win32') env[pathKey] = `${bin}${path.delimiter}${env[pathKey] ?? ''}`;
const compiler = process.env.IVERILOG_PATH ?? (process.platform === 'win32' ? path.join(bin, 'iverilog.exe') : 'iverilog');
const runtime = process.env.VVP_PATH ?? (process.platform === 'win32' ? path.join(bin, 'vvp.exe') : 'vvp');
const library = process.env.IVERILOG_LIB ?? (process.platform === 'win32' ? path.join(portable, 'lib/ivl') : undefined);
const project = validateProject({ name: 'button-led-check', top: 'top', board: 'tangnano20k', files: await Promise.all(['top.v', 'board.cst'].map(async name => ({ name, content: await readFile(path.join(directory, name), 'utf8') }))) });
await writeFile(path.join(directory, 'project.json'), JSON.stringify(project, null, 2));
const simulationConfig = validateSimulationConfig({ clock: null, reset: null, resetActiveLow: true, periodNs: 10, cycles: 4, resetCycles: 0, inputs: { button_a_n: '1', button_b_n: '1' }, stimuli: [{ cycle: 1, inputs: { button_a_n: '0', button_b_n: '1' } }, { cycle: 2, inputs: { button_a_n: '1', button_b_n: '0' } }, { cycle: 3, inputs: { button_a_n: '0', button_b_n: '0' } }] });
await writeFile(path.join(directory, 'simulation-config.json'), JSON.stringify(simulationConfig, null, 2));
await invoke(compiler, [...(library ? ['-B', library] : []), '-g2012', '-s', 'tb', '-o', 'simulation.vvp', 'top.v', 'tb.sv'], { cwd: directory, env, windowsHide: true });
const simulation = await invoke(runtime, ['simulation.vvp'], { cwd: directory, env, windowsHide: true });
assert.match(simulation.stdout, /All four button combinations passed/);
await writeFile(path.join(directory, 'simulation.log'), simulation.stdout + simulation.stderr);
console.log(simulation.stdout.trim());

const builds = new BuildManager(path.join(workspace, '.builds'));
const physical = new PhysicalManager(path.join(workspace, '.physical'), builds);
async function complete<T extends { id: string; status: string; stage: string; error?: string; logs: string }>(job: T, get: (id: string) => Promise<T>) {
    const deadline = Date.now() + 300000;
    let stage = '';
    while (['queued', 'running'].includes(job.status)) {
        assert.ok(Date.now() < deadline, 'Build deadline exceeded');
        if (job.stage !== stage) { stage = job.stage; console.log(stage); }
        await new Promise(resolve => setTimeout(resolve, 500));
        job = await get(job.id);
    }
    assert.equal(job.status, 'success', `${job.error}\n${job.logs.slice(-6000)}`);
    return job;
}
try {
    const build = await complete(await builds.create(project), id => builds.get(id));
    const result = await complete(await physical.create(project, build.id, { cstFile: 'board.cst', frequencyMHz: 27 }), id => physical.get(id));
    assert.ok(result.placed); assert.ok(result.bitstreamAvailable);
    const bitstream = await physical.artifact(result.id, 'design.fs');
    await writeFile(path.join(directory, 'design.fs'), bitstream.content);
    await writeFile(path.join(directory, 'synthesis.log'), build.logs);
    await writeFile(path.join(directory, 'physical.log'), result.logs);
    await writeFile(path.join(directory, 'rtl.json'), JSON.stringify(build.rtl));
    await writeFile(path.join(directory, 'technology.json'), JSON.stringify(build.technology));
    await writeFile(path.join(directory, 'placement.json'), JSON.stringify(result.placed));
    await writeFile(path.join(directory, 'timing.json'), JSON.stringify(result.report, null, 2));
    const map = parsePlacement(result.placed);
    const receipt = { createdAt: new Date().toISOString(), projectHash: projectHash(project), buildId: build.id, physicalId: result.id, bitstreamBytes: bitstream.content.length, bitstreamSha256: createHash('sha256').update(bitstream.content).digest('hex'), device: 'GW2AR-LV18QN88C8/I7', family: map.family, cells: map.cells.length, routingPips: map.routingPips, occupiedTiles: map.tiles.filter(tile => tile.cells.length).length, simulation: 'Icarus: all four combinations passed', physicalReport: result.report };
    await writeFile(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt, null, 2));
} finally { await physical.close(); await builds.close(); }
