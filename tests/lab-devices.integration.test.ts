import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { PARTS, PART_GROUPS, partById } from '../src/lib/lab/catalog';
import { BOARD_CLOCK_HZ, createDevice } from '../src/lib/lab/devices';
import {
  BOARD_BUTTONS,
  BOARD_LEDS,
  BOARD_UART,
  LabRuntime,
  type LabLayout,
} from '../src/lib/lab/runtime';
import type { Project } from '../shared/types';

const manager = new LabManager();
after(() => manager.close());

async function bench(source: string, cst: string, layout: LabLayout = { parts: [], wires: [] }) {
  const project: Project = {
    name: 'lab',
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: source },
      { name: 'board.cst', content: cst },
    ],
  };
  const result = await manager.compile('tester', project, new AbortController().signal);
  assert.equal(result.error, undefined, JSON.stringify(result.diagnostics));
  const design = result.design!;
  const lab = new LabRuntime(design, project, layout);
  /** Value of a port of the design, whether or not it is on a pin. */
  const read = (name: string) =>
    design.ports
      .find((port) => port.name === name)!
      .bits.reduce((sum, net, bit) => sum + lab.sim.values[net] * 2 ** bit, 0);
  return Object.assign(lab, { read });
}
const loc = (pairs: Record<string, number>) =>
  Object.entries(pairs)
    .map(([signal, pin]) => `IO_LOC "${signal}" ${pin};`)
    .join('\n');

test('the catalogue offers at least fifty distinct parts in every group', () => {
  assert.ok(PARTS.length >= 50, `${PARTS.length} parts`);
  assert.equal(new Set(PARTS.map((part) => part.id)).size, PARTS.length);
  for (const group of PART_GROUPS)
    assert.ok(
      PARTS.some((part) => part.group === group),
      group,
    );
  for (const part of PARTS) {
    assert.ok(part.pins.length > 0 && part.note.length > 10, part.id);
    assert.equal(new Set(part.pins.map((pin) => pin[0])).size, part.pins.length, part.id);
  }
});

test('board buttons and LEDs follow the design; a bench LED shows PWM brightness', async () => {
  const lab = await bench(
    `module top(input clk, input s1, output led0, output pwm);
  reg [3:0] c = 0;
  always @(posedge clk) c <= c + 1;
  assign led0 = ~s1;
  assign pwm = c < 4;
endmodule`,
    loc({ clk: 4, s1: 88, led0: 15, pwm: 75 }),
    {
      parts: [{ uid: 'p1', def: 'led', x: 0, y: 0, rot: 0, opts: {} }],
      wires: [{ id: 'w1', part: 'p1', pin: 'A', fpga: 75 }],
    },
  );
  lab.advance(1600, Infinity);
  assert.equal((lab.devices.get(BOARD_LEDS)!.view.b as number[])[0], 0, 'LED0 is off');
  lab.devices.get(BOARD_BUTTONS)!.act('set', { pin: 0, on: true });
  lab.advance(1600, Infinity);
  assert.ok((lab.devices.get(BOARD_LEDS)!.view.b as number[])[0] > 0.99, 'LED0 lights at 0');
  assert.ok(Math.abs((lab.devices.get('p1')!.view.b as number[])[0] - 0.25) < 0.02);
  assert.equal(lab.wireState('w1'), 'ok');
});

test('wires to unassigned pins and against the direction are reported', async () => {
  const lab = await bench(
    `module top(input a, output y); assign y = a; endmodule`,
    loc({ a: 75, y: 80 }),
    {
      parts: [
        { uid: 'led', def: 'led', x: 0, y: 0, rot: 0, opts: {} },
        { uid: 'btn', def: 'button', x: 0, y: 0, rot: 0, opts: {} },
      ],
      wires: [
        { id: 'free', part: 'led', pin: 'A', fpga: 42 },
        { id: 'wrong', part: 'btn', pin: 'OUT', fpga: 80 },
        { id: 'good', part: 'btn', pin: 'OUT', fpga: 75 },
      ],
    },
  );
  assert.equal(lab.wireState('free'), 'unassigned');
  assert.equal(lab.wireState('wrong'), 'direction');
  assert.equal(lab.wireState('good'), 'ok');
});

