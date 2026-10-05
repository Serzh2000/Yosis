import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BENCH,
  BOARD,
  EXIT,
  HEADER,
  WIRE_COLORS,
  fitOnBench,
  headerByFpga,
  nextWireColor,
  partBox,
  partLayout,
  pinPoint,
  routeWires,
  turn,
  type WireEnds,
} from '../src/lib/lab/bench';
import { PARTS, behaviourKey, partById, partPins, sanitize } from '../src/lib/lab/catalog';
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
  busConnect,
  connectWire,
  nudgeParts,
  pasteParts,
  removeItems,
  replugWire,
  rotateParts,
  setPartProps,
} from '../src/lib/lab/layout-ops';
import { LEGACY_PARTS, migrateLayout } from '../src/lib/lab/migrate';
import type { LabLayout, LabPart, Rot } from '../src/lib/lab/runtime';
import { linkStatus } from '../src/lib/lab/wiring';

const part = (def: string, patch: Partial<LabPart> = {}): LabPart => ({
  uid: def,
  def,
  x: 100,
  y: 100,
  rot: 0,
  opts: {},
  ...patch,
});
const empty: LabLayout = { parts: [], wires: [] };

test('pins depend on the properties of a part', () => {
  const pins = (id: string, opts: Record<string, unknown>) =>
    partPins(partById.get(id)!, opts).map((pin) => pin[0]);
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
      { uid: 'a', def: 'led-blue', x: 40, y: 40, opts: {} },
      // Below the board: the old rule turned its pins up.
      { uid: 'b', def: 'seg4-ca', x: 400, y: 800, opts: {} },
      { uid: 'c', def: 'bar10', x: 40, y: 150, opts: { activeLow: true } },
      { uid: 'd', def: 'const-1', x: 40, y: 250, opts: {} },
      { uid: 'e', def: 'btn-arcade', x: 40, y: 350, opts: { on: [true] } },
      { uid: 'f', def: 'no-such-part', x: 0, y: 0, opts: {} },
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
  assert.equal(byUid.a.rot, 0);
  assert.equal(byUid.b.rot, 180, 'parts below the board keep their pins turned up');
  assert.equal(byUid.c.opts.count, 10);
  assert.equal(byUid.c.opts.activeLow, true, 'what the user had set survives');
  assert.deepEqual(byUid.e.opts.on, [true]);
  assert.equal(byUid.e.opts.size, 'large');
  // The merged constant has one pin whatever its value; wires to unknown pins go away.
  assert.deepEqual(
    layout.wires.map((wire) => [wire.id, wire.pin]),
    [
      ['w1', 'A'],
      ['w2', 'D4'],
      ['w3', '10'],
      ['w4', 'OUT'],
    ],
  );
  assert.equal(migrateLayout(null), null);
  assert.equal(migrateLayout({ parts: 1, wires: [] }), null);
  // A layout that is already current passes through unchanged.
  assert.deepEqual(migrateLayout(layout), layout);
});

test('pins stand on the side the rotation names, and the body keeps its size', () => {
  const led = partById.get('led')!;
  const at = (rot: Rot) => {
    const placed = part('led', { rot });
    return {
      box: partBox(placed, led),
      pin: pinPoint(placed, led, 0),
      layout: partLayout(led, {}, rot),
    };
  };
  const bottom = at(0);
  assert.equal(bottom.pin.y, bottom.box.y + bottom.box.h);
  assert.ok(Math.abs(bottom.pin.x - (bottom.box.x + bottom.box.w / 2)) < 0.01);
  const top = at(180);
  assert.equal(top.pin.y, top.box.y);
  const left = at(90);
  assert.equal(left.pin.x, left.box.x);
  const right = at(270);
  assert.equal(right.pin.x, right.box.x + right.box.w);
  // With the pins at a side the part is wider, and the picture is the same size.
  assert.ok(left.box.w > bottom.box.w);
  assert.deepEqual(
    [left.layout.body.h, right.layout.body.h],
    [bottom.layout.body.h, bottom.layout.body.h],
  );
  assert.equal(left.layout.pins.x, 0);
  assert.ok(right.layout.pins.x > 0);
  // Pins of a row are spread along the side and never leave it.
  const bar = partById.get('bar')!;
  for (const rot of [0, 90, 180, 270] as Rot[]) {
    const placed = part('bar', { rot });
    const box = partBox(placed, bar);
    const points = [0, 7].map((pin) => pinPoint(placed, bar, pin));
    for (const point of points) {
      assert.ok(point.x >= box.x && point.x <= box.x + box.w, `x in ${rot}`);
      assert.ok(point.y >= box.y && point.y <= box.y + box.h, `y in ${rot}`);
    }
    assert.ok(
      Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) > 100,
      `spread ${rot}`,
    );
  }
  assert.deepEqual(
    [0, 90, 180, 270].map((rot) => turn(rot as Rot, true)),
    [90, 180, 270, 0],
  );
  assert.deepEqual(
    [0, 90, 180, 270].map((rot) => turn(rot as Rot, false)),
    [270, 0, 90, 180],
  );
});

