import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { BuildManager } from '../server/builds';
import { SimulationManager } from '../server/simulations';
import { PhysicalManager } from '../server/physical';
import { projectHash, validateProject as validateBackendProject } from '../server/validation';
import { examples, cloneProject, validateProject } from '../src/lib/projects';
import { boardPorts, portBitName, simulationDefaults, topSignal } from '../src/lib/virtual-board';
import { parseVcd } from '../src/lib/vcd';
import { valueAt } from '../src/lib/waveform';
import { parseCstPins, parsePlacement } from '../src/lib/physical';

// Runs the same managers as the app, without depending on or restarting its HTTP server.
// Keep snapshots and the report so a failed example has inspectable logs and artifacts.
const builds = new BuildManager(path.resolve('.builds'));
const simulations = new SimulationManager(path.resolve('.simulations'));
const physical = new PhysicalManager(path.resolve('.physical'), builds);
const only = process.argv.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
const selected = examples.filter(example => !only || only.includes(example.id));
assert.ok(selected.length, 'No examples matched --only');
if (only) assert.ok(only.every(id => selected.some(example => example.id === id)), 'Unknown example ID in --only');
assert.equal(new Set(examples.map(example => example.id)).size, examples.length, 'Example IDs must be unique');
assert.equal(new Set(examples.map(example => example.project.name)).size, examples.length, 'Example project names must be unique');

interface Job { id: string; status: string; error?: string; logs: string }
async function complete<T extends Job>(job: T, get: (id: string) => Promise<T>): Promise<T> {
  const deadline = Date.now() + 300_000;
  while (job.status === 'queued' || job.status === 'running') {
    assert.ok(Date.now() < deadline, `Job ${job.id} exceeded the example check deadline`);
    await sleep(250);
    job = await get(job.id);
  }
  assert.equal(job.status, 'success', `${job.error ?? 'Job failed'}\n${job.logs.slice(-7000)}`);
  return job;
}

interface ExampleCheck {
  id: string; title: string; status: 'running' | 'success' | 'error'; elapsedMs?: number;
  projectHash?: string; buildId?: string; simulationId?: string; physicalId?: string; cstFile?: string;
  cells?: number; routingPips?: number; occupiedTiles?: number; routedTiles?: number;
  bitstreamBytes?: number; outputSignals?: number; error?: string;
}
const checks: ExampleCheck[] = [];
const reportPath = path.resolve('.physical', only ? `example-smoke-${only.join('-')}.json` : 'example-smoke-report.json');
const startedAt = new Date().toISOString();
async function saveReport() {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({ startedAt, updatedAt: new Date().toISOString(),
    expectedDevice: 'GW2AR-LV18QN88C8/I7', expectedFamily: 'GW2A-18C', grid: { columns: 56, rows: 55 },
    checks,
  }, null, 2), 'utf8');
}