test('a four-digit display shows what a scanning design puts on it', async () => {
  const pins: Record<string, number> = { clk: 4 };
  'abcdefg'.split('').forEach((_, index) => (pins[`seg[${index}]`] = 25 + index));
  [0, 1, 2, 3].forEach((index) => (pins[`dig[${index}]`] = 71 + index));
  const lab = await bench(
    `module top(input clk, output reg [6:0] seg, output reg [3:0] dig);
  reg [5:0] c = 0;
  always @(posedge clk) c <= c + 1;
  always @* begin
    dig = ~(4'b0001 << c[5:4]);
    case (c[5:4])
      0: seg = 7'b0000110;
      1: seg = 7'b1011011;
      2: seg = 7'b1001111;
      default: seg = 7'b1100110;
    endcase
  end
endmodule`,
    loc(pins),
    {
      parts: [{ uid: 'd', def: 'segn', x: 0, y: 0, rot: 0, opts: {} }],
      wires: [
        ...'abcdefg'.split('').map((id, index) => ({ id, part: 'd', pin: id, fpga: 25 + index })),
        ...[0, 1, 2, 3].map((index) => ({
          id: `D${index}`,
          part: 'd',
          pin: `D${index + 1}`,
          fpga: 71 + index,
        })),
      ],
    },
  );
  lab.advance(6400, Infinity);
  const lit = (lab.devices.get('d')!.view.b as number[][]).map((digit) =>
    digit.map((value) => (value > 0.9 ? 1 : value < 0.1 ? 0 : '?')).join(''),
  );
  // Segments a..g then dp, for the digits 1, 2, 3, 4.
  assert.deepEqual(lit, ['01100000', '11011010', '11110010', '01100110']);
});

test('the board terminal receives bytes from the design and sends bytes to it', async () => {
  const divider = 32;
  const lab = await bench(
    `module top(input clk, input rx, output tx, output reg [7:0] got);
  // Echo: every received byte is sent back plus one.
  localparam DIV = ${divider};
  reg [7:0] rc = 0; reg [3:0] rb = 0; reg rbusy = 0; reg [7:0] rs;
  reg [7:0] tc = 0; reg [3:0] tb = 0; reg tbusy = 0; reg [9:0] ts = 10'h3ff;
  assign tx = ts[0];
  initial got = 0;
  always @(posedge clk) begin
    if (!rbusy) begin
      if (!rx) begin rbusy <= 1; rc <= DIV + DIV / 2 - 1; rb <= 0; end
    end else if (rc == 0) begin
      rc <= DIV - 1;
      if (rb == 8) begin
        rbusy <= 0; got <= rs;
        ts <= {1'b1, rs + 8'd1, 1'b0}; tbusy <= 1; tb <= 0; tc <= DIV - 1;
      end else begin rs <= {rx, rs[7:1]}; rb <= rb + 1; end
    end else rc <= rc - 1;
    if (tbusy) begin
      if (tc == 0) begin
        tc <= DIV - 1; ts <= {1'b1, ts[9:1]};
        if (tb == 9) tbusy <= 0; else tb <= tb + 1;
      end else tc <= tc - 1;
    end
  end
endmodule`,
    loc({ clk: 4, rx: 70, tx: 69 }),
  );
  const terminal = lab.devices.get(BOARD_UART)!;
  terminal.act('baud', BOARD_CLOCK_HZ / divider);
  lab.advance(100, Infinity);
  // The echo design handles one byte at a time, so the second waits for the first reply.
  terminal.act('send', 'H');
  lab.advance(divider * 30, Infinity);
  terminal.act('send', 'i');
  lab.advance(divider * 30, Infinity);
  assert.equal(terminal.view.text, 'Ij');
});

