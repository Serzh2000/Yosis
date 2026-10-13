import test from 'node:test';
import { HEADER_PINS } from '../src/lib/board-parts';
import assert from 'node:assert/strict';
import { examples } from '../src/lib/examples';
import { loadExample, validateProject } from '../src/lib/projects';
import { parseCstPins } from '../src/lib/physical';
import { validateProject as validateServerProject } from '../server/validation';

function topPortBits(source: string, top: string): string[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
  const header = text.match(
    new RegExp(`\\bmodule\\s+${top}(?:\\s*#\\s*\\([\\s\\S]*?\\))?\\s*\\(([\\s\\S]*?)\\)\\s*;`),
  );
  assert.ok(header, `Cannot find ANSI module ${top}`);
  const ports = [
    ...header[1].matchAll(
      /\b(?:input|output|inout)\s+(?:(?:wire|reg|signed)\s+)*(?:\[(\d+):(\d+)\]\s+)?([A-Za-z_]\w*)/g,
    ),
  ];
  assert.ok(ports.length, `${top} must expose ports`);
  return ports.flatMap((match) => {
    const [, msb, lsb, name] = match;
    if (msb === undefined) return [name];
    const first = Math.min(Number(msb), Number(lsb)),
      last = Math.max(Number(msb), Number(lsb));
    return Array.from({ length: last - first + 1 }, (_, index) => `${name}[${first + index}]`);
  });
}

test('every built-in experiment fully constrains its actual top ports without pin conflicts', () => {
  assert.equal(examples.length, 243);
  assert.equal(new Set(examples.map((example) => example.id)).size, examples.length);
  for (const id of ['logic', 'counter', 'alu'])
    assert.ok(examples.some((example) => example.id === id));
  // These connections were checked against Apicula's Tang Nano 20K profile.
  // Laboratory examples also use the two headers, where the peripherals are wired.
  const boardPins = new Set([
    ...['4', '15', '16', '17', '18', '19', '20', '69', '70', '87', '88'],
    ...[...HEADER_PINS.J5, ...HEADER_PINS.J6].filter((pin) => pin !== null).map(String),
  ]);
  for (const example of examples) {
    const project = example.project;
    assert.deepEqual(validateProject(project), validateServerProject(project), example.id);
    const constraints = project.files.filter((file) => file.name.endsWith('.cst'));
    assert.equal(constraints.length, 1, `${example.id}: a single CST must be selectable`);
    const source = project.files
      .filter((file) => /\.(?:v|sv)$/.test(file.name))
      .map((file) => file.content)
      .join('\n');
    const expected = topPortBits(source, project.top).sort();
    const assignments = parseCstPins(constraints);
    assert.deepEqual(
      assignments.map((pin) => pin.signal).sort(),
      expected,
      `${example.id}: missing or surplus top port bit`,
    );
    assert.equal(
      new Set(assignments.map((pin) => pin.signal)).size,
      assignments.length,
      `${example.id}: repeated port`,
    );
    assert.equal(
      new Set(assignments.map((pin) => pin.pin)).size,
      assignments.length,
      `${example.id}: two ports drive the same physical pin`,
    );
    for (const pin of assignments)
      assert.ok(boardPins.has(pin.pin), `${example.id}: unknown board connection ${pin.pin}`);
    const standards = [
      ...constraints[0].content.matchAll(
        /\bIO_PORT\s+"([^"]+)"\s+IO_TYPE=LVCMOS33(?:\s+\w+=[\w.]+)*\s*;/g,
      ),
    ];
    assert.deepEqual(
      standards.map((match) => match[1]).sort(),
      expected,
      `${example.id}: missing 3.3 V I/O standard`,
    );
    const clock = assignments.find((pin) => pin.signal === 'clk');
    if (clock) {
      assert.equal(clock.pin, '4', `${example.id}: the 27 MHz oscillator uses pin 4`);
      assert.match(constraints[0].content, /CLOCK_LOC\s+"clk"\s+BUFG\s*;/);
    }
    for (const pin of assignments.filter((pin) => /^(?:led_n|count)\[\d\]$/.test(pin.signal))) {
      assert.equal(
        Number(pin.pin),
        15 + Number(pin.signal.match(/\[(\d)\]/)![1]),
        `${example.id}: LED order`,
      );
    }
  }
});

test('opening a built-in experiment preserves saved edits and chooses a fresh name', async () => {
  const original = examples.find((example) => example.id === 'logic')!;
  const edited = {
    ...original.project,
    files: [
      { name: 'top.v', content: '// my source\nmodule top(output y); assign y=0; endmodule' },
    ],
  };
  const fresh = loadExample(original, [edited.name]);
  assert.equal(fresh.name, 'logic-lab-2');
  assert.deepEqual(fresh.files, original.project.files);
  assert.ok(fresh.id);
  const next = loadExample(original, [edited.name, fresh.name, 'logic-lab-3']);
  assert.equal(next.name, 'logic-lab-4');
  assert.notEqual(next.id, fresh.id);
  next.files[0].content = 'edited copy';
  assert.notEqual(next.files[0].content, original.project.files[0].content);
  assert.equal(edited.files[0].content.includes('// my source'), true);
});
