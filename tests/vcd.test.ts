import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVcd, VCD_LIMITS } from '../src/lib/vcd';

function header(vars = '$var wire 1 ! clk $end', timescale = '1 ns') {
  return `$date October 1, 2026 $end\n$version test $end\n${timescale ? `$timescale ${timescale} $end` : ''}\n$scope module top $end\n${vars}\n$upscope $end\n$enddefinitions $end\n`;
}

test('real Icarus counter fixture shows reset on two clock edges and six subsequent increments', () => {
  const text = readFileSync(new URL('./fixtures/counter.vcd', import.meta.url), 'utf8');
  const trace = parseVcd(text);
  assert.equal(trace.timescaleFs, 1000); // Icarus emits 1 ps ticks for a 1 ns / 1 ps testbench.
  assert.equal(trace.startTime, 0);
  assert.equal(trace.endTime, 80_000);
  const counter = trace.signals.find(
    (signal) => signal.scope.join('.') === 'tb' && signal.name === 'count[7:0]',
  )!;
  assert.deepEqual(counter.changes, [
    { time: 0, value: 'xxxxxxxx' },
    { time: 5000, value: '00000000' },
    ...Array.from({ length: 6 }, (_, index) => ({
      time: 25_000 + index * 10_000,
      value: (index + 1).toString(2).padStart(8, '0'),
    })),
  ]);
  const clock = trace.signals.find((signal) => signal.name === 'clk' && signal.scope.length === 1)!;
  const dutClock = trace.signals.find(
    (signal) => signal.name === 'clk' && signal.scope.length === 2,
  )!;
  assert.strictEqual(clock.changes, dutClock.changes);
  assert.equal(clock.changes.length, 17);
  assert.deepEqual(clock.changes.slice(0, 5), [
    { time: 0, value: '0' },
    { time: 5000, value: '1' },
    { time: 10_000, value: '0' },
    { time: 15_000, value: '1' },
    { time: 20_000, value: '0' },
  ]);
  const reset = trace.signals.find(
    (signal) => signal.name === 'reset' && signal.scope.length === 1,
  )!;
  assert.deepEqual(reset.changes, [
    { time: 0, value: '1' },
    { time: 20_000, value: '0' },
  ]);
  assert.deepEqual(trace.warnings, []);
});

test('clock and counter retain native ticks, compact binary changes and final timestamp', () => {
  const trace = parseVcd(
    header('$var wire 1 ! clk $end\n$var reg 4 " count [3:0] $end') +
      `
#0
$dumpvars
0!
b0000 "
$end
#5 1!
#10 0! b1 "
#15 1!
#20 0! b10 "
#25
`,
  );
  assert.equal(trace.timescaleFs, 1_000_000);
  assert.equal(trace.startTime, 0);
  assert.equal(trace.endTime, 25);
  assert.equal(trace.signals[1].name, 'count[3:0]');
  assert.deepEqual(trace.signals[1].scope, ['top']);
  assert.deepEqual(trace.signals[1].changes, [
    { time: 0, value: '0000' },
    { time: 10, value: '0001' },
    { time: 20, value: '0010' },
  ]);
  assert.deepEqual(
    trace.signals[0].changes.map((change) => [change.time, change.value]),
    [
      [0, '0'],
      [5, '1'],
      [10, '0'],
      [15, '1'],
      [20, '0'],
    ],
  );
  assert.deepEqual(trace.warnings, []);
});

test('aliases in nested scopes share the actual change array and preserve names', () => {
  const trace = parseVcd(
    header(`$var wire 4 # bus [3:0] $end
$scope module child $end
$var wire 4 # data [3:0] $end
$upscope $end`) + '#0 b1 #\n#3 b1010 #',
  );
  assert.equal(trace.signals.length, 2);
  assert.equal(trace.signals[0].id, trace.signals[1].id);
  assert.strictEqual(trace.signals[0].changes, trace.signals[1].changes);
  assert.deepEqual(trace.signals[1].scope, ['top', 'child']);
  assert.deepEqual(trace.signals[1].changes, [
    { time: 0, value: '0001' },
    { time: 3, value: '1010' },
  ]);
});

test('vectors normalize width and distinguish unknown X from high impedance Z', () => {
  const trace = parseVcd(
    header('$var wire 4 ! data $end') + '#0 bX !\n#1 bZ1 !\n#2 b10xz !\n#3 b1 !\n#4 b10101 !',
  );
  assert.deepEqual(
    trace.signals[0].changes.map((change) => change.value),
    ['xxxx', 'zzz1', '10xz', '0001', '0101'],
  );
  assert.equal(trace.warnings.length, 1);
  assert.match(trace.warnings[0], /младшие 4 бит/);
});

