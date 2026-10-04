import assert from 'node:assert/strict';
import test from 'node:test';
import {
  blockKinds,
  blocks,
  boardAssignments,
  circuitIssues,
  circuitPins,
  circuitProblems,
  compileCircuit,
  connectCircuit,
  emptyCircuit,
  library,
  materializeCircuitProject,
  newCircuitNode,
  newLibraryNode,
  parseCircuit,
  removeCircuitNode,
  starterCircuit,
  type CircuitDocument,
  type CircuitNode,
  type BlockKind,
} from '../shared/schematic';
import {
  alignNodes,
  normalizeParams,
  pasteSelection,
  serializeSelection,
  updateNode,
} from '../shared/circuit-edit';
import { validateProject } from '../shared/project-validation';
import { createWizardProject } from '../src/lib/project-wizard';
import { getProjectSnapshot } from '../src/lib/projects';
import { canvasPoint, fitCanvas, zoomCanvas } from '../src/lib/canvas-view';
import { circuitGeometry, routeWire } from '../src/lib/circuit-geometry';
import { quickCheck } from '../src/lib/circuit-connect';
import { syncBoardConstraints } from '../src/lib/circuit-board';
import { circuitExamples } from '../shared/circuit-examples';

test('fit includes elements outside the initial canvas and centers their bounds', () => {
  const bounds = { x: -200, y: 1100, width: 800, height: 300 },
    view = fitCanvas(1000, 680, bounds);
  const left = bounds.x * view.scale + view.x,
    top = bounds.y * view.scale + view.y;
  assert.ok(left >= 0 && top >= 0);
  assert.ok(left + bounds.width * view.scale <= 1000);
  assert.ok(top + bounds.height * view.scale <= 680);
  assert.deepEqual(canvasPoint(view, { x: 500, y: 340 }), { x: 200, y: 1250 });
});
const copy = () => structuredClone(starterCircuit());
const text = (doc: CircuitDocument) =>
  circuitIssues(doc)
    .map((issue) => issue.message)
    .join('\n');
