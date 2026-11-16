// Turns the descriptions of lessons into the pages of a book. Pure: no React, no network.
import type { SimulationConfig } from '../../../../shared/types';
import {
  emptyCircuit,
  newCircuitNode,
  newLibraryNode,
  type CircuitDocument,
} from '../../../../shared/schematic';
import type { BenchState, Block, ChapterDef, Exercise, LessonDef, PageDef } from '../schema';
import type { BenchLessonSpec, LessonBase, SchematicLessonSpec, VerilogLessonSpec } from './types';
import { t } from '../../../lib/i18n';

const baseConfig: SimulationConfig = {
  clock: null,
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 10,
  periodNs: 10,
  inputs: {},
};

/** The simulator's setup for a set of cases; what the author names in `config` wins. */
export function simulationConfig(
  cases: VerilogLessonSpec['practice']['cases'],
  over: Partial<SimulationConfig> = {},
): SimulationConfig {
  const last = cases.reduce((most, item) => Math.max(most, item.cycle), 0);
  return {
    ...baseConfig,
    cycles: last + 2,
    inputs: cases[0]?.inputs ?? {},
    stimuli: cases.map((item) => ({ cycle: item.cycle, inputs: item.inputs })),
    ...over,
  };
}

/* The pages of a lesson: its explanations, its quiz, its practice. */

function theoryPages(spec: LessonBase): PageDef[] {
  const pages: PageDef[] = spec.theory.map((page, at) => {
    const blocks: Block[] = [{ kind: 'text', md: page.md }];
    if (page.code) blocks.push({ kind: 'code', code: page.code, language: 'verilog' });
    return { id: `${spec.id}-t${at + 1}`, title: page.title, blocks };
  });
  if (spec.quiz)
    pages.push({
      id: `${spec.id}-quiz`,
      title: t('Проверь себя'),
      blocks: [
        {
          kind: 'quiz',
          question: spec.quiz.question,
          options: spec.quiz.options,
          answer: spec.quiz.answer,
          explain: spec.quiz.explain,
        },
      ],
      task: { kind: 'quiz', text: t('Выбери верный ответ.') },
    });
  return pages;
}

/* Verilog */

export function verilogExercise(spec: VerilogLessonSpec, source = spec.practice.starter): Exercise {
  const { practice } = spec;
  return {
    project: {
      name: `Урок ${spec.id}`,
      top: 'top',
      board: 'tangnano20k',
      files: [{ name: 'top.v', content: source }],
    },
    config: simulationConfig(practice.cases, practice.config),
    cases: practice.cases,
    output: practice.output,
  };
}

export function verilogLesson(spec: VerilogLessonSpec): LessonDef {
  const practice: PageDef = {
    id: `${spec.id}-practice`,
    title: t('Попробуй сам'),
    blocks: [{ kind: 'text', md: spec.practice.text }],
    task: {
      kind: 'sim',
      text: spec.practice.text,
      exercise: verilogExercise(spec),
      hints: spec.practice.hints,
    },
  };
  return {
    id: spec.id,
    title: spec.title,
    minutes: spec.minutes,
    pages: [...theoryPages(spec), practice],
  };
}

/* Schematic */

/** The starter of a schematic lesson: the ports, placed, and nothing between them. */
export function schematicStarter(spec: SchematicLessonSpec): CircuitDocument {
  const { practice } = spec;
  const doc = emptyCircuit();
  practice.inputs.forEach((port, index) => {
    const node = newCircuitNode(doc, 'input', { width: port.width ?? 1 }, port.name);
    node.name = port.name;
    node.x = 60;
    node.y = 60 + index * 100;
    doc.nodes.push(node);
  });
  const out = newCircuitNode(doc, 'output', { width: practice.outputWidth ?? 1 }, practice.output);
  out.name = practice.output;
  out.x = 620;
  out.y = 60 + ((practice.inputs.length - 1) * 100) / 2;
  doc.nodes.push(out);
  return doc;
}

