import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Bit, Project, YosysCell, YosysNetlist } from '../shared/types';
import { projectHash } from '../server/validation';
import { examples } from '../src/lib/examples';
import { buildGraph, getHierarchy, getResources, getSourceLocations } from '../src/lib/netlist';
import { getRtlSymbol } from '../src/components/RtlSymbol';

// Inspect the actual Yosys artifacts created by smoke:examples. This audit does
// not synthesize a substitute fixture and does not modify existing artifacts.
const root = path.resolve('.builds');
const smoke = JSON.parse(await readFile(path.resolve('.physical/example-smoke-report.json'), 'utf8')) as {
  checks: Array<{ id: string; status: string; buildId: string; projectHash: string }>;
};
const allTypes: Record<string, number> = {};
const fallbackTypes: Record<string, number> = {};
const symbolTypes: Record<string, { kind: string; count: number }> = {};
const reports: Array<Record<string, unknown>> = [];
function number(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return value;
  return value && /^[01]+$/.test(value) ? parseInt(value, 2) : undefined;
}
function increment(totals: Record<string, number>, type: string) { totals[type] = (totals[type] ?? 0) + 1; }

for (const example of examples) {
  const check = smoke.checks.find(item => item.id === example.id);
  assert.ok(check && check.status === 'success', `${example.id}: first run smoke:examples`);
  assert.equal(check.projectHash, projectHash(example.project), `${example.id}: artifact source hash is stale`);
  const directory = path.join(root, check.buildId);
  const rtl: YosysNetlist = JSON.parse(await readFile(path.join(directory, 'rtl.json'), 'utf8'));
  const technology: YosysNetlist = JSON.parse(await readFile(path.join(directory, 'technology.json'), 'utf8'));
  const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'));
  assert.equal(metadata.status, 'success');
  assert.equal(metadata.projectHash, check.projectHash);
  assert.ok(rtl.modules[example.project.top]);
  const counts: Record<string, number> = {};
  const unsourced: string[] = [];
  let cellPorts = 0;
  let edgeBits = 0;
  let clockedRegisters = 0;
  let registerBits = 0;
  for (const [moduleName, module] of Object.entries(rtl.modules)) {
    assert.ok(getSourceLocations(module.attributes).length, `${example.id}/${moduleName}: missing module source`);
    const drivers = new Map<Bit, Set<string>>();
    const sinks: Array<{ bit: Bit; endpoint: string }> = [];
    function endpoint(bits: Bit[], name: string, direction: string) {
      for (const bit of bits) {
        assert.ok(typeof bit === 'number' ? Number.isInteger(bit) && bit >= 2 : /^[01xz]$/.test(bit), `${example.id}/${moduleName}/${name}: invalid bit ${bit}`);
        if (typeof bit !== 'number') continue;
        if (direction !== 'input') {
          const existing = drivers.get(bit) ?? new Set<string>();
          existing.add(name); drivers.set(bit, existing);
        }
        if (direction !== 'output') sinks.push({ bit, endpoint: name });
      }
    }
    for (const [name, port] of Object.entries(module.ports)) {
      endpoint(port.bits, `port:${name}`, port.direction === 'input' ? 'output' : port.direction === 'output' ? 'input' : 'inout');
    }
    const graph = buildGraph(rtl, moduleName, { maxCells: 100_000, maxEdges: 100_000 });
    assert.equal(graph.hiddenCells, 0); assert.equal(graph.hiddenEdges, 0);
    assert.equal(graph.nodes.some(node => node.kind === 'undriven'), false, `${example.id}/${moduleName}: undriven graph signal`);
    edgeBits += graph.edges.reduce((sum, edge) => sum + edge.width, 0);
    for (const [cellName, cell] of Object.entries(module.cells)) {
      increment(counts, cell.type); increment(allTypes, cell.type);
      const prefix = `${example.id}/${moduleName}/${cellName}`;
      assert.ok(cell.type.startsWith('$') || rtl.modules[cell.type], `${prefix}: technology primitive leaked into RTL ${cell.type}`);
      if (!getSourceLocations(cell.attributes).length) unsourced.push(`${moduleName}/${cellName}`);
      for (const [portName, bits] of Object.entries(cell.connections)) {
        const direction = cell.port_directions[portName] ?? rtl.modules[cell.type]?.ports[portName]?.direction;
        assert.ok(direction, `${prefix}: missing direction for ${portName}`);
        endpoint(bits, `cell:${cellName}/${portName}`, direction);
        cellPorts++;
        const width = number(cell.parameters[`${portName}_WIDTH`]);
        if (width !== undefined) assert.equal(bits.length, width, `${prefix}: ${portName}_WIDTH disagrees with connected bits`);
        if (rtl.modules[cell.type]) assert.equal(bits.length, rtl.modules[cell.type].ports[portName]?.bits.length, `${prefix}: child-module port width disagrees`);
      }
      const width = number(cell.parameters.WIDTH);
      if (/^\$(?:p?mux|[as]?dffe?|sdffce|dffsr|dffsre|dlatch)$/.test(cell.type)) {
        const outputName = cell.type.endsWith('mux') ? 'Y' : 'Q';
        assert.equal(cell.connections[outputName]?.length, width, `${prefix}: WIDTH disagrees with ${outputName}`);
      }
      if (cell.type === '$pmux') {
        assert.equal(cell.connections.S.length, number(cell.parameters.S_WIDTH));
        assert.equal(cell.connections.B.length, cell.connections.Y.length * cell.connections.S.length, `${prefix}: pmux B is not WIDTH × S_WIDTH`);
      }
      if (/^\$(?:[as]?dffe?|sdffe?|sdffce|dffsr|dffsre)$/.test(cell.type)) {
        clockedRegisters++;
        registerBits += cell.connections.Q.length;
        assert.equal(cell.connections.CLK.length, 1);
        assert.ok([0, 1].includes(number(cell.parameters.CLK_POLARITY)!), `${prefix}: invalid clock polarity`);
        for (const [port, parameter] of [['ARST', 'ARST'], ['SRST', 'SRST'], ['EN', 'EN']] as const) {
          if (!cell.connections[port]) continue;
          assert.equal(cell.connections[port].length, 1);
          assert.ok([0, 1].includes(number(cell.parameters[`${parameter}_POLARITY`])!), `${prefix}: invalid ${parameter} polarity`);
        }
        for (const port of ['ARST', 'SRST']) if (cell.connections[port]) {
          const value = cell.parameters[`${port}_VALUE`];
          assert.equal(typeof value === 'string' ? value.length : width, width, `${prefix}: reset value width disagrees`);
        }
      }
      const node = graph.nodes.find(item => item.cellName === cellName)!;
      assert.ok(node);
      const symbol = getRtlSymbol(node, cell);
      if (symbol) {
        const existing = symbolTypes[cell.type] ?? { kind: symbol.kind, count: 0 };
        assert.equal(existing.kind, symbol.kind); existing.count++; symbolTypes[cell.type] = existing;
        assert.deepEqual(symbol.ports.map(port => port.id).sort(), node.ports.map(port => port.id).sort(), `${prefix}: symbol lost or invented a terminal`);
        for (const port of symbol.ports) assert.ok(Number.isFinite(port.x) && Number.isFinite(port.y), `${prefix}: invalid anchor`);
      } else if (!node.moduleName) increment(fallbackTypes, cell.type);
    }
    for (const { bit, endpoint: name } of sinks) {
      assert.equal(drivers.get(bit)?.size, 1, `${example.id}/${moduleName}/${name}: bit ${bit} needs exactly one driver`);
    }
  }
  const hierarchy = getHierarchy(rtl, example.project.top);
  if (example.id === 'alu') {
    assert.equal(hierarchy.children.length, 1, 'ALU hierarchy was flattened');
    assert.equal(hierarchy.children[0].moduleName, 'alu');
    assert.ok(technology.modules.alu, 'Gowin synthesis lost ALU hierarchy');
  }
  const report = { id: example.id, buildId: check.buildId, modules: Object.keys(rtl.modules), cellsByType: counts,
    cellPorts, edgeBits, clockedRegisters, registerBits, resources: getResources(rtl, example.project.top), unsourced };
  reports.push(report);
  console.log(`PASS ${example.id}: ${Object.values(counts).reduce((sum, count) => sum + count, 0)} RTL cells, ${cellPorts} ports, ${clockedRegisters} register groups / ${registerBits} register bits`);
}
const reportPath = path.join(root, 'rtl-example-audit.json');
await writeFile(reportPath, JSON.stringify({ checkedAt: new Date().toISOString(), checks: reports, allTypes, symbolTypes, fallbackTypes }, null, 2), 'utf8');
console.log(`PASS ${reports.length} examples. Primitive counts: ${JSON.stringify(allTypes)}. Fallbacks: ${JSON.stringify(fallbackTypes)}. Report: ${reportPath}`);

