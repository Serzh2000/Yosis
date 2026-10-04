import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Project, SimulationResult } from '../shared/types';
import { beginnerExercises, beginnerLessons } from '../src/lib/beginner-course';
import { glossary, splitGlossary } from '../src/lib/learning-glossary';
import { checkLessonTrace, type Lesson } from '../src/lib/lessons';
import { parseVcd } from '../src/lib/vcd';
import { SimulationManager } from '../server/simulations';
import { validateProject, validateSimulationConfig } from '../server/validation';

type Edit = (source: string) => string;
const replace =
  (from: string, to: string): Edit =>
  (source) => {
    assert.ok(source.includes(from), `source must contain ${from}`);
    return source.replace(from, to);
  };
// Reference solutions are independent HDL edits; every wrong solution must fail the checks.
const solutions: Record<string, Edit> = {
  'v-wire': replace("assign y = 1'b0;", 'assign y = a;'),
  'v-literal': replace("4'b0000", "4'b1010"),
  'v-operators': replace('assign y = a & b;', 'assign y = ~(a & b);'),
  'v-bus': replace('data[1:0]', 'data[3:2]'),
  'v-concat': replace('{b, a}', '{a, b}'),
  'v-cond': replace("assign y = 4'd3;", "assign y = button ? 4'd9 : 4'd3;"),
  'v-dff': replace("q <= 1'b1;", 'q <= d;'),
  'v-blocking': replace('b <= d;', 'b <= a;'),
  'v-case': replace('// TODO: добавь вариант для 2', "2'd2: y = 3'b100;"),
  'v-param': replace("VALUE = 4'd0", "VALUE = 4'd5"),
  'v-instance': replace('assign y = a;', 'inv u1(.a(a), .y(y));'),
};
const wrong: Record<string, Edit[]> = {
  'v-wire': [
    replace("assign y = 1'b0;", 'assign y = ~a;'),
    replace("assign y = 1'b0;", "assign y = 1'b1;"),
  ],
  'v-literal': [replace("4'b0000", "4'b0101"), replace("4'b0000", "4'd1010")],
  'v-operators': [
    replace('assign y = a & b;', 'assign y = ~a & b;'),
    replace('assign y = a & b;', 'assign y = ~(a | b);'),
  ],
  'v-bus': [replace('data[1:0]', 'data[2:1]')],
  'v-concat': [replace('{b, a}', '{a, b[0], b[1]}')],
  'v-cond': [replace("assign y = 4'd3;", "assign y = button ? 4'd3 : 4'd9;")],
  'v-dff': [replace("q <= 1'b1;", "q <= 1'b0;"), replace("q <= 1'b1;", 'q <= ~d;')],
  // Blocking assignments make b follow d at once instead of one clock later.
  'v-blocking': [
    replace('a <= d;\n        b <= d;', 'a = d;\n        b = a;'),
    replace('b <= d;', "b <= 1'b0;"),
  ],
  'v-case': [replace('// TODO: добавь вариант для 2', "2'd2: y = 3'b010;")],
  'v-param': [replace("VALUE = 4'd0", "VALUE = 4'd6")],
  'v-instance': [replace('assign y = a;', 'assign y = a; // no inverter')],
};

async function simulate(manager: SimulationManager, lesson: Lesson, project: Project) {
  let result: SimulationResult = await manager.create(
    validateProject(project),
    validateSimulationConfig(lesson.config),
  );
  const deadline = Date.now() + 30_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, `${lesson.id} must finish before the deadline`);
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', `${lesson.id}: ${result.error}\n${result.logs}`);
  return checkLessonTrace(lesson, parseVcd(result.vcd!));
}
const withSource = (lesson: Lesson, edit: Edit): Project => {
  const copy = structuredClone(lesson.project);
  copy.files[0].content = edit(copy.files[0].content);
  return copy;
};

test('every beginner exercise has a reference solution and a wrong solution', () => {
  for (const lesson of beginnerExercises) {
    assert.ok(solutions[lesson.id], `${lesson.id} needs a reference solution`);
    assert.ok(wrong[lesson.id]?.length, `${lesson.id} needs a wrong solution`);
  }
  assert.equal(Object.keys(solutions).length, beginnerExercises.length);
});

test(
  'beginner exercises: starters and wrong solutions fail, reference solutions pass the real simulator',
  { timeout: 400_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yosis-beginner-course-'));
    const manager = new SimulationManager(directory, 30_000);
    try {
      assert.equal(
        (await manager.health()).available,
        true,
        'Prepare Icarus with npm run setup:iverilog',
      );
      for (const lesson of beginnerExercises) {
        const starter = await simulate(manager, lesson, lesson.project);
        assert.ok(
          starter.some((item) => !item.passed),
          `${lesson.id}: the starter must fail`,
        );
        for (const edit of wrong[lesson.id]) {
          const verdicts = await simulate(manager, lesson, withSource(lesson, edit));
          assert.ok(
            verdicts.some((item) => !item.passed),
            `${lesson.id}: a wrong solution must fail`,
          );
        }
        const solved = await simulate(manager, lesson, withSource(lesson, solutions[lesson.id]));
        assert.deepEqual(
          solved.filter((item) => !item.passed),
          [],
          `${lesson.id}: the reference solution must pass every check`,
        );
      }
    } finally {
      await manager.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('every beginner lesson uses terms only after they are explained or links them to the glossary', () => {
  // Terms that must be explained in the lesson text itself the first time they appear in the strand.
  const explainedBy: Record<string, string> = {
    fpga: 'start-board',
    bit: 'start-bit',
    gate: 'start-gates',
    verilog: 'v-module',
    synthesis: '',
    clock: 'v-always',
    edge: 'v-always',
    register: 'v-always',
    bus: 'v-bus',
    width: 'v-bus',
    combinational: 'v-case',
    parameter: 'v-param',
  };
  const order = beginnerLessons.map((lesson) => lesson.id);
  const firstUse = new Map<string, number>();
  beginnerLessons.forEach((lesson, index) => {
    const text = lesson.steps
      .flatMap((step) => [step.title, step.text, step.code ?? '', step.quiz?.question ?? ''])
      .join('\n');
    for (const part of splitGlossary(text))
      if (typeof part !== 'string' && !firstUse.has(part.term.id))
        firstUse.set(part.term.id, index);
  });
  for (const [term, lessonId] of Object.entries(explainedBy)) {
    if (!lessonId) continue;
    const used = firstUse.get(term);
    assert.ok(used !== undefined, `${term} should appear in the beginner strand`);
    assert.ok(
      used >= order.indexOf(lessonId) - 0,
      `${term} is used in ${order[used]} before it is explained in ${lessonId}`,
    );
  }
  // Every term of the strand exists in the glossary the pupil can open.
  for (const id of firstUse.keys()) assert.ok(glossary.some((term) => term.id === id));
});
