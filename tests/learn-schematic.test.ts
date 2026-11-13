import test from 'node:test';
import assert from 'node:assert/strict';
import { previewInit, previewSetInput, previewSettle } from '../shared/circuit-eval';
import {
  compileCircuit,
  newLibraryNode,
  parseCircuit,
  type CircuitDocument,
} from '../shared/schematic';
import { books } from '../src/learn/content/books';
import { flattenBook } from '../src/learn/content/schema';

/** A reference solution of each circuit page: blocks from the library and the wires between them. */
const SOLUTIONS: Record<
  string,
  { blocks: [entry: string, name: string][]; wires: [from: string, to: string][] }
> = {
  'circuit-wire': { blocks: [], wires: [['a.Y', 'y.A']] },
  'circuit-not': {
    blocks: [['not', 'g']],
    wires: [
      ['a.Y', 'g.A'],
      ['g.Y', 'y.A'],
    ],
  },
  'circuit-and': {
    blocks: [['and', 'g']],
    wires: [
      ['a.Y', 'g.A'],
      ['b.Y', 'g.B'],
      ['g.Y', 'y.A'],
    ],
  },
  'circuit-or': {
    blocks: [['or', 'g']],
    wires: [
      ['a.Y', 'g.A'],
      ['b.Y', 'g.B'],
      ['g.Y', 'y.A'],
    ],
  },
  'circuit-xor': {
    blocks: [['xor', 'g']],
    wires: [
      ['a.Y', 'g.A'],
      ['b.Y', 'g.B'],
      ['g.Y', 'y.A'],
    ],
  },
  'circuit-combo': {
    blocks: [
      ['and', 'both'],
      ['or', 'any'],
    ],
    wires: [
      ['a.Y', 'both.A'],
      ['b.Y', 'both.B'],
      ['both.Y', 'any.A'],
      ['c.Y', 'any.B'],
      ['any.Y', 'y.A'],
    ],
  },
};

function solved(start: string, id: string): CircuitDocument {
  const doc = parseCircuit(start);
  const solution = SOLUTIONS[id]!;
  solution.blocks.forEach(([entry, name], index) => {
    const node = newLibraryNode(doc, entry);
    node.name = name;
    node.x = 280;
    node.y = 40 + index * 120;
    doc.nodes.push(node);
  });
  const byName = new Map(doc.nodes.map((node) => [node.name, node]));
  solution.wires.forEach(([from, to], index) => {
    const [fromName, fromPin] = from.split('.'),
      [toName, toPin] = to.split('.');
    doc.wires.push({
      id: `w${index + 1}`,
      from: { node: byName.get(fromName!)!.id, pin: fromPin! },
      to: { node: byName.get(toName!)!.id, pin: toPin! },
    });
  });
  return doc;
}

const circuits = books.flatMap((book) =>
  flattenBook(book).flatMap(({ page }) =>
    // Only the pages written by hand: the authored lessons are checked by learn-authored.test.ts.
    page.task?.kind === 'circuit' && SOLUTIONS[page.id] ? [{ page, task: page.task }] : [],
  ),
);

test('every circuit page has a reference solution that meets all its checks', () => {
  assert.equal(circuits.length, Object.keys(SOLUTIONS).length);
  for (const { page, task } of circuits) {
    assert.ok(SOLUTIONS[page.id], `${page.id}: no reference solution in the test`);
    const source = task.exercise.project.files.find((file) => file.name.endsWith('.ysch'))!;
    const doc = solved(source.content, page.id);
    const out = doc.nodes.find((node) => node.name === task.exercise.output)!;
    const driver = doc.wires.find((wire) => wire.to.node === out.id)!.from;
    for (const item of task.exercise.cases) {
      let state = previewInit(doc);
      for (const node of doc.nodes.filter((value) => value.kind === 'input'))
        state = previewSetInput(state, node.id, BigInt(item.inputs[node.name]!), 1);
      const value = previewSettle(doc, state).values.get(`${driver.node}.${driver.pin}`);
      assert.equal(String(value), item.expected, `${page.id}: ${item.title}`);
    }
  }
});

test('the starter of a circuit page is empty of logic and compiles once it is wired', () => {
  for (const { page, task } of circuits) {
    const source = task.exercise.project.files.find((file) => file.name.endsWith('.ysch'))!;
    const start = parseCircuit(source.content);
    // Only ports: the learner brings the blocks.
    assert.ok(
      start.nodes.every((node) => node.kind === 'input' || node.kind === 'output'),
      page.id,
    );
    assert.equal(start.wires.length, 0, page.id);
    const verilog = compileCircuit(solved(source.content, page.id), 'top');
    assert.match(verilog, /module top \(/);
    assert.match(verilog, /output wire y/);
    // The checks drive exactly the inputs of the starter.
    const inputs = start.nodes.filter((node) => node.kind === 'input').map((node) => node.name);
    for (const item of task.exercise.cases)
      assert.deepEqual(Object.keys(item.inputs).sort(), inputs.sort(), page.id);
  }
});
