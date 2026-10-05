import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { examples } from '../src/lib/examples';
import { labExamples } from '../src/lib/examples-lab';
import { busMoreExamples } from '../src/lib/examples-lab-bus2';
import { partExamples } from '../src/lib/examples-lab-parts';
import { PARTS } from '../src/lib/lab/catalog';
import { examplePreset } from '../src/lib/lab/presets';
import { BOARD_BUTTONS, BOARD_LEDS, LabRuntime } from '../src/lib/lab/runtime';

const manager = new LabManager();
after(() => manager.close());

async function start(id: string) {
  const example = examples.find((item) => item.id === id);
  assert.ok(example, id);
  const result = await manager.compile('tester', example.project, new AbortController().signal);
  assert.equal(result.error, undefined, `${id}: ${JSON.stringify(result.diagnostics)}`);
  const layout = examplePreset(id);
  assert.ok(layout && layout.parts.length > 0, `${id} has a ready bench`);
  const lab = new LabRuntime(result.design!, example.project, layout);
  for (const wire of layout.wires)
    assert.equal(lab.wireState(wire.id), 'ok', `${id}: wire ${wire.id} is connected`);
  const part = lab.devices.get('p1')!;
  /** Board LEDs that are lit, LED0 in bit 0. */
  const leds = () =>
    (lab.devices.get(BOARD_LEDS)!.view.b as number[]).reduce(
      (sum, value, bit) => sum + (value > 0.5 ? 2 ** bit : 0),
      0,
    );
  const button = (pin: number, on: boolean) =>
    lab.devices.get(BOARD_BUTTONS)!.act('set', { pin, on });
  const run = (cycles: number) => lab.advance(cycles, Infinity);
  return { lab, part, leds, button, run };
}

test('every part of the laboratory has at least two examples with a ready bench', () => {
  const uses = new Map<string, number>();
  for (const example of labExamples) {
    const layout = examplePreset(example.id);
    assert.ok(layout, `${example.id}: bench`);
    assert.match(example.description, /На стенде/, example.id);
    for (const def of new Set(layout.parts.map((part) => part.def)))
      uses.set(def, (uses.get(def) ?? 0) + 1);
  }
  for (const part of PARTS)
    assert.ok((uses.get(part.id) ?? 0) >= 2, `${part.id}: ${uses.get(part.id) ?? 0} example(s)`);
  assert.equal(new Set(labExamples.map((example) => example.id)).size, labExamples.length);
});

test('every part example synthesises for the bench and all its wires carry signals', async () => {
  for (const example of [...partExamples, ...busMoreExamples]) {
    const { run } = await start(example.id);
    run(50_000);
  }
});

test('the second examples of the protocol parts do what they say', async () => {
  {
    const { leds, run } = await start('eeprom-verify');
    run(1_200_000);
    assert.equal(leds(), 0b000001, 'the four bytes read back as written');
  }
  {
    const { leds, run } = await start('pcf8574-switches');
    run(300_000);
    assert.equal(leds(), 0b100101, 'closed switches P0, P2 and P5');
  }
  {
    const { part, run } = await start('pcf8574-chaser');
    run(100_000);
    assert.equal(part.view.port, 0b11111110, 'the first pattern: a zero on P0');
  }
  {
    const { leds, run } = await start('adc-binary');
    run(200_000);
    assert.equal(leds(), 640 >> 4);
  }
  {
    const { leds, run } = await start('lm75-thermostat');
    run(400_000);
    assert.equal(leds() & 1, 1, 'it is 22 degrees: the heater is on');
  }
  {
    const { leds, run } = await start('dht11-alarm');
    run(3_000_000);
    assert.equal(leds(), 0b100001, 'a good answer and humidity over the limit');
  }
});

