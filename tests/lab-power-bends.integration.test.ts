import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { LabManager } from '../server/lab';
import { HEADER, bendIndex, bentPoints, routeWires, type WireEnds } from '../src/lib/lab/bench';
import { partById, partPins } from '../src/lib/lab/catalog';
import { addPart, setAutoPower, setWireBends } from '../src/lib/lab/layout-ops';
import { migrateLayout } from '../src/lib/lab/migrate';
import { linkStatus } from '../src/lib/lab/wiring';
import { LabRuntime, type LabLayout, type LabWire } from '../src/lib/lab/runtime';
import type { Project } from '../shared/types';

const manager = new LabManager();
after(() => manager.close());

test('with automatic power off a part works only once VCC and GND are wired', async () => {
  const project: Project = {
    name: 'power',
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: 'module top(output y); assign y = 1; endmodule\n' },
      { name: 'board.cst', content: 'IO_LOC "y" 75;\n' },
    ],
  };
  const result = await manager.compile('t', project, new AbortController().signal);
  assert.equal(result.error, undefined, JSON.stringify(result.diagnostics));
  const pad = (rail: string) => HEADER.find((item) => item.rail === rail)!.fpga;
  const signal: LabWire = { id: 's', part: 'led', pin: 'A', fpga: 75 };
  const run = (layout: LabLayout) => {
    const lab = new LabRuntime(result.design!, project, layout);
    lab.advance(16, Infinity);
    return lab;
  };
  const brightness = (lab: LabRuntime) => (lab.devices.get('led')!.view.b as number[])[0];
  const auto = addPart({ parts: [], wires: [] }, 'led');
  const uid = auto.uid;
  const wired = (layout: LabLayout, wires: LabWire[]): LabLayout => ({
    ...layout,
    parts: layout.parts.map((part) => ({ ...part, uid: 'led' })),
    wires,
  });
  assert.ok(uid);
  assert.equal(brightness(run(wired(auto.layout, [signal]))), 1, 'the bench powers the part');

  const manual = setAutoPower(auto.layout, false);
  assert.equal(manual.parts[0].opts.power, true);
  assert.deepEqual(
    partPins(partById.get('led')!, manual.parts[0].opts).map((pin) => pin[0]),
    ['A', 'VCC', 'GND'],
  );
  const dead = run(wired(manual, [signal]));
  assert.ok(dead.unpowered.has('led'));
  assert.equal(brightness(dead), 0, 'no supply, no light');
  // VCC on a ground pad does not count and is reported.
  const wrong = run(
    wired(manual, [
      signal,
      { id: 'v', part: 'led', pin: 'VCC', fpga: pad('GND') },
      { id: 'g', part: 'led', pin: 'GND', fpga: pad('GND') },
    ]),
  );
  assert.equal(wrong.wireState('v'), 'direction');
  assert.ok(wrong.unpowered.has('led'));
  const alive = run(
    wired(manual, [
      signal,
      { id: 'v', part: 'led', pin: 'VCC', fpga: pad('3V3') },
      { id: 'g', part: 'led', pin: 'GND', fpga: pad('GND') },
    ]),
  );
  assert.equal(alive.unpowered.size, 0);
  assert.equal(brightness(alive), 1);
  assert.equal(alive.wireState('v'), 'ok');

  // Link rules while dragging a wire.
  assert.equal(linkStatus('vcc', pad('5V'), undefined).ok, true);
  assert.equal(linkStatus('vcc', pad('GND'), undefined).ok, false);
  assert.equal(linkStatus('gnd', pad('GND'), undefined).ok, true);
  assert.equal(linkStatus('gnd', 75, undefined).ok, false);
  assert.equal(linkStatus('in', pad('3V3'), undefined).ok, false);
  // Back to automatic power: the supply pins and their wires go away, signal wires stay.
  const back = setAutoPower(
    wired(manual, [signal, { id: 'v', part: 'led', pin: 'VCC', fpga: pad('3V3') }]),
    true,
  );
  assert.equal(back.parts[0].opts.power, undefined);
  assert.deepEqual(
    back.wires.map((wire) => wire.id),
    ['s'],
  );
  // A saved bench keeps the mode and the bends.
  const saved = migrateLayout(
    JSON.parse(JSON.stringify(wired(manual, [{ ...signal, bends: [{ x: 10, y: 20 }] }]))),
  )!;
  assert.equal(saved.autoPower, false);
  assert.deepEqual(saved.wires[0].bends, [{ x: 10, y: 20 }]);
});

test('a bent wire goes through its bends and a new bend lands on the nearest run', () => {
  const wire: LabWire = { id: 'w', part: 'p', pin: 'A', fpga: 75 };
  const to = HEADER.find((pad) => pad.fpga === 75)!;
  const end = (bends?: LabWire['bends']): WireEnds => ({
    wire: { ...wire, bends },
    from: { x: 100, y: 100 },
    exit: { x: 0, y: 1 },
    rect: { x: 80, y: 40, w: 40, h: 60 },
    to,
  });
  const auto = routeWires([end()]).get('w')!;
  const bent = routeWires([end([{ x: 200, y: 180 }])]).get('w')!;
  assert.notEqual(auto, bent);
  assert.ok(bent.includes('200 180'), 'the path turns at the bend');
  assert.ok(bent.startsWith('M100 100') && bent.endsWith(`L${to.x} ${to.y}`));
  const points = bentPoints(end([{ x: 200, y: 180 }]));
  assert.deepEqual(points[1], { x: 100, y: 114 }, 'a stub leaves the pin first');
  // A point near the pin belongs before the existing bend, one near the pad after it.
  assert.equal(bendIndex(end([{ x: 200, y: 180 }]), { x: 140, y: 140 }), 0);
  assert.equal(bendIndex(end([{ x: 200, y: 180 }]), { x: to.x - 5, y: to.y - 40 }), 1);
  assert.equal(bendIndex(end(), { x: 150, y: 150 }), 0);
  const layout: LabLayout = { parts: [], wires: [wire] };
  const withBend = setWireBends(layout, 'w', [{ x: 1, y: 2 }]);
  assert.deepEqual(withBend.wires[0].bends, [{ x: 1, y: 2 }]);
  assert.equal(setWireBends(withBend, 'w', []).wires[0].bends, undefined);
});
