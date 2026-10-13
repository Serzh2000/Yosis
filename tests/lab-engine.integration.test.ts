import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { LabSim } from '../src/lib/lab/engine';
import { LAB_OP, type LabDesign } from '../shared/lab';
import type { Project } from '../shared/types';

const manager = new LabManager();
after(() => manager.close());

async function design(source: string): Promise<LabDesign> {
  const project: Project = {
    name: 'lab',
    top: 'top',
    board: 'tangnano20k',
    files: [{ name: 'top.v', content: source }],
  };
  const result = await manager.compile('tester', project, new AbortController().signal);
  assert.equal(result.error, undefined, JSON.stringify(result.diagnostics));
  return result.design!;
}
const port = (value: LabDesign, name: string) => value.ports.find((item) => item.name === name)!;
const read = (sim: LabSim, value: LabDesign, name: string) =>
  port(value, name).bits.reduce((sum, net, bit) => sum + sim.values[net] * 2 ** bit, 0);

test('counter with enable and synchronous reset counts clock cycles', async () => {
  const value = await design(`module top(input clk, input rst, input en, output reg [7:0] q);
  always @(posedge clk) if (rst) q <= 0; else if (en) q <= q + 1;
endmodule`);
  const sim = new LabSim(value, port(value, 'clk').bits[0]);
  sim.run(5);
  assert.equal(read(sim, value, 'q'), 0, 'enable is low');
  sim.setInput(port(value, 'en').bits[0], 1);
  sim.run(300);
  assert.equal(read(sim, value, 'q'), 300 % 256);
  sim.setInput(port(value, 'rst').bits[0], 1);
  sim.run(1);
  assert.equal(read(sim, value, 'q'), 0);
});

test('initial values, asynchronous reset, falling edge and a divided clock all work', async () => {
  const value =
    await design(`module top(input clk, input rst_n, output reg [3:0] a, output reg b, output reg [1:0] slow);
  reg half = 0;
  initial a = 4'd9;
  always @(posedge clk or negedge rst_n) if (!rst_n) a <= 4'd3; else a <= a + 1;
  always @(negedge clk) b <= a[0];
  always @(posedge clk) half <= ~half;
  always @(posedge half) slow <= slow + 1;
endmodule`);
  const clk = port(value, 'clk').bits[0];
  const sim = new LabSim(value, clk);
  const rst = port(value, 'rst_n').bits[0];
  // rst_n starts at 0, so the asynchronous reset holds the counter at 3.
  sim.run(4);
  assert.equal(read(sim, value, 'a'), 3);
  sim.setInput(rst, 1);
  sim.run(5);
  assert.equal(read(sim, value, 'a'), 8);
  assert.equal(read(sim, value, 'b'), 0, 'b follows a[0] on the falling edge');
  sim.run(1);
  assert.equal(read(sim, value, 'b'), 1);
  const before = read(sim, value, 'slow');
  sim.run(8);
  assert.equal((read(sim, value, 'slow') - before + 4) % 4, 0, 'four rising edges of clk/2');
  sim.run(2);
  assert.equal((read(sim, value, 'slow') - before + 4) % 4, 1);
});

test('probes measure duty, period and edges; timed inputs arrive on their cycle', async () => {
  const value = await design(`module top(input clk, input d, output pwm, output reg seen);
  reg [3:0] c = 0;
  always @(posedge clk) begin c <= c + 1; seen <= d; end
  assign pwm = c < 4;
endmodule`);
  const sim = new LabSim(value, port(value, 'clk').bits[0]);
  const edges: number[] = [];
  const probe = sim.probe(port(value, 'pwm').bits[0], (level, cycle) => {
    if (level) edges.push(cycle);
  });
  sim.run(1600);
  assert.equal(probe.period, 16);
  assert.equal(probe.pulse, 4);
  assert.ok(Math.abs(sim.highUntilNow(probe) / 1600 - 0.25) < 0.01);
  assert.equal(edges.length, probe.rises);
  const seen = sim.probe(port(value, 'seen').bits[0]);
  sim.setInputAt(sim.cycle + 10, port(value, 'd').bits[0], 1);
  sim.run(10);
  assert.equal(seen.level, 0);
  sim.run(2);
  assert.equal(seen.level, 1);
});

test('a combinational loop is reported instead of hanging', () => {
  const loop: LabDesign = {
    top: 'top',
    nets: 4,
    ports: [],
    gates: [0, 2, 0, 0, 3, 0, 3, 0, 0, 2],
    dffs: [],
  };
  assert.throws(() => new LabSim(loop, null), /петля/);
});

