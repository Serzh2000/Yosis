import test from 'node:test';
import assert from 'node:assert/strict';
import { partById } from '../src/lib/lab/catalog';
import { createDevice, sameView } from '../src/lib/lab/devices';

const host = { cycle: () => 0, out: () => {}, high: () => 0 };

test('views with equal numbers, flags and flat arrays are the same picture', () => {
  assert.equal(sameView({ b: [0, 1, 0.5], on: true }, { b: [0, 1, 0.5], on: true }), true);
  assert.equal(sameView({ b: [0, 1] }, { b: [0, 0.5] }), false);
  assert.equal(sameView({ b: [0, 1] }, { b: [0, 1, 0] }), false);
  assert.equal(sameView({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(sameView({ text: 'a' }, { text: 'b' }), false);
});

test('a buffer shared by reference may have changed in place, so it counts as a new picture', () => {
  const ram = new Uint8Array(4);
  assert.equal(sameView({ ram, rev: 1 }, { ram, rev: 1 }), false);
  const nested = [[0, 1]];
  assert.equal(sameView({ rows: nested }, { rows: nested }), false);
  assert.equal(sameView({ rows: [[0, 1]] }, { rows: [[0, 1]] }), false);
});

test('a device raises viewVersion only when its picture changes', () => {
  const led = createDevice(partById.get('led')!, {}, host);
  const first = led.viewVersion;
  led.view = { b: [0] };
  const afterChange = led.viewVersion;
  assert.equal(afterChange, first + 1);
  led.view = { b: [0] };
  assert.equal(led.viewVersion, afterChange, 'the same picture keeps the version');
  led.view = { b: [1] };
  assert.equal(led.viewVersion, afterChange + 1);
  assert.deepEqual(led.view, { b: [1] });
});

test('a lamp that stays dark is not redrawn from frame to frame', () => {
  const led = createDevice(partById.get('led')!, {}, host);
  led.frame(0, 0.016);
  const settled = led.viewVersion;
  for (let cycle = 1; cycle < 10; cycle++) led.frame(cycle * 1000, 0.016);
  assert.equal(led.viewVersion, settled);
});
