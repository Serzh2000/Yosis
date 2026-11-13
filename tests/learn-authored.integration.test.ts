import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Project, SimulationResult } from '../shared/types';
import { SimulationManager } from '../server/simulations';
import { validateProject, validateSimulationConfig } from '../server/validation';
import { checkLessonTrace } from '../src/lib/lessons';
import { parseVcd } from '../src/lib/vcd';
import {
  schematicExercise,
  schematicSolution,
  verilogExercise,
} from '../src/learn/content/authored/build';
import { schematic as schematicSpecs, verilog as verilogSpecs } from './learn-authored-specs';
import type { Exercise } from '../src/learn/content/schema';

// Every authored lesson must be solvable and not solved already: the starter fails at least one
// case, the reference solution passes all of them, both through the real Yosys → Icarus path.
// LEARN_FILE=verilog-b limits the run to the lessons of one file: an author runs just their own.

async function verdicts(manager: SimulationManager, exercise: Exercise, project: Project) {
  let result: SimulationResult = await manager.create(
    validateProject(project),
    validateSimulationConfig(exercise.config),
  );
  const deadline = Date.now() + 60_000;
  while (result.status === 'queued' || result.status === 'running') {
    assert.ok(Date.now() < deadline, `${project.name}: the simulation did not finish`);
    await delay(25);
    result = await manager.get(result.id);
  }
  assert.equal(result.status, 'success', `${project.name}: ${result.error}\n${result.logs}`);
  assert.ok(result.vcd, `${project.name}: no waveform`);
  return checkLessonTrace(exercise, parseVcd(result.vcd));
}
const summary = (items: Awaited<ReturnType<typeof verdicts>>) =>
  items
    .filter((item) => !item.passed)
    .map((item) => `${item.title}: expected ${item.expected}, got ${item.actual}`)
    .join('; ');

async function run(
  label: string,
  items: { id: string; starter: Exercise; solved: Exercise }[],
  // An unwired schematic does not even compile, which is a starter that fails as well as any.
  starterMayNotCompile = false,
) {
  const directory = await mkdtemp(path.join(tmpdir(), `yosis-learn-${label}-`));
  const manager = new SimulationManager(directory, 60_000);
  try {
    assert.equal(
      (await manager.health()).available,
      true,
      'Prepare Icarus with npm run setup:iverilog',
    );
    const problems: string[] = [];
    for (const item of items) {
      const start = starterMayNotCompile
        ? await verdicts(manager, item.starter, item.starter.project).catch(() => null)
        : await verdicts(manager, item.starter, item.starter.project);
      if (start && start.every((entry) => entry.passed))
        problems.push(`${item.id}: the starter already meets every case`);
      const solved = await verdicts(manager, item.solved, item.solved.project);
      if (!solved.every((entry) => entry.passed))
        problems.push(`${item.id}: the solution fails: ${summary(solved)}`);
    }
    assert.deepEqual(problems, []);
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test(
  'every authored Verilog lesson rejects its starter and accepts its solution',
  { timeout: 3_600_000 },
  async () => {
    const items = verilogSpecs.map((spec) => ({
      id: spec.id,
      starter: verilogExercise(spec),
      solved: verilogExercise(spec, spec.practice.solution),
    }));
    await run('verilog', items);
  },
);

test(
  'every authored schematic lesson rejects its empty starter and accepts its solution',
  { timeout: 3_600_000 },
  async () => {
    const items = schematicSpecs.map((spec) => ({
      id: spec.id,
      starter: schematicExercise(spec),
      solved: schematicExercise(spec, schematicSolution(spec)),
    }));
    await run('schematic', items, true);
  },
);
