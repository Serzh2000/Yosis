import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logicExamples } from '../src/lib/examples-logic';

// Compile the actual example source and assert its external LED contract with Icarus.
// Expected vectors below use ordinary integer arithmetic or documented truth tables,
// rather than translating the source's Verilog expression into another HDL model.
const workspace = fileURLToPath(new URL('../', import.meta.url));
const portable = path.join(workspace, '.tools', 'iverilog', 'mingw64');
const bin = path.join(portable, 'bin');
const compiler =
  process.env.IVERILOG_PATH ??
  (process.platform === 'win32' ? path.join(bin, 'iverilog.exe') : 'iverilog');
const runtime =
  process.env.VVP_PATH ?? (process.platform === 'win32' ? path.join(bin, 'vvp.exe') : 'vvp');
const library =
  process.env.IVERILOG_LIB ??
  (process.platform === 'win32' ? path.join(portable, 'lib', 'ivl') : undefined);
const env = { ...process.env };
const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
env[pathKey] = `${bin}${path.delimiter}${env[pathKey] ?? ''}`;
const compilerProbe = spawnSync(compiler, [...(library ? ['-B', library] : []), '-V'], {
  env,
  encoding: 'utf8',
  windowsHide: true,
});
const available = !compilerProbe.error && compilerProbe.status === 0;
const bit = (value: boolean) => Number(value);
const signed3 = (value: number) => (value < 4 ? value : value - 8);
const popcount = (value: number) => value.toString(2).replaceAll('0', '').length;
type Contract = (sample: number, pressed: boolean) => number;

const segments = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
// Independent polynomial long division: remainder of message*x^3 by x^3+x+1.
function crc3(message: number) {
  let remainder = message * 8;
  for (let degree = 8; degree >= 3; degree--) {
    if (Math.floor(remainder / 2 ** degree) % 2) remainder ^= 0b1011 * 2 ** (degree - 3);
  }
  return remainder;
}
// Hard-coded shortened Hamming(6,3) codewords for messages 0…7.
const hamming = [0, 7, 25, 30, 42, 45, 51, 52];
function syndrome(word: number) {
  let result = 0;
  // XOR the position labels of all present bits: the parity-check matrix contract.
  for (let position = 1; position <= 6; position++)
    if (word & (1 << (position - 1))) result ^= position;
  return result;
}

