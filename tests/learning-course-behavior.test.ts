import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Project, SimulationResult } from '../shared/types';
import { guidedLessons } from '../src/lib/learning-course';
import { checkLessonTrace, type Lesson } from '../src/lib/lessons';
import { parseVcd } from '../src/lib/vcd';
import { SimulationManager } from '../server/simulations';
import { validateProject, validateSimulationConfig } from '../server/validation';

// Reference implementations are written as HDL independently of the expected vectors.
// Every starter must fail external behavior; every completed reference must pass all vectors.
const solutions: Record<string, (source: string) => string> = {
  ports: (source) => source.replace("assign led_n = 1'b1;", 'assign led_n = button;'),
  not: (source) => source.replace("assign y = 1'b0;", 'assign y = ~a;'),
  and: (source) => source.replace("assign y = 1'b0;", 'assign y = a & b;'),
  xor: (source) => source.replace('assign y = a | b;', 'assign y = a ^ b;'),
  buses: (source) => source.replace('assign y = data;', "assign y = data + 4'd1;"),
  mux: (source) => source.replace("assign y = 1'b0;", 'assign y = select ? b : a;'),
  decoder: (source) =>
    source.replace('// TODO: добавьте случай code = 2', "2'd2: led_n = 4'b1011;"),
  register: (source) =>
    source.replace("else if (enable) q <= 1'b0;", 'else if (enable) q <= data;'),
  counter: (source) => source.replace('count <= count;', "count <= count + 4'd1;"),
  'traffic-fsm': (source) => source.replace('GREEN: state <= GREEN;', 'GREEN: state <= YELLOW;'),
};
async function simulate(manager: SimulationManager, lesson: Lesson, project: Project) {
  let result: SimulationResult = await manager.create(
    validateProject(project),
    validateSimulationConfig(lesson.config),
  );
  const deadline = Date.now() + 30_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, `Lesson ${lesson.id} must finish before deadline`);
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', `${lesson.id}: ${result.error}\n${result.logs}`);
  assert.ok(result.vcd);
  return checkLessonTrace(lesson, parseVcd(result.vcd));
}
test(
  'all ten guided laboratories reject starters and pass real Yosys → Icarus reference behavior',
  { timeout: 300_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yosis-learning-course-'));
    const manager = new SimulationManager(directory, 30_000);
    try {
      assert.equal(
        (await manager.health()).available,
        true,
        'Prepare Icarus with npm run setup:iverilog',
      );
      for (const guided of guidedLessons.filter((lesson) => lesson.exercise)) {
        const lesson = guided.exercise!;
        const starter = await simulate(manager, lesson, lesson.project);
        assert.ok(
          starter.some((item) => !item.passed),
          `${guided.id}: incomplete starter must fail`,
        );
        const solved = structuredClone(lesson.project);
        solved.files[0].content = solutions[guided.id](solved.files[0].content);
        assert.notEqual(
          solved.files[0].content,
          lesson.project.files[0].content,
          `${guided.id}: reference must actually edit source`,
        );
        const passed = await simulate(manager, lesson, solved);
        assert.equal(
          passed.every((item) => item.passed),
          true,
          `${guided.id}: ${JSON.stringify(passed)}`,
        );
      }
    } finally {
      await manager.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  'register laboratory detects lost pause and reset priority rather than merely counting successful fronts',
  { timeout: 90_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yosis-learning-register-'));
    const manager = new SimulationManager(directory, 30_000);
    const lesson = guidedLessons.find((item) => item.id === 'register')!.exercise!;
    try {
      const noPause = structuredClone(lesson.project);
      noPause.files[0].content = solutions
        .register(noPause.files[0].content)
        .replace('else if (enable) q <= data;', 'else q <= data;');
      const pauseVerdicts = await simulate(manager, lesson, noPause);
      assert.equal(pauseVerdicts[3].passed, false, 'changed data must not load during pause');
      const noResetPriority = structuredClone(lesson.project);
      noResetPriority.files[0].content = solutions
        .register(noResetPriority.files[0].content)
        .replace(
          "if (reset) q <= 1'b0;\n        else if (enable) q <= data;",
          "if (enable) q <= data;\n        else if (reset) q <= 1'b0;",
        );
      const resetVerdicts = await simulate(manager, lesson, noResetPriority);
      assert.equal(resetVerdicts[0].passed, false, 'reset must beat enabled data=1');
    } finally {
      await manager.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
