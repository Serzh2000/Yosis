import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { BuildResult, Project } from '../shared/types';
import { BuildManager } from '../server/builds';
import { PhysicalManager } from '../server/physical';
import { projectHash, RequestError } from '../server/validation';

const buildId = '11111111-1111-1111-1111-111111111111';
const project: Project = {
  name: 'Физический тест',
  board: 'tangnano20k',
  top: 'top',
  files: [
    { name: 'top.v', content: 'module top(input a, output y); assign y=a; endmodule' },
    { name: 'board.cst', content: 'IO_LOC "a" 87; IO_LOC "y" 15;' },
  ],
};
const config = { cstFile: 'board.cst', frequencyMHz: 27 };
const build: BuildResult = {
  id: buildId,
  status: 'success',
  stage: 'Готово',
  top: 'top',
  startedAt: '',
  logs: '',
  diagnostics: [],
  projectHash: projectHash(project),
  technology: { creator: 'test', modules: {} },
};
class FixtureBuilds extends BuildManager {
  constructor(private load: () => Promise<BuildResult> = async () => build) {
    super('unused');
  }
  override get() {
    return this.load();
  }
}
class PendingHealth extends PhysicalManager {
  override health(): ReturnType<PhysicalManager['health']> {
    return new Promise(() => {});
  }
}
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
async function cleanup(directory: string) {
  const absolute = path.resolve(directory);
  assert.equal(path.dirname(absolute), path.resolve(tmpdir()));
  assert.match(path.basename(absolute), /^yosis-physical-/);
  await rm(absolute, { recursive: true, force: true });
}

test('physical queue reserves capacity before awaiting builds, then persists queued cancellation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-physical-capacity-'));
  let release!: (build: BuildResult) => void;
  const buildPromise = new Promise<BuildResult>((resolve) => {
    release = resolve;
  });
  const manager = new PendingHealth(directory, new FixtureBuilds(() => buildPromise));
  try {
    const pending = Array.from({ length: 4 }, () => manager.create(project, buildId, config));
    await assert.rejects(
      manager.create(project, buildId, config),
      (cause) => cause instanceof RequestError && cause.status === 429,
    );
    release(build);
    const jobs = await Promise.all(pending);
    const cancelled = await manager.cancel(jobs[3].id);
    assert.equal(cancelled.status, 'cancelled');
    const restored = await new PhysicalManager(directory, new FixtureBuilds()).get(cancelled.id);
    assert.equal(restored.status, 'cancelled');
    assert.deepEqual(restored.config, config);
    assert.equal(
      await readFile(path.join(directory, cancelled.id, 'sources/board.cst'), 'utf8'),
      project.files[1].content,
    );
    await writeFile(
      path.join(directory, cancelled.id, 'design.fs'),
      'partial bitstream from an interrupted tool',
    );
    await assert.rejects(manager.artifact(cancelled.id, 'design.fs'), /Битстрим не создан/);
    await assert.rejects(manager.artifact(cancelled.id, 'project.json'), /Артефакт не найден/);
  } finally {
    await manager.close();
    await cleanup(directory);
  }
});

test('a failed packing run retains its genuine placement after a service restart', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-physical-restore-'));
  const manager = new PendingHealth(directory, new FixtureBuilds());
  try {
    const job = await manager.create(project, buildId, config);
    const cancelled = await manager.cancel(job.id);
    const placed = {
      creator: 'nextpnr',
      modules: {
        top: { cells: { gate: { type: 'LUT4', attributes: { NEXTPNR_BEL: 'X12Y18/LUT0' } } } },
      },
    };
    await writeFile(path.join(directory, job.id, 'placement.json'), JSON.stringify(placed));
    await writeFile(
      path.join(directory, job.id, 'metadata.json'),
      JSON.stringify({
        ...cancelled,
        status: 'error',
        error: 'packer failed',
        stage: 'packer failed',
      }),
    );
    const restored = await new PhysicalManager(directory, new FixtureBuilds()).get(job.id);
    assert.equal(restored.status, 'error');
    assert.equal(restored.bitstreamAvailable, false);
    assert.deepEqual(restored.placed, placed);
  } finally {
    await manager.close();
    await cleanup(directory);
  }
});

test('active cancellation releases the next physical job even while health is still pending', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-physical-cancel-'));
  const manager = new PendingHealth(directory, new FixtureBuilds());
  try {
    const first = await manager.create(project, buildId, config);
    await turn();
    assert.equal((await manager.get(first.id)).status, 'running');
    const second = await manager.create(project, buildId, config);
    assert.equal(second.status, 'queued');
    assert.equal((await manager.cancel(first.id)).status, 'cancelled');
    await turn();
    assert.equal((await manager.get(second.id)).status, 'running');
    await manager.cancel(second.id);
  } finally {
    await manager.close();
    await cleanup(directory);
  }
});

test('physical timeout leaves a terminal record while a shared tool probe is pending', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-physical-timeout-'));
  const manager = new PendingHealth(directory, new FixtureBuilds(), 20);
  try {
    const job = await manager.create(project, buildId, config);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const result = await manager.get(job.id);
    assert.equal(result.status, 'error');
    assert.match(result.error!, /лимит времени/);
    const restored = await new PhysicalManager(directory, new FixtureBuilds()).get(job.id);
    assert.equal(restored.status, 'error');
  } finally {
    await manager.close();
    await cleanup(directory);
  }
});

test('physical placement rejects stale CST snapshots and shutdown during an awaited build', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-physical-stale-'));
  let release!: (build: BuildResult) => void;
  const manager = new PendingHealth(
    directory,
    new FixtureBuilds(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    ),
  );
  try {
    const creating = manager.create(project, buildId, config);
    await manager.close();
    release(build);
    await assert.rejects(
      creating,
      (cause) => cause instanceof RequestError && cause.status === 503,
    );
    const staleManager = new PhysicalManager(directory, new FixtureBuilds());
    try {
      await assert.rejects(
        staleManager.create(
          {
            ...project,
            files: project.files.map((file) =>
              file.name.endsWith('.cst') ? { ...file, content: 'IO_LOC "a" 88;' } : file,
            ),
          },
          buildId,
          config,
        ),
        /изменились после синтеза/,
      );
    } finally {
      await staleManager.close();
    }
  } finally {
    await manager.close();
    await cleanup(directory);
  }
});