test('a rotated part turns about its centre and stays on the bench', () => {
  const layout = { ...empty, parts: [part('bar', { x: 500, y: 100 })] };
  const before = partBox(layout.parts[0], partById.get('bar')!);
  const after = rotateParts(layout, ['bar'], true).parts[0];
  assert.equal(after.rot, 90);
  const box = partBox(after, partById.get('bar')!);
  assert.ok(Math.abs(box.x + box.w / 2 - (before.x + before.w / 2)) <= 6);
  assert.ok(Math.abs(box.y + box.h / 2 - (before.y + before.h / 2)) <= 6);
  // At the edge it is pushed back inside.
  const edge = rotateParts({ ...empty, parts: [part('bar', { x: 0, y: 0 })] }, ['bar'], true)
    .parts[0];
  assert.ok(edge.x >= 0 && edge.y >= 0);
  const four = [true, true, true, true].reduce(
    (value) => rotateParts(value, ['bar'], true),
    layout,
  );
  assert.equal(four.parts[0].rot, 0);
});

/** The first segment of a path: its start and the end of its first straight run. */
function firstRun(path: string) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return { start: [numbers[0], numbers[1]], next: [numbers[2], numbers[3]] };
}
test('wires leave a pin straight out of the part in every direction and end on their pad', () => {
  const led = partById.get('led')!;
  const top = HEADER.find((pad) => pad.fpga === 75)!;
  const bottom = HEADER.find((pad) => pad.fpga === 15)!;
  for (const rot of [0, 90, 180, 270] as Rot[]) {
    for (const [x, y] of [
      [100, 100],
      [900, 120],
      [150, 780],
      [1100, 760],
      [60, 450],
    ]) {
      for (const pad of [top, bottom]) {
        const placed = part('led', { rot, x, y });
        const from = pinPoint(placed, led, 0);
        const wire = { id: `${rot}-${x}-${y}-${pad.fpga}`, part: 'led', pin: 'A', fpga: pad.fpga! };
        const ends: WireEnds[] = [
          { wire, from, exit: EXIT[rot], rect: partBox(placed, led), to: pad },
        ];
        const path = routeWires(ends).get(wire.id)!;
        const run = firstRun(path);
        const label = `${rot} ${x},${y} -> ${pad.fpga}`;
        assert.deepEqual(run.start, [from.x, from.y]);
        // The first run is along the pin's direction and not sideways.
        const dx = run.next[0] - from.x;
        const dy = run.next[1] - from.y;
        if (EXIT[rot].x)
          assert.ok(dx * EXIT[rot].x >= 0 && Math.abs(dy) < 8, `horizontal ${label}`);
        else assert.ok(dy * EXIT[rot].y >= 0 && Math.abs(dx) < 8, `vertical ${label}`);
        const tail = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        assert.deepEqual(tail.slice(-2), [pad.x, pad.y], `ends on the pad ${label}`);
      }
    }
  }
});

