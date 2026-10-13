import assert from 'node:assert/strict';
import test from 'node:test';
import type { Device } from '../src/lib/lab/devices';
import { DHT11_READ_V, HCSR04_V, NEC_RX_V, PS2_RX_V } from '../src/lib/lab/bus/verilog-cores';
import { bench, loc } from './lab-bus-helper';

test('HC-SR04: the design measures an echo of 58 microseconds per centimetre', async () => {
  const lab = await bench(
    [
      { name: 'hcsr04.v', content: HCSR04_V },
      {
        name: 'top.v',
        content: `module top(input clk, output trig, input echo, output [8:0] distance_cm);
  wire done;
  hcsr04 sensor(.clk(clk), .trig(trig), .echo(echo), .distance_cm(distance_cm), .done(done));
endmodule`,
      },
    ],
    loc({ clk: 4, trig: 75, echo: 80 }),
    [{ id: 'hc-sr04', opts: { distance: 50 }, wires: { TRIG: 75, ECHO: 80 } }],
  );
  lab.advance(2_000_000);
  assert.equal(lab.read('distance_cm'), 50n);
  (lab.devices[0] as Device).act('distance', 200);
  lab.advance(2_500_000);
  assert.equal(lab.read('distance_cm'), 200n);
  (lab.devices[0] as Device).act('distance', 7);
  lab.advance(2_500_000);
  assert.equal(lab.read('distance_cm'), 7n);
});

test('DHT11: start signal from the design, then 40 bits told apart by pulse length', async () => {
  const lab = await bench(
    [
      { name: 'dht11_read.v', content: DHT11_READ_V },
      {
        name: 'top.v',
        content: `module top(input clk, inout dht, output [39:0] data, output ok, output busy);
  reg start = 0;
  reg started = 0;
  reg [7:0] wait_n = 0;
  always @(posedge clk) begin
    wait_n <= wait_n + 1;
    start <= !started && wait_n == 100;
    if (wait_n == 100) started <= 1;
  end
  dht11_read reader(.clk(clk), .start(start), .dht(dht), .busy(busy), .data(data), .ok(ok));
endmodule`,
      },
    ],
    loc({ clk: 4, dht: 75 }),
    [{ id: 'dht11', opts: { temp: 31, humidity: 62 }, wires: { DATA: 75 } }],
  );
  lab.advance(1_500_000);
  assert.equal(lab.read('ok'), 1n);
  const data = lab.read('data');
  const bytes = [4, 3, 2, 1, 0].map((i) => Number((data >> BigInt(8 * i)) & 0xffn));
  assert.deepEqual(bytes, [62, 0, 31, 0, 93]);
  assert.equal(lab.devices[0].view.responses, 1);
});

test('IR remote: a key sends an NEC frame that the design decodes (active-low, demodulated)', async () => {
  const lab = await bench(
    [
      { name: 'nec_rx.v', content: NEC_RX_V },
      {
        name: 'top.v',
        content: `module top(input clk, input ir, output reg [7:0] cmd = 0, output reg [7:0] addr = 0, output reg [7:0] frames = 0);
  wire [7:0] command, address;
  wire valid;
  nec_rx rx(.clk(clk), .ir(ir), .command(command), .address(address), .valid(valid));
  always @(posedge clk) if (valid) begin cmd <= command; addr <= address; frames <= frames + 1; end
endmodule`,
      },
    ],
    loc({ clk: 4, ir: 75 }),
    [{ id: 'ir-receiver', wires: { OUT: 75 } }],
  );
  lab.advance(1000);
  assert.equal(lab.read('frames'), 0n);
  (lab.devices[0] as Device).act('press', 'play');
  lab.advance(3_000_000);
  assert.equal(lab.read('frames'), 1n);
  assert.equal(lab.read('cmd'), 0x43n);
  assert.equal(lab.read('addr'), 0n);
  (lab.devices[0] as Device).act('press', '7');
  lab.advance(3_000_000);
  assert.equal(lab.read('cmd'), 0x42n);
  assert.equal(lab.read('frames'), 2n);
});

test('PS/2 keyboard: make and break codes with odd parity on a keyboard-driven 12.5 kHz clock', async () => {
  const lab = await bench(
    [
      { name: 'ps2_rx.v', content: PS2_RX_V },
      {
        name: 'top.v',
        content: `module top(input clk, input ps2_clk, input ps2_data, output reg [39:0] log = 0, output reg [7:0] count = 0, output reg bad = 0);
  wire [7:0] code;
  wire strobe, parity_ok;
  ps2_rx rx(.clk(clk), .ps2_clk(ps2_clk), .ps2_data(ps2_data), .code(code), .strobe(strobe), .parity_ok(parity_ok));
  always @(posedge clk) if (strobe) begin
    log <= {log[31:0], code};
    count <= count + 1;
    if (!parity_ok) bad <= 1;
  end
endmodule`,
      },
    ],
    loc({ clk: 4, ps2_clk: 75, ps2_data: 80 }),
    [{ id: 'ps2-keyboard', wires: { CLK: 75, DATA: 80 } }],
  );
  const keyboard = lab.devices[0] as Device;
  keyboard.act('key', { id: 'A', on: true });
  lab.advance(60_000);
  keyboard.act('key', { id: 'A', on: false });
  lab.advance(60_000);
  keyboard.act('key', { id: 'Up', on: true });
  for (let i = 0; i < 20; i++) lab.advance(10_000);
  assert.equal(lab.read('count'), 5n);
  assert.equal(lab.read('bad'), 0n, 'every frame had correct odd parity and framing');
  assert.equal(lab.read('log'), 0x1cf01ce075n, '1C, F0 1C, E0 75');
});
