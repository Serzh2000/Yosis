import assert from 'node:assert/strict';
import test from 'node:test';
import type { LcdParallel } from '../src/lib/lab/bus/lcd';
import type { Max7219, Mcp3008, Tm1637, Ws2812 } from '../src/lib/lab/bus/serial-devices';
import { LCD4_V } from '../src/lib/lab/bus/verilog';
import {
  MCP3008_READ_V,
  SPI16_V,
  TM1637_BUS_V,
  WS2812_TX_V,
} from '../src/lib/lab/bus/verilog-cores';
import { bench, loc } from './lab-bus-helper';

/** A top module that feeds a ROM of items, one at a time, to a sender module. */
function sequencer(
  ports: string,
  width: number,
  items: string[],
  body: string,
  extra = '',
): string {
  const rows = items.map((item, index) => `      ${index}: item = ${item};`).join('\n');
  return `module top(input clk, ${ports}, output reg done = 0);
  reg start = 0;
  reg [7:0] pc = 0;
  reg [1:0] s = 0;
  reg [${width - 1}:0] item;
  wire busy;
${body}
  always @* begin
    item = 0;
    case (pc)
${rows}
      default: item = 0;
    endcase
  end
  wire last = pc == ${items.length};
${extra}
  always @(posedge clk) begin
    start <= 0;
    if (!done) case (s)
      0: if (last) done <= 1; else begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin pc <= pc + 1; s <= 0; end
    endcase
  end
endmodule
`;
}

test('HD44780 wired directly in 4-bit mode: init sequence, text on two lines, no warnings with proper waits', async () => {
  const item = (rs: number, data: number, short = 0) =>
    `{1'b${short}, 1'b${rs}, 8'h${data.toString(16)}}`;
  const text = (value: string) => [...value].map((char) => item(1, char.charCodeAt(0)));
  const items = [
    item(0, 0x30, 1),
    item(0, 0x30, 1),
    item(0, 0x30, 1),
    item(0, 0x20, 1),
    item(0, 0x28),
    item(0, 0x0c),
    item(0, 0x01),
    item(0, 0x06),
    item(0, 0x80),
    ...text('Hello'),
    item(0, 0xc0),
    ...text('World 42'),
  ];
  const lab = await bench(
    [
      { name: 'lcd4.v', content: LCD4_V },
      {
        name: 'top.v',
        content: sequencer(
          'output rs, output e, output [3:0] d',
          10,
          items,
          `  wire sh = item[9];
  wire [7:0] data = item[7:0];
  lcd4 lcd(.clk(clk), .start(start), .short(item[9]), .rs_in(item[8]), .data(data), .busy(busy), .rs(rs), .e(e), .d(d));`,
        ),
      },
    ],
    loc({ clk: 4, rs: 75, e: 80, 'd[0]': 42, 'd[1]': 41, 'd[2]': 56, 'd[3]': 54 }),
    [
      {
        id: 'lcd-parallel',
        wires: { RS: 75, E: 80, D4: 42, D5: 41, D6: 56, D7: 54 },
      },
    ],
  );
  const { lcd } = lab.devices[0] as LcdParallel;
  lab.runUntil('done', 4_000_000);
  assert.equal(lcd.text(0), 'Hello           ');
  assert.equal(lcd.text(1), 'World 42        ');
  assert.equal(lcd.tooFast, 0, 'the driver waits long enough after every byte');
  assert.ok(lcd.displayOn && lcd.twoLine && !lcd.eightBit);
});

test('HD44780 in 8-bit mode with the cursor, shift and entry-mode commands', async () => {
  const items = [
    "{1'b0, 8'h38}",
    "{1'b0, 8'h0f}",
    "{1'b0, 8'h01}",
    "{1'b1, 8'h41}",
    "{1'b1, 8'h42}",
    "{1'b0, 8'h18}", // shift the display left
  ];
  const lab = await bench(
    [
      {
        name: 'top.v',
        content: `module top(input clk, output reg rs, output reg e, output reg [7:0] d, output reg done = 0);
  reg [3:0] i = 0;
  reg [15:0] t = 0;
  reg [8:0] w;
  always @* case (i)
    0: w = 9'h038; 1: w = 9'h00f; 2: w = 9'h001; 3: w = 9'h141; 4: w = 9'h142; 5: w = 9'h018; default: w = 0;
  endcase
  always @(posedge clk) begin
    t <= t + 1;
    if (!done) case (t)
      16'd1: begin rs <= w[8]; d <= w[7:0]; end
      16'd40: e <= 1;
      16'd80: e <= 0;
      16'd4000: begin t <= 0; i <= i + 1; if (i == ${items.length - 1}) done <= 1; end
    endcase
  end
endmodule`,
      },
    ],
    loc({
      clk: 4,
      rs: 75,
      e: 80,
      'd[0]': 42,
      'd[1]': 41,
      'd[2]': 56,
      'd[3]': 54,
      'd[4]': 51,
      'd[5]': 48,
      'd[6]': 55,
      'd[7]': 49,
    }),
    [
      {
        id: 'lcd-parallel',
        opts: { bus: 8 },
        wires: { RS: 75, E: 80, D0: 42, D1: 41, D2: 56, D3: 54, D4: 51, D5: 48, D6: 55, D7: 49 },
      },
    ],
  );
  const { lcd } = lab.devices[0] as LcdParallel;
  lab.runUntil('done', 1_000_000);
  assert.ok(lcd.cursorOn && lcd.blinkOn);
  // "AB" was written at 0 and 1; the display shifted left by one: B is at column 0.
  assert.equal(lcd.shift, 1);
  assert.equal(lcd.charAt(0, 0), 0x42);
  assert.equal(lcd.text(0).slice(0, 2), 'B ');
});

