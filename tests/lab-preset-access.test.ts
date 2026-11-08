import assert from 'node:assert/strict';
import test from 'node:test';
import { busMoreBenches } from '../src/lib/examples-lab-bus2';
import { partBenches } from '../src/lib/examples-lab-parts';
import { PARTS, partPins } from '../src/lib/lab/catalog';
import { benchProblems, buildBench, examplePreset } from '../src/lib/lab/presets';
import { resolveConnections } from '../src/components/lab/reference/bridge';
import { HEADER, headerByFpga } from '../src/lib/lab/pads';
import { benchOverlaps } from '../src/lib/lab/footprints';
import { addPart } from '../src/lib/lab/layout-ops';
import type { LabLayout } from '../src/lib/lab/runtime';

const PADS = HEADER.filter((pad) => !pad.rail).map((pad) => pad.fpga);

test('every ready bench of an example has plugs where nothing covers them', () => {
  const ids = [...Object.keys(busMoreBenches), ...Object.keys(partBenches)];
  assert.ok(ids.length > 50);
  const bad: string[] = [];
  for (const id of ids) {
    const bench = examplePreset(id);
    if (!bench) continue;
    const problems = benchProblems(bench);
    if (problems.length) bad.push(`${id}: ${problems.join('; ')}`);
  }
  assert.deepEqual(bad, []);
});

test('every part of the library, alone on a bench, is wired and its plugs are free', () => {
  const bad: string[] = [];
  for (const def of PARTS) {
    if (def.kind === 'breadboard') continue;
    const pins = partPins(def, {}).filter((pin) => pin[0] !== 'VCC' && pin[0] !== 'GND');
    const wanted = Object.fromEntries(
      pins.map((pin, index) => [pin[0], PADS[index % PADS.length]]),
    );
    const bench = buildBench([{ def: def.id, x: 0, pins: wanted }]);
    const problems = benchProblems(bench);
    const joined = new Map(resolveConnections(bench).wires.map((wire) => [wire.pin, wire.fpga]));
    for (const pin of pins)
      if (joined.get(pin[0]) !== wanted[pin[0]]) problems.push(`вывод ${pin[0]} не дошёл до платы`);
    for (const [name, rail] of [
      ['VCC', '3V3'],
      ['GND', 'GND'],
    ])
      if (headerByFpga.get(joined.get(name) ?? 0)?.rail !== rail)
        problems.push(`${name} не на ${rail}`);
    if (problems.length) bad.push(`${def.id}: ${problems.join('; ')}`);
  }
  assert.deepEqual(bad, []);
});

test('parts added one after another from the library never stand on one another', () => {
  let bench: LabLayout = { parts: [], wires: [] };
  for (const def of PARTS) bench = addPart(bench, def.id).layout;
  assert.equal(bench.parts.length, PARTS.length);
  assert.deepEqual(benchOverlaps(bench), []);
});
