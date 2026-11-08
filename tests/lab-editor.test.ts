import assert from 'node:assert/strict';
import test from 'node:test';
import { behaviourKey, partById, partPins, PARTS, sanitize } from '../src/lib/lab/catalog';
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  emptyHistory,
  record,
  redo,
  undo,
} from '../src/lib/lab/history';
import {
  addPart,
  addWire,
  disconnectParts,
  duplicatePart,
  movePart,
  removeItems,
  replugWire,
  setPartProps,
  turnPart,
} from '../src/lib/lab/layout-ops';
import { LEGACY_PARTS, migrateLayout } from '../src/lib/lab/migrate';
import { padTerminal } from '../src/lib/lab/pads';
import type { LabLayout } from '../src/lib/lab/runtime';
import { linkStatus } from '../src/lib/lab/wiring';

const empty: LabLayout = { parts: [], wires: [] };

test('pins depend on the properties of a part', () => {
  // The plus and the minus that every part has are not counted here.
  const pins = (id: string, opts: Record<string, unknown>) =>
    partPins(partById.get(id)!, opts)
      .filter((pin) => pin[2] !== 'vcc' && pin[2] !== 'gnd')
      .map((pin) => pin[0]);
  assert.deepEqual(pins('bar', { count: 4 }), ['1', '2', '3', '4']);
  assert.equal(pins('bar', {}).length, 8, 'the default is eight');
  assert.equal(pins('segn', { digits: 2 }).length, 10);
  assert.deepEqual(pins('segn', { digits: 3 }).slice(8), ['D1', 'D2', 'D3']);
  assert.equal(pins('matrix', { size: '5x7' }).length, 12);
  assert.equal(pins('dip', { count: 2 }).length, 2);
  assert.deepEqual(pins('keypad', { layout: '1x4' }), ['R1', 'C1', 'C2', 'C3', 'C4']);
  assert.deepEqual(pins('keypad', { layout: '3x4' }).slice(4), ['C1', 'C2', 'C3']);
  assert.equal(pins('analyzer', { channels: 7 }).length, 7);
  assert.equal(partPins(partById.get('const')!, { level: '0' })[0][1], '0');
  // A value the schema does not allow falls back to the default instead of breaking the part.
  assert.equal(pins('bar', { count: 99 }).length, 8);
  assert.equal(pins('bar', { count: '6' }).length, 8);
  // The same property values give the very same pins, so they can be compared cheaply.
  assert.equal(
    partPins(partById.get('bar')!, { count: 5 }),
    partPins(partById.get('bar')!, { count: 5 }),
  );
});

test('behaviour and look are told apart so that only behaviour restarts the design', () => {
  const led = partById.get('led')!;
  assert.equal(behaviourKey(led, { color: '#3d8bff' }), behaviourKey(led, { color: '#34d058' }));
  assert.notEqual(behaviourKey(led, { activeLow: true }), behaviourKey(led, { activeLow: false }));
  const pulse = partById.get('pulse')!;
  assert.equal(behaviourKey(pulse, { hz: 10 }), behaviourKey(pulse, { hz: 1000 }));
  assert.notEqual(
    behaviourKey(partById.get('bar')!, { count: 4 }),
    behaviourKey(partById.get('bar')!, { count: 5 }),
  );
  const prop = led.props!.find((item) => item.key === 'color')!;
  assert.equal(sanitize(prop, '#123456'), prop.default);
});

test('every old part maps to a part of the new catalogue with valid properties', () => {
  for (const [old, target] of Object.entries(LEGACY_PARTS)) {
    const def = partById.get(target.def);
    assert.ok(def, `${old} -> ${target.def}`);
    for (const [key, value] of Object.entries(target.opts ?? {}))
      assert.deepEqual(
        sanitize(
          def.props!.find((prop) => prop.key === key)!,
          value,
        ),
        value,
        `${old}: ${key}`,
      );
  }
  assert.ok(PARTS.length >= 50, `${PARTS.length} parts`);
});