const contracts: Record<string, Contract> = {
  'full-adder': (n, pressed) => {
    const a = n % 2,
      b = Math.floor(n / 2) % 2,
      c = bit(pressed);
    return (a + b + c) | (a << 2) | (b << 3) | (c << 4);
  },
  'full-subtractor': (n, pressed) => {
    const a = n % 2,
      b = Math.floor(n / 2) % 2,
      c = bit(pressed);
    return ((a - b - c + 2) % 2) | (bit(a < b + c) << 1) | (a << 2) | (b << 3) | (c << 4);
  },
  implication: (n) => {
    const a = !!(n & 1),
      b = !!(n & 2);
    return bit(!a || b) | (bit(a && !b) << 1);
  },
  'exactly-two': (n, pressed) => {
    const a = n % 2,
      b = Math.floor(n / 2) % 2,
      c = bit(pressed);
    return bit(a + b + c === 2) | (a << 1) | (b << 2) | (c << 3);
  },
  majority: (n, pressed) => {
    const a = n % 2,
      b = Math.floor(n / 2) % 2,
      c = bit(pressed);
    return bit(a + b + c >= 2) | (a << 1) | (b << 2) | (c << 3);
  },
  demorgan: (n) => (n === 3 ? 0 : 3) | (n === 0 ? 12 : 0),
  consensus: (n) => {
    const a = n % 2,
      b = Math.floor(n / 2) % 2,
      c = Math.floor(n / 4) % 2;
    return ((a ? b : c) * 3) | (a << 3) | (b << 4) | (c << 5);
  },
  'mux-four': (n) => [1, 6, 24, 32][n],
  'demux-four': (n, pressed) => ((n % 4) << 4) | (pressed ? 2 ** (n % 4) : 0),
  'signed-min-max': (n, pressed) => {
    const a = signed3(n % 8),
      b = signed3(Math.floor(n / 8));
    const chosen = pressed ? Math.max(a, b) : Math.min(a, b);
    return (chosen & 7) | (bit(a < b) << 3) | (bit(a === b) << 4) | (bit(a > b) << 5);
  },
  'carry-overflow': (n) => {
    const a = n % 8,
      b = Math.floor(n / 8),
      sum = a + b,
      signedSum = signed3(a) + signed3(b);
    return (
      (sum % 8) |
      (bit(sum >= 8) << 3) |
      (bit(signedSum < -4 || signedSum > 3) << 4) |
      ((sum & 4) << 3)
    );
  },
  'absolute-value': (n) => {
    const a = signed3(n % 8);
    return Math.abs(a) | (bit(a < 0) << 3) | (bit(a === -4) << 4);
  },
  'saturating-add': (n) => {
    const sum = (n % 8) + Math.floor(n / 8);
    return Math.min(7, sum) | (bit(sum > 7) << 3) | (bit(sum >= 8) << 4) | (bit(sum === 7) << 5);
  },
  'unsigned-average': (n) => {
    const a = n % 8,
      b = Math.floor(n / 8),
      sum = a + b;
    return Math.floor(sum / 2) | ((sum % 2) << 3) | (bit(a === b) << 4);
  },
  'shift-add-multiply': (n) => {
    const product = (n % 8) * (Math.floor(n / 8) % 4);
    return product | (bit(product !== 0) << 5);
  },
  'guarded-division': (n) => {
    const a = n % 8,
      b = Math.floor(n / 8);
    return b === 0 ? a * 8 : Math.floor(a / b) + (a % b) * 8;
  },
  'population-count': (n) => {
    const count = popcount(n);
    return count | (bit(n > 0) << 3) | (bit(count > 3) << 4) | (bit(n === 63) << 5);
  },
  'leading-zero-count': (n) => (n === 0 ? 6 : 5 - Math.floor(Math.log2(n))) | (bit(n === 0) << 3),
  'trailing-zero-count': (n) => {
    if (n === 0) return 14;
    let count = 0,
      remaining = n;
    while (remaining % 2 === 0) {
      remaining /= 2;
      count++;
    }
    return count;
  },
  'priority-encoder-six': (n) => (n === 0 ? 0 : Math.floor(Math.log2(n)) | 8),
  'binary-onehot': (n) => (n % 8 < 6 ? 2 ** (n % 8) : 0),
  'onehot-check': (n) => {
    const count = popcount(n);
    return (
      bit(count === 1) | (bit(count <= 1) << 1) | (bit(count === 0) << 2) | (bit(count > 1) << 3)
    );
  },
  'thermometer-code': (n) => 2 ** Math.min(n % 8, 6) - 1,
  'binary-bcd': (n, pressed) => {
    const value = n % 32,
      tens = Math.floor(value / 10);
    return (pressed ? tens : value % 10) | (bit(pressed) << 4) | (bit(tens > 0) << 5);
  },
  'segment-decoder': (n, pressed) => {
    const digit = n % 16,
      pattern = segments[digit] ?? 0;
    return pressed ? Math.floor(pattern / 64) | (bit(digit < 10) << 1) : pattern % 64;
  },
  'rotate-word': (n, pressed) =>
    pressed ? Math.floor(n / 2) + (n % 2) * 32 : ((n * 2) % 64) + Math.floor(n / 32),
  'barrel-shifter': (n, pressed) => {
    const data = n % 16,
      amount = Math.floor(n / 16);
    return pressed ? Math.floor(data / 2 ** amount) : (data * 2 ** amount) % 64;
  },
  'prefix-parity': (n) => {
    let result = 0;
    for (let width = 1; width <= 6; width++)
      result += (popcount(n % 2 ** width) % 2) * 2 ** (width - 1);
    return result;
  },
  'reverse-bits': (n) =>
    Number.parseInt(n.toString(2).padStart(6, '0').split('').reverse().join(''), 2),
  'bit-spread': (n) => (n % 2) + (Math.floor(n / 2) % 2) * 4 + (Math.floor(n / 4) % 2) * 16,
  'small-rom': (n) => [9, 18, 36, 15, 60, 21, 42, 63][n % 8],
  'crc-three': (n) => crc3(n) | (bit(crc3(n) !== 0) << 3),
  'hamming-encode': (n) => hamming[n % 8],
  'hamming-syndrome': (n) => {
    const position = syndrome(n);
    return (
      position |
      (bit(position === 0) << 3) |
      (bit(position >= 1 && position <= 6) << 4) |
      (bit(position === 7) << 5)
    );
  },
  'signed-compare': (n) => {
    const a = n % 8,
      b = Math.floor(n / 8),
      sa = signed3(a),
      sb = signed3(b);
    return (
      bit(a < b) |
      (bit(sa < sb) << 1) |
      (bit(a < b !== sa < sb) << 2) |
      (bit(a === b) << 3) |
      (bit(sa < 0) << 4) |
      (bit(sb < 0) << 5)
    );
  },
  'range-check': (n) => {
    const value = n % 8;
    return (
      bit(value >= 2 && value <= 5) |
      (bit(value > 2 && value < 5) << 1) |
      (bit(value === 2 || value === 5) << 2) |
      (bit(value < 2) << 3) |
      (bit(value > 5) << 4)
    );
  },
  'bit-mask': (n, pressed) => {
    const word = n % 8,
      mask = Math.floor(n / 8);
    return (pressed ? word & (7 - mask) : word | mask) + (word ^ mask) * 8;
  },
  'lookup-square': (n) => (n % 8) ** 2,
};

