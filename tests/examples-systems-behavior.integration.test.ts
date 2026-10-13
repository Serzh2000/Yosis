import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { systemExamples } from '../src/lib/examples-systems';

const run = promisify(execFile);
const workspace = fileURLToPath(new URL('../', import.meta.url));
const portable = path.join(workspace, '.tools', 'iverilog', 'mingw64');
const compiler =
  process.env.IVERILOG_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin', 'iverilog.exe') : 'iverilog');
const runtime =
  process.env.VVP_PATH ??
  (process.platform === 'win32' ? path.join(portable, 'bin', 'vvp.exe') : 'vvp');
const library =
  process.env.IVERILOG_LIB ??
  (process.platform === 'win32' ? path.join(portable, 'lib', 'ivl') : undefined);
const toolEnv = { ...process.env };
if (process.platform === 'win32') {
  const pathKey = Object.keys(toolEnv).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  toolEnv[pathKey] = `${path.join(portable, 'bin')}${path.delimiter}${toolEnv[pathKey] ?? ''}`;
}

interface Contract {
  parameters?: string;
  body: string;
  declarations?: string;
}
// Assertions exercise externally useful contracts: rejection, ordering, timing,
// protocol framing and boundaries. Each test executes actual Icarus Verilog.
const contracts: Record<string, Contract> = {
  'button-debounce': {
    parameters: '.STABLE_TICKS(3)',
    body: `
    check(dut.stable, 1, "released after reset");
    @(negedge clk); button_n = 0; step();
    @(negedge clk); button_n = 1; repeat(4) step();
    check(dut.stable, 1, "one-clock glitch rejected");
    @(negedge clk); button_n = 0; repeat(4) step();
    check(dut.stable, 1, "not stable for three samples yet");
    step(); check(dut.stable, 0, "stable press accepted");
    check(led_n, 62, "only LED0 on");
    @(negedge clk); button_n = 1; repeat(5) step();
    check(led_n, 63, "stable release accepted");`,
  },
  'pulse-capture': {
    parameters: '.HOLD_TICKS(4)',
    body: `
    @(negedge clk); button_n = 0; repeat(3) step();
    check(led_n, 62, "front starts stretched pulse");
    repeat(3) step(); check(led_n, 62, "fourth interval still active");
    step(); check(led_n, 63, "expires after four intervals");
    repeat(5) step(); check(led_n, 63, "held button never restarts pulse");`,
  },
  'async-toggle-sync': {
    body: `
    press_button(); repeat(3) step(); check(led_n, 62, "one delivered toggle");
    press_button(); repeat(3) step(); check(led_n, 61, "second delivered toggle");
    repeat(8) step(); check(dut.events, 2, "no duplicate deliveries");`,
  },
  'reset-release': {
    body: `
    step(); check(dut.release_pipe, 1, "first release stage"); check(dut.count, 0, "counter held first edge");
    step(); check(dut.release_pipe, 3, "second release stage"); check(dut.count, 0, "counter held second edge");
    step(); check(dut.count, 1, "counter starts on third edge");
    @(negedge clk); reset_n = 0; #1; check(dut.release_pipe, 0, "asynchronous reset assertion");
    step(); check(dut.count, 0, "functional register resets on next edge");`,
  },
  'pulse-width': {
    body: `
    @(negedge clk); button_n = 0; repeat(5) step();
    @(negedge clk); button_n = 1; repeat(3) step();
    check(dut.captured, 5, "five input intervals measured"); check(led_n, 58, "stored duration on LED");
    repeat(5) step(); check(dut.captured, 5, "duration holds");
    @(negedge clk); button_n = 0; repeat(70) step();
    @(negedge clk); button_n = 1; repeat(3) step();
    check(dut.captured, 63, "duration saturates instead of wrapping");`,
  },
  'one-shot': {
    parameters: '.PULSE_TICKS(12)',
    body: `
    press_button(); check(dut.remaining, 7, "first pulse keeps original deadline");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.remaining, 4, "retrigger ignored while active");
    repeat(4) step(); check(led_n, 63, "original deadline reached");
    repeat(3) step(); check(led_n, 63, "hold after deadline does not restart");`,
  },
  'retrigger-timer': {
    parameters: '.TIMEOUT_TICKS(12)',
    body: `
    press_button(); check(dut.remaining, 7, "first timer active");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.remaining, 12, "new event reloads full interval");
    repeat(11) step(); check(dut.expired, 0, "no early expiry");
    step(); check(led_n, 61, "expired pulse with inactive timer");
    step(); check(led_n, 63, "expiry pulse exactly one edge");`,
  },
  watchdog: {
    parameters: '.LIMIT_TICKS(6)',
    body: `
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.silence, 0, "heartbeat clears elapsed interval");
    repeat(5) step(); check(led_n, 63, "not expired one edge early");
    step(); check(led_n, 62, "watchdog deadline alarm");
    @(negedge clk); button_n = 1; repeat(3) step();
    press_button(); check(led_n, 62, "late heartbeat cannot clear latched alarm");`,
  },
  'divide-by-three': {
    body: `
    check(led_n, 62, "initial phase zero");
    step(); check(dut.phase, 1, "phase1"); check(led_n[0], 1, "strobe off phase1");
    step(); check(dut.phase, 2, "phase2"); check(led_n[0], 1, "strobe off phase2");
    step(); check(dut.phase, 0, "wrap to phase0"); check(led_n[0], 0, "one-in-three strobe");
    repeat(3) step(); check(dut.phase, 0, "second complete period");`,
  },
  'fractional-tick': {
    body: `
    repeat(8) step(); check(dut.events, 3, "three carries per eight edges"); check(dut.phase, 0, "phase returns to zero");
    repeat(8) step(); check(dut.events, 6, "second eight-edge interval");
    repeat(8) step(); check(dut.events, 9, "average rate stable across third interval");`,
  },
  'duty-cycle': {
    body: `
    repeat(8) step(); check(dut.measured, 0, "released window zero percent");
    @(negedge clk); button_n = 0; repeat(8) step();
    check(dut.measured, 6, "first window includes two-clock sync latency");
    repeat(8) step(); check(dut.measured, 8, "stable press one hundred percent");
    @(negedge clk); button_n = 1; repeat(8) step();
    check(dut.measured, 2, "release latency belongs to current window");
    repeat(8) step(); check(dut.measured, 0, "next released window zero");`,
  },
  stopwatch: {
    parameters: '.SECOND_TICKS(4)',
    body: `
    repeat(3) step(); check(dut.seconds, 0, "starts paused");
    press_button(); check(dut.running, 1, "press starts");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.running, 0, "second press pauses");
    saved = dut.ticks; saved2 = dut.seconds;
    repeat(7) step(); check(dut.ticks, saved, "fractional second held"); check(dut.seconds, saved2, "seconds held");
    @(negedge clk); button_n = 1; repeat(3) step();
    press_button(); check(dut.running, 1, "third press resumes");
    repeat(4) step(); check(dut.seconds > saved2, 1, "resumed time advances");`,
  },
  countdown: {
    parameters: '.SECOND_TICKS(2)',
    body: `
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.seconds, 15, "load fifteen seconds"); check(dut.running, 1, "running after start");
    repeat(29) step(); check(dut.seconds, 1, "one interval before expiry");
    step(); check(led_n, 31, "done at zero, no underflow");
    repeat(6) step(); check(dut.seconds, 0, "finished timer stays at zero");
    @(negedge clk); button_n = 1; repeat(3) step();
    @(negedge clk); button_n = 0; repeat(3) step(); check(dut.done, 0, "restart clears done");`,
  },
  'event-window': {
    parameters: '.WINDOW_TICKS(12)',
    body: `
    press_button(); repeat(4) step(); check(dut.published, 1, "one event in first window");
    repeat(12) step(); check(dut.published, 0, "empty second window");
    press_button(); repeat(4) step(); check(dut.published, 1, "new window owns event");`,
  },
  'breathing-pwm': {
    parameters: '.LEVEL_TICKS(1)',
    body: `
    check(led_n[0], 1, "zero level means fully off");
    repeat(255) step(); check(dut.level, 255, "maximum brightness reached");
    step(); check(dut.level, 254, "turn down without wrapping to zero");
    repeat(254) step(); check(dut.level, 0, "returns to zero");
    step(); check(dut.level, 1, "turn up without underflow");`,
  },
  'walking-pairs': {
    parameters: '.STEP_TICKS(2)',
    body: `
    check(led_n, 30, "two end lights");
    repeat(2) step(); check(led_n, 45, "second pair");
    repeat(2) step(); check(led_n, 51, "central pair");
    repeat(2) step(); check(led_n, 51, "central pair crosses");
    repeat(6) step(); check(led_n, 30, "full six-step period");`,
  },
  'serial-parity': {
    body: `
    repeat(4) step(); check(dut.published, 0, "zero frame even parity");
    @(negedge clk); button_n = 0; repeat(8) step();
    check(dut.word, 15, "held press produces ones"); check(dut.published, 0, "four ones have even parity");
    @(negedge clk); button_n = 1; repeat(4) step();
    check(dut.word, 12, "two old and two new bits in latest word"); check(dut.published, 0, "1100 even parity");
    // Start another zero frame, then one bit. Synchronizer latency is two.
    repeat(4) step();
    @(negedge clk); button_n = 0; step();
    @(negedge clk); button_n = 1; repeat(3) step();
    check(dut.word, 2, "single bit packet"); check(dut.published, 1, "single one gives odd XOR");`,
  },
  crc4: {
    body: `
    repeat(2) step(); check(dut.crc, 0, "zero bits keep zero seed");
    @(negedge clk); button_n = 0; repeat(2) step(); check(dut.crc, 0, "sync latency");
    step(); check(dut.crc, 3, "CRC after first one");
    step(); check(dut.crc, 5, "CRC after second one");
    step(); check(dut.crc, 9, "CRC after third one");
    step(); check(dut.crc, 2, "known remainder for 1111");`,
  },
  lfsr6: {
    parameters: '.STEP_TICKS(1)',
    declarations: 'reg [63:0] visited;',
    body: `
    visited = 0;
    repeat(63) begin
        check(dut.state != 0, 1, "zero seed never reached");
        check(visited[dut.state], 0, "all states distinct within period");
        visited[dut.state] = 1; step();
    end
    check(dut.state, 1, "returns to seed after exactly 63 edges");
    check(&visited[63:1], 1, "visits every nonzero six-bit state");`,
  },
  'sequence-1011': {
    body: `
    // Input packet 1011011; extra zeros let synchronized bits arrive.
    @(negedge clk); button_n = 0; step();
    @(negedge clk); button_n = 1; step();
    @(negedge clk); button_n = 0; repeat(2) step();
    @(negedge clk); button_n = 1; step();
    @(negedge clk); button_n = 0; repeat(2) step();
    @(negedge clk); button_n = 1; repeat(4) step();
    check(dut.hits, 2, "two overlapping 1011 matches");
    repeat(6) step(); check(dut.hits, 2, "zero suffix gives no extra match");`,
  },
  'door-controller': {
    parameters: '.MOVE_TICKS(2), .HOLD_TICKS(4)',
    body: `
    check(led_n, 62, "door initially closed");
    @(negedge clk); button_n = 0; repeat(3) step(); check(led_n, 61, "request starts opening");
    repeat(2) step(); check(led_n, 59, "open after travel delay");
    repeat(4) step(); check(led_n, 55, "hold expires into closing");
    repeat(2) step(); check(led_n, 62, "closed after second travel delay");`,
  },
  'request-ack': {
    parameters: '.RESPONSE_TICKS(3)',
    body: `
    @(negedge clk); button_n = 0; repeat(3) step(); check(dut.pending, 1, "request stored");
    repeat(2) step(); check(dut.acknowledged, 0, "no early acknowledgement");
    step(); check(led_n, 30, "ack with completed count one");
    step(); check(dut.acknowledged, 0, "ack exactly one cycle");
    repeat(5) step(); check(dut.completed, 1, "held request does not replay");`,
  },
  'elevator-fsm': {
    parameters: '.TRAVEL_TICKS(4)',
    body: `
    check(led_n, 62, "lower floor at reset");
    @(negedge clk); button_n = 0; repeat(3) step(); check(led_n, 59, "in transit no floor light");
    repeat(4) step(); check(led_n, 61, "upper floor after travel");
    @(negedge clk); button_n = 1; repeat(3) step();
    @(negedge clk); button_n = 0; repeat(7) step(); check(led_n, 62, "return to lower floor");`,
  },
  'vending-fsm': {
    body: `
    press_button(); check(dut.credit, 1, "one coin");
    press_button(); check(dut.credit, 2, "two coins");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(led_n, 51, "third coin dispenses and clears credit");
    step(); check(dut.dispense, 0, "one-cycle dispense");
    repeat(8) step(); check(dut.sales, 1, "hold cannot pay another sale");`,
  },
  'arbiter-round-robin': {
    body: `
    step(); check(dut.grant, 2, "B served when alone");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.grant, 1, "A served when both request");
    step(); check(dut.grant, 2, "B gets next contested turn");
    step(); check(dut.grant, 1, "A gets following contested turn");
    repeat(12) begin step(); check(dut.grant == 1 || dut.grant == 2, 1, "one grant only"); end`,
  },
  'fifo-four': {
    body: `
    check(dut.used, 0, "empty on reset");
    repeat(4) step(); check(dut.used, 4, "four writes reach full");
    repeat(5) step(); check(dut.next_data, 5, "full buffer blocks producer");
    press_button(); check(dut.last_read, 1, "oldest item first"); check(dut.used, 4, "producer refills free slot");
    press_button(); check(dut.last_read, 2, "second item preserves FIFO order");
    press_button(); check(dut.last_read, 3, "third item");
    press_button(); check(dut.last_read, 4, "fourth item wraps read pointer");
    press_button(); check(dut.last_read, 5, "new item follows original four");`,
  },
  'stack-four': {
    body: `
    repeat(4) step(); check(dut.depth, 4, "four pushes reach full");
    press_button(); check(dut.last_pop, 4, "newest item first");
    press_button(); check(dut.last_pop, 5, "refilled top is next pop");
    check(dut.depth, 4, "bounded stack refills"); check(dut.next_data, 7, "two successful refills");`,
  },
  'ram-write-read': {
    body: `
    repeat(4) step(); check(dut.writing, 0, "four words written");
    check(dut.memory[0], 3, "address0 pattern"); check(dut.memory[1], 6, "address1 pattern");
    check(dut.memory[2], 9, "address2 pattern"); check(dut.memory[3], 12, "address3 pattern");
    step(); check(dut.data, 3, "synchronous read old address0"); check(dut.address, 1, "next address already advanced");
    step(); check(dut.data, 6, "read address1"); step(); check(dut.data, 9, "read address2");
    step(); check(dut.data, 12, "read address3"); step(); check(dut.data, 3, "cyclic read wraps");`,
  },
  'rom-melody': {
    parameters: '.STEP_TICKS(1)',
    body: `
    check(led_n, 62, "ROM word0");
    step(); check(led_n, 60, "ROM word1"); step(); check(led_n, 56, "ROM word2");
    step(); check(led_n, 48, "ROM word3"); step(); check(led_n, 32, "ROM word4");
    step(); check(led_n, 0, "ROM word5"); step(); check(led_n, 42, "ROM word6");
    step(); check(led_n, 21, "ROM word7"); step(); check(led_n, 62, "ROM wraps");`,
  },
  'lookup-sine': {
    parameters: '.SAMPLE_TICKS(1)',
    body: `
    check(dut.sample, 32, "midpoint at phase0");
    repeat(4) step(); check(dut.sample, 63, "positive crest quarter period");
    repeat(4) step(); check(dut.sample, 32, "midpoint half period");
    repeat(4) step(); check(dut.sample, 0, "negative trough three quarters");
    repeat(4) step(); check(dut.sample, 32, "full period returns midpoint");`,
  },
  'uart-tx': {
    parameters: '.BIT_TICKS(4)',
    body: `
    check(uart_tx, 1, "UART idle high");
    @(negedge clk); button_n = 0; repeat(3) step(); check(uart_tx, 0, "start bit");
    repeat(4) step(); check(uart_tx, 1, "A bit0 one");
    repeat(4) step(); check(uart_tx, 0, "A bit1 zero");
    repeat(20) step(); check(uart_tx, 1, "A bit6 one");
    repeat(4) step(); check(uart_tx, 0, "A bit7 zero");
    repeat(4) step(); check(uart_tx, 1, "stop bit");
    repeat(4) step(); check(dut.busy, 0, "ten whole bit periods");
    repeat(5) step(); check(uart_tx, 1, "idle restored while button held");`,
  },
  'uart-rx': {
    parameters: '.BIT_TICKS(8)',
    declarations: `
    task serial_bit(input bit value); begin @(negedge clk); uart_rx = value; repeat(8) step(); end endtask
    task serial_byte(input [7:0] value, input bit good_stop);
      integer b; begin serial_bit(0); for (b=0; b<8; b=b+1) serial_bit(value[b]); serial_bit(good_stop); serial_bit(1); end
    endtask`,
    body: `
    repeat(5) step();
    serial_byte(8'hA5, 0); check(dut.valid, 0, "bad stop rejects frame");
    repeat(12) step();
    serial_byte(8'hA5, 1); check(dut.valid, 1, "good stop accepts frame");
    check(dut.received, 8'hA5, "LSB-first byte reconstructed"); check(led_n, 26, "valid plus low five payload bits");`,
  },
  'spi-loopback': {
    parameters: '.HALF_TICKS(1)',
    body: `
    @(negedge clk); button_n = 0; repeat(3) step(); check(dut.cs_n, 0, "CS asserts for packet");
    repeat(15) step(); check(dut.busy, 1, "still active through last rising edge");
    step(); check(dut.busy, 0, "complete after sixteen half-periods"); check(dut.cs_n, 1, "CS deasserts");
    check(dut.sck, 0, "mode0 clock idle low"); check(dut.received, 8'hA6, "loopback reconstructs MSB-first packet");
    check(led_n, 57, "low five payload bits visible");`,
  },
  'i2c-pattern': {
    parameters: '.STEP_TICKS(1)',
    body: `
    check(dut.scl, 1, "bus idle SCL high"); check(dut.sda, 1, "bus idle SDA high");
    @(negedge clk); button_n = 0; repeat(3) step(); check(dut.scl, 1, "START keeps SCL high"); check(dut.sda, 0, "START pulls SDA low");
    step(); check(dut.scl, 0, "clock low before data change");
    step(); check(dut.sda, 1, "release SDA for bit one");
    step(); check(dut.scl, 1, "clock data one");
    repeat(3) step(); check(dut.scl, 1, "STOP setup clock high"); check(dut.sda, 0, "STOP setup data low");
    step(); check(dut.sda, 1, "STOP releases SDA"); check(dut.state, 0, "transaction returns idle");`,
  },
  'serial-sum': {
    body: `
    @(negedge clk); button_n = 0; repeat(3) step(); check(dut.busy, 1, "arithmetic started");
    repeat(3) step(); check(dut.done, 0, "four-bit sum not complete early");
    step(); check(dut.done, 1, "fourth edge completes sum"); check(dut.carry, 1, "9+7 overflow carry");
    check(dut.result, 0, "9+7 low four sum bits zero"); check(led_n, 15, "five-bit result sixteen plus done");
    repeat(7) step(); check(led_n, 15, "completed result holds");`,
  },
  'majority-filter': {
    body: `
    @(negedge clk); button_n = 0; step();
    @(negedge clk); button_n = 1; repeat(6) begin step(); check(dut.majority, 0, "single glitch rejected"); end
    @(negedge clk); button_n = 0; repeat(4) step(); check(dut.majority, 1, "two neighboring samples accepted");
    @(negedge clk); button_n = 1; repeat(5) step(); check(dut.majority, 0, "stable release passes");`,
  },
  'capture-minmax': {
    body: `
    step(); check(dut.minimum, 0, "first sample lowers min");
    repeat(7) step(); check(dut.minimum, 0, "minimum full ramp"); check(dut.maximum, 7, "maximum full ramp");
    @(negedge clk); button_n = 0; repeat(3) step();
    check(dut.minimum, 2, "window reset uses current pre-edge sample"); check(dut.maximum, 2, "both extrema reset together");
    step(); check(dut.minimum, 2, "rising sample cannot increase min"); check(dut.maximum, 3, "max grows with stream");
    repeat(5) step(); check(dut.minimum, 0, "wrap exposes new minimum"); check(dut.maximum, 7, "max survives wrap");`,
  },
  'bcd-stopwatch': {
    parameters: '.SECOND_TICKS(1)',
    body: `
    repeat(9) step(); check(dut.units, 9, "decimal units stop at nine"); check(dut.tens, 0, "no early decimal carry");
    step(); check(dut.units, 0, "nine rolls to zero"); check(dut.tens, 1, "decimal carry");
    repeat(89) step(); check(dut.units, 9, "ninety-nine units"); check(dut.tens, 9, "ninety-nine tens");
    step(); check(dut.units, 0, "ninety-nine wraps units"); check(dut.tens, 0, "ninety-nine wraps tens");`,
  },
};

