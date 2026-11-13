import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCircuit, libraryEntry, type CircuitDocument } from '../shared/schematic';
import { previewInit, previewSetInput, previewSettle } from '../shared/circuit-eval';
import { partById } from '../src/lib/lab/catalog';
import {
  benchStepHolds,
  schematicSolution,
  schematicStarter,
} from '../src/learn/content/authored/build';
import { schematicChapters, verilogChapters } from '../src/learn/content/authored';
import {
  benchSchematic as schematicBenchSpecs,
  benchVerilog as verilogBenchSpecs,
  schematic as schematicSpecs,
  verilog as verilogSpecs,
} from './learn-authored-specs';
import type { LessonBase, QuizSpec } from '../src/learn/content/authored/types';
import { books } from '../src/learn/content/books';
import { flattenBook } from '../src/learn/content/schema';

const ID = /^[a-z0-9][a-z0-9-]*$/;
const BINARY = /^[01]+$/;

function checkBase(spec: LessonBase, chapters: { id: string }[], problems: string[]) {
  const where = spec.id;
  if (!ID.test(spec.id) || spec.id.length > 60) problems.push(`${where}: bad lesson id`);
  if (!chapters.some((chapter) => chapter.id === spec.chapter))
    problems.push(`${where}: unknown chapter ${spec.chapter}`);
  if (!spec.title.trim()) problems.push(`${where}: no title`);
  if (!(spec.minutes >= 3 && spec.minutes <= 15)) problems.push(`${where}: minutes not in 3…15`);
  if (spec.theory.length < 1 || spec.theory.length > 4)
    problems.push(`${where}: needs 1 to 4 theory pages`);
  for (const page of spec.theory)
    if (!page.title.trim() || page.md.trim().length < 40)
      problems.push(`${where}: a theory page is empty or too short`);
  const quiz: QuizSpec | undefined = spec.quiz;
  if (quiz) {
    if (quiz.options.length < 2 || quiz.options.length > 4)
      problems.push(`${where}: quiz needs 2 to 4 options`);
    if (!Number.isInteger(quiz.answer) || quiz.answer < 0 || quiz.answer >= quiz.options.length)
      problems.push(`${where}: quiz answer is not an option`);
    if (new Set(quiz.options).size !== quiz.options.length)
      problems.push(`${where}: quiz has equal options`);
    if (!quiz.explain.trim()) problems.push(`${where}: quiz has no explanation`);
  }
}
const portsOf = (source: string) =>
  source.slice(source.indexOf('module top'), source.indexOf(');'));
const bitsOf = (expected: string) => expected.length;

test('Verilog lesson descriptions are well formed', () => {
  const problems: string[] = [];
  for (const spec of verilogSpecs) {
    checkBase(spec, verilogChapters, problems);
    const { practice } = spec,
      where = spec.id;
    if (!practice.text.trim()) problems.push(`${where}: no task text`);
    if (
      practice.hints.length < 2 ||
      practice.hints.length > 3 ||
      practice.hints.some((h) => !h.trim())
    )
      problems.push(`${where}: needs 2 or 3 hints`);
    if (!practice.starter.includes('module top')) problems.push(`${where}: starter has no top`);
    if (!practice.solution.includes('module top')) problems.push(`${where}: solution has no top`);
    if (practice.starter === practice.solution) problems.push(`${where}: starter is the solution`);
    if (portsOf(practice.starter) !== portsOf(practice.solution))
      problems.push(`${where}: starter and solution have different ports`);
    if (!practice.cases.length) problems.push(`${where}: no cases`);
    if (new Set(practice.cases.map((item) => item.title)).size !== practice.cases.length)
      problems.push(`${where}: cases with equal titles`);
    for (const item of practice.cases)
      if (!BINARY.test(item.expected))
        problems.push(`${where}: expected is not binary: ${item.title}`);
    const widths = new Set(practice.cases.map((item) => bitsOf(item.expected)));
    if (widths.size > 1) problems.push(`${where}: expected values of different widths`);
    if (!new RegExp(`\\b${practice.output}\\b`).test(portsOf(practice.solution)))
      problems.push(`${where}: output ${practice.output} is not a port of top`);
  }
  assert.deepEqual(problems, []);
});