test('bounded imported IDs and allocation cannot overflow or collide with sparse IDs', () => {
  const doc = copy();
  doc.nodes[0].id = 'n' + '9'.repeat(400);
  assert.throws(() => parseCircuit(JSON.stringify(doc)), /ID элемента/);
  doc.nodes[0].id = 'n999999999';
  assert.doesNotThrow(() => parseCircuit(JSON.stringify(doc)));
  const next = newCircuitNode(doc, 'gate');
  assert.equal(next.id, 'n1');
  assert.ok(!doc.nodes.some((node) => node.id === next.id));
  doc.wires[0].id = 'w' + '9'.repeat(400);
  assert.throws(() => parseCircuit(JSON.stringify(doc)), /ID соединения/);
});
test('reserved generated-net prefix cannot be used as a port', () => {
  const doc = copy();
  doc.nodes[0].name = '__ys_n1';
  assert.throws(() => compileCircuit(doc, 'top'), /зарезервирован/);
});
function node(
  kind: BlockKind,
  params: CircuitNode['params'] = {},
  extra: Partial<CircuitNode> = {},
): CircuitNode {
  return { ...newCircuitNode(emptyCircuit(), kind, params), ...extra };
}
test('schematic wizard preserves board contracts and materializes a custom module without overwriting the source', () => {
  const project = createWizardProject({ start: 'schematic', name: 'Моя схема', top: 'my_device' });
  assert.equal(project.files[0].name, 'top.ysch');
  const snapshot = getProjectSnapshot(project),
    compiled = materializeCircuitProject(project);
  assert.equal(getProjectSnapshot(project), snapshot);
  assert.match(compiled.files.find((file) => file.name === 'top.v')!.content, /module my_device/);
  assert.match(compiled.files[0].content, /IO_LOC "button" 88/);
  assert.equal(validateProject(project).files.length, 2);
});
test('incomplete drafts persist, but cannot generate an old or fabricated circuit', () => {
  const doc = copy();
  doc.wires = [];
  const project = createWizardProject({ start: 'schematic', name: 'draft', top: 'top' });
  project.files[0].content = JSON.stringify(doc);
  assert.doesNotThrow(() => validateProject(project));
  assert.throws(() => materializeCircuitProject(project), /не соединён/);
});
const mutations: [string, (doc: CircuitDocument) => void][] = [
  ['unsupported version', (doc) => ((doc as unknown as { version: number }).version = 3)],
  ['duplicate IDs', (doc) => (doc.nodes[1].id = doc.nodes[0].id)],
  [
    'unknown primitive',
    (doc) => ((doc.nodes[0] as unknown as { kind: string }).kind = 'javascript'),
  ],
  ['injected port name', (doc) => (doc.nodes[0].name = 'a); endmodule')],
  ['reserved keyword', (doc) => (doc.nodes[0].name = 'wire')],
  ['bad width', (doc) => (doc.nodes[0].params.width = 0)],
  ['excessive width', (doc) => (doc.nodes[0].params.width = 65)],
  ['fractional width', (doc) => (doc.nodes[0].params.width = 1.5)],
  ['nonfinite position', (doc) => (doc.nodes[0].x = Infinity)],
  ['bad rotation', (doc) => ((doc.nodes[0] as unknown as { rot: number }).rot = 45)],
  ['unknown parameter', (doc) => (doc.nodes[0].params.script = 'x')],
  ['missing parameter', (doc) => delete doc.nodes[0].params.width],
  [
    'unknown node field',
    (doc) => ((doc.nodes[0] as unknown as Record<string, unknown>).code = 'x'),
  ],
  ['unknown document field', (doc) => ((doc as unknown as Record<string, unknown>).code = 'x')],
  [
    'executable constant',
    (doc) => {
      doc.nodes.push({ ...newCircuitNode(doc, 'const'), id: 'n9' });
      doc.nodes[3].params.value = '1; $system("x")';
    },
  ],
  [
    'too many nodes',
    (doc) =>
      (doc.nodes = Array.from({ length: 401 }, (_, i) => ({ ...doc.nodes[0], id: `n${i}` }))),
  ],
  ['duplicate wires', (doc) => (doc.wires[1].id = doc.wires[0].id)],
  ['bad pin name', (doc) => (doc.wires[0].from.pin = 'y; drop')],
];
for (const [title, mutate] of mutations)
  test(`import rejects ${title}`, () => {
    const doc = copy();
    mutate(doc);
    assert.throws(() => parseCircuit(JSON.stringify(doc)));
  });
