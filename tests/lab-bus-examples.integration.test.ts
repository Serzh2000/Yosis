import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { examples } from '../src/lib/examples';
import { labExamples } from '../src/lib/examples-lab';
import type { Ssd1306 } from '../src/lib/lab/bus/ssd1306';
import type { LcdI2c, LcdParallel } from '../src/lib/lab/bus/lcd';
import type { Device } from '../src/lib/lab/devices';
import { examplePreset } from '../src/lib/lab/presets';
import { BOARD_BUTTONS, BOARD_LEDS, BOARD_UART, LabRuntime } from '../src/lib/lab/runtime';

const manager = new LabManager();
after(() => manager.close());

/** Compile an example with its own sources and put its ready bench around the design. */
async function start(id: string) {
  const example = examples.find((item) => item.id === id);
  assert.ok(example, id);
  const result = await manager.compile('tester', example.project, new AbortController().signal);
  assert.equal(result.error, undefined, `${id}: ${JSON.stringify(result.diagnostics)}`);
  const layout = examplePreset(id);
  assert.ok(layout && layout.parts.length > 0, `${id} has a ready bench`);
  const lab = new LabRuntime(result.design!, example.project, layout);
  for (const wire of layout.wires)
    assert.equal(lab.wireState(wire.id), 'ok', `${id}: wire ${wire.id} (${wire.pin}) is connected`);
  const device = (uid: string) => lab.devices.get(uid)!;
  const leds = () => device(BOARD_LEDS).view.b as number[];
  const text = () => device(BOARD_UART).view.text as string;
  return { lab, device, leds, text, layout };
}
/** Run until the condition holds; fail with a readable message after the limit. */
function until(lab: LabRuntime, done: () => boolean, limit: number, what: string) {
  const started = lab.cycle();
  while (!done()) {
    assert.ok(lab.cycle() - started < limit, `${what} did not happen within ${limit} cycles`);
    lab.advance(20_000, Infinity);
  }
  return lab.cycle() - started;
}
const SEGMENTS: Record<number, string> = {
  0x3f: '0',
  0x06: '1',
  0x5b: '2',
  0x4f: '3',
  0x66: '4',
  0x6d: '5',
  0x7d: '6',
  0x07: '7',
  0x7f: '8',
  0x6f: '9',
  0: ' ',
};
const shown = (device: Device) =>
  (device.view.digits as number[])
    .slice(0, 4)
    .map((mask) => SEGMENTS[mask & 0x7f] ?? '?')
    .join('');

test('the example library has the protocol examples, each with a ready bench and a lesson', () => {
  assert.equal(labExamples.length, 135);
  for (const example of labExamples) {
    assert.ok(examples.includes(example), example.id);
    assert.ok(examplePreset(example.id), `${example.id}: bench`);
    assert.match(example.description, /На стенде/, `${example.id}: names the parts on the bench`);
  }
});

test('OLED hello: initialises the SSD1306 and draws the frame and two lines of text', async () => {
  const { lab, device, leds } = await start('oled-hello');
  const oled = device('p1') as Ssd1306;
  const wall = performance.now();
  const cycles = until(lab, () => oled.writes >= 1024, 4_000_000, 'the screen filling');
  console.log(
    `oled-hello: screen filled after ${cycles} cycles (${((cycles / 27e6) * 1000).toFixed(1)} ms of board time), ${Math.round(performance.now() - wall)} ms of computing`,
  );
  lab.advance(40_000, Infinity);
  assert.ok(oled.visible, 'display on and charge pump on');
  // "H" of HELLO starts at column 25 on page 2: its first column is the full stem.
  assert.equal(oled.ram[2 * 128 + 25], 0x7f);
  assert.equal(oled.ram[0 * 128 + 5], 0x01, 'top frame line');
  assert.equal(oled.ram[7 * 128 + 5], 0x80, 'bottom frame line');
  assert.equal(oled.ram[3 * 128 + 0], 0xff, 'left frame line');
  assert.equal(oled.pixel(25, 16 + 3), true);
  assert.ok(leds()[0] > 0.9, 'LED0 shows that drawing is done');
  assert.ok(leds()[1] < 0.1, 'no byte went unacknowledged');
});