test('dumpvars, dumpoff and dumpon values are recorded at their timestamps; comments are ignored', () => {
  const trace = parseVcd(
    header('$var wire 4 ! data $end') +
      `
#10 $dumpvars b1 ! $end
$comment The words 1unknown and #999 here do not change the waveform $end
#20 $dumpoff bx ! $end
#30 $dumpon b10 ! $end
#40 $dumpall b10 ! $end
`,
  );
  assert.equal(trace.startTime, 10);
  assert.equal(trace.endTime, 40);
  assert.deepEqual(trace.signals[0].changes, [
    { time: 10, value: '0001' },
    { time: 20, value: 'xxxx' },
    { time: 30, value: '0010' },
  ]);
  assert.deepEqual(trace.warnings, []);
});

test('same-timestamp updates keep the last value and remove zero-duration glitches', () => {
  const trace = parseVcd(header() + '#0 0! 1!\n#1 0! 1!\n#2 0! 0!\n#3 0!');
  assert.deepEqual(trace.signals[0].changes, [
    { time: 0, value: '1' },
    { time: 2, value: '0' },
  ]);
  assert.equal(trace.endTime, 3);
});

test('timescale supports joined/spaced units, factors and missing-scale warning', () => {
  for (const [scale, expected] of [
    ['1fs', 1],
    ['10 ps', 10_000],
    ['100ps', 100_000],
    ['1 ns', 1_000_000],
    ['10 us', 10_000_000_000],
    ['1 ms', 1_000_000_000_000],
    ['1 s', 1_000_000_000_000_000],
  ] as const) {
    assert.equal(parseVcd(header(undefined, scale) + '#0 0!').timescaleFs, expected);
  }
  const missing = parseVcd(header(undefined, '') + '#0 0!');
  assert.equal(missing.timescaleFs, 1_000_000);
  assert.match(missing.warnings[0], /нет \$timescale/);
});

test('unsupported real/string signals and undeclared ids produce bounded warnings', () => {
  const trace = parseVcd(
    header('$var real 1 R voltage $end\n$var wire 1 ! clk $end') +
      '#0 r1.25 R 0!\n#1 1missing\n#2 0missing',
  );
  assert.equal(trace.signals.length, 1);
  assert.equal(trace.signals[0].name, 'clk');
  assert.equal(trace.warnings.length, 2);
  assert.match(trace.warnings[0], /типа real/);
  assert.match(trace.warnings[1], /необъявленного сигнала/);
  const many = parseVcd(
    header() + '#0 0! ' + Array.from({ length: 100 }, (_, index) => `0unknown${index}`).join(' '),
  );
  assert.equal(many.warnings.length, 51);
  assert.match(many.warnings.at(-1)!, /опущены/);
});

test('malformed data, alias widths and unsafe/decreasing timestamps fail with readable errors', () => {
  assert.throws(() => parseVcd(''), /VCD пуст/);
  assert.throws(() => parseVcd('$scope module top $end'), /\$enddefinitions/);
  assert.throws(() => parseVcd(header(undefined, '0 ns')), /масштаб времени/i);
  assert.throws(() => parseVcd(header() + '#5 0! #4 1!'), /по возрастанию/);
  assert.throws(() => parseVcd(header() + '#9007199254740992 0!'), /точных целых/);
  assert.throws(() => parseVcd(header() + '#0 b2 !'), /двоичное значение/);
  assert.throws(() => parseVcd(header() + '#0 b10'), /идентификатор/);
  assert.throws(() => parseVcd(header() + '#0 $dumpvars 0!'), /не завершена команда \$dumpvars/);
  assert.throws(
    () => parseVcd(header('$var wire 1 ! first $end\n$var wire 2 ! second $end') + '#0 0!'),
    /разную разрядность/,
  );
});

test('oversized signals, files and declaration counts are rejected before allocation', () => {
  assert.throws(() => parseVcd(header('$var wire 4097 ! huge $end')), /от 1 до 4096/);
  assert.throws(() => parseVcd(' '.repeat(VCD_LIMITS.textChars + 1) + 'x'), /слишком большой/);
  const vars = Array.from(
    { length: VCD_LIMITS.signals + 1 },
    (_, index) => `$var wire 1 n${index} s${index} $end`,
  ).join('\n');
  assert.throws(() => parseVcd(header(vars)), /лимит 4096 объявлений/);
});

test('escaped references, scalar aliases, empty signals and UTF-8 BOM remain valid', () => {
  const trace = parseVcd(
    '\ufeff' +
      header(
        '$var wire 1 A \\escaped.signal $end\n$var wire 1 A alias $end\n$var wire 2 B idle [1:0] $end',
      ) +
      '#0 XA\n#5 zA',
  );
  assert.equal(trace.signals[0].name, '\\escaped.signal');
  assert.strictEqual(trace.signals[0].changes, trace.signals[1].changes);
  assert.deepEqual(trace.signals[0].changes, [
    { time: 0, value: 'x' },
    { time: 5, value: 'z' },
  ]);
  assert.deepEqual(trace.signals[2].changes, []);
});
