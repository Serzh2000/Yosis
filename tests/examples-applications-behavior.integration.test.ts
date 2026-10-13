import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationExamples } from '../src/lib/examples-applications';

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
  id: string;
  name: string;
  parameters?: string;
  declarations?: string;
  body: string;
}

// Expected impulses, density counts and CPU output sequences are independent
// observable contracts. The stream uses a software queue as an ordering oracle.
const contracts: Contract[] = [
  {
    id: 'moving-average',
    name: 'impulse spreads over exactly four samples and reset empties history',
    parameters: '.SAMPLE_TICKS(1)',
    body: `
      check(dut.average, 0, "zero padding after reset");
      repeat(4) begin step(); check(dut.average, 8, "four samples own one quarter of impulse"); end
      repeat(4) begin step(); check(dut.average, 0, "impulse has left entire window"); end
      step(); check(dut.average, 8, "next independent impulse");
      @(negedge clk); reset_n = 0; step(); check(dut.average, 0, "reset clears output");
      check(dut.delay1 | dut.delay2 | dut.delay3, 0, "reset clears history");`,
  },
  {
    id: 'moving-average',
    name: 'sample enable holds result and history between events',
    parameters: '.SAMPLE_TICKS(3)',
    body: `
      repeat(2) step(); check(dut.average, 0, "not sampled early");
      step(); check(dut.average, 8, "sample at exact third edge");
      repeat(2) step(); check(dut.delay1, 32, "history holds between enables");
      step(); check(dut.delay1, 0, "next sample consumes trailing zero");
      repeat(8) step(); check(dut.average, 8, "fourth impulse-bearing sample remains");
      step(); check(dut.average, 0, "fifth sample ends impulse");`,
  },
  {
    id: 'fir-filter',
    name: 'normalized 1 2 1 impulse response and reset',
    parameters: '.SAMPLE_TICKS(1)',
    body: `
      step(); check(dut.filtered, 8, "first coefficient one quarter");
      step(); check(dut.filtered, 16, "second coefficient one half");
      step(); check(dut.filtered, 8, "third coefficient one quarter");
      repeat(5) begin step(); check(dut.filtered, 0, "finite impulse tail exactly three samples"); end
      step(); check(dut.filtered, 8, "response repeats after eight samples");
      @(negedge clk); reset_n = 0; step(); check(dut.filtered, 0, "reset clears signed output");`,
  },
  {
    id: 'fir-filter',
    name: 'negative coefficients preserve sign and arithmetic scale',
    parameters:
      ".SAMPLE_TICKS(1), .COEFF_A(8'sd1), .COEFF_B(8'sd0), .COEFF_C(-8'sd1), .SCALE_SHIFT(0)",
    body: `
      step(); check($signed(dut.filtered), 32, "current sample positive");
      step(); check($signed(dut.filtered), 0, "middle coefficient zero");
      step(); check($signed(dut.filtered), -32, "delayed sample negative");
      check(led_n, 31, "LED retains documented lower-bit two's complement representation");
      step(); check($signed(dut.filtered), 0, "signed tail clears");`,
  },
  {
    id: 'fir-filter',
    name: 'minimum signed coefficient extends before accumulation',
    parameters:
      ".SAMPLE_TICKS(1), .COEFF_A(-8'sd128), .COEFF_B(8'sd127), .COEFF_C(-8'sd128), .SCALE_SHIFT(2)",
    body: `
      step(); check($signed(dut.filtered), -1024, "minus 128 times 32 with arithmetic divide");
      step(); check($signed(dut.filtered), 1016, "plus 127 times 32 with correct width");
      step(); check($signed(dut.filtered), -1024, "delayed minimum signed coefficient");
      step(); check($signed(dut.filtered), 0, "large signed response clears");`,
  },
  {
    id: 'raster-scan',
    name: 'frame has 32 visible pixels and exact sync widths across wraps',
    declarations: 'integer i, visible_count, horizontal_sync_count, vertical_sync_count;',
    body: `
      visible_count = 0; horizontal_sync_count = 0; vertical_sync_count = 0;
      for (i=0; i<98; i=i+1) begin
        if (dut.active_video) visible_count = visible_count + 1;
        if (!dut.hsync_n) horizontal_sync_count = horizontal_sync_count + 1;
        if (!dut.vsync_n) vertical_sync_count = vertical_sync_count + 1;
        check(dut.active_video, ((i%14)<8) && ((i/14)<4), "active area bounds");
        check(dut.hsync_n, !((i%14)==10 || (i%14)==11), "two clocks of horizontal sync");
        check(dut.vsync_n, !((i/14)==5), "one whole line of vertical sync");
        step();
      end
      check(visible_count, 32, "eight by four active pixels");
      check(horizontal_sync_count, 14, "two sync clocks in each of seven lines");
      check(vertical_sync_count, 14, "one sync line per frame");
      check(dut.horizontal, 0, "horizontal wraps with frame"); check(dut.vertical, 0, "vertical wraps after last blank line");
      repeat(17) step(); @(negedge clk); reset_n = 0; step();
      check(dut.horizontal | dut.vertical, 0, "reset restarts first visible pixel");`,
  },
  {
    id: 'dds-tone',
    name: 'quarter-cycle word yields digital square wave with exact period',
    parameters: ".FREQUENCY_WORD(16'd16384)",
    body: `
      check(dut.digital_tone, 0, "initial low half period");
      step(); check(dut.phase, 16384, "quarter phase"); check(dut.digital_tone, 0, "first quarter low");
      step(); check(dut.phase, 32768, "half phase"); check(dut.digital_tone, 1, "half phase high");
      step(); check(dut.phase, 49152, "third quarter"); check(dut.digital_tone, 1, "third quarter high");
      step(); check(dut.phase, 0, "full phase wraps"); check(dut.digital_tone, 0, "new period low");`,
  },
  {
    id: 'dds-tone',
    name: 'non-dividing phase step wraps without saturating and reset clears',
    parameters: ".FREQUENCY_WORD(16'd30000)",
    body: `
      step(); check(dut.phase, 30000, "phase sample one"); step(); check(dut.phase, 60000, "phase sample two");
      step(); check(dut.phase, 24464, "overflow wraps modulo 65536");
      step(); check(dut.phase, 54464, "phase advances after wrap"); step(); check(dut.phase, 18928, "second overflow wraps");
      @(negedge clk); reset_n = 0; step(); check(dut.phase, 0, "reset phase independent of current tone");`,
  },
  {
    id: 'dds-tone',
    name: 'zero frequency word remains silent',
    parameters: ".FREQUENCY_WORD(16'd0)",
    body: `
      repeat(64) step(); check(dut.phase, 0, "zero step holds phase"); check(led_n, 63, "all teaching LED bits off");`,
  },
  {
    id: 'sigma-delta',
    name: '25 percent and 75 percent densities conserve remainder',
    declarations: 'integer i, ones, saved_remainder;',
    body: `
      ones=0; repeat(64) begin step(); if (dut.pulse) ones=ones+1; end
      check(ones, 16, "sixteen pulses per sixty-four clocks"); check(dut.remainder, 0, "exact period consumes remainder");
      @(negedge clk); button_n=0; repeat(2) step(); check(dut.level, 48, "button selects high density after synchronizer");
      saved_remainder=dut.remainder; ones=0;
      repeat(64) begin step(); if (dut.pulse) ones=ones+1; end
      check(ones, 48, "forty-eight pulses per sixty-four clocks");
      check(dut.remainder, saved_remainder, "density period preserves initial residual");`,
  },
  {
    id: 'sigma-delta',
    name: 'minimum level silent and maximum is 63 of 64',
    parameters: ".RELEASED_LEVEL(6'd0), .PRESSED_LEVEL(6'd63)",
    declarations: 'integer ones;',
    body: `
      repeat(64) begin step(); check(dut.pulse, 0, "zero level never pulses"); end
      @(negedge clk); button_n=0; repeat(2) step(); ones=0;
      repeat(64) begin step(); if (dut.pulse) ones=ones+1; end
      check(ones, 63, "maximum code still includes one zero per sixty-four");
      @(negedge clk); reset_n=0; step(); check(dut.remainder, 0, "reset residual"); check(dut.pulse, 0, "reset digital output");`,
  },
  {
    id: 'tiny-cpu',
    name: 'ROM countdown branches three times and halts after 24 clocks',
    body: `
      step(); check(dut.accumulator, 0, "fetch has no arithmetic effect");
      step(); check(dut.accumulator, 3, "execute LDI");
      repeat(2) step(); check(dut.output_value, 3, "first OUT");
      repeat(2) step(); check(dut.accumulator, 2, "modular ADD subtracts one");
      repeat(2) step(); check(dut.pc, 1, "nonzero conditional jump returns to OUT");
      repeat(2) step(); check(dut.output_value, 2, "second OUT preserves order");
      repeat(6) step(); check(dut.output_value, 1, "third OUT after second conditional branch");
      repeat(2) step(); check(dut.accumulator, 0, "countdown reaches exact zero");
      repeat(2) step(); check(dut.pc, 4, "zero falls through branch");
      repeat(2) step(); check(dut.output_value, 0, "final OUT clears LED");
      repeat(2) step(); check(dut.halted, 1, "HLT completes on clock 24"); check(dut.pc, 5, "halt retains instruction address");
      repeat(10) step(); check(dut.pc, 5, "halt prevents further fetch"); check(dut.output_value, 0, "halt holds output");
      @(negedge clk); reset_n=0; step(); check(dut.halted, 0, "reset releases halt"); check(dut.pc, 0, "reset restarts ROM");`,
  },
  {
    id: 'stream-skid',
    name: 'scoreboard verifies backpressure, stable stalled words and simultaneous replacement',
    declarations: `
      integer queue[0:127];
      integer written=0, read_count=0, expected_next=0, simultaneous=0, stalls=0;
      integer previous_stalled=0, held_payload=0, saved_reads;
      reg accepted_output, accepted_input;
      task checked_step;
        begin
          @(posedge clk);
          if (previous_stalled) begin
            check(dut.output_valid, 1, "valid cannot disappear before acceptance");
            check(dut.payload, held_payload, "data stable under backpressure");
          end
          accepted_output=dut.output_valid && dut.output_ready;
          accepted_input=dut.input_valid && dut.input_ready;
          if (accepted_output) begin
            check(written>read_count, 1, "consumer cannot invent a word");
            check(dut.payload, queue[read_count], "FIFO ordering matches independent queue");
            read_count=read_count+1;
          end
          if (accepted_input) begin
            check(dut.source_data, expected_next, "producer does not skip blocked word");
            queue[written]=dut.source_data; written=written+1; expected_next=(expected_next+1)%64;
          end
          if (accepted_input && accepted_output) simultaneous=simultaneous+1;
          check((written-read_count)<=1, 1, "one-word capacity never exceeded");
          previous_stalled=dut.output_valid && !dut.output_ready;
          held_payload=dut.payload;
          if (previous_stalled) stalls=stalls+1;
          #1;
          check(dut.received_count, read_count%64, "one counter event per accepted word including modulo wrap");
          if (accepted_output) check(dut.last_received, queue[read_count-1], "received register has previous buffered word");
        end
      endtask`,
    body: `
      repeat(10) checked_step();
      @(negedge clk); button_n=0; repeat(3) checked_step();
      saved_reads=read_count; repeat(8) checked_step(); check(read_count, saved_reads, "held press stops all consumption");
      @(negedge clk); button_n=1; repeat(14) checked_step();
      check(read_count>saved_reads, 1, "release resumes consumption");
      check(simultaneous>5, 1, "buffer replaces consumed words without empty bubbles");
      check(stalls>=8, 1, "test exercises sustained backpressure");
      repeat(96) checked_step(); check(read_count>64, 1, "scoreboard covers word and debug counter wrapping");
      @(negedge clk); reset_n=0; step(); check(dut.output_valid, 0, "reset flushes queued word");
      check(dut.received_count, 0, "reset clears debug counts");`,
  },
  {
    id: 'protocol-checker',
    name: 'legal source passes; data mutation sets sticky fault and reset clears',
    body: `
      repeat(16) begin step(); check(dut.fault, 0, "legal valid-data sequence never faults"); end
      check(dut.source_data, 4, "four accepted source updates in sixteen clocks");
      @(negedge clk); button_n=0; repeat(7) step(); check(dut.fault, 1, "early payload mutation detected");
      @(negedge clk); button_n=1; repeat(10) step(); check(dut.fault, 1, "repair does not clear evidence");
      @(negedge clk); reset_n=0; step(); check(dut.fault, 0, "explicit reset clears error latch");`,
  },
  {
    id: 'protocol-checker',
    name: 'valid disappearing while stalled is also a violation',
    parameters: '.FAULT_MODE(1)',
    body: `
      repeat(8) begin step(); check(dut.fault, 0, "legal second fault mode passes"); end
      @(negedge clk); button_n=0; repeat(7) step(); check(dut.fault, 1, "withdrawn valid detected even without payload mutation");
      @(negedge clk); button_n=1; repeat(8) step(); check(dut.fault, 1, "valid restoration keeps latched error");`,
  },
];