test('shift registers, keypad, encoder and dial talk to a design', async () => {
  const lab = await bench(
    `module top(input clk, input [3:0] col, input a, input b, input [3:0] bcd, input q7,
  output [3:0] row, output ds, output shcp, output stcp, output pl, output cp,
  output reg [3:0] turns, output [3:0] seen, output [3:0] digit, output reg [7:0] word);
  reg [7:0] c = 0;
  always @(posedge clk) c <= c + 1;
  // 74HC595: shift 8'hA5 out, most significant bit first, then latch.
  wire [7:0] pattern = 8'hA5;
  assign shcp = c[0] & (c[7:4] == 0);
  assign ds = pattern[7 - c[3:1]];
  assign stcp = c[7:4] == 1;
  // 74HC165: load, then eight clocks.
  assign pl = ~(c[7:4] == 2);
  assign cp = c[0] & (c[7:4] == 3);
  always @(posedge clk) if (c[7:4] == 3 && !c[0]) word <= {word[6:0], q7};
  // Keypad: row 2 is selected.
  assign row = 4'b1011;
  assign seen = col;
  assign digit = bcd;
  reg a1 = 1;
  initial turns = 0;
  always @(posedge clk) begin a1 <= a; if (a1 && !a) turns <= b ? turns + 1 : turns - 1; end
endmodule`,
    loc({
      clk: 4,
      'row[0]': 25,
      'row[1]': 26,
      'row[2]': 27,
      'row[3]': 28,
      'col[0]': 29,
      'col[1]': 30,
      'col[2]': 31,
      'col[3]': 17,
      ds: 71,
      shcp: 72,
      stcp: 73,
      q7: 74,
      pl: 75,
      cp: 76,
      a: 77,
      b: 85,
      'bcd[0]': 41,
      'bcd[1]': 42,
      'bcd[2]': 48,
      'bcd[3]': 49,
      'seen[0]': 51,
      'seen[1]': 52,
      'seen[2]': 53,
      'seen[3]': 54,
    }),
    {
      parts: [
        { uid: 'pad', def: 'keypad', x: 0, y: 0, rot: 0, opts: {} },
        { uid: 'out', def: 'sr595', x: 0, y: 0, rot: 0, opts: {} },
        { uid: 'in', def: 'sr165', x: 0, y: 0, rot: 0, opts: { switches: 0x3c } },
        { uid: 'enc', def: 'encoder', x: 0, y: 0, rot: 0, opts: { gap: 40 } },
        { uid: 'dial', def: 'rotary', x: 0, y: 0, rot: 0, opts: {} },
        { uid: 'hex', def: 'hex-display', x: 0, y: 0, rot: 0, opts: {} },
      ],
      wires: [
        ...[25, 26, 27, 28].map((fpga, i) => ({
          id: `r${i}`,
          part: 'pad',
          pin: `R${i + 1}`,
          fpga,
        })),
        ...[29, 30, 31, 17].map((fpga, i) => ({
          id: `c${i}`,
          part: 'pad',
          pin: `C${i + 1}`,
          fpga,
        })),
        { id: 'ds', part: 'out', pin: 'DS', fpga: 71 },
        { id: 'sh', part: 'out', pin: 'SHCP', fpga: 72 },
        { id: 'st', part: 'out', pin: 'STCP', fpga: 73 },
        { id: 'pl', part: 'in', pin: 'PL', fpga: 75 },
        { id: 'cp', part: 'in', pin: 'CP', fpga: 76 },
        { id: 'q7', part: 'in', pin: 'Q7', fpga: 74 },
        { id: 'ea', part: 'enc', pin: 'A', fpga: 77 },
        { id: 'eb', part: 'enc', pin: 'B', fpga: 85 },
        ...[41, 42, 48, 49].map((fpga, i) => ({
          id: `d${i}`,
          part: 'dial',
          pin: `${2 ** i}`,
          fpga,
        })),
        ...[51, 52, 53, 54].map((fpga, i) => ({ id: `h${i}`, part: 'hex', pin: `D${i}`, fpga })),
      ],
    },
  );
  lab.advance(256, Infinity);
  assert.equal(lab.devices.get('out')!.view.latch, 0xa5);
  assert.equal(lab.read('word'), 0x3c, 'eight switches read through one wire');
  // Keys in the selected row 2 pull their column low; keys in other rows do nothing.
  lab.devices.get('pad')!.act('key', { key: '2,1', on: true });
  lab.devices.get('pad')!.act('key', { key: '0,3', on: true });
  lab.advance(4, Infinity);
  assert.equal(lab.devices.get('hex')!.view.value, 0b1101);
  lab.devices.get('pad')!.act('key', { key: '2,1', on: false });
  lab.advance(4, Infinity);
  assert.equal(lab.devices.get('hex')!.view.value, 0b1111);
  lab.devices.get('enc')!.act('turn', 1);
  lab.devices.get('enc')!.act('turn', 1);
  lab.devices.get('enc')!.act('turn', -1);
  lab.devices.get('dial')!.act('step', 7);
  lab.advance(1000, Infinity);
  assert.equal(lab.devices.get('dial')!.view.value, 7);
  assert.equal(lab.devices.get('enc')!.view.position, 1);
  assert.equal(lab.read('digit'), 7);
  assert.equal(lab.read('turns'), 1, 'two steps clockwise and one back');
});