test('select parameters keep their declared type and tables, multi-selects and text are bounded', () => {
  const mux = node('mux', { inputs: '4' as unknown as number });
  assert.throws(
    () => parseCircuit(JSON.stringify({ ...emptyCircuit(), nodes: [mux] })),
    /параметра/,
  );
  for (const [kind, key, value] of [
    ['cmp', 'outs', ['eq', 'eq']],
    ['cmp', 'outs', ['bogus']],
    ['rom', 'words', Array.from({ length: 65 }, () => '0')],
    ['note', 'text', 'x'.repeat(301)],
    ['gate', 'inverted', 256],
    ['divider', 'hz', Number.NaN],
  ] as const)
    assert.throws(() =>
      parseCircuit(
        JSON.stringify({ ...emptyCircuit(), nodes: [node(kind, { [key]: value as never })] }),
      ),
    );
});
test('import of a version 1 document strips unknown fields and does not interpret serialized instructions', () => {
  const v1 = {
    format: 'yosis-schematic',
    version: 1,
    code: 'execute me',
    nodes: [
      {
        id: 'n1',
        kind: 'input',
        name: 'a',
        width: 1,
        x: 0,
        y: 0,
        value: '0',
        inputWidth: 1,
        lo: 0,
        hi: 0,
        reset: false,
        enable: false,
        script: 'execute me',
      },
    ],
    wires: [],
  };
  const doc = parseCircuit(JSON.stringify(v1));
  assert.equal(doc.version, 2);
  assert.equal('code' in doc, false);
  assert.equal('script' in doc.nodes[0], false);
  assert.throws(() => parseCircuit('{bad json'), /JSON/);
});
test('driver checks reject reversed edges, multiple drivers, missing endpoints and incompatible widths', () => {
  const doc = copy();
  assert.throws(
    () => connectCircuit(doc, { node: 'n2', pin: 'A' }, { node: 'n3', pin: 'A' }),
    /выход/,
  );
  assert.throws(
    () => connectCircuit(doc, { node: 'n1', pin: 'Y' }, { node: 'n3', pin: 'A' }),
    /уже соединён/,
  );
  doc.wires = [];
  doc.nodes[1].params.width = 3;
  assert.throws(
    () => connectCircuit(doc, { node: 'n1', pin: 'Y' }, { node: 'n2', pin: 'A' }),
    /ширины/,
  );
  doc.wires = [{ id: 'w1', from: { node: 'n99', pin: 'Y' }, to: { node: 'n2', pin: 'A' } }];
  assert.match(text(doc), /контакт отсутствует/);
  const duplicate = copy();
  duplicate.wires.push({ ...duplicate.wires[0], id: 'w3' });
  assert.match(text(duplicate), /несколько источников/);
});
test('fanout is allowed, combinational feedback is rejected, register feedback is allowed', () => {
  const doc = copy();
  doc.nodes.push(node('output', {}, { id: 'n4', name: 'extra' }));
  const fanout = connectCircuit(doc, { node: 'n1', pin: 'Y' }, { node: 'n4', pin: 'A' });
  assert.deepEqual(circuitIssues(fanout), []);
  const loop = copy();
  loop.wires = [loop.wires[1]];
  assert.throws(
    () => connectCircuit(loop, { node: 'n2', pin: 'Y' }, { node: 'n2', pin: 'A' }),
    /петлю/,
  );
  const registered = copy();
  registered.nodes[1] = node('reg', { enable: true }, { id: 'n2', name: 'invert' });
  registered.wires = [
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'CLK' } },
    { id: 'w2', from: { node: 'n2', pin: 'Q' }, to: { node: 'n2', pin: 'D' } },
    { id: 'w3', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'EN' } },
    { id: 'w4', from: { node: 'n2', pin: 'Q' }, to: { node: 'n3', pin: 'A' } },
  ];
  assert.deepEqual(circuitIssues(registered), []);
  registered.wires[0].from = { node: 'n2', pin: 'Q' };
  assert.match(text(registered), /такт должен/);
});
test('renaming retains stable wiring; deleting an element removes every attached edge', () => {
  const doc = copy();
  doc.nodes[0].name = 'key';
  assert.match(compileCircuit(doc, 'top'), /assign invert = ~key;/);
  const removed = removeCircuitNode(doc, 'n2');
  assert.equal(removed.wires.length, 0);
  assert.equal(doc.wires.length, 2);
  assert.equal(newCircuitNode(removed, 'gate').id, 'n4');
});
test('every block kind has pins with positive widths and its symbol shares their anchors, in all rotations', () => {
  for (const kind of blockKinds)
    for (const rot of [0, 90, 180, 270] as const)
      for (const flip of [false, true]) {
        const value = { ...node(kind), rot, flip },
          geometry = circuitGeometry(value);
        assert.ok(geometry.width > 0 && geometry.height > 0);
        for (const pin of circuitPins(value)) {
          assert.ok(pin.width > 0);
          const anchor = geometry.pins.find((item) => item.name === pin.name);
          assert.ok(anchor, `${kind}.${pin.name}`);
          assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
          // Контакт лежит на границе повёрнутого символа.
          assert.ok(
            anchor.x >= 0 &&
              anchor.x <= geometry.width &&
              anchor.y >= 0 &&
              anchor.y <= geometry.height,
          );
        }
      }
});
test('rotation moves pins clockwise and keeps outward directions consistent', () => {
  const base = node('gate'),
    right = circuitGeometry({ ...base, rot: 90 });
  const output = right.pins.find((pin) => pin.name === 'Y')!;
  assert.deepEqual([output.dx, output.dy], [0, 1]);
  assert.equal(output.y, right.height);
  const mirrored = circuitGeometry({ ...base, flip: true }).pins.find((pin) => pin.name === 'Y')!;
  assert.deepEqual([mirrored.dx, mirrored.dy], [-1, 0]);
  assert.equal(mirrored.x, 0);
});
test('wire routes are orthogonal for every pair of pin directions', () => {
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const a of dirs)
    for (const b of dirs) {
      const points = routeWire({ x: 100, y: 100, ...a }, { x: 300, y: 220, ...b });
      for (let i = 1; i < points.length; i++)
        assert.ok(
          points[i].x === points[i - 1].x || points[i].y === points[i - 1].y,
          JSON.stringify(points),
        );
    }
});
test('range checks cover slices, extension, concatenation, constants, duplicate names and internal namespace', () => {
  const doc = (value: CircuitNode): CircuitDocument => ({ ...emptyCircuit(), nodes: [value] });
  for (const value of [
    node('slice', { inWidth: 2, lo: 1, hi: 4 }),
    node('extend', { inWidth: 4, outWidth: 2 }),
    node('concat', { parts: 2, w0: 64, w1: 1 }),
    node('const', { width: 3, value: '8' }),
    node('rom', { addrBits: 2, width: 3, words: ['0', '1', '9', '3'] }),
    node('counter', { width: 3, modulus: 9 }),
    node('counter', { width: 3, modulus: 1 }),
    node('divider', { mode: 'pulse', hz: 20_000_000 }),
    node('cmp', { outs: [] }),
    node('mult', { widthA: 40, widthB: 40 }),
  ])
    assert.throws(() => compileCircuit(doc(value), 'top'), /./, value.kind);
  const duplicate = copy();
  duplicate.nodes[1].name = duplicate.nodes[0].name;
  assert.throws(() => compileCircuit(duplicate, 'top'), /повторяется/);
  duplicate.nodes[1].name = 'invert';
  duplicate.nodes[0].name = '__ys_n2';
  assert.throws(() => compileCircuit(duplicate, 'top'), /зарезервирован/);
  assert.throws(() => compileCircuit(copy(), 'always'), /имя/);
});
test('derived net names cannot collide: a counter named cnt owns cnt_q and cnt_tc', () => {
  const doc = emptyCircuit();
  const counter = { ...node('counter', { tc: true }), id: 'n1', name: 'cnt' },
    clash = { ...node('output'), id: 'n2', name: 'cnt_q' };
  doc.nodes.push(counter, clash);
  assert.match(text(doc), /Имя цепи cnt_q/);
});
test('problems carry severity, the offending node and advice a beginner can follow', () => {
  const doc = emptyCircuit();
  doc.nodes.push(
    { ...node('gate'), id: 'n1', name: 'g' },
    { ...node('output'), id: 'n2', name: 'led' },
  );
  doc.wires.push({ id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } });
  const problems = circuitProblems(doc);
  assert.ok(
    problems.some(
      (item) => item.pin === 'A' && item.node === 'n1' && /Протяните провод/.test(item.message),
    ),
  );
  doc.nodes.push({ ...node('const'), id: 'n3', name: 'unused' });
  assert.ok(circuitProblems(doc).some((item) => item.severity === 'warning' && item.node === 'n3'));
  assert.ok(circuitIssues(doc).every((item) => item.severity !== 'warning'));
  // Ширины.
  doc.nodes[0].params.width = 4;
  assert.ok(
    circuitProblems(doc).some((item) => item.wire === 'w1' && /срез|Срез/.test(item.message)),
  );
});
test('net labels connect two places by name and are validated', () => {
  const doc = emptyCircuit();
  const input = { ...node('input'), id: 'n1', name: 'a' },
    out = { ...node('tag_out'), id: 'n2', name: 'bus_a' },
    inn = { ...node('tag_in'), id: 'n3', name: 'bus_a' },
    led = { ...node('output'), id: 'n4', name: 'y' };
  doc.nodes.push(input, out, inn, led);
  doc.wires.push(
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
    { id: 'w2', from: { node: 'n3', pin: 'Y' }, to: { node: 'n4', pin: 'A' } },
  );
  assert.deepEqual(circuitIssues(doc), []);
  assert.match(compileCircuit(doc, 'top'), /assign y = bus_a;/);
  doc.nodes[2].name = 'other';
  assert.match(text(doc), /не нашла метку/);
  doc.nodes[2].name = 'bus_a';
  doc.nodes[2].params.width = 2;
  assert.match(text(doc), /разную ширину/);
});
test('a label cannot hide a combinational loop', () => {
  const doc = emptyCircuit();
  doc.nodes.push(
    { ...node('buf'), id: 'n1', name: 'inv' },
    { ...node('tag_out'), id: 'n2', name: 'fb' },
    { ...node('tag_in'), id: 'n3', name: 'fb' },
    { ...node('output'), id: 'n4', name: 'y' },
  );
  doc.wires.push(
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
    { id: 'w2', from: { node: 'n3', pin: 'Y' }, to: { node: 'n1', pin: 'A' } },
    { id: 'w3', from: { node: 'n1', pin: 'Y' }, to: { node: 'n4', pin: 'A' } },
  );
  assert.match(text(doc), /Комбинационная петля/);
});
test('board terminals invert LEDs, keep buttons positive and produce assignments', () => {
  const button = { ...node('button', { which: 's2' }), id: 'n1', name: 'press' },
    led = { ...node('led', { index: 3 }), id: 'n2', name: 'lamp' },
    bank = { ...node('ledbank'), id: 'n3', name: 'all' },
    clk = { ...node('clock27'), id: 'n4', name: 'clk' },
    pattern = { ...node('const', { width: 6, value: '21' }), id: 'n5', name: 'pattern' };
  const doc: CircuitDocument = {
    ...emptyCircuit(),
    nodes: [button, led, clk, bank, pattern],
    wires: [
      { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'A' } },
      { id: 'w2', from: { node: 'n5', pin: 'Y' }, to: { node: 'n3', pin: 'A' } },
    ],
  };
  // Светодиод LED3 и шина из шести светодиодов делят вывод 18.
  assert.match(text(doc), /вывод платы 18 уже занят/);
  const clean: CircuitDocument = { ...doc, nodes: [button, led, clk], wires: [doc.wires[0]] };
  assert.deepEqual(circuitIssues(clean), []);
  const solo = compileCircuit(clean, 'top');
  assert.match(solo, /input wire press/);
  assert.match(solo, /assign lamp = ~press;/);
  const bankOnly: CircuitDocument = { ...doc, nodes: [clk, bank, pattern], wires: [doc.wires[1]] };
  assert.deepEqual(circuitIssues(bankOnly), []);
  const verilog = compileCircuit(bankOnly, 'top');
  assert.match(verilog, /output wire \[5:0\] all/);
  assert.match(verilog, /assign all = ~pattern;/);
  assert.deepEqual(
    boardAssignments(doc).map((item) => [item.signal, item.pin, item.direction]),
    [
      ['press', 87, 'input'],
      ['lamp', 18, 'output'],
      ['clk', 4, 'input'],
      ...[15, 16, 17, 18, 19, 20].map((pin, bit) => [`all[${bit}]`, pin, 'output']),
    ],
  );
});
test('library entries all create valid, parseable nodes with unique readable names', () => {
  const doc = emptyCircuit();
  for (const entry of library) {
    const created = newLibraryNode(doc, entry.id);
    assert.ok(/^[A-Za-z_][A-Za-z0-9_]*$/.test(created.name), created.name);
    doc.nodes.push(created);
  }
  assert.equal(
    new Set(doc.nodes.filter((item) => item.kind !== 'tag_in').map((item) => item.name)).size,
    doc.nodes.length - 1,
  );
  assert.doesNotThrow(() => parseCircuit(JSON.stringify(doc)));
  for (const kind of blockKinds)
    assert.ok(
      library.some((entry) => entry.kind === kind),
      `${kind} нет в библиотеке`,
    );
  for (const entry of library) {
    assert.ok(entry.help.length > 10);
    assert.doesNotThrow(() => circuitGeometry(newLibraryNode(emptyCircuit(), entry.id)));
  }
  // Любой блок по умолчанию описывается, имеет символ и текст справки.
  for (const kind of blockKinds) {
    const def = blocks[kind];
    assert.ok(def.title && def.help && def.describe(def.defaults));
    assert.ok(def.symbol(def.defaults, 'x').shape);
  }
});
test('LED and button terminals pick the next free number', () => {
  const doc = emptyCircuit();
  for (let i = 0; i < 3; i++) doc.nodes.push({ ...newLibraryNode(doc, 'led'), id: `n${i + 1}` });
  assert.deepEqual(
    doc.nodes.map((item) => item.params.index),
    [0, 1, 2],
  );
  assert.deepEqual(
    doc.nodes.map((item) => item.name),
    ['led0', 'led1', 'led2'],
  );
  const first = newLibraryNode(doc, 's1');
  doc.nodes.push({ ...first, id: 'n9' });
  assert.equal(newLibraryNode(doc, 's1').params.which, 's2');
});
test('clipboard text round-trips between documents with new IDs, unique names and inner wires only', () => {
  const doc = copy();
  const clip = serializeSelection(doc, ['n1', 'n2']);
  const result = pasteSelection(doc, clip, 20, 20);
  assert.equal(result.doc.nodes.length, 5);
  assert.equal(result.doc.wires.length, 3);
  assert.deepEqual(result.ids, ['n4', 'n5']);
  assert.equal(new Set(result.doc.nodes.map((item) => item.name)).size, 5);
  assert.deepEqual(result.doc.nodes[3].x, doc.nodes[0].x + 20);
  const other = pasteSelection(emptyCircuit(), clip, 0, 0);
  assert.equal(other.doc.wires.length, 1);
  assert.throws(() => pasteSelection(doc, '{"format":"x"}', 0, 0), /не схем|нет схемы/);
  assert.throws(() => pasteSelection(doc, 'not json', 0, 0), /нет схемы/);
  const hostile = JSON.stringify({
    format: 'yosis-schematic-clip',
    version: 2,
    nodes: [{ ...doc.nodes[0], kind: 'evil' }],
    wires: [],
  });
  assert.throws(() => pasteSelection(doc, hostile, 0, 0));
});
test('editing helpers: parameters are normalised, dangling wires dropped and alignment snaps to the grid', () => {
  const rom = node('rom');
  assert.equal((normalizeParams(rom, { addrBits: 4 }).words as string[]).length, 16);
  assert.equal((normalizeParams(rom, { addrBits: 1 }).words as string[]).length, 2);
  assert.equal(normalizeParams(node('shift', { width: 8, amount: 7 }), { width: 4 }).amount, 3);
  const doc = emptyCircuit();
  doc.nodes.push(
    { ...node('gate', { inputs: 3 }), id: 'n1', name: 'g' },
    { ...node('input'), id: 'n2', name: 'a' },
  );
  doc.wires.push({ id: 'w1', from: { node: 'n2', pin: 'Y' }, to: { node: 'n1', pin: 'C' } });
  const reduced = updateNode(doc, 'n1', { params: { ...doc.nodes[0].params, inputs: 2 } });
  assert.equal(reduced.wires.length, 0);
  assert.throws(() => updateNode(doc, 'n1', { name: 'bad name' }));
  const spread = emptyCircuit();
  for (let i = 0; i < 3; i++)
    spread.nodes.push({ ...node('buf'), id: `n${i + 1}`, name: `b${i}`, x: i * 137, y: 3 * i });
  const size = () => ({ width: 50, height: 40 });
  const left = alignNodes(spread, ['n1', 'n2', 'n3'], 'left', size);
  assert.deepEqual(
    left.nodes.map((item) => item.x),
    [0, 0, 0],
  );
  const distributed = alignNodes(spread, ['n1', 'n2', 'n3'], 'hdistribute', size);
  assert.equal(distributed.nodes[1].x % 10, 0);
  assert.ok(
    distributed.nodes[1].x > distributed.nodes[0].x &&
      distributed.nodes[1].x < distributed.nodes[2].x,
  );
});
test('connection checks explain why a target is rejected', () => {
  const doc = emptyCircuit();
  doc.nodes.push(
    { ...node('input', { width: 4 }), id: 'n1', name: 'a' },
    { ...node('buf'), id: 'n2', name: 'b' },
    { ...node('input'), id: 'n3', name: 'c' },
  );
  const reason = (check: ReturnType<typeof quickCheck>) => (check.ok ? '' : check.reason);
  assert.match(
    reason(quickCheck(doc, { node: 'n1', pin: 'Y' }, { node: 'n2', pin: 'A' })),
    /Ширины/,
  );
  assert.match(
    reason(quickCheck(doc, { node: 'n1', pin: 'Y' }, { node: 'n3', pin: 'Y' })),
    /два выхода/,
  );
  assert.match(
    reason(quickCheck(doc, { node: 'n2', pin: 'A' }, { node: 'n2', pin: 'A' })),
    /два входа/,
  );
  assert.equal(quickCheck(doc, { node: 'n2', pin: 'A' }, { node: 'n3', pin: 'Y' }).ok, true);
});
test('board constraints are written without touching manual assignments, and removed with the terminal', () => {
  const project = createWizardProject({ start: 'schematic', name: 'board', top: 'top' });
  const manual = {
    ...project,
    files: project.files.map((file) =>
      file.name.endsWith('.cst')
        ? {
            ...file,
            content: `${file.content}\nIO_LOC "extra" 30;\nIO_PORT "extra" IO_TYPE=LVCMOS33;\n`,
          }
        : file,
    ),
  };
  const doc = emptyCircuit();
  const before = emptyCircuit();
  doc.nodes.push({ ...newLibraryNode(doc, 's1'), id: 'n1' });
  doc.nodes.push({ ...newLibraryNode(doc, 'led'), id: 'n2' });
  const first = syncBoardConstraints(manual, before, doc);
  const cst = first.project.files.find((file) => file.name.endsWith('.cst'))!.content;
  assert.match(cst, /IO_LOC "s1" 88;/);
  assert.match(cst, /IO_LOC "led0" 15;/);
  assert.match(cst, /IO_LOC "extra" 30;/);
  // Повторная синхронизация ничего не дублирует.
  const again = syncBoardConstraints(first.project, doc, doc);
  assert.equal(again.project.files.find((file) => file.name.endsWith('.cst'))!.content, cst);
  const removed = syncBoardConstraints(first.project, doc, { ...doc, nodes: [doc.nodes[0]] });
  const after = removed.project.files.find((file) => file.name.endsWith('.cst'))!.content;
  assert.doesNotMatch(after, /"led0"/);
  assert.match(after, /IO_LOC "extra" 30;/);
  assert.match(after, /IO_LOC "s1" 88;/);
});
test('every gallery example is a complete valid schematic with board terminals', () => {
  assert.ok(circuitExamples.length >= 6);
  for (const example of circuitExamples) {
    const doc = example.build();
    assert.deepEqual(circuitIssues(doc), [], example.title);
    assert.doesNotThrow(() => compileCircuit(doc, 'top'), example.title);
    assert.ok(boardAssignments(doc).length > 0, example.title);
    assert.deepEqual(parseCircuit(JSON.stringify(doc)), doc);
  }
});
test('materialization rejects generated-file collisions and multiple documents before worker execution', () => {
  const project = createWizardProject({ start: 'schematic', name: 'collision', top: 'top' });
  assert.throws(
    () =>
      materializeCircuitProject({
        ...project,
        files: [...project.files, { name: 'top.v', content: 'module top; endmodule' }],
      }),
    /перезаписан/,
  );
  assert.throws(
    () =>
      validateProject({
        ...project,
        files: [...project.files, { ...project.files[0], name: 'second.ysch' }],
      }),
    /один файл/,
  );
});
test('canvas zoom preserves the world point under the cursor and respects scale limits', () => {
  const view = { x: 30, y: -70, scale: 1.7 },
    point = { x: 193, y: 297 },
    before = canvasPoint(view, point),
    next = zoomCanvas(view, 2, point);
  assert.ok(Math.abs(canvasPoint(next, point).x - before.x) < 1e-9);
  assert.ok(Math.abs(canvasPoint(next, point).y - before.y) < 1e-9);
  assert.equal(zoomCanvas(view, 100, point).scale, 5);
  assert.equal(zoomCanvas(view, 0.00001, point).scale, 0.35);
});
