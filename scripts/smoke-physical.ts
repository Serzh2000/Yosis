import assert from 'node:assert/strict';
import path from 'node:path';
import { BuildManager } from '../server/builds';
import { PhysicalManager } from '../server/physical';
import { parsePlacement } from '../src/lib/physical';
import { validateProject } from '../server/validation';

const project = validateProject({ name: 'Физический счётчик', top: 'top', board: 'tangnano20k', files: [
  { name: 'top.v', content: `module top(input clk, input reset, input enable, output reg [3:0] count);
always @(posedge clk) if (reset) count <= 0; else if (enable) count <= count + 1'b1;
endmodule` },
  { name: 'board.cst', content: `IO_LOC "clk" 4;
IO_PORT "clk" IO_TYPE=LVCMOS33 PULL_MODE=NONE;
CLOCK_LOC "clk" BUFG;
IO_LOC "reset" 88;
IO_PORT "reset" IO_TYPE=LVCMOS33 PULL_MODE=UP;
IO_LOC "enable" 87;
IO_PORT "enable" IO_TYPE=LVCMOS33 PULL_MODE=UP;
IO_LOC "count[0]" 15;
IO_PORT "count[0]" IO_TYPE=LVCMOS33 PULL_MODE=NONE;
IO_LOC "count[1]" 16;
IO_PORT "count[1]" IO_TYPE=LVCMOS33 PULL_MODE=NONE;
IO_LOC "count[2]" 17;
IO_PORT "count[2]" IO_TYPE=LVCMOS33 PULL_MODE=NONE;
IO_LOC "count[3]" 18;
IO_PORT "count[3]" IO_TYPE=LVCMOS33 PULL_MODE=NONE;` },
] });
const builds = new BuildManager(path.resolve('.builds'));
const physical = new PhysicalManager(path.resolve('.physical'), builds);
async function complete<T extends { id: string; status: string; error?: string; logs: string }>(job: T, get: (id: string) => Promise<T>): Promise<T> {
  const deadline = Date.now() + 300000;
  while (['queued', 'running'].includes(job.status)) {
    assert.ok(Date.now() < deadline, 'Job exceeded smoke deadline');
    await new Promise(resolve => setTimeout(resolve, 250)); job = await get(job.id);
  }
  assert.equal(job.status, 'success', `${job.error}\n${job.logs.slice(-7000)}`);
  return job;
}
try {
  const tools = await physical.health(); assert.equal(tools.available, true, tools.error); assert.equal(tools.bitstreamAvailable, true);
  console.log(tools.nextpnrVersion);
  const build = await complete(await builds.create(project), id => builds.get(id));
  console.log(`Синтез ${build.id} готов.`);
  const result = await complete(await physical.create(project, build.id, { cstFile: 'board.cst', frequencyMHz: 27 }), id => physical.get(id));
  assert.ok(result.placed); assert.ok(result.bitstreamAvailable);
  const map = parsePlacement(result.placed);
  assert.ok(map.cells.length > 4); assert.ok(map.routingPips > 0); assert.equal(map.family, 'GW2A-18C');
  const bitstream = await physical.artifact(result.id, 'design.fs'); assert.ok(bitstream.content.length > 100);
  const restored = await new PhysicalManager(path.resolve('.physical'), builds).get(result.id); assert.ok(restored.placed);
  console.log(JSON.stringify({ id: result.id, directory: path.resolve('.physical', result.id), cells: map.cells.length, routingPips: map.routingPips, occupiedTiles: map.tiles.filter(tile => tile.cells.length).length, bitstreamBytes: bitstream.content.length, report: result.report }, null, 2));
} finally { await physical.close(); await builds.close(); }
