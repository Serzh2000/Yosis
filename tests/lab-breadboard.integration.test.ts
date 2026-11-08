import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { addPart, addWire } from '../src/lib/lab/layout-ops';
import type { LabLayout } from '../src/lib/lab/runtime';
import { LabRuntime } from '../src/lib/lab/runtime';
import type { Project } from '../shared/types';

const manager = new LabManager();
after(() => manager.close());

test('a part plugged into a breadboard works through the jumpers to the board', async () => {
  const project: Project = {
    name: 'breadboard',
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: 'module top(output y); assign y = 1; endmodule\n' },
      { name: 'board.cst', content: 'IO_LOC "y" 75;\n' },
    ],
  };
  const result = await manager.compile('t', project, new AbortController().signal);
  assert.equal(result.error, undefined, JSON.stringify(result.diagnostics));
  const run = (layout: LabLayout) => {
    const lab = new LabRuntime(result.design!, project, layout);
    lab.advance(16, Infinity);
    return lab;
  };
  const brightness = (lab: LabRuntime, uid: string) =>
    (lab.devices.get(uid)!.view.b as number[])[0];

  const board = addPart({ parts: [], wires: [] }, 'breadboard');
  const led = addPart(board.layout, 'led');
  const mount = led.layout.parts.find((part) => part.uid === led.uid)!.mount!;
  assert.ok(mount);
  // The pins of the LED stand in neighbouring holes of the row, starting from the mount hole.
  const column = Number(mount.hole.slice(1));
  const strip = (offset: number) => `${board.uid}:j${column + offset}`;
  const wire = (layout: LabLayout, from: string, to: string) => addWire(layout, from, to).layout;

  // Nothing wired: the part is dead, whatever the design drives.
  assert.ok(run(led.layout).unpowered.has(led.uid));
  // The signal alone does not light it: a part needs its plus and its minus.
  const signal = wire(led.layout, strip(0), 'board:75');
  const unfed = run(signal);
  assert.ok(unfed.unpowered.has(led.uid));
  assert.equal(brightness(unfed, led.uid), 0);
  // Feed the strips of VCC and GND, and the LED is lit by the output.
  const fed = wire(wire(signal, strip(1), 'board:3V3'), strip(2), 'board:GND');
  const lit = run(fed);
  assert.ok(!lit.unpowered.has(led.uid));
  assert.equal(brightness(lit, led.uid), 1);
  // Ground on the plus strip is a mistake: the part stays dead.
  const wrong = run(wire(wire(signal, strip(1), 'board:GND'), strip(2), 'board:GND'));
  assert.ok(wrong.unpowered.has(led.uid));
  // A rail feeds every column: one jumper from the board to the rail, one from the rail to a strip.
  const rails = wire(
    wire(
      wire(wire(signal, `${board.uid}:P1`, 'board:3V3'), `${board.uid}:N1`, 'board:GND'),
      strip(1),
      `${board.uid}:P5`,
    ),
    strip(2),
    `${board.uid}:N5`,
  );
  assert.ok(!run(rails).unpowered.has(led.uid));
});
