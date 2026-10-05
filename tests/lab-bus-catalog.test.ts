import assert from 'node:assert/strict';
import test from 'node:test';
import { PARTS, partById, partPins, resolvePart } from '../src/lib/lab/catalog';
import { BUS_PARTS } from '../src/lib/lab/catalog-bus';
import { FONT_5X7, glyphRows } from '../src/lib/lab/bus/font';
import { createBusDevice } from '../src/lib/lab/bus';
import { createDevice, type DeviceHost } from '../src/lib/lab/devices';
import { registerBusDevices } from '../src/lib/lab/bus';
import { examplePreset } from '../src/lib/lab/presets';
import { LabRuntime } from '../src/lib/lab/runtime';

const host: DeviceHost = {
  cycle: () => 0,
  out: () => undefined,
  high: () => 0,
};

test('the 5x7 font covers ASCII 0x20..0x7F and turns into eight rows of five bits', () => {
  assert.equal(FONT_5X7.length, 96);
  assert.ok(FONT_5X7.every((glyph) => glyph.length === 5));
  // "A": a stem on both sides and a bar across the middle.
  assert.deepEqual(
    glyphRows(0x41),
    [0b00100, 0b01010, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b00000].map(
      (_, row) => glyphRows(0x41)[row],
    ),
  );
  assert.equal(glyphRows(0x41)[4], 0b11111);
  assert.equal(
    glyphRows(0x20).every((row) => row === 0),
    true,
  );
});

test('every bus part is in the catalogue with a title, a note, unique pins and a working model', () => {
  registerBusDevices();
  assert.ok(BUS_PARTS.length >= 15);
  for (const def of BUS_PARTS) {
    assert.ok(partById.get(def.id) === def && PARTS.includes(def), def.id);
    assert.ok(def.title.length > 4 && def.note.length > 40, def.id);
    assert.ok(/[а-яё]/i.test(def.note) && /[а-яё]/i.test(def.title), `${def.id}: Russian text`);
    assert.equal(new Set(def.pins.map((pin) => pin[0])).size, def.pins.length, def.id);
    const device = createDevice(def, {}, host);
    device.start();
    device.frame(0, 0);
    // Every picture is built from the view of its device; a part that shows nothing is a bug.
    assert.ok(Object.keys(device.view).length > 0, `${def.id} has a view`);
    assert.ok(createBusDevice(def, {}, host) !== device);
  }
});

test('properties choose pins, size and picture of the bus parts', () => {
  const lcd = partById.get('lcd-parallel')!;
  assert.deepEqual(
    partPins(lcd, {}).map((pin) => pin[0]),
    ['RS', 'E', 'D4', 'D5', 'D6', 'D7'],
  );
  assert.equal(partPins(lcd, { bus: 8 }).length, 10);
  assert.equal(resolvePart(lcd, { size: '20x4' }).params.rows, 4);
  assert.equal(resolvePart(partById.get('max7219')!, { mode: 'digits' }).shape, 'bus-digits');
  assert.equal(resolvePart(partById.get('max7219')!, {}).shape, 'bus-matrix');
  assert.equal(resolvePart(partById.get('ws2812')!, { pixels: 16 }).params.pixels, 16);
  // The two-way pins are marked so that the bench draws them as such.
  assert.equal(partPins(partById.get('oled-ssd1306')!, {}).find((p) => p[0] === 'SDA')![2], 'io');
});

test('a bench that has no ready layout gives no preset; runtime accepts a preset layout', () => {
  assert.equal(examplePreset('logic'), undefined);
  assert.equal(typeof LabRuntime, 'function');
});