test('a saved bench of the old format keeps working', () => {
  const layout = migrateLayout({
    parts: [
      { uid: 'a', def: 'led-blue', x: 40, y: 40, rot: 0, opts: {} },
      { uid: 'b', def: 'seg4-ca', x: 400, y: 800, rot: 180, opts: {} },
      { uid: 'c', def: 'bar10', x: 40, y: 150, rot: 0, opts: { activeLow: true } },
      { uid: 'd', def: 'const-1', x: 40, y: 250, rot: 0, opts: {} },
      { uid: 'e', def: 'btn-arcade', x: 40, y: 350, rot: 0, opts: { on: [true] } },
      { uid: 'f', def: 'no-such-part', x: 0, y: 0, rot: 0, opts: {} },
    ],
    wires: [
      { id: 'w1', part: 'a', pin: 'A', fpga: 15 },
      { id: 'w2', part: 'b', pin: 'D4', fpga: 71 },
      { id: 'w3', part: 'c', pin: '10', fpga: 72 },
      { id: 'w4', part: 'd', pin: '1', fpga: 73 },
      { id: 'w5', part: 'f', pin: 'X', fpga: 74 },
      { id: 'w6', part: 'a', pin: 'ZZ', fpga: 75 },
    ],
  })!;
  const byUid = Object.fromEntries(layout.parts.map((item) => [item.uid, item]));
  assert.deepEqual(Object.keys(byUid), ['a', 'b', 'c', 'd', 'e'], 'unknown parts are dropped');
  assert.equal(byUid.a.def, 'led');
  assert.equal(byUid.a.opts.color, '#3d8bff');
  assert.equal(byUid.b.def, 'segn');
  assert.equal(byUid.b.opts.common, 'anode');
  assert.equal(byUid.c.opts.count, 10);
  assert.equal(byUid.c.opts.activeLow, true, 'what the user had set survives');
  assert.deepEqual(byUid.e.opts.on, [true]);
  assert.equal(byUid.e.opts.size, 'large');
  // The merged constant has one pin whatever its value; wires to unknown pins go away.
  assert.deepEqual(
    layout.wires.filter((wire) => !/-(VCC|GND)$/.test(wire.id)).map((wire) => [wire.id, wire.from]),
    [
      ['w1', 'a:A'],
      ['w2', 'b:D4'],
      ['w3', 'c:10'],
      ['w4', 'd:OUT'],
    ],
  );
  // Before the supply was wired by hand the bench powered the parts: now it is wired for them.
  assert.ok(layout.wires.some((wire) => wire.from === 'a:VCC' && wire.to === 'board:3V3'));
  assert.ok(layout.wires.some((wire) => wire.from === 'a:GND' && wire.to === 'board:GND'));
  assert.equal(migrateLayout(null), null);
  assert.equal(migrateLayout({ parts: 1, wires: [] }), null);
  // A layout that is already current passes through unchanged.
  assert.deepEqual(migrateLayout(layout), layout);
});

test('a part goes onto a breadboard when there is one, else to a free place', () => {
  const board = addPart(empty, 'breadboard');
  const led = addPart(board.layout, 'led');
  const placed = led.layout.parts.find((part) => part.uid === led.uid)!;
  assert.equal(placed.mount?.on, board.uid);
  const second = addPart(led.layout, 'led');
  const other = second.layout.parts.find((part) => part.uid === second.uid)!;
  assert.notEqual(other.mount?.hole, placed.mount?.hole, 'a taken hole is not offered again');
  // Without a breadboard it stands loose.
  const loose = addPart(empty, 'led').layout.parts[0];
  assert.equal(loose.mount, undefined);
});

test('moving, turning, copying and removing parts keep the bench consistent', () => {
  const board = addPart(empty, 'breadboard');
  const led = addPart(board.layout, 'led');
  const wire = addWire(led.layout, `${led.uid}:A`, padTerminal(75));
  assert.ok(wire.wire);
  // Let go away from the holes: the part is unplugged and its wires stay.
  const moved = movePart(wire.layout, led.uid, 900, 300, null);
  const part = moved.parts.find((item) => item.uid === led.uid)!;
  assert.deepEqual([part.x, part.y, part.mount], [900, 300, undefined]);
  assert.equal(moved.wires.length, 1);
  assert.equal(turnPart(moved, led.uid).parts.find((item) => item.uid === led.uid)!.turn, 1);
  assert.equal(turnPart(moved, led.uid, false).parts.find((item) => item.uid === led.uid)!.turn, 3);
  const copy = duplicatePart(moved, led.uid);
  assert.equal(copy.layout.parts.length, moved.parts.length + 1);
  assert.equal(copy.layout.wires.length, 1, 'wires are not copied');
  assert.equal(disconnectParts(moved, [led.uid]).wires.length, 0);
  // A removed part takes its wires; what stood on a removed breadboard stays on the bench.
  assert.equal(removeItems(moved, [led.uid], null).wires.length, 0);
  const stuck = removeItems(led.layout, [board.uid], null);
  assert.equal(stuck.parts.length, 1);
  assert.equal(stuck.parts[0].mount, undefined);
});