test('every systems example has one independent executable behavioral contract', () => {
  assert.equal(systemExamples.length, 38);
  assert.deepEqual(
    Object.keys(contracts).sort(),
    systemExamples.map((example) => example.id).sort(),
  );
  assert.equal(new Set(systemExamples.map((example) => example.id)).size, 38);
});

for (const example of systemExamples) {
  test(`Icarus: ${example.id} behavioral contract`, async () => {
    const contract = contracts[example.id];
    const source = example.project.files.find((file) => file.name === 'top.v')!.content;
    const hasButton = /input wire button,/.test(source);
    const hasRx = /input wire uart_rx/.test(source);
    const hasTx = /output wire uart_tx/.test(source);
    const bench = `\`timescale 1ns/1ps
module tb;
    reg clk = 0;
    always #5 clk = !clk;
    reg reset_n = 0;
    reg button_n = 1;
    reg uart_rx = 1;
    wire uart_tx;
    wire [5:0] led_n;
    integer saved, saved2;
    top ${contract.parameters ? `#(${contract.parameters})` : ''} dut(.clk(clk), .reset(~reset_n), .led_n(led_n)${hasButton ? ', .button(~button_n)' : ''}${hasRx ? ', .uart_rx(uart_rx)' : ''}${hasTx ? ', .uart_tx(uart_tx)' : ''});
    task step; begin @(posedge clk); #1; end endtask
    task check(input [31:0] actual, input [31:0] expected, input [511:0] message);
      begin if (actual !== expected) begin $display("FAIL %s actual=%0d expected=%0d", message, actual, expected); $fatal(1); end end
    endtask
    task press_button; begin
      @(negedge clk); button_n = 0; repeat(4) step();
      @(negedge clk); button_n = 1; repeat(4) step();
    end endtask
    ${contract.declarations ?? ''}
    initial begin
      repeat(2) step(); @(negedge clk); reset_n = 1;
      ${contract.body}
      if (^led_n === 1'bx) $fatal(1, "LED outputs must be known after reset");
      $display("PASS ${example.id}"); $finish;
    end
    initial begin #20000; $fatal(1, "testbench timeout"); end
endmodule
`;
    const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-example-system-'));
    try {
      const sourcePath = path.join(directory, 'top.v');
      const benchPath = path.join(directory, 'tb.v');
      const binaryPath = path.join(directory, 'simulation.vvp');
      await Promise.all([
        writeFile(sourcePath, source, 'utf8'),
        writeFile(benchPath, bench, 'utf8'),
      ]);
      const args = [
        ...(library ? ['-B', library] : []),
        '-g2012',
        '-s',
        'tb',
        '-o',
        binaryPath,
        sourcePath,
        benchPath,
      ];
      await run(compiler, args, { timeout: 15_000, windowsHide: true, env: toolEnv });
      const result = await run(runtime, [binaryPath], {
        timeout: 15_000,
        windowsHide: true,
        env: toolEnv,
      });
      assert.match(result.stdout, new RegExp(`PASS ${example.id}`));
    } finally {
      // Only the exact mkdtemp directory owned by this test is removed.
      assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
      assert.match(path.basename(directory), /^yosis-example-system-/);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
