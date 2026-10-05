import assert from 'node:assert/strict';
import test from 'node:test';
import type { Eeprom24c02 } from '../src/lib/lab/bus/i2c-devices';
import type { LcdI2c } from '../src/lib/lab/bus/lcd';
import { bench, i2cScript, loc, type Op } from './lab-bus-helper';

const CST = loc({ clk: 4, sda: 75, scl: 80 });
const WIRES = { SDA: 75, SCL: 80 };
const writes = (address: number, ...bytes: number[]): Op[] => [
  { start: true },
  { write: address << 1 },
  ...bytes.map((write) => ({ write })),
];
const readFrom = (address: number, count: number): Op[] => [
  { start: true },
  { write: (address << 1) | 1 },
  ...Array.from({ length: count }, (_, i): Op => ({ read: i === count - 1 ? 'nack' : 'ack' })),
  { stop: true },
];
const STOP: Op = { stop: true };

test('LCD behind a PCF8574 backpack shows text, custom characters and a 20x4 layout', async () => {
  const BACKLIGHT = 8;
  const nibble = (rs: number, value: number) => [
    (value << 4) | BACKLIGHT | rs | 4,
    (value << 4) | BACKLIGHT | rs,
  ];
  const byte = (rs: number, value: number) => [
    ...nibble(rs, value >> 4),
    ...nibble(rs, value & 15),
  ];
  const text = (value: string) => [...value].flatMap((char) => byte(1, char.charCodeAt(0)));
  const sequence = [
    ...nibble(0, 3),
    ...nibble(0, 3),
    ...nibble(0, 3),
    ...nibble(0, 2),
    ...byte(0, 0x28),
    ...byte(0, 0x0c),
    ...byte(0, 0x01),
    ...byte(0, 0x06),
    // Custom character 0: a heart (CGRAM address 0, eight rows), then back to DDRAM.
    ...byte(0, 0x40),
    ...[0x00, 0x0a, 0x1f, 0x1f, 0x0e, 0x04, 0x00, 0x00].flatMap((row) => byte(1, row)),
    ...byte(0, 0x80),
    ...text('Hello'),
    ...byte(1, 0),
    ...byte(0, 0xc0),
    ...text('Lab 4'),
    ...byte(0, 0x94), // third row of a 20x4 display
    ...text('row3'),
    ...byte(0, 0xd4), // fourth row
    ...text('row4'),
  ];
  const lab = await bench(i2cScript([...writes(0x27, ...sequence), STOP]), CST, [
    { id: 'lcd-i2c', opts: { size: '20x4' }, wires: WIRES },
  ]);
  const { lcd } = lab.devices[0] as LcdI2c;
  lab.runUntil('done', 3_000_000);
  assert.equal(lcd.columns, 20);
  assert.equal(lcd.rows, 4);
  assert.equal(lcd.text(0).slice(0, 5), 'Hello');
  assert.equal(lcd.charAt(0, 5), 0, 'custom character 0 sits after the text');
  assert.deepEqual(lcd.glyph(0), [0x00, 0x0a, 0x1f, 0x1f, 0x0e, 0x04, 0x00, 0x00]);
  assert.equal(lcd.text(1).slice(0, 5), 'Lab 4');
  assert.equal(lcd.text(2).slice(0, 4), 'row3');
  assert.equal(lcd.text(3).slice(0, 4), 'row4');
  assert.ok(lcd.displayOn);
  assert.ok(lcd.tooFast > 0, 'the script has no delays, and the display notices');
});

test('LM75 reports the temperature set on the part as two register bytes', async () => {
  const script = (temp: number) =>
    bench(
      i2cScript([
        ...writes(0x48, 0x00),
        ...readFrom(0x48, 2),
        // A plain read keeps the pointer.
        ...readFrom(0x48, 2),
      ]),
      CST,
      [{ id: 'lm75', opts: { temp }, wires: WIRES }],
    );
  let lab = await script(25.5);
  lab.runUntil('done', 1_000_000);
  assert.equal(lab.read('rx') & 0xffffffffn, 0x19801980n);
  lab = await script(-10.5);
  lab.runUntil('done', 1_000_000);
  assert.equal(lab.read('rx') & 0xffffn, 0xf580n);
});