test('wires are added once, replugged and refused to the same terminal', () => {
  const a = addWire(empty, 'led:A', 'board:75');
  assert.ok(a.wire);
  assert.equal(addWire(a.layout, 'board:75', 'led:A').wire, undefined, 'the same two are one wire');
  assert.equal(addWire(a.layout, 'led:A', 'led:A').wire, undefined);
  const moved = replugWire(a.layout, a.wire.id, 'to', 'board:80');
  assert.equal(moved.wires[0].to, 'board:80');
  assert.equal(replugWire(a.layout, a.wire.id, 'to', 'led:A'), a.layout, 'a wire has two ends');
});

test('changing a property that removes pins drops their wires and keeps the part', () => {
  const bar = addPart(empty, 'bar');
  const wired = addWire(bar.layout, `${bar.uid}:8`, padTerminal(75));
  const wired2 = addWire(wired.layout, `${bar.uid}:2`, padTerminal(76));
  const smaller = setPartProps(wired2.layout, bar.uid, { opts: { count: 4 } });
  assert.deepEqual(
    smaller.wires.map((wire) => wire.from),
    [`${bar.uid}:2`],
  );
  assert.equal(smaller.parts.length, 1);
});

test('undo and redo walk through snapshots, merge quick edits of one kind and stay bounded', () => {
  let history = emptyHistory<number>();
  let present = 0;
  const edit = (next: number, key?: string, now = 0) => {
    history = record(history, present, key, now);
    present = next;
  };
  edit(1);
  edit(2);
  edit(3);
  const back = undo(history, present)!;
  assert.equal(back.present, 2);
  history = back.history;
  present = back.present;
  const forward = redo(history, present)!;
  assert.equal(forward.present, 3);
  history = forward.history;
  present = forward.present;
  assert.equal(redo(history, present), null);
  // A new edit forgets what was undone.
  history = undo(history, present)!.history;
  present = 2;
  edit(10);
  assert.deepEqual(history.future, []);
  // Typing is one step for as long as it goes on; a pause or another kind starts a new one.
  history = emptyHistory();
  present = 0;
  edit(1, 'label', 1000);
  edit(2, 'label', 1000 + COALESCE_MS - 1);
  edit(3, 'label', 1000 + 3 * COALESCE_MS);
  edit(4, 'color', 1000 + 3 * COALESCE_MS + 1);
  assert.deepEqual(history.past, [0, 2, 3]);
  // An edit without a kind is never merged.
  edit(5);
  edit(6);
  assert.equal(history.past.length, 5);
  history = emptyHistory();
  for (let index = 0; index < HISTORY_LIMIT + 30; index++) edit(index);
  assert.equal(history.past.length, HISTORY_LIMIT);
  assert.equal(undo(emptyHistory<number>(), 0), null);
});

test('a wire is refused by a pad of the wrong direction or a power pad, and says why', () => {
  const targets = new Map([
    [15, { net: 1, direction: 'output' as const, signal: 'led0' }],
    [75, { net: 2, direction: 'input' as const, signal: 'a' }],
    [76, { net: 3, direction: 'inout' as const, signal: 'sda' }],
  ]);
  assert.equal(linkStatus('in', 15, targets).ok, true);
  assert.equal(linkStatus('out', 75, targets).ok, true);
  assert.equal(linkStatus('in', 75, targets).ok, false);
  assert.match(linkStatus('in', 75, targets).reason!, /вход схемы \(a\)/);
  assert.equal(linkStatus('out', 15, targets).ok, false);
  assert.match(linkStatus('out', 15, targets).reason!, /выход схемы \(led0\)/);
  assert.equal(linkStatus('in', 76, targets).ok, true);
  assert.equal(linkStatus('out', 42, targets).ok, true, 'a pad nobody uses yet can be assigned');
  assert.equal(linkStatus('in', null, targets).ok, false);
  assert.equal(linkStatus('in', 15, undefined).ok, true);
});