test('wires to the far header go round an end of the board, and neighbours get lanes of their own', () => {
  const led = partById.get('led')!;
  const placed = part('led', { x: 600, y: 60 });
  const from = pinPoint(placed, led, 0);
  const far = headerByFpga.get(15)!;
  const path = routeWires([
    {
      wire: { id: 'far', part: 'led', pin: 'A', fpga: 15 },
      from,
      exit: EXIT[0],
      rect: partBox(placed, led),
      to: far,
    },
  ]).get('far')!;
  const xs = (path.match(/-?\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((_, index) => index % 2 === 0);
  assert.ok(
    xs.some((x) => x < BOARD.x || x > BOARD.x + BOARD.w),
    'goes around the board',
  );
  const pads = [75, 80, 42].map((fpga) => headerByFpga.get(fpga)!);
  const routes = routeWires(
    pads.map((to, index) => ({
      wire: { id: `n${index}`, part: 'led', pin: 'A', fpga: to.fpga! },
      from: { x: from.x + index * 24, y: from.y },
      exit: EXIT[0],
      rect: partBox(placed, led),
      to,
    })),
  );
  assert.equal(new Set(routes.values()).size, 3);
});

test('a bench keeps parts on it and off the board picture', () => {
  const outside = fitOnBench({ x: BENCH.w - 20, y: -30, w: 100, h: 80 });
  assert.deepEqual(outside, { x: -80, y: 30 });
  const onBoard = fitOnBench({ x: BOARD.x + 300, y: BOARD.y + 100, w: 100, h: 80 });
  const moved = { x: BOARD.x + 300 + onBoard.x, y: BOARD.y + 100 + onBoard.y };
  const clear =
    moved.x + 100 <= BOARD.x ||
    moved.x >= BOARD.x + BOARD.w ||
    moved.y + 80 <= BOARD.y ||
    moved.y >= BOARD.y + BOARD.h;
  assert.ok(clear, 'pushed out of the board');
  assert.deepEqual(fitOnBench({ x: 10, y: 10, w: 50, h: 50 }), { x: 0, y: 0 });
  const added = addPart(empty, 'bar');
  const box = partBox(added.layout.parts[0], partById.get('bar')!);
  assert.deepEqual(fitOnBench(box), { x: 0, y: 0 }, 'a new part is already in a good place');
});

test('changing a property that removes pins drops their wires and keeps the part on the bench', () => {
  let layout: LabLayout = { parts: [part('bar', { x: 1100, y: 100 })], wires: [] };
  for (const pin of ['1', '4', '8'])
    layout = connectWire(layout, { part: 'bar', pin, fpga: 75 }).layout;
  assert.equal(layout.wires.length, 3);
  const fewer = setPartProps(layout, 'bar', { opts: { count: 4 } });
  assert.deepEqual(
    fewer.wires.map((wire) => wire.pin),
    ['1', '4'],
  );
  assert.equal(fewer.parts[0].opts.count, 4);
  const more = setPartProps(layout, 'bar', { opts: { count: 10 } });
  assert.equal(more.wires.length, 3);
  const box = partBox(more.parts[0], partById.get('bar')!);
  assert.ok(box.x + box.w <= BENCH.w, 'a part that grew stays inside');
  assert.equal(setPartProps(layout, 'bar', { label: 'Мой' }).parts[0].label, 'Мой');
  assert.equal(
    setPartProps(setPartProps(layout, 'bar', { label: 'Мой' }), 'bar', { label: '' }).parts[0]
      .label,
    undefined,
  );
  // The original layout is untouched.
  assert.equal(layout.parts[0].opts.count, undefined);
});

test('a pin holds one wire, a pad holds several, and new wires differ in colour', () => {
  let layout: LabLayout = { parts: [part('led'), part('bar')], wires: [] };
  const first = connectWire(layout, { part: 'led', pin: 'A', fpga: 15 });
  layout = first.layout;
  layout = connectWire(layout, { part: 'bar', pin: '1', fpga: 15 }).layout;
  assert.equal(layout.wires.length, 2, 'two wires on one pad');
  layout = connectWire(layout, { part: 'led', pin: 'A', fpga: 16 }).layout;
  assert.equal(layout.wires.length, 2, 'the pin took the new wire instead');
  assert.equal(layout.wires.filter((wire) => wire.part === 'led').length, 1);
  for (let index = 2; index < 12; index++)
    layout = connectWire(layout, {
      part: 'bar',
      pin: String((index % 8) + 1),
      fpga: 20 + index,
    }).layout;
  const colours = layout.wires.map((wire) => wire.color!);
  colours.slice(1).forEach((colour, index) => assert.notEqual(colour, colours[index]));
  assert.equal(nextWireColor([]), WIRE_COLORS[0]);
  assert.equal(
    nextWireColor([{ id: 'x', part: 'p', pin: 'q', fpga: 1, color: WIRE_COLORS[9] }]),
    WIRE_COLORS[0],
  );
  // Moving one end of a wire.
  const wireId = layout.wires[0].id;
  const moved = replugWire(layout, wireId, { fpga: 77 });
  assert.equal(moved.wires.find((wire) => wire.id === wireId)!.fpga, 77);
  const other = replugWire(layout, wireId, { part: 'bar', pin: '1' });
  assert.ok(
    !other.wires.some((wire) => wire.id !== wireId && wire.part === 'bar' && wire.pin === '1'),
  );
  assert.equal(
    removeItems(layout, [], wireId).wires.some((wire) => wire.id === wireId),
    false,
  );
  assert.equal(
    removeItems(layout, ['bar'], null).wires.some((wire) => wire.part === 'bar'),
    false,
  );
});

test('a bus drag wires the following pins to the following free pads of the row', () => {
  let layout: LabLayout = { parts: [part('bar')], wires: [] };
  // Pad 73 is taken by something else, so the bus has to skip it.
  layout = connectWire(
    { ...layout, parts: [...layout.parts, part('led')] },
    { part: 'led', pin: 'A', fpga: 74 },
  ).layout;
  const made = busConnect(layout, 'bar', 2, 73);
  const row = HEADER.filter((pad) => pad.row === 'bottom');
  const start = row.findIndex((pad) => pad.fpga === 73);
  assert.equal(start, 0);
  assert.deepEqual(
    made.wires.map((wire) => [wire.pin, wire.fpga]),
    [
      ['3', 73],
      ['4', 76],
      ['5', 85],
      ['6', 77],
      ['7', 15],
      ['8', 16],
    ],
  );
  const top = busConnect({ parts: [part('bar')], wires: [] }, 'bar', 0, 72);
  // Pad 72 is near the end of the top row: only the pads after it are used, power pads are not.
  assert.deepEqual(
    top.wires.map((wire) => wire.fpga),
    [72, 71, 53, 52],
  );
  assert.equal(new Set(made.layout.wires.map((wire) => wire.color)).size > 3, true);
});

test('copies are offset, keep their properties and do not take wires along', () => {
  const layout: LabLayout = {
    parts: [part('led', { opts: { color: '#3d8bff' }, label: 'Мой' })],
    wires: [{ id: 'w', part: 'led', pin: 'A', fpga: 15 }],
  };
  const pasted = pasteParts(layout, layout.parts, 33);
  assert.equal(pasted.layout.parts.length, 2);
  const copy = pasted.layout.parts[1];
  assert.notEqual(copy.uid, 'led');
  assert.equal(copy.opts.color, '#3d8bff');
  assert.notEqual(copy.opts, layout.parts[0].opts, 'options are not shared');
  assert.equal(copy.label, 'Мой');
  assert.deepEqual([copy.x, copy.y], [133, 133]);
  assert.equal(pasted.layout.wires.length, 1);
  const nudged = nudgeParts(layout, ['led'], 11, -22).parts[0];
  assert.deepEqual([nudged.x, nudged.y], [111, 78]);
  assert.deepEqual(
    [
      nudgeParts(layout, ['led'], -500, 0).parts[0].x,
      nudgeParts(layout, ['led'], 0, -500).parts[0].y,
    ],
    [0, 0],
  );
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