test('schematic lesson descriptions are well formed and their solutions compile', () => {
  const problems: string[] = [];
  for (const spec of schematicSpecs) {
    checkBase(spec, schematicChapters, problems);
    const { practice } = spec,
      where = spec.id;
    if (!practice.text.trim()) problems.push(`${where}: no task text`);
    if (
      practice.hints.length < 2 ||
      practice.hints.length > 3 ||
      practice.hints.some((h) => !h.trim())
    )
      problems.push(`${where}: needs 2 or 3 hints`);
    if (!practice.cases.length) problems.push(`${where}: no cases`);
    const names = practice.inputs.map((port) => port.name);
    if (new Set([...names, practice.output]).size !== names.length + 1)
      problems.push(`${where}: port names repeat`);
    for (const item of practice.solution.blocks)
      if (!libraryEntry(item.entry)) problems.push(`${where}: no library entry ${item.entry}`);
    for (const item of practice.cases)
      if (!BINARY.test(item.expected))
        problems.push(`${where}: expected is not binary: ${item.title}`);
    let doc: CircuitDocument | undefined;
    try {
      doc = schematicSolution(spec);
      compileCircuit(doc, 'top');
      schematicStarter(spec);
    } catch (error) {
      problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
    // A circuit without a clock is checked at once, without the simulator. Input values are read as
    // the simulator reads them: plain digits are decimal, `0b…` is binary, `0x…` hex.
    if (doc && !practice.config?.clock) {
      const out = doc.nodes.find((node) => node.name === practice.output)!;
      const driver = doc.wires.find((wire) => wire.to.node === out.id)?.from;
      if (!driver) problems.push(`${where}: the output is not wired in the solution`);
      else
        for (const item of practice.cases) {
          let state = previewInit(doc);
          for (const node of doc.nodes.filter((value) => value.kind === 'input')) {
            const width = Number(node.params.width ?? 1);
            state = previewSetInput(state, node.id, BigInt(item.inputs[node.name] ?? '0'), width);
          }
          const value = previewSettle(doc, state).values.get(`${driver.node}.${driver.pin}`);
          const shown = value === null || value === undefined ? 'x' : value.toString(2);
          if (shown.padStart(item.expected.length, '0') !== item.expected)
            problems.push(
              `${where}: ${item.title}: solution gives ${shown}, expected ${item.expected}`,
            );
        }
    }
  }
  assert.deepEqual(problems, []);
});

test('bench lesson descriptions use real parts and checks', () => {
  const problems: string[] = [];
  for (const [specs, chapters] of [
    [verilogBenchSpecs, verilogChapters],
    [schematicBenchSpecs, schematicChapters],
  ] as const)
    for (const spec of specs) {
      checkBase(spec, chapters, problems);
      const where = spec.id;
      if (!spec.task.trim()) problems.push(`${where}: no task text`);
      if (!spec.parts.length) problems.push(`${where}: no parts on the shelf`);
      for (const item of spec.parts)
        if (!partById.has(item.part)) problems.push(`${where}: unknown part ${item.part}`);
      if (!spec.steps.length) problems.push(`${where}: no steps`);
      for (const step of spec.steps) {
        if (!partById.has(step.part))
          problems.push(`${where}: step with unknown part ${step.part}`);
        if (!spec.parts.some((item) => item.part === step.part))
          problems.push(`${where}: step part ${step.part} is not on the shelf`);
        if (!(step.count >= 1)) problems.push(`${where}: step count must be positive`);
        if (!step.text.trim()) problems.push(`${where}: step without text`);
      }
    }
  assert.deepEqual(problems, []);
});

test('a bench check counts parts and joined pins as it says', () => {
  const state = {
    layout: {
      parts: [
        { uid: 'a', def: 'led' },
        { uid: 'b', def: 'led' },
      ],
      wires: [],
    },
    connections: {
      wires: [
        { id: 'a:A', part: 'a', pin: 'A', fpga: 1 },
        { id: 'a:K', part: 'a', pin: 'K', fpga: 2 },
      ],
      shorts: [],
      netWires: new Map(),
    },
  } as unknown as Parameters<typeof benchStepHolds>[1];
  assert.equal(benchStepHolds({ text: '', check: 'placed', part: 'led', count: 2 }, state), true);
  assert.equal(benchStepHolds({ text: '', check: 'placed', part: 'led', count: 3 }, state), false);
  assert.equal(benchStepHolds({ text: '', check: 'wired', part: 'led', count: 1 }, state), true);
  assert.equal(benchStepHolds({ text: '', check: 'wired', part: 'led', count: 2 }, state), false);
  assert.equal(benchStepHolds({ text: '', check: 'pins', part: 'led', count: 2 }, state), true);
});

test('ids stay unique across the whole book, the guided course included', () => {
  for (const book of books) {
    const pages = flattenBook(book).map(({ page }) => page.id);
    assert.equal(new Set(pages).size, pages.length, `${book.id}: duplicate page ids`);
    const lessons = book.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
    assert.equal(new Set(lessons).size, lessons.length, `${book.id}: duplicate lesson ids`);
  }
});