test('LCD 1602 over I2C and wired directly: both show the two lines without warnings', async () => {
  const i2c = await start('lcd-i2c');
  const a = (i2c.device('p1') as LcdI2c).lcd;
  until(i2c.lab, () => i2c.leds()[0] > 0.9, 6_000_000, 'the I2C screen finishing');
  assert.equal(a.text(0), 'Hello, FPGA!    ');
  assert.equal(a.text(1), 'LCD 1602 + I2C  ');
  assert.equal(a.tooFast, 0, 'no byte arrived while the display was busy');

  const direct = await start('lcd-direct');
  const b = (direct.device('p1') as LcdParallel).lcd;
  until(direct.lab, () => direct.leds()[0] > 0.9, 6_000_000, 'the direct screen finishing');
  assert.equal(b.text(0), 'Hello, FPGA!    ');
  assert.equal(b.text(1), 'LCD 1602 direct ');
  assert.equal(b.tooFast, 0);
});

test('LM75 to UART: the terminal prints the temperature set on the part, signs included', async () => {
  const { lab, device, text } = await start('lm75-uart');
  until(lab, () => text().includes('T=+ 25.5 C'), 3_000_000, 'the first temperature line');
  device('p1').act('temp', -10.5);
  until(lab, () => text().includes('T=- 10.5 C'), 3_000_000, 'the negative temperature line');
  device('p1').act('temp', 100);
  until(lab, () => text().includes('T=+100.0 C'), 3_000_000, 'the hot temperature line');
});

test('DS1307 clock on the TM1637: the hours and minutes follow the clock written to it', async () => {
  const { lab, device } = await start('rtc-clock');
  const display = device('p2');
  until(lab, () => shown(display).startsWith('12'), 4_000_000, 'the hours showing');
  // Written as 12:30:00 and running 1000 times faster, so minutes pass during the run.
  const before = Number(shown(display).slice(2));
  assert.ok(before >= 30 && before < 60, shown(display));
  lab.advance(2_000_000, Infinity);
  const after = Number(shown(display).slice(2));
  assert.ok(after !== before, 'the minutes moved');
  assert.equal(device('p1').view.halted, false);
});

test('EEPROM counter: the number grows with every start because the chip keeps its bytes', async () => {
  const first = await start('eeprom-counter');
  until(first.lab, () => first.leds()[0] > 0.9, 3_000_000, 'the first run');
  const memory = first.layout.parts[0].opts.data as number[];
  assert.equal(memory[0], 1);
  // A new run with the same part keeps what the chip stored.
  const { example } = { example: examples.find((item) => item.id === 'eeprom-counter')! };
  const again = await manager.compile('tester', example.project, new AbortController().signal);
  const lab = new LabRuntime(again.design!, example.project, first.layout);
  until(
    lab,
    () => (lab.devices.get(BOARD_LEDS)!.view.b as number[])[1] > 0.9,
    3_000_000,
    'run two',
  );
  assert.equal(memory[0], 2);
  assert.ok((lab.devices.get(BOARD_LEDS)!.view.b as number[])[0] < 0.1, 'binary 2: LED0 dark');
});

test('MAX7219 matrix: configured out of shutdown, then the smiley winks', async () => {
  const { lab, device } = await start('max7219-matrix');
  const chip = device('p1');
  until(lab, () => (chip.view.rows as number[]).some(Boolean), 2_000_000, 'the smiley appearing');
  const rows = chip.view.rows as number[];
  assert.deepEqual([rows[0], rows[1], rows[3], rows[7]], [0x3c, 0x42, 0x81, 0x3c]);
  const eyes = new Set<number>();
  for (let i = 0; i < 12; i++) {
    lab.advance(300_000, Infinity);
    eyes.add((chip.view.rows as number[])[2]);
  }
  assert.deepEqual([...eyes].sort(), [0x85, 0xa5], 'both eye frames are shown');
});

test('TM1637 stopwatch: counts hundredths, S2 pauses it', async () => {
  const { lab, device } = await start('tm1637-stopwatch');
  const display = device('p1');
  until(lab, () => Number(shown(display)) >= 5, 6_000_000, 'the stopwatch passing 0.05 s');
  assert.equal(display.view.on, true);
  device(BOARD_BUTTONS).act('set', { pin: 1, on: true });
  lab.advance(200_000, Infinity);
  device(BOARD_BUTTONS).act('set', { pin: 1, on: false });
  lab.advance(600_000, Infinity);
  const frozen = shown(display);
  lab.advance(2_000_000, Infinity);
  assert.equal(shown(display), frozen, 'paused');
  device(BOARD_BUTTONS).act('set', { pin: 0, on: true });
  lab.advance(600_000, Infinity);
  assert.equal(shown(display), '0000', 'S1 resets');
});