if (process.argv.includes('--probes')) {
  const project: Project = { name: 'rtl-generation-probes', board: 'tangnano20k', top: 'top', files: [{ name: 'probes.v', content: `
module top (
    input wire clk, reset_n, enable,
    input wire signed [2:0] a,
    input wire signed [4:0] b,
    input wire [1:0] select,
    output wire signed [5:0] sum,
    output wire eq,
    output wire [2:0] shifted,
    output reg [2:0] selected,
    output reg [2:0] sync_q,
    output reg [2:0] async_q,
    output reg [2:0] latch_q
);
    assign sum = a + b;
    assign eq = a == b;
    assign shifted = a << select;
    always @* begin
        case (select)
            0: selected = a;
            1: selected = b[2:0];
            2: selected = 3'b010;
            default: selected = 3'b101;
        endcase
    end
    always @(posedge clk) begin
        if (!reset_n) sync_q <= 3'b101;
        else if (enable) sync_q <= a;
    end
    always @(negedge clk or negedge reset_n) begin
        if (!reset_n) async_q <= 3'b010;
        else if (enable) async_q <= a;
    end
    always @* if (enable) latch_q = a;
endmodule
` }] };
  const rtl = await new Promise<YosysNetlist>((resolve, reject) => {
    const child = fork(fileURLToPath(new URL('../server/yosys-runner.mjs', import.meta.url)), [], {
      execArgv: ['--max-old-space-size=2048'], windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let result: YosysNetlist | undefined;
    let success = false;
    let logs = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('RTL generation probe timed out')); }, 45_000);
    child.on('message', (message: { type: string; name?: string; netlist?: YosysNetlist; text?: string; error?: string }) => {
      if (message.type === 'log') logs += message.text ?? '';
      else if (message.type === 'netlist' && message.name === 'rtl') result = message.netlist;
      else if (message.type === 'success') success = true;
      else if (message.type === 'failure') { child.kill(); reject(new Error(message.error)); }
    });
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timeout);
      if (code === 0 && success && result) resolve(result);
      else reject(new Error(`RTL probe failed (${code}): ${logs.slice(-3000)}`));
    });
    child.send({ project, prepareSimulation: true });
  });
  const cells = Object.values(rtl.modules.top.cells);
  const find = (type: string) => {
    const cell = cells.find(item => item.type === type);
    assert.ok(cell, `Probe did not infer ${type}`); return cell;
  };
  const add = find('$add');
  assert.equal(number(add.parameters.A_SIGNED), 1); assert.equal(number(add.parameters.B_SIGNED), 1);
  assert.equal(number(add.parameters.A_WIDTH), 3); assert.equal(number(add.parameters.B_WIDTH), 5);
  assert.equal(number(add.parameters.Y_WIDTH), 6); assert.equal(add.connections.Y.length, 6);
  const sync = find('$sdffe');
  assert.equal(number(sync.parameters.WIDTH), 3); assert.equal(number(sync.parameters.CLK_POLARITY), 1);
  assert.equal(number(sync.parameters.SRST_POLARITY), 0); assert.equal(number(sync.parameters.EN_POLARITY), 1);
  assert.equal(sync.parameters.SRST_VALUE, '101');
  const async = find('$adffe');
  assert.equal(number(async.parameters.WIDTH), 3); assert.equal(number(async.parameters.CLK_POLARITY), 0);
  assert.equal(number(async.parameters.ARST_POLARITY), 0); assert.equal(number(async.parameters.EN_POLARITY), 1);
  assert.equal(async.parameters.ARST_VALUE, '010');
  const latch = find('$dlatch');
  assert.equal(number(latch.parameters.WIDTH), 3); assert.equal(number(latch.parameters.EN_POLARITY), 1);
  assert.equal(latch.connections.Q.length, 3); assert.equal(latch.connections.CLK, undefined);
  assert.equal(number(find('$eq').parameters.A_SIGNED), 1);
  const pmux = find('$pmux');
  assert.equal(number(pmux.parameters.WIDTH), 3); assert.equal(number(pmux.parameters.S_WIDTH), 3);
  assert.equal(pmux.connections.B.length, 9);
  const graph = buildGraph(rtl, 'top', { maxCells: 10_000 });
  assert.equal(graph.nodes.some(node => node.kind === 'undriven'), false);
  const probePath = path.join(root, 'rtl-generation-probes.json');
  await writeFile(probePath, JSON.stringify({ checkedAt: new Date().toISOString(), project, rtl }, null, 2), 'utf8');
  console.log(`PASS generated probes: signed 3+5→6-bit arithmetic, one-hot pmux, sync/async reset values, rising/falling clock, enable, latch. Report: ${probePath}`);
}