test('the 38 logic examples have unique IDs and independent behavioural contracts', () => {
  assert.equal(logicExamples.length, 38);
  assert.equal(new Set(logicExamples.map((example) => example.id)).size, 38);
  assert.deepEqual(
    logicExamples.map((example) => example.id).sort(),
    Object.keys(contracts).sort(),
  );
  assert.equal(crc3(1), 3, 'CRC published example vector 000001 → 011');
  for (const codeword of hamming)
    assert.equal(syndrome(codeword), 0, 'all documented Hamming words satisfy parity');
  for (let position = 1; position <= 6; position++)
    assert.equal(syndrome(1 << (position - 1)), position);
});

function run(executable: string, args: string[], cwd: string) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${executable}: ${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

for (const example of logicExamples) {
  test(
    `Icarus: ${example.id} external outputs, reset, full input domain and both button modes`,
    {
      skip: available
        ? false
        : 'Install Icarus Verilog or set IVERILOG_PATH/VVP_PATH to run hardware contracts.',
    },
    async () => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'yosis-logic-contract-'));
      try {
        const source = example.project.files.find((file) => file.name === 'top.v')!.content;
        const sequential = /input wire clk/.test(source),
          withButton = /input wire button,/.test(source);
        let checks = '';
        if (sequential) {
          checks += 'reset_n=0; clk=0; #1; clk=1; #1; clk=0; #1; reset_n=1;\n';
          for (let sample = 0; sample < 64; sample++) {
            for (const pressed of withButton ? [false, true] : [false]) {
              const expected = 63 ^ contracts[example.id](sample, pressed);
              if (withButton) checks += `button_n=${pressed ? "1'b0" : "1'b1"}; `;
              checks += `#1; if (led_n !== 6'd${expected}) $fatal(1,"${example.id} sample ${sample}, pressed=${pressed}: got %d expected ${expected}",led_n);\n`;
            }
            checks += 'clk=1; #1; clk=0; #1;\n';
          }
          // The internal source wraps to zero after all64 words and reset can be re-applied.
          checks += `reset_n=0; #1; clk=1; #1; clk=0; ${withButton ? "button_n=1'b1;" : ''} #1;
if (led_n !== 6'd${63 ^ contracts[example.id](0, false)}) $fatal(1,"second reset did not restore the initial output");\n`;
        } else {
          for (let inputs = 0; inputs < 4; inputs++) {
            const expected = 63 ^ contracts[example.id](inputs, false);
            checks += `a_n=1'b${1 - (inputs % 2)}; b_n=1'b${1 - Math.floor(inputs / 2)}; #1;
if (led_n !== 6'd${expected}) $fatal(1,"${example.id} input ${inputs}: got %d expected ${expected}",led_n);\n`;
          }
        }
        const bench = `module tb;
${sequential ? `reg clk=0,reset_n=0; ${withButton ? 'reg button_n=1;' : ''}` : 'reg a_n=1,b_n=1;'}
wire [5:0] led_n;
top ${sequential ? '#(.STEP_TICKS(1)) ' : ''}dut(${sequential ? `.clk(clk),.reset(~reset_n),${withButton ? '.button(~button_n),' : ''}` : '.button_a(~a_n),.button_b(~b_n),'} .led_n(led_n));
initial begin
${checks}
$display("PASS ${example.id}"); $finish;
end
endmodule\n`;
        const top = path.join(directory, 'top.v'),
          tb = path.join(directory, 'tb.v'),
          output = path.join(directory, 'check.vvp');
        await writeFile(top, source);
        await writeFile(tb, bench);
        run(
          compiler,
          [...(library ? ['-B', library] : []), '-g2012', '-s', 'tb', '-o', output, top, tb],
          directory,
        );
        assert.ok(existsSync(output));
        assert.match(run(runtime, [output], directory), new RegExp(`PASS ${example.id}`));
      } finally {
        // This directory is a newly-created test folder under the OS temp directory.
        assert.equal(path.dirname(directory), os.tmpdir());
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
}