test('WS2812 rainbow: eight dim colours that move along the strip', async () => {
  const { lab, device } = await start('ws2812-rainbow');
  const strip = device('p1');
  until(lab, () => (strip.view.rev as number) > 0, 2_000_000, 'the first frame');
  const snapshot = () => Array.from(strip.view.colors as Uint8Array).join(',');
  const first = snapshot();
  const colors = strip.view.colors as Uint8Array;
  assert.ok(
    colors.every((value) => value <= 31),
    'brightness is reduced',
  );
  assert.ok(
    Array.from(
      { length: 8 },
      (_, i) => colors[i * 3] + colors[i * 3 + 1] + colors[i * 3 + 2],
    ).every((sum) => sum > 0),
  );
  lab.advance(1_000_000, Infinity);
  assert.notEqual(snapshot(), first, 'the rainbow moved');
  assert.notEqual(
    `${colors[0]},${colors[1]},${colors[2]}`,
    `${colors[3]},${colors[4]},${colors[5]}`,
    'neighbours have different colours',
  );
});

test('HC-SR04 on the TM1637: the design shows the distance set on the part', async () => {
  const { lab, device, leds } = await start('hcsr04-display');
  const display = device('p2');
  until(lab, () => shown(display) === '  60', 6_000_000, 'the distance 60 showing');
  // 60 cm: the proximity scale lights LED0..LED3.
  assert.ok(leds()[0] > 0.9 && leds()[3] > 0.9 && leds()[4] < 0.1, leds().join(' '));
  device('p1').act('distance', 245);
  until(lab, () => shown(display) === ' 245', 8_000_000, 'the distance 245 showing');
});

test('DHT11 to UART: temperature and humidity arrive as text', async () => {
  const { lab, device, text } = await start('dht11-uart');
  until(lab, () => text().includes('T=24C H=45%'), 4_000_000, 'the first reading');
  assert.ok(device('p1').view.responses === 1);
});

test('IR remote: the keys of the remote switch the LEDs', async () => {
  const { lab, device, leds } = await start('ir-remote-leds');
  const remote = device('p1');
  remote.act('press', '1');
  until(lab, () => leds()[0] > 0.9, 3_000_000, 'LED0 lighting');
  remote.act('press', '3');
  until(lab, () => leds()[2] > 0.9, 3_000_000, 'LED2 lighting');
  assert.ok(leds()[1] < 0.1);
  remote.act('press', '1');
  until(lab, () => leds()[0] < 0.1, 3_000_000, 'LED0 switching off');
  remote.act('press', '9');
  until(lab, () => leds().every((level) => level > 0.9), 3_000_000, 'all LEDs lighting');
});

test('PS/2 keyboard to UART: pressed keys become letters, releases are skipped', async () => {
  const { lab, device, text } = await start('ps2-uart');
  const keyboard = device('p1');
  keyboard.act('key', { id: 'H', on: true });
  lab.advance(100_000, Infinity);
  keyboard.act('key', { id: 'H', on: false });
  lab.advance(100_000, Infinity);
  keyboard.act('key', { id: 'I', on: true });
  lab.advance(100_000, Infinity);
  keyboard.act('key', { id: 'I', on: false });
  lab.advance(200_000, Infinity);
  assert.equal(text(), 'HI');
  assert.ok(leds(lab)[0] < 0.1, 'no parity errors (LED0 lights on an error)');
});

test('MCP3008: the potentiometer sets the LED ruler and the brightness of the PWM LED', async () => {
  const { lab, device, leds } = await start('adc-pwm');
  lab.advance(200_000, Infinity);
  // 512 of 1023: the ruler lights LED0..LED3 and the PWM LED is half bright.
  assert.ok(leds()[0] > 0.9 && leds()[3] > 0.9 && leds()[4] < 0.1, leds().join(' '));
  const pwm = () => (device('p2').view.b as number[])[0];
  assert.ok(Math.abs(pwm() - 0.5) < 0.08, `PWM LED at ${pwm()}`);
  device('p1').act('value', 1023);
  lab.advance(300_000, Infinity);
  assert.ok(leds().every((level) => level > 0.9));
  assert.ok(pwm() > 0.95);
  device('p1').act('value', 0);
  lab.advance(300_000, Infinity);
  assert.ok(leds().every((level) => level < 0.1));
  assert.ok(pwm() < 0.05);
});

function leds(lab: LabRuntime) {
  return lab.devices.get(BOARD_LEDS)!.view.b as number[];
}
