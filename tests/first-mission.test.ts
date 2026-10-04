import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createMissionProject,
  missionSimulationProject,
  missionConfig,
  missionExercise,
  parseMission,
} from '../src/lib/first-mission';
import { checkLessonTrace } from '../src/lib/lessons';
import { parseVcd } from '../src/lib/vcd';
import { SimulationManager } from '../server/simulations';
import { validateProject, validateSimulationConfig } from '../server/validation';

test('first mission creates an independent project and preserves actual board timing and CST', () => {
  const project = createMissionProject(['mission-beacon', 'mission-beacon-2']),
    original = JSON.stringify(project);
  assert.equal(project.name, 'mission-beacon-3');
  validateProject(project);
  const simulation = missionSimulationProject(project);
  assert.match(simulation.files[0].content, /HALF_PERIOD = 4/);
  assert.equal(JSON.stringify(project), original);
  assert.equal(simulation.files[1].content, project.files[1].content);
  assert.equal((project.files[1].content.match(/IO_LOC/g) ?? []).length, 7);
  project.files[0].content = project.files[0].content.replace('13_500_000', '1');
  assert.throws(() => missionSimulationProject(project), /Верни HALF_PERIOD/);
});
test('first mission restored progress cannot claim a fresh USB identity or upload', () => {
  assert.equal(parseMission('{').step, 0);
  assert.equal(
    parseMission(
      JSON.stringify({
        version: 1,
        projectName: 'mission-beacon',
        step: 9,
        verifiedSnapshot: '{}',
      }),
    ).step,
    7,
  );
  assert.equal(
    parseMission(
      JSON.stringify({ version: 1, projectName: 'other', step: 4, verifiedSnapshot: '{}' }),
    ).step,
    0,
  );
});
test(
  'first mission rejects the unfinished group and verifies actual alternation with Yosys and Icarus',
  { timeout: 90_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yosis-first-mission-'));
    const manager = new SimulationManager(directory, 30_000);
    try {
      const starter = createMissionProject([]),
        solved = structuredClone(starter);
      solved.files[0].content = solved.files[0].content.replace("6'b111111", "6'b101010");
      for (const [project, pass] of [
        [starter, false],
        [solved, true],
      ] as const) {
        let result = await manager.create(
          validateProject(missionSimulationProject(project)),
          validateSimulationConfig(missionConfig),
        );
        const deadline = Date.now() + 30_000;
        while (['queued', 'running'].includes(result.status)) {
          assert.ok(Date.now() < deadline);
          await delay(25);
          result = await manager.get(result.id);
        }
        assert.equal(result.status, 'success', result.error);
        const verdicts = checkLessonTrace(missionExercise, parseVcd(result.vcd!));
        assert.equal(
          verdicts.every((item) => item.passed),
          pass,
          JSON.stringify(verdicts),
        );
      }
    } finally {
      await manager.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