/** The reference solution as a document: the starter with its blocks placed and wired. */
export function schematicSolution(spec: SchematicLessonSpec): CircuitDocument {
  const doc = schematicStarter(spec);
  const { blocks, wires } = spec.practice.solution;
  blocks.forEach((item, index) => {
    const node = newLibraryNode(doc, item.entry);
    node.name = item.name;
    node.params = { ...node.params, ...item.params };
    node.x = 260 + (index % 3) * 150;
    node.y = 40 + Math.floor(index / 3) * 130;
    doc.nodes.push(node);
  });
  const byName = new Map(doc.nodes.map((node) => [node.name, node]));
  wires.forEach(([from, to], index) => {
    const [fromName, fromPin] = from.split('.'),
      [toName, toPin] = to.split('.');
    const source = byName.get(fromName!),
      target = byName.get(toName!);
    if (!source || !target || !fromPin || !toPin)
      throw new Error(`${spec.id}: wire ${from} → ${to} names an unknown block or pin`);
    doc.wires.push({
      id: `w${index + 1}`,
      from: { node: source.id, pin: fromPin },
      to: { node: target.id, pin: toPin },
    });
  });
  return doc;
}

export function schematicExercise(
  spec: SchematicLessonSpec,
  doc = schematicStarter(spec),
): Exercise {
  const { practice } = spec;
  return {
    project: {
      name: `Урок ${spec.id}`,
      top: 'top',
      board: 'tangnano20k',
      files: [{ name: 'top.ysch', content: JSON.stringify(doc, null, 2) }],
    },
    config: simulationConfig(practice.cases, practice.config),
    cases: practice.cases,
    output: practice.output,
  };
}

export function schematicLesson(spec: SchematicLessonSpec): LessonDef {
  const practice: PageDef = {
    id: `${spec.id}-practice`,
    title: t('Собери схему'),
    blocks: [{ kind: 'text', md: spec.practice.text }],
    task: {
      kind: 'circuit',
      text: spec.practice.text,
      exercise: schematicExercise(spec),
      hints: spec.practice.hints,
    },
  };
  return {
    id: spec.id,
    title: spec.title,
    minutes: spec.minutes,
    pages: [...theoryPages(spec), practice],
  };
}

/* Bench */

const ownersOf = (state: BenchState, part: string) =>
  new Set(state.layout.parts.filter((item) => item.def === part).map((item) => item.uid));
const joinedPinsOf = (state: BenchState, part: string) => {
  const owners = ownersOf(state, part);
  return state.connections.wires.filter((wire) => owners.has(wire.part)).map((wire) => wire.id);
};

/** Whether one step of a bench lesson holds on the bench. */
export function benchStepHolds(step: BenchLessonSpec['steps'][number], state: BenchState): boolean {
  if (step.check === 'placed') return ownersOf(state, step.part).size >= step.count;
  if (step.check === 'pins') return joinedPinsOf(state, step.part).length >= step.count;
  const owners = ownersOf(state, step.part);
  const wired = new Set(
    state.connections.wires.filter((wire) => owners.has(wire.part)).map((wire) => wire.part),
  );
  return wired.size >= step.count;
}

export function benchLesson(spec: BenchLessonSpec): LessonDef {
  const done = (state: BenchState) => spec.steps.every((step) => benchStepHolds(step, state));
  const practice: PageDef = {
    id: `${spec.id}-practice`,
    title: t('Собери на столе'),
    blocks: [
      { kind: 'text', md: spec.task },
      { kind: 'parts', items: spec.parts.map((item) => ({ def: item.part, count: item.count })) },
    ],
    task: {
      kind: 'build',
      text: spec.task,
      until: done,
      checklist: spec.steps.map((step) => ({
        text: step.text,
        until: (state: BenchState) => benchStepHolds(step, state),
      })),
    },
  };
  return {
    id: spec.id,
    title: spec.title,
    minutes: spec.minutes,
    pages: [...theoryPages(spec), practice],
  };
}

/* Chapters */

export interface ChapterInfo {
  id: string;
  title: string;
}

/** The chapters that have lessons, in the order of `chapters`, each with its lessons in spec order. */
export function chaptersOf<T extends LessonBase>(
  chapters: ChapterInfo[],
  specs: T[],
  lesson: (spec: T) => LessonDef,
): ChapterDef[] {
  return chapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: specs.filter((spec) => spec.chapter === chapter.id).map(lesson),
    }))
    .filter((chapter) => chapter.lessons.length > 0);
}