test('MAX7219: 16-bit frames latched by CS; shutdown, scan limit and decode mode', async () => {
  const word = (register: number, data: number) =>
    `16'h${((register << 8) | data).toString(16).padStart(4, '0')}`;
  const smiley = [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c];
  const frames = [
    word(0x0c, 0x01), // leave shutdown
    word(0x0b, 0x07),
    word(0x0a, 0x04),
    word(0x09, 0x00),
    ...smiley.map((row, index) => word(index + 1, row)),
  ];
  const lab = await bench(
    [
      { name: 'spi16.v', content: SPI16_V },
      {
        name: 'top.v',
        content: sequencer(
          'output cs, output sclk, output din',
          16,
          frames,
          '  spi16 spi(.clk(clk), .start(start), .word(item), .busy(busy), .cs(cs), .sclk(sclk), .mosi(din));',
        ),
      },
    ],
    loc({ clk: 4, cs: 75, sclk: 80, din: 42 }),
    [{ id: 'max7219', wires: { DIN: 42, CLK: 80, CS: 75 } }],
  );
  const chip = lab.devices[0] as Max7219;
  assert.equal(chip.row(0), 0, 'starts shut down');
  lab.runUntil('done', 1_000_000);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7].map((row) => chip.row(row)),
    smiley,
  );
  assert.equal(chip.registers[0x0a], 4);

  const digits = await bench(
    [
      { name: 'spi16.v', content: SPI16_V },
      {
        name: 'top.v',
        content: sequencer(
          'output cs, output sclk, output din',
          16,
          [
            word(0x0c, 1),
            word(0x0b, 3),
            word(0x09, 0x0f),
            word(1, 7),
            word(2, 0x8a),
            word(3, 0),
            word(4, 0x7e),
          ],
          '  spi16 spi(.clk(clk), .start(start), .word(item), .busy(busy), .cs(cs), .sclk(sclk), .mosi(din));',
        ),
      },
    ],
    loc({ clk: 4, cs: 75, sclk: 80, din: 42 }),
    [{ id: 'max7219', opts: { mode: 'digits' }, wires: { DIN: 42, CLK: 80, CS: 75 } }],
  );
  const seven = digits.devices[0] as Max7219;
  digits.runUntil('done', 1_000_000);
  // Code B: 7 is segments a, b, c; 0x8A is '-' (g) with the decimal point; 0 is a..f.
  assert.equal(seven.segments(0), 0b0000111);
  assert.equal(seven.segments(1), 0xc0);
  assert.equal(seven.segments(2), 0x3f);
  assert.equal(seven.segments(3), 0x73, 'code 0xE shows P');
  assert.equal(seven.segments(4), 0, 'beyond the scan limit nothing is lit');
});

test('TM1637: its own start/stop protocol, acknowledged bytes, address command and brightness', async () => {
  const START = "{2'd1, 8'h00}";
  const STOP = "{2'd2, 8'h00}";
  const write = (byte: number) => `{2'd3, 8'h${byte.toString(16).padStart(2, '0')}}`;
  const items = [
    START,
    write(0x40),
    STOP,
    START,
    write(0xc0),
    write(0x3f),
    write(0x06),
    write(0xdb), // 2 with the colon
    write(0x4f),
    STOP,
    START,
    write(0x8f),
    STOP,
  ];
  const lab = await bench(
    [
      { name: 'tm1637_bus.v', content: TM1637_BUS_V },
      {
        name: 'top.v',
        content: sequencer(
          'inout dio, output tclk',
          10,
          items,
          '  tm1637_bus bus(.clk(clk), .start(start), .cmd(item[9:8]), .wdata(item[7:0]), .busy(busy), .dio(dio), .tclk(tclk));',
        ),
      },
    ],
    loc({ clk: 4, dio: 75, tclk: 80 }),
    [{ id: 'tm1637', wires: { CLK: 80, DIO: 75 } }],
  );
  const chip = lab.devices[0] as Tm1637;
  lab.runUntil('done', 2_000_000);
  assert.deepEqual(Array.from(chip.digits.slice(0, 4)), [0x3f, 0x06, 0xdb, 0x4f]);
  assert.equal(chip.view.on, true);
  assert.equal(chip.view.brightness, 7);
  assert.equal(chip.view.acked, 7, 'every byte was acknowledged by pulling DIO low');
});