test('a 24-bit divider runs fast enough to be watched', async () => {
  const value = await design(`module top(input clk, output reg [5:0] led);
  reg [23:0] c = 0;
  initial led = 6'b111110;
  always @(posedge clk) begin c <= c + 1; if (c == 0) led <= {led[4:0], led[5]}; end
endmodule`);
  const sim = new LabSim(value, port(value, 'clk').bits[0]);
  const start = performance.now();
  sim.run(200_000);
  const perSecond = 200_000 / ((performance.now() - start) / 1000);
  assert.ok(perSecond > 100_000, `only ${Math.round(perSecond)} cycles per second`);
  console.log(`lab speed: ${Math.round(perSecond / 1000)}k cycles/s, ${sim.gateCount} gates`);
});

const pad = (value: LabDesign, name: string) => port(value, name).bits[0];

test('a released inout pad is pulled up, the design can pull it low and reads the result back', async () => {
  const value = await design(`module top(input clk, input drive, output rd, inout sda);
  assign sda = drive ? 1'b0 : 1'bz;
  assign rd = sda;
endmodule`);
  assert.ok(value.gates.some((_, index) => index % 5 === 0 && value.gates[index] === LAB_OP.TRI));
  const sim = new LabSim(value, pad(value, 'clk'));
  const line = sim.probe(pad(value, 'sda'));
  sim.run(2);
  assert.equal(read(sim, value, 'rd'), 1, 'pull-up when nobody drives');
  sim.setInput(pad(value, 'drive'), 1);
  sim.run(2);
  assert.equal(read(sim, value, 'rd'), 0);
  assert.equal(line.level, 0, 'the probe sees the resolved level');
  sim.setInput(pad(value, 'drive'), 0);
  sim.run(2);
  assert.equal(read(sim, value, 'rd'), 1);
});

test('an outside device pulling the pad low wins while the design releases it', async () => {
  const value = await design(`module top(input clk, input drive, output rd, inout sda);
  assign sda = drive ? 1'b0 : 1'bz;
  assign rd = sda;
endmodule`);
  const sim = new LabSim(value, pad(value, 'clk'));
  const sda = pad(value, 'sda');
  sim.drivePad(sda, 'a', 0);
  sim.run(2);
  assert.equal(read(sim, value, 'rd'), 0);
  sim.drivePad(sda, 'b', 0);
  sim.drivePad(sda, 'a', null);
  sim.run(1);
  assert.equal(read(sim, value, 'rd'), 0, 'wired AND: one puller is enough');
  sim.drivePad(sda, 'b', null);
  sim.run(1);
  assert.equal(read(sim, value, 'rd'), 1);
  sim.drivePadAt(sim.cycle + 5, sda, 'a', 0);
  sim.run(4);
  assert.equal(read(sim, value, 'rd'), 1);
  sim.run(3);
  assert.equal(read(sim, value, 'rd'), 0, 'a timed pull arrives on its cycle');
});

test('a pad the design drives push-pull wins over the outside, and a two-way handshake works', async () => {
  const push = await design(`module top(input clk, input en, input d, output rd, inout p);
  assign p = en ? d : 1'bz;
  assign rd = p;
endmodule`);
  const first = new LabSim(push, pad(push, 'clk'));
  first.drivePad(pad(push, 'p'), 'ext', 0);
  first.setInput(pad(push, 'en'), 1);
  first.setInput(pad(push, 'd'), 1);
  first.run(2);
  assert.equal(read(first, push, 'rd'), 1, 'the design drives 1 against an external 0');
  first.setInput(pad(push, 'en'), 0);
  first.run(2);
  assert.equal(read(first, push, 'rd'), 0, 'released: the external level shows');

  const shake = await design(`module top(input clk, inout line, output reg [1:0] state);
  reg oe = 0;
  reg [2:0] n = 0;
  assign line = oe ? 1'b0 : 1'bz;
  always @(posedge clk) begin
    if (state == 0 && !line) begin oe <= 1; state <= 1; end
    else if (state == 1) begin n <= n + 1; if (n == 3) begin oe <= 0; state <= 2; end end
  end
endmodule`);
  const sim = new LabSim(shake, pad(shake, 'clk'));
  const line = pad(shake, 'line');
  sim.run(5);
  assert.equal(read(sim, shake, 'state'), 0);
  sim.drivePad(line, 'ext', 0);
  sim.run(2);
  assert.equal(read(sim, shake, 'state'), 1, 'the design noticed the request');
  sim.drivePad(line, 'ext', null);
  sim.run(1);
  assert.equal(sim.values[line], 0, 'the design now holds the line low itself');
  sim.run(8);
  assert.equal(read(sim, shake, 'state'), 2);
  assert.equal(sim.values[line], 1, 'both let go: pull-up');
});
