import assert from 'node:assert/strict';
import test from 'node:test';
import { examples } from '../src/lib/examples';
import { BENCH, BOARD, partBox } from '../src/lib/lab/bench';
import { partById, partPins } from '../src/lib/lab/catalog';
import { boardPreset, examplePreset } from '../src/lib/lab/presets';
import { LED_PINS } from '../src/lib/board-parts';
import { readCst } from '../src/lib/pin-planner';

test('every example opens with a bench: its own parts or an analyser on its LEDs', () => {
  let own = 0;
  let analysers = 0;
  let bare = 0;
  for (const example of examples) {
    const usesLeds = readCst(example.project).some(
      (item) =>
        item.kind === 'IO_LOC' && (LED_PINS as readonly number[]).includes(Number(item.value)),
    );
    const manual = examplePreset(example.id);
    const layout = manual ?? boardPreset(example.project);
    if (manual) own++;
    else if (layout) analysers++;
    else bare++;
    assert.equal(
      !!layout,
      !!manual || usesLeds,
      `${example.id}: a bench when there is something to show`,
    );
    if (!layout) continue;
    const boxes = layout.parts.map((part) => {
      const def = partById.get(part.def);
      assert.ok(def, `${example.id}: part ${part.def}`);
      const box = partBox(part, def);
      assert.ok(
        box.x >= 0 && box.y >= 0 && box.x + box.w <= BENCH.w && box.y + box.h <= BENCH.h,
        `${example.id}: ${part.def} is on the bench`,
      );
      assert.ok(
        box.x + box.w <= BOARD.x ||
          box.x >= BOARD.x + BOARD.w ||
          box.y + box.h <= BOARD.y ||
          box.y >= BOARD.y + BOARD.h,
        `${example.id}: ${part.def} does not cover the board`,
      );
      return box;
    });
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++)
        assert.ok(
          boxes[a].x + boxes[a].w <= boxes[b].x ||
            boxes[b].x + boxes[b].w <= boxes[a].x ||
            boxes[a].y + boxes[a].h <= boxes[b].y ||
            boxes[b].y + boxes[b].h <= boxes[a].y,
          `${example.id}: parts ${a} and ${b} overlap`,
        );
    const assigned = new Set(
      readCst(example.project)
        .filter((item) => item.kind === 'IO_LOC')
        .map((item) => Number(item.value)),
    );
    for (const wire of layout.wires) {
      const part = layout.parts.find((item) => item.uid === wire.part)!;
      assert.ok(
        partPins(partById.get(part.def)!, part.opts).some((pin) => pin[0] === wire.pin),
        `${example.id}: pin ${wire.pin}`,
      );
      assert.ok(assigned.has(wire.fpga), `${example.id}: contact ${wire.fpga} carries a signal`);
    }
  }
  console.log(`benches: ${own} with parts, ${analysers} with an analyser, ${bare} board only`);
});
