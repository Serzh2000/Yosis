import test from 'node:test';
import assert from 'node:assert/strict';
import type { VcdSignal, VcdTrace } from '../src/lib/vcd';
import {
  clampWindow,
  formatWaveTime,
  formatWaveValue,
  initialWindow,
  panWindow,
  timeTicks,
  valueAt,
  visibleSegments,
  zoomWindow,
} from '../src/lib/waveform';

const signal: VcdSignal = {
  id: '!',
  name: 'count',
  width: 4,
  scope: ['tb', 'dut'],
  changes: [
    { time: 5, value: '0000' },
    { time: 10, value: '0010' },
    { time: 10, value: '0011' },
    { time: 20, value: '0111' },
  ],
};

test('cursor values use the last assignment at a timestamp and do not borrow a future value', () => {
  assert.equal(valueAt(signal, 0), 'xxxx');
  assert.equal(valueAt(signal, 5), '0000');
  assert.equal(valueAt(signal, 9.99), '0000');
  assert.equal(valueAt(signal, 10), '0011');
  assert.equal(valueAt(signal, 100), '0111');
});

test('clipped waveform begins with the value inherited from outside the visible window', () => {
  assert.deepEqual(visibleSegments(signal, { start: 12, end: 25 }).segments, [
    { start: 12, end: 20, value: '0011' },
    { start: 20, end: 25, value: '0111' },
  ]);
  assert.deepEqual(visibleSegments(signal, { start: 0, end: 10 }).segments, [
    { start: 0, end: 5, value: 'xxxx' },
    { start: 5, end: 10, value: '0000' },
  ]);
});

test('dense transitions report a rendering limit rather than displaying a sampled waveform', () => {
  const limited = visibleSegments(signal, { start: 0, end: 25 }, 2);
  assert.equal(limited.truncated, true);
  assert.deepEqual(limited.segments, []);
});

test('wide buses retain integer precision and unknown values across radix changes', () => {
  assert.equal(formatWaveValue('1'.repeat(64), 64, 'dec'), '18446744073709551615');
  assert.equal(formatWaveValue('00000001', 8, 'hex'), '0x01');
  assert.equal(formatWaveValue('xxxx0001', 8, 'hex'), '0xX1');
  assert.equal(formatWaveValue('zzzz0001', 8, 'dec'), 'Z');
  assert.equal(formatWaveValue('x0z1', 4, 'bin'), '0bX0Z1');
  assert.equal(formatWaveValue('x', 1, 'hex'), 'X');
});

test('zoom preserves the position of the cursor until a domain boundary constrains it', () => {
  assert.deepEqual(zoomWindow({ start: 0, end: 100 }, { start: 0, end: 100 }, 0.5, 25), {
    start: 12.5,
    end: 62.5,
  });
  assert.deepEqual(clampWindow({ start: 95, end: 115 }, { start: 0, end: 100 }), {
    start: 80,
    end: 100,
  });
  assert.deepEqual(zoomWindow({ start: 12.5, end: 62.5 }, { start: 0, end: 100 }, 10, 25), {
    start: 0,
    end: 100,
  });
});

test('first view shows up to 32 clock periods and formats the declared VCD tick scale', () => {
  const trace: VcdTrace = {
    timescaleFs: 1e3,
    startTime: 0,
    endTime: 10000,
    warnings: [],
    signals: [
      {
        id: '#',
        name: 'clk',
        width: 1,
        scope: [],
        changes: [
          { time: 0, value: '0' },
          { time: 5, value: '1' },
          { time: 15, value: '1' },
        ],
      },
    ],
  };
  assert.deepEqual(initialWindow(trace), { start: 0, end: 320 });
  assert.equal(formatWaveTime(1000, 1e3, 10000), '1 нс');
});

test('panning keeps the original zoom at both edges and when returning from an edge', () => {
  const domain = { start: 5, end: 1005 };
  const original = { start: 100, end: 300 };
  assert.deepEqual(panWindow(original, domain, -100), { start: 5, end: 205 });
  assert.deepEqual(panWindow(original, domain, 1200), { start: 805, end: 1005 });
  assert.deepEqual(panWindow(original, domain, 123.5), { start: 123.5, end: 323.5 });
});

test('fractional pan rounding does not change the ruler step at a 1/2/5 boundary', () => {
  const spacing = (start: number, span: number) => {
    const ticks = timeTicks({ start, end: start + span }, 1100);
    assert.ok(ticks.length > 2);
    return ticks[1] - ticks[0];
  };
  for (const span of [100, 200, 500]) {
    assert.equal(spacing(0, span), span / 10);
    assert.equal(spacing(3.14, span + 1e-10), span / 10);
  }
  assert.equal(spacing(3.14, 201), 50, 'A real zoom change still selects the next readable step');
});