test('lights, indicators and instruments show what their designs drive', async () => {
  {
    const { part, run } = await start('lab-led-blink');
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) {
      run(1 << 20);
      seen.add(Math.round((part.view.b as number[])[0]));
    }
    assert.deepEqual([...seen].sort(), [0, 1], 'the LED is on for a while and off for a while');
  }
  {
    const { part, run } = await start('lab-segn-counter');
    run(3 << 19);
    const digits = part.view.b as number[][];
    // Three ticks have passed: the right digit shows 3 (segments a b c d g), the left ones 0.
    assert.deepEqual(
      digits[3].map((value) => (value > 0.5 ? 1 : 0)),
      [1, 1, 1, 1, 0, 0, 1, 0],
    );
    assert.deepEqual(
      digits[0].map((value) => (value > 0.5 ? 1 : 0)),
      [1, 1, 1, 1, 1, 1, 0, 0],
    );
  }
  {
    const { part, run } = await start('lab-matrix-picture');
    run(1 << 14);
    const lit = (part.view.b as number[][]).map((row) =>
      row.map((value) => (value > 0.5 ? '#' : '.')).join(''),
    );
    assert.equal(lit[0], '..####..');
    assert.equal(lit[2], '#.#..#.#');
  }
  {
    const { part, run } = await start('lab-freq-1khz');
    run(200_000);
    assert.equal(Math.round(part.view.frequency as number), 1000);
  }
  {
    const { part, run } = await start('lab-volt-half');
    run(20_000);
    run(25_600);
    assert.ok(Math.abs((part.view.duty as number) - 0.5) < 0.01);
  }
  {
    const { part, run } = await start('lab-servo-buttons');
    run(1_200_000);
    assert.equal(Math.round(part.view.angle as number), 90);
  }
});

test('inputs reach the design: buttons, keypad, encoder, shift registers and the terminal', async () => {
  {
    const { part, leds, run } = await start('lab-button-direct');
    run(10);
    assert.equal(leds(), 0);
    part.act('set', { pin: 0, on: true });
    run(10);
    assert.equal(leds(), 1);
  }
  {
    const { part, leds, run } = await start('lab-keypad-scan');
    run(20_000);
    assert.equal(leds() & 0b100000, 0, 'nothing pressed');
    part.act('key', { key: '2,1', on: true });
    run(20_000);
    assert.equal(leds(), 0b100000 | (2 << 2) | 1, 'row 2, column 1');
    part.act('key', { key: '2,1', on: false });
    run(20_000);
    assert.equal(leds() & 0b100000, 0, 'released');
  }
  {
    const { part, leds, run } = await start('lab-encoder-count');
    run(100);
    assert.equal(leds(), 8);
    part.act('turn', 1);
    part.act('turn', 1);
    part.act('turn', -1);
    run(400_000);
    assert.equal(leds(), 9);
  }
  {
    const { part, run } = await start('lab-sr595-chaser');
    run((1 << 20) + 40_000);
    // The divider gives a tick at the very start and one more 2^20 cycles later.
    assert.equal(part.view.latch, 0b00000100, 'the pattern after its second step');
  }
  {
    const { leds, run } = await start('lab-sr165-read');
    run(80_000);
    assert.equal(leds(), 0b110100, 'the low six switches');
  }
  {
    const { leds, run } = await start('lab-sr165-ones');
    run(80_000);
    assert.equal(leds(), 4, 'four switches are on');
  }
  {
    const { part, run } = await start('lab-uart-hello');
    run(8 << 18);
    assert.match(part.view.text as string, /HELLO\r\nH/);
  }
  {
    const { part, run } = await start('lab-uart-echo');
    run(1000);
    part.act('send', 'ab1');
    run(40_000);
    assert.equal(part.view.text, 'AB1');
  }
  {
    const { part, leds, button, run } = await start('lab-pir-count');
    for (let i = 0; i < 3; i++) {
      part.act('set', { pin: 0, on: true });
      run(10);
      part.act('set', { pin: 0, on: false });
      run(10);
    }
    assert.equal(leds(), 3, 'three events, however long each lasted');
    button(0, true);
    run(10);
    assert.equal(leds(), 0, 'S1 clears the count');
  }
  {
    const { part, leds, button, run } = await start('lab-flame-alarm');
    part.act('set', { pin: 0, on: true });
    run(10);
    part.act('set', { pin: 0, on: false });
    run(10);
    assert.equal(leds(), 0b10, 'the alarm stays after the sensor went quiet');
    button(0, true);
    run(10);
    assert.equal(leds(), 0);
  }
});