test('24C02 EEPROM: page write wraps inside its page, writes take 5 ms, reads are random and sequential', async () => {
  const lab = await bench(
    i2cScript([
      ...writes(0x50, 0x06, 1, 2, 3, 4),
      STOP,
      // Immediately afterwards the chip is busy and does not answer (acknowledge polling).
      ...writes(0x50),
      STOP,
      { wait: 60 },
      ...writes(0x50),
      STOP,
      ...writes(0x50, 0x00),
      ...readFrom(0x50, 8),
      // A byte write elsewhere, then a random read of it.
      { wait: 60 },
      ...writes(0x50, 0x80, 0x5a),
      STOP,
      { wait: 60 },
      ...writes(0x50, 0x80),
      ...readFrom(0x50, 1),
    ]),
    CST,
    [{ id: 'eeprom-24c02', wires: WIRES }],
  );
  const eeprom = lab.devices[0] as Eeprom24c02;
  lab.runUntil('done', 3_000_000);
  // Address 6, 7 then back to 0 and 1.
  assert.deepEqual(
    [0, 1, 6, 7, 2].map((a) => eeprom.peek(a)),
    [3, 4, 1, 2, 0xff],
  );
  assert.equal(eeprom.peek(0x80), 0x5a);
  const nacks = lab.read('nacks');
  // Writes: A0 06 1 2 3 4 | A0 (busy) | A0 | A0 00 | A1 | A0 80 5A | A0 80 | A1
  assert.equal((nacks >> 6n) & 1n, 1n, 'busy right after the write cycle began');
  assert.equal((nacks >> 7n) & 1n, 0n, 'ready again after 6 ms');
  assert.equal(lab.read('rx') & 0xffn, 0x5an, 'random read of the byte written');
  assert.deepEqual(
    (eeprom.opts.data as number[]).slice(0, 2),
    [3, 4],
    'contents live in the options',
  );
});

test('DS1307 starts halted, keeps BCD time against the board clock and rolls over the date', async () => {
  let lab = await bench(i2cScript([...writes(0x68, 0x00), ...readFrom(0x68, 1)]), CST, [
    { id: 'rtc-ds1307', wires: WIRES },
  ]);
  lab.runUntil('done', 1_000_000);
  assert.equal(lab.read('rx') & 0x80n, 0x80n, 'CH is set after power-up');

  lab = await bench(
    i2cScript([
      // 31 December 2025, 23:59:55, clock running (CH clear).
      ...writes(0x68, 0x00, 0x55, 0x59, 0x23, 0x03, 0x31, 0x12, 0x25),
      STOP,
      { wait: 100 },
      ...writes(0x68, 0x00),
      ...readFrom(0x68, 7),
    ]),
    CST,
    [{ id: 'rtc-ds1307', opts: { warp: 1000 }, wires: WIRES }],
  );
  lab.runUntil('done', 3_000_000);
  // 10 ms of board time at 1000x is ten seconds: 00:00:05 on 1 January 2026.
  const rx = lab.read('rx');
  const bytes = Array.from({ length: 7 }, (_, i) => Number((rx >> BigInt(8 * (6 - i))) & 0xffn));
  assert.deepEqual(
    bytes.map((b) => b.toString(16).padStart(2, '0')),
    ['05', '00', '00', '03', '01', '01', '26'],
  );
});

test('PCF8574 expander: written zeros light LEDs, closed switches read as zero', async () => {
  const lab = await bench(i2cScript([...writes(0x20, 0xf5), STOP, ...readFrom(0x20, 1)]), CST, [
    { id: 'pcf8574', opts: { switches: 0x81 }, wires: WIRES },
  ]);
  lab.runUntil('done', 1_000_000);
  assert.equal(lab.read('rx') & 0xffn, 0x74n);
  assert.equal(lab.devices[0].view.port, 0xf5);
  assert.equal(lab.devices[0].view.pins, 0x74);
});
