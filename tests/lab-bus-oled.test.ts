import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ssd1306 } from '../src/lib/lab/bus/ssd1306';
import { bench, i2cScript, loc, type Op } from './lab-bus-helper';

const CST = loc({ clk: 4, sda: 75, scl: 80 });
const WIRES = { SDA: 75, SCL: 80 };
const command = (...bytes: number[]): Op[] => [
  { start: true },
  { write: 0x78 },
  { write: 0x00 },
  ...bytes.map((write) => ({ write })),
  { stop: true },
];
const data = (...bytes: number[]): Op[] => [
  { start: true },
  { write: 0x78 },
  { write: 0x40 },
  ...bytes.map((write) => ({ write })),
  { stop: true },
];

test('SSD1306 takes commands and data over I2C and fills its memory by the addressing mode', async () => {
  const lab = await bench(
    i2cScript([
      ...command(0xae, 0x8d, 0x14, 0xa1, 0xc8),
      // Page mode: page 3, column 0x15.
      ...command(0x20, 0x02, 0xb3, 0x05, 0x11),
      ...data(0xff, 0x0f, 0xaa),
      // Horizontal mode over columns 0..3 and pages 0..1; ten bytes wrap around.
      ...command(0x20, 0x00, 0x21, 0, 3, 0x22, 0, 1),
      ...data(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
      // A control byte with Co set carries one byte at a time.
      { start: true },
      { write: 0x78 },
      { write: 0x80 },
      { write: 0xaf },
      { stop: true },
      // Wrong address: nobody answers.
      { start: true },
      { write: 0x7a },
      { stop: true },
    ]),
    CST,
    [{ id: 'oled-ssd1306', wires: WIRES }],
  );
  const oled = lab.devices[0] as Ssd1306;
  assert.equal(oled.pixel(0, 0), false, 'the panel starts off');
  lab.runUntil('done', 3_000_000);
  const at = (page: number, column: number) => oled.ram[page * 128 + column];
  assert.deepEqual([at(3, 21), at(3, 22), at(3, 23)], [0xff, 0x0f, 0xaa]);
  // Ten bytes into a 4x2 window: 1..4 on page 0, 5..8 on page 1, then 9 and 10 over page 0 again.
  assert.deepEqual(
    [0, 1, 2, 3].map((c) => at(0, c)),
    [9, 10, 3, 4],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((c) => at(1, c)),
    [5, 6, 7, 8],
  );
  // AF alone is not enough: the charge pump was enabled by 8D 14, so now pixels show.
  assert.equal(oled.pixel(0, 0), true, 'byte 9 has bit 0 set, so the top left pixel is lit');
  assert.equal(oled.pixel(21, 24), true, 'page 3 column 21 is 0xFF');
  assert.equal(oled.pixel(22, 24 + 4), false, '0x0F lights only the upper four rows');
  assert.equal(oled.pixel(22, 24 + 1), true);
  // The last write (address 0x7A) was not acknowledged: it is the 41st write of the script.
  const nacks = lab.read('nacks');
  assert.equal(nacks.toString(2).replace(/0/g, '').length, 1, 'exactly one byte went unanswered');
});

test('SSD1306 is dark until display on and the charge pump are both set; inverse and flips apply', async () => {
  const lab = await bench(
    i2cScript([
      ...command(0xaf),
      ...command(0x20, 0x02, 0xb0, 0x00, 0x10),
      ...data(0x01),
      ...command(0x8d, 0x14),
      ...command(0xa7),
      ...command(0xa1, 0xc8),
    ]),
    CST,
    [{ id: 'oled-ssd1306', wires: WIRES }],
  );
  const oled = lab.devices[0] as Ssd1306;
  lab.runUntil('done', 3_000_000);
  // Inverted: the one set pixel (0,0) is dark and its neighbours are lit. A1 and C8 put the
  // picture upright; without them the same memory shows turned by 180 degrees.
  assert.equal(oled.pixel(0, 0), false);
  assert.equal(oled.pixel(1, 0), true);
});