try {
  const [synthTools, simulationTools, physicalTools] = await Promise.all([builds.health(), simulations.health(), physical.health()]);
  assert.equal(synthTools.yosys.available, true, 'Yosys unavailable');
  assert.equal(simulationTools.available, true, 'Icarus unavailable');
  assert.equal(physicalTools.available, true, physicalTools.error);
  assert.equal(physicalTools.bitstreamAvailable, true, 'Apicula packer unavailable');
  console.log(`Checking ${selected.length} examples with ${synthTools.yosys.version}, ${simulationTools.version}, ${physicalTools.nextpnrVersion}`);

  for (const example of selected) {
    const started = Date.now();
    const check: ExampleCheck = { id: example.id, title: example.title, status: 'running' };
    checks.push(check);
    try {
      const project = validateBackendProject(validateProject(cloneProject(example.project)));
      check.projectHash = projectHash(project);
      const constraints = project.files.filter(file => /\.cst$/.test(file.name));
      assert.equal(constraints.length, 1, `${example.id}: expected one complete board CST`);
      check.cstFile = constraints[0].name;
      const build = await complete(await builds.create(project), id => builds.get(id));
      check.buildId = build.id;
      assert.ok(build.rtl && build.technology, `${example.id}: synthesis must produce both netlists`);
      const ports = boardPorts(project, build.rtl);
      assert.ok(ports.length, `${example.id}: no top-level ports`);
      const expectedPins = ports.flatMap(port => Array.from({ length: port.width }, (_, bit) => portBitName(port, bit))).sort();
      const pins = parseCstPins(constraints);
      assert.deepEqual(pins.map(pin => pin.signal).sort(), expectedPins, `${example.id}: CST must assign every top-level bit exactly once`);
      assert.equal(new Set(pins.map(pin => pin.pin)).size, pins.length, `${example.id}: a package pin is assigned more than once`);

      const config = { ...simulationDefaults(ports), cycles: 64 };
      const simulation = await complete(await simulations.create(project, config), id => simulations.get(id));
      check.simulationId = simulation.id;
      assert.ok(simulation.vcd, `${example.id}: missing VCD`);
      const trace = parseVcd(simulation.vcd);
      assert.ok(trace.endTime > trace.startTime, `${example.id}: VCD has no timeline`);
      const outputs = ports.filter(port => port.direction === 'output');
      assert.ok(outputs.length, `${example.id}: no output signals`);
      for (const output of outputs) {
        const signal = topSignal(trace, output.name);
        assert.ok(signal, `${example.id}: VCD lacks top-level output ${output.name}`);
        assert.equal(signal.width, output.width, `${example.id}: unexpected width of ${output.name}`);
        assert.match(valueAt(signal, trace.endTime), /^[01]+$/, `${example.id}: ${output.name} remains X/Z after reset and 64 periods`);
      }
      check.outputSignals = outputs.length;

      const result = await complete(await physical.create(project, build.id, { cstFile: constraints[0].name, frequencyMHz: 27 }), id => physical.get(id));
      check.physicalId = result.id;
      assert.ok(result.placed, `${example.id}: missing nextpnr placement`);
      assert.equal(result.bitstreamAvailable, true, `${example.id}: bitstream unavailable`);
      const map = parsePlacement(result.placed);
      assert.equal(map.family, 'GW2A-18C');
      assert.equal(map.device, 'GW2AR-LV18QN88C8/I7');
      assert.equal(map.fullChipBounds, true, `${example.id}: map must use the whole chip database grid`);
      assert.equal(map.maxX, 55); assert.equal(map.maxY, 54);
      assert.equal(map.unplaced, 0, `${example.id}: cells missing from the heatmap`);
      assert.ok(map.cells.length > 0, `${example.id}: empty placement heatmap`);
      assert.ok(map.routingPips > 0, `${example.id}: empty routing heatmap`);
      assert.equal(new Set(map.cells.map(cell => cell.bel)).size, map.cells.length, `${example.id}: duplicate BEL occupancy`);
      assert.equal(new Set(map.tiles.map(tile => `${tile.x},${tile.y}`)).size, map.tiles.length, `${example.id}: duplicate heatmap tile`);
      for (const tile of map.tiles) {
        assert.ok(Number.isInteger(tile.x) && tile.x >= 0 && tile.x <= 55, `${example.id}: invalid tile x=${tile.x}`);
        assert.ok(Number.isInteger(tile.y) && tile.y >= 0 && tile.y <= 54, `${example.id}: invalid tile y=${tile.y}`);
        assert.ok(Number.isInteger(tile.routingPips) && tile.routingPips >= 0, `${example.id}: invalid routing density`);
        for (const cell of tile.cells) {
          assert.equal(cell.x, tile.x); assert.equal(cell.y, tile.y);
        }
      }
      assert.equal(map.tiles.reduce((sum, tile) => sum + tile.cells.length, 0), map.cells.length, `${example.id}: cells lost during map aggregation`);
      assert.equal(map.tiles.reduce((sum, tile) => sum + tile.routingPips, 0), map.routingPips, `${example.id}: routes lost during map aggregation`);
      const exportedPlacement = await physical.artifact(result.id, 'placement.json');
      const exportedMap = parsePlacement(JSON.parse(exportedPlacement.content.toString('utf8')));
      assert.equal(exportedMap.cells.length, map.cells.length, `${example.id}: exported heatmap differs from live result`);
      assert.equal(exportedMap.routingPips, map.routingPips);
      const bitstream = await physical.artifact(result.id, 'design.fs');
      assert.ok(bitstream.content.length > 1000, `${example.id}: empty or incomplete bitstream`);
      Object.assign(check, { status: 'success', cells: map.cells.length, routingPips: map.routingPips,
        occupiedTiles: map.tiles.filter(tile => tile.cells.length > 0).length,
        routedTiles: map.tiles.filter(tile => tile.routingPips > 0).length,
        bitstreamBytes: bitstream.content.length,
      });
      console.log(`PASS ${example.id}: ${map.cells.length} cells, ${map.routingPips} PIPs, ${check.occupiedTiles} occupied tiles, grid 56×55, ${bitstream.content.length} bytes → ${result.id}`);
    } catch (cause) {
      check.status = 'error'; check.error = cause instanceof Error ? cause.message : String(cause);
      console.error(`FAIL ${example.id}: ${check.error}`);
    } finally {
      check.elapsedMs = Date.now() - started;
      await saveReport();
    }
  }
  const failures = checks.filter(check => check.status !== 'success');
  assert.equal(failures.length, 0, `${failures.length} examples failed; see ${reportPath}`);
  console.log(`PASS all ${checks.length} built-in examples. Report: ${reportPath}`);
} finally {
  await Promise.allSettled([physical.close(), simulations.close(), builds.close()]);
}
