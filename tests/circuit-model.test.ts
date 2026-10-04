import assert from 'node:assert/strict';
import test from 'node:test';
import {
  blockCatalog,
  circuitIssues,
  circuitPins,
  compileCircuit,
  connectCircuit,
  materializeCircuitProject,
  newCircuitNode,
  parseCircuit,
  removeCircuitNode,
  starterCircuit,
  type CircuitDocument,
  type CircuitNode,
  type BlockKind,
} from '../shared/schematic';
import { validateProject } from '../shared/project-validation';
import { createWizardProject } from '../src/lib/project-wizard';
import { getProjectSnapshot } from '../src/lib/projects';
import { canvasPoint, fitCanvas, zoomCanvas } from '../src/lib/canvas-view';
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
test('bounded imported IDs and allocation cannot overflow or collide with sparse IDs', () => {
  const doc = copy();
  doc.nodes[0].id = 'n' + '9'.repeat(400);
  assert.throws(() => parseCircuit(JSON.stringify(doc)), /ID элемента/);
  doc.nodes[0].id = 'n999999999';
  assert.doesNotThrow(() => parseCircuit(JSON.stringify(doc)));
  const next = newCircuitNode(doc, 'and');
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
function node(kind: BlockKind, changes: Partial<CircuitNode> = {}) {
  return {
    ...newCircuitNode({ format: 'yosis-schematic', version: 1, nodes: [], wires: [] }, kind),
    ...changes,
  };
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
for (const [title, mutate] of [
  [
    'unsupported version',
    (doc: CircuitDocument) => {
      (doc as unknown as { version: number }).version = 2;
    },
  ],
  [
    'duplicate IDs',
    (doc: CircuitDocument) => {
      doc.nodes[1].id = doc.nodes[0].id;
    },
  ],
  [
    'unknown primitive',
    (doc: CircuitDocument) => {
      (doc.nodes[0] as unknown as { kind: string }).kind = 'javascript';
    },
  ],
  [
    'injected port name',
    (doc: CircuitDocument) => {
      doc.nodes[0].name = 'a); endmodule';
    },
  ],
  [
    'reserved keyword',
    (doc: CircuitDocument) => {
      doc.nodes[0].name = 'wire';
    },
  ],
  [
    'bad width',
    (doc: CircuitDocument) => {
      doc.nodes[0].width = 0;
    },
  ],
  [
    'excessive width',
    (doc: CircuitDocument) => {
      doc.nodes[0].width = 65;
    },
  ],
  [
    'nonfinite position',
    (doc: CircuitDocument) => {
      doc.nodes[0].x = Infinity;
    },
  ],
  [
    'executable constant',
    (doc: CircuitDocument) => {
      doc.nodes[0].value = '1; $system("x")';
    },
  ],
  [
    'too many nodes',
    (doc: CircuitDocument) => {
      doc.nodes = Array.from({ length: 201 }, (_, i) => ({ ...doc.nodes[0], id: `n${i}` }));
    },
  ],
  [
    'duplicate wires',
    (doc: CircuitDocument) => {
      doc.wires[1].id = doc.wires[0].id;
    },
  ],
] as const)
  test(`import rejects ${title}`, () => {
    const doc = copy();
    mutate(doc);
    assert.throws(() => parseCircuit(JSON.stringify(doc)));
  });
test('import strips unknown fields and does not interpret serialized instructions', () => {
  const doc = {
    ...copy(),
    code: 'execute me',
    nodes: copy().nodes.map((node) => ({ ...node, script: 'execute me' })),
  };
  assert.equal('code' in parseCircuit(JSON.stringify(doc)), false);
  assert.equal('script' in parseCircuit(JSON.stringify(doc)).nodes[0], false);
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
  doc.nodes[1].width = 3;
  assert.throws(
    () => connectCircuit(doc, { node: 'n1', pin: 'Y' }, { node: 'n2', pin: 'A' }),
    /ширины/,
  );
  doc.wires = [{ id: 'w1', from: { node: 'n99', pin: 'Y' }, to: { node: 'n2', pin: 'A' } }];
  assert.match(
    circuitIssues(doc)
      .map((issue) => issue.message)
      .join('\n'),
    /контакт отсутствует/,
  );
  const duplicate = copy();
  duplicate.wires.push({ ...duplicate.wires[0], id: 'w3' });
  assert.match(
    circuitIssues(duplicate)
      .map((issue) => issue.message)
      .join('\n'),
    /несколько источников/,
  );
});
test('fanout is allowed, combinational feedback is rejected, register feedback is allowed', () => {
  const doc = copy();
  doc.nodes.push(node('output', { id: 'n4', name: 'extra' }));
  const fanout = connectCircuit(doc, { node: 'n1', pin: 'Y' }, { node: 'n4', pin: 'A' });
  assert.deepEqual(circuitIssues(fanout), []);
  const loop = copy();
  loop.wires = [loop.wires[1]];
  assert.throws(
    () => connectCircuit(loop, { node: 'n2', pin: 'Y' }, { node: 'n2', pin: 'A' }),
    /петлю/,
  );
  const registered = copy();
  registered.nodes[1].kind = 'register';
  registered.nodes[1].enable = true;
  registered.wires = [
    { id: 'w1', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'CLK' } },
    { id: 'w2', from: { node: 'n2', pin: 'Q' }, to: { node: 'n2', pin: 'D' } },
    { id: 'w3', from: { node: 'n1', pin: 'Y' }, to: { node: 'n2', pin: 'EN' } },
    { id: 'w4', from: { node: 'n2', pin: 'Q' }, to: { node: 'n3', pin: 'A' } },
  ];
  assert.deepEqual(circuitIssues(registered), []);
  registered.wires[0].from = { node: 'n2', pin: 'Q' };
  assert.match(
    circuitIssues(registered)
      .map((issue) => issue.message)
      .join('\n'),
    /такт должен/,
  );
});
test('renaming retains stable wiring; deleting an element removes every attached edge', () => {
  const doc = copy();
  doc.nodes[0].name = 'key';
  assert.match(compileCircuit(doc, 'top'), /assign __ys_n2 = ~key/);
  const removed = removeCircuitNode(doc, 'n2');
  assert.equal(removed.wires.length, 0);
  assert.equal(doc.wires.length, 2);
  assert.equal(newCircuitNode(removed, 'and').id, 'n4');
});
test('all catalog pins have explicit widths and generated symbols share their anchors', async () => {
  const { circuitGeometry } = await import('../src/lib/circuit-geometry');
  for (const [kind] of blockCatalog) {
    const value = node(kind, { width: 4, inputWidth: 2, hi: 1, reset: true, enable: true }),
      geometry = circuitGeometry(value);
    for (const pin of circuitPins(value)) {
      assert.ok(pin.width > 0);
      const anchor = geometry.pins.find((value) => value.name === pin.name);
      assert.ok(anchor);
      assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
    }
  }
});
test('range checks cover slices, extension, concatenation, constants, duplicate names and internal namespace', () => {
  for (const value of [
    node('slice', { inputWidth: 2, lo: 1, hi: 4 }),
    node('extend', { inputWidth: 4, width: 2 }),
    node('concat', { width: 64, inputWidth: 1 }),
    node('constant', { width: 3, value: '8' }),
  ])
    assert.throws(() =>
      compileCircuit({ format: 'yosis-schematic', version: 1, nodes: [value], wires: [] }, 'top'),
    );
  const doc = copy();
  doc.nodes[1].name = doc.nodes[0].name;
  assert.throws(() => compileCircuit(doc, 'top'), /повторяется/);
  doc.nodes[1].name = 'invert';
  doc.nodes[0].name = '__ys_n2';
  assert.throws(() => compileCircuit(doc, 'top'), /зарезервирован/);
  assert.throws(() => compileCircuit(copy(), 'always'), /имя/);
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