test('each new application has at least one independent Icarus contract', () => {
  assert.equal(applicationExamples.length, 8);
  assert.deepEqual(
    [...new Set(contracts.map((contract) => contract.id))].sort(),
    applicationExamples.map((example) => example.id).sort(),
  );
});

for (const contract of contracts) {
  test(`Icarus: ${contract.id}: ${contract.name}`, async () => {
    const example = applicationExamples.find((item) => item.id === contract.id)!;
    const source = example.project.files.find((file) => file.name === 'top.v')!.content;
    const hasButton = /input wire button,/.test(source);
    const bench = `\`timescale 1ns/1ps
module tb;
  reg clk=0;
  always #5 clk=!clk;
  reg reset_n=0, button_n=1;
  wire [5:0] led_n;
  top ${contract.parameters ? `#(${contract.parameters})` : ''} dut(.clk(clk), .reset(~reset_n), .led_n(led_n)${hasButton ? ', .button(~button_n)' : ''});
  task step; begin @(posedge clk); #1; end endtask
  task check(input [31:0] actual, input [31:0] expected, input [511:0] message);
    begin if (actual !== expected) begin $display("FAIL %s actual=%0d expected=%0d", message, actual, expected); $fatal(1); end end
  endtask
  ${contract.declarations ?? ''}
  initial begin
    repeat(2) step(); @(negedge clk); reset_n=1;
    ${contract.body}
    if (^led_n === 1'bx) $fatal(1, "LED outputs must be known after reset");
    $display("PASS ${contract.id}"); $finish;
  end
  initial begin #20000; $fatal(1, "testbench timeout"); end
endmodule
`;
    const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-example-application-'));
    try {
      const sourcePath = path.join(directory, 'top.v');
      const benchPath = path.join(directory, 'tb.v');
      const binaryPath = path.join(directory, 'simulation.vvp');
      await Promise.all([
        writeFile(sourcePath, source, 'utf8'),
        writeFile(benchPath, bench, 'utf8'),
      ]);
      await run(
        compiler,
        [
          ...(library ? ['-B', library] : []),
          '-g2012',
          '-s',
          'tb',
          '-o',
          binaryPath,
          sourcePath,
          benchPath,
        ],
        { timeout: 15_000, windowsHide: true, env: toolEnv },
      );
      const result = await run(runtime, [binaryPath], {
        timeout: 15_000,
        windowsHide: true,
        env: toolEnv,
      });
      assert.match(result.stdout, new RegExp(`PASS ${contract.id}`));
    } finally {
      assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
      assert.match(path.basename(directory), /^yosis-example-application-/);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