test('properties change what a part does: latching, polarity, constants, bicolour and counters', async () => {
  const lab = await bench(
    `module top(input clk, input s1, input s2, input hold, input one, output yh, output yo, output p, output n, output tick);
  reg [3:0] c = 0;
  always @(posedge clk) c <= c + 1;
  assign yh = hold;
  assign yo = one;
  assign p = s1;
  assign n = s2;
  assign tick = c[2];
endmodule`,
    loc({ clk: 4, s1: 88, s2: 87, hold: 75, one: 76, yh: 77, yo: 85, p: 41, n: 42, tick: 48 }),
    {
      parts: [
        { uid: 'bi', def: 'bicolor', x: 0, y: 0, rot: 0, opts: {} },
        { uid: 'cnt', def: 'counter', x: 0, y: 0, rot: 0, opts: { digits: 2 } },
        {
          uid: 'hold',
          def: 'button',
          x: 0,
          y: 0,
          rot: 0,
          opts: { latching: true, activeLow: true },
        },
        { uid: 'one', def: 'const', x: 0, y: 0, rot: 0, opts: { level: '1' } },
      ],
      wires: [
        { id: 'p', part: 'bi', pin: 'P', fpga: 41 },
        { id: 'n', part: 'bi', pin: 'N', fpga: 42 },
        { id: 'clk', part: 'cnt', pin: 'CLK', fpga: 48 },
        { id: 'hold', part: 'hold', pin: 'OUT', fpga: 75 },
        { id: 'one', part: 'one', pin: 'OUT', fpga: 76 },
      ],
    },
  );
  lab.advance(8 * 20 + 6, Infinity);
  const count = lab.devices.get('cnt')!.view.count as number;
  assert.ok(count >= 19 && count <= 21, `counted ${count} edges`);
  assert.equal(lab.read('yo'), 1, 'the constant is one');
  // A latching button that is active low idles high, and one press holds it low.
  assert.equal(lab.read('yh'), 1);
  lab.devices.get('hold')!.act('set', { pin: 0 });
  lab.advance(2, Infinity);
  assert.equal(lab.read('yh'), 0);
  lab.devices.get('hold')!.act('set', { pin: 0 });
  lab.advance(2, Infinity);
  assert.equal(lab.read('yh'), 1, 'the second press releases it');
  // The two-pin LED shows one colour for each direction of the current.
  const buttons = lab.devices.get(BOARD_BUTTONS)!;
  const colours = () =>
    (lab.devices.get('bi')!.view.b as number[]).map((value) => Math.round(value));
  buttons.act('set', { pin: 0, on: true });
  lab.advance(4, Infinity);
  assert.deepEqual(colours(), [1, 0]);
  buttons.act('set', { pin: 0, on: false });
  buttons.act('set', { pin: 1, on: true });
  lab.advance(4, Infinity);
  assert.deepEqual(colours(), [0, 1]);
  buttons.act('set', { pin: 0, on: true });
  lab.advance(4, Infinity);
  assert.deepEqual(colours(), [0, 0], 'equal levels, no current');
});

test('properties choose the pins and the behaviour a device is built with', () => {
  const host = {
    cycle: () => 0,
    out: () => {},
    high: () => 0,
  };
  const buzzer = (type: string) => createDevice(partById.get('buzzer')!, { type }, host);
  assert.equal(buzzer('passive').params.active, false);
  assert.equal(buzzer('active').params.active, true);
  assert.equal(createDevice(partById.get('rotary')!, { range: 15 }, host).params.max, 15);
  assert.equal(createDevice(partById.get('bar')!, { count: 5 }, host).pins.length, 5);
  assert.equal(createDevice(partById.get('button')!, { size: 'large' }, host).shape, 'arcade');
  // The anode variant of a digit lights its segments at 0.
  assert.equal(createDevice(partById.get('seg1')!, { common: 'anode' }, host).activeLow, true);
  assert.equal(createDevice(partById.get('seg1')!, {}, host).activeLow, false);
  assert.equal(createDevice(partById.get('led')!, { activeLow: true }, host).activeLow, true);
});
