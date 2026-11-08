import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveConnections } from '../src/components/lab/reference/bridge';
import { LED_PINS } from '../src/lib/board-parts';
import { examples } from '../src/lib/examples';
import { partById, partPins } from '../src/lib/lab/catalog';
import { headerByFpga } from '../src/lib/lab/pads';
import { boardPreset, examplePreset } from '../src/lib/lab/presets';
import { readCst } from '../src/lib/pin-planner';

test('every example opens with a bench: its own parts or an analyser on its LEDs', () => {
  let own = 0;
  let analysers = 0;
  for (const example of examples) {
    const usesLeds = readCst(example.project).some(
      (item) =>
        item.kind === 'IO_LOC' && (LED_PINS as readonly number[]).includes(Number(item.value)),
    );
    const manual = examplePreset(example.id);
    const layout = manual ?? boardPreset(example.project);
    if (manual) own++;
    else if (layout) analysers++;
    assert.equal(
      !!layout,
      !!manual || usesLeds,
      `${example.id}: a bench when there is something to show`,
    );
    if (!layout) continue;
    const connections = resolveConnections(layout);
    assert.deepEqual(connections.shorts, [], `${example.id}: no short`);
    const assigned = new Set(
      readCst(example.project)
        .filter((item) => item.kind === 'IO_LOC')
        .map((item) => Number(item.value)),
    );
    for (const part of layout.parts) {
      const def = partById.get(part.def);
      assert.ok(def, `${example.id}: part ${part.def}`);
      if (def.kind === 'breadboard') continue;
      // Every pin of the part is on a contact of the board: the supply on rails, signals on
      // contacts the design drives.
      for (const pin of partPins(def, part.opts)) {
        const link = connections.wires.find((item) => item.id === `${part.uid}:${pin[0]}`);
        if (pin[0] === 'VCC' || pin[0] === 'GND') {
          assert.ok(
            headerByFpga.get(link?.fpga ?? 0)?.rail,
            `${example.id}: ${part.def}.${pin[0]} is on a rail`,
          );
        } else if (link)
          assert.ok(
            assigned.has(link.fpga),
            `${example.id}: contact ${link.fpga} carries a signal`,
          );
      }
    }
  }
  console.log(`benches: ${own} with parts, ${analysers} with an analyser`);
});

test('parts of a ready bench stand in a breadboard where they fit', () => {
  const layout = examplePreset('oled-hello')!;
  const board = layout.parts.find((part) => part.def === 'breadboard');
  assert.ok(board, 'a breadboard');
  const oled = layout.parts.find((part) => part.def === 'oled-ssd1306')!;
  assert.equal(oled.mount?.on, board.uid);
});