test('WS2812B: pulse widths of 0.4 and 0.8 us become colours, and a 50 us gap latches them', async () => {
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0x102030, 0xffffff, 0x000000, 0x800080, 0x010203];
  const grb = (rgb: number) =>
    ((rgb >> 8) & 0xff) * 65536 + ((rgb >> 16) & 0xff) * 256 + (rgb & 0xff);
  const frame = (list: number[]) =>
    list.map((rgb) => `25'h0${grb(rgb).toString(16).padStart(6, '0')}`);
  const second = colors.map((rgb) => 0xffffff - rgb);
  // The pause between frames is a single item with the top bit set: 'wait'.
  const items = [...frame(colors), "25'h1000000", ...frame(second), "25'h1000000"];
  const lab = await bench(
    [
      { name: 'ws2812_tx.v', content: WS2812_TX_V },
      {
        name: 'top.v',
        content: `module top(input clk, output dout, output reg done = 0);
  reg start = 0;
  reg [7:0] pc = 0;
  reg [1:0] s = 0;
  reg [24:0] item;
  reg [11:0] gap = 0;
  wire busy;
  ws2812_tx tx(.clk(clk), .start(start), .grb(item[23:0]), .busy(busy), .dout(dout));
  always @* begin
    item = 0;
    case (pc)
${items.map((value, index) => `      ${index}: item = ${value};`).join('\n')}
      default: item = 0;
    endcase
  end
  always @(posedge clk) begin
    start <= 0;
    if (!done) case (s)
      0: if (pc == ${items.length}) done <= 1;
         else if (item[24]) begin gap <= 3000; s <= 3; end
         else begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin pc <= pc + 1; s <= 0; end
      3: if (gap == 0) begin pc <= pc + 1; s <= 0; end else gap <= gap - 1;
    endcase
  end
endmodule`,
      },
    ],
    loc({ clk: 4, dout: 75 }),
    [{ id: 'ws2812', opts: { pixels: 8 }, wires: { DIN: 75 } }],
  );
  const strip = lab.devices[0] as Ws2812;
  const at = (i: number) =>
    (strip.colors[i * 3] << 16) | (strip.colors[i * 3 + 1] << 8) | strip.colors[i * 3 + 2];
  // Run until the first frame is on the strip, then check, then let the second one through.
  for (let cycles = 0; strip.rev < 1 && cycles < 2_000_000; cycles += 2000) lab.advance(2000);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(at), colors);
  lab.runUntil('done', 2_000_000);
  lab.advance(4000);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(at), second);
});

test('MCP3008: the three-byte exchange returns the potentiometer on channel 0 and zero elsewhere', async () => {
  const lab = await bench(
    [
      { name: 'mcp3008_read.v', content: MCP3008_READ_V },
      {
        name: 'top.v',
        content: `module top(input clk, output cs, output sclk, output mosi, input miso,
  output reg [9:0] v0 = 0, output reg [9:0] v1 = 0);
  reg start = 0;
  reg channel = 0;
  reg [1:0] s = 0;
  wire busy;
  wire [9:0] value;
  mcp3008_read adc(.clk(clk), .start(start), .channel({2'b00, channel}), .busy(busy), .value(value),
    .cs(cs), .sclk(sclk), .mosi(mosi), .miso(miso));
  always @(posedge clk) begin
    start <= 0;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin
        if (channel) v1 <= value; else v0 <= value;
        channel <= ~channel;
        s <= 0;
      end
    endcase
  end
endmodule`,
      },
    ],
    loc({ clk: 4, cs: 75, sclk: 80, mosi: 42, miso: 41 }),
    [
      {
        id: 'adc-mcp3008',
        opts: { value: 700 },
        wires: { CS: 75, CLK: 80, DIN: 42, DOUT: 41 },
      },
    ],
  );
  lab.advance(40_000);
  assert.equal(lab.read('v0'), 700n);
  assert.equal(lab.read('v1'), 0n);
  (lab.devices[0] as Mcp3008).act('value', 1023);
  lab.advance(40_000);
  assert.equal(lab.read('v0'), 1023n);
  (lab.devices[0] as Mcp3008).act('value', 0);
  lab.advance(40_000);
  assert.equal(lab.read('v0'), 0n);
});
