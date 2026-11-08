import test from 'node:test';
import assert from 'node:assert/strict';
import { syncBoardConstraints } from '../src/lib/circuit-board';
import { createWizardProject } from '../src/lib/project-wizard';
import { readCst } from '../src/lib/pin-planner';
import { newCircuitNode, parseCircuit, removeCircuitNodes } from '../shared/schematic';
import { genericStarter } from './circuit-fixtures';

const pins = (project: Parameters<typeof readCst>[0]) =>
  Object.fromEntries(
    readCst(project)
      .filter((item) => item.kind === 'IO_LOC')
      .map((item) => [item.signal, item.value]),
  );
const orphans = (project: Parameters<typeof readCst>[0]) => {
  const located = new Set(
    readCst(project)
      .filter((item) => item.kind === 'IO_LOC')
      .map((item) => item.signal),
  );
  return readCst(project)
    .filter((item) => item.kind === 'IO_PORT' && !located.has(item.signal))
    .map((item) => item.signal);
};

test('a new schematic project starts on the board button and LED with their pins assigned', () => {
  const project = createWizardProject({ start: 'schematic', name: 'new', top: 'top' });
  const doc = parseCircuit(project.files[0].content);
  assert.deepEqual(
    doc.nodes.map((node) => node.kind),
    ['button', 'led'],
  );
  assert.deepEqual(pins(project), { s1: '88', led0: '15' });
  assert.deepEqual(orphans(project), []);
});

test('adding board blocks to the starter keeps one consistent .cst', () => {
  const project = createWizardProject({ start: 'schematic', name: 'new', top: 'top' });
  const before = parseCircuit(project.files[0].content);
  const after = { ...before, nodes: [...before.nodes] };
  for (const [kind, params] of [
    ['led', { index: 1 }],
    ['button', { which: 's2' }],
    ['clock27', {}],
  ] as const)
    after.nodes.push({ ...newCircuitNode(after, kind, params), x: 0, y: 300 });
  const synced = syncBoardConstraints(project, before, after);
  assert.deepEqual(synced.problems, []);
  assert.equal(pins(synced.project).led1, '16');
  assert.equal(pins(synced.project).s1, '88');
  assert.equal(pins(synced.project).button1, '87');
  assert.deepEqual(orphans(synced.project), []);
});

test('a pin held by a plain port of the circuit is reported, never taken away', () => {
  const doc = genericStarter();
  let project = createWizardProject({ start: 'schematic', name: 'new', top: 'top' });
  project = {
    ...project,
    files: project.files.map((file) =>
      file.name.endsWith('.cst')
        ? {
            ...file,
            content:
              'IO_LOC "led_n" 15;\nIO_PORT "led_n" IO_TYPE=LVCMOS33;\nIO_LOC "button" 88;\nIO_PORT "button" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\n',
          }
        : file,
    ),
  };
  const next = { ...doc, nodes: [...doc.nodes] };
  next.nodes.push({ ...newCircuitNode(next, 'led', { index: 0 }), x: 0, y: 300 });
  const synced = syncBoardConstraints(project, doc, next);
  assert.equal(synced.problems.length, 1);
  assert.deepEqual(pins(synced.project), { led_n: '15', button: '88' });
});

test('a pin left by a deleted port is freed together with its IO_PORT line', () => {
  const doc = genericStarter();
  let project = createWizardProject({ start: 'schematic', name: 'new', top: 'top' });
  project = {
    ...project,
    files: project.files.map((file) =>
      file.name.endsWith('.cst')
        ? { ...file, content: 'IO_LOC "old" 15;\nIO_PORT "old" IO_TYPE=LVCMOS33;\n' }
        : file,
    ),
  };
  const next = removeCircuitNodes(doc, ['n1', 'n2', 'n3']);
  next.nodes.push({ ...newCircuitNode(next, 'led', { index: 0 }), x: 0, y: 0 });
  const synced = syncBoardConstraints(project, null, next);
  assert.deepEqual(synced.problems, []);
  assert.equal(pins(synced.project).led1 ?? pins(synced.project).led0, '15');
  assert.equal(pins(synced.project).old, undefined);
  assert.deepEqual(orphans(synced.project), []);
});
