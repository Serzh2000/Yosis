import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JobQueue } from '../server/job-queue';
import { JobRetention, markJob } from '../server/job-retention';
import { incrementalStatus } from '../server/job-status';
import { UserJobLimits } from '../server/api-security';
import { UserStore } from '../server/user-store';
import { RequestError } from '../server/validation';

const project = {
  name: 'test',
  top: 'top',
  board: 'tangnano20k' as const,
  files: [{ name: 'top.v', content: 'module top; endmodule' }],
};
const id = '11111111-1111-1111-1111-111111111111';

test('shared queue reserves before awaited creation, limits concurrency, cancels queued work and stops admission', async () => {
  const started: number[] = [],
    timedOut: number[] = [];
  const queue = new JobQueue<number>({
    capacity: 2,
    concurrency: 2,
    timeoutMs: 15,
    start: (item) => {
      started.push(item);
    },
    timeout: (item) => {
      timedOut.push(item);
      queue.complete(item);
    },
  });
  const release1 = queue.reserve(),
    release2 = queue.reserve();
  assert.throws(
    () => queue.reserve(),
    (error) => error instanceof RequestError && error.status === 429,
  );
  queue.enqueue(1);
  release1();
  queue.enqueue(2);
  release2();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [1, 2]);
  queue.enqueue(3);
  queue.complete(3);
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.deepEqual(timedOut, [1, 2]);
  assert.deepEqual(started, [1, 2]);
  queue.stop();
  assert.throws(
    () => queue.reserve(),
    (error) => error instanceof RequestError && error.status === 503,
  );
});

test('retention expires managed completed runs and preserves active jobs, fixtures, malformed folders and non-UUIDs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-retention-'));
  const ids = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
  ];
  try {
    for (const [index, job] of ids.entries()) {
      const directory = path.join(root, job);
      await mkdir(directory);
      await writeFile(
        path.join(directory, 'metadata.json'),
        JSON.stringify({
          id: job,
          projectHash: 'a'.repeat(64),
          status: index === 1 ? 'running' : 'success',
          startedAt: '2020-01-01T00:00:00.000Z',
        }),
      );
      if (index < 2) await markJob(directory, job);
    }
    await mkdir(path.join(root, 'fixtures'));
    await writeFile(path.join(root, 'fixtures', 'keep.fs'), 'keep');
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set([ids[1]]),
      (job) => {
        removed.push(job);
      },
      { maxCount: 1, maxAgeMs: 1, maxBytes: 1 },
    ).sweep();
    assert.deepEqual(removed, [ids[0]]);
    await assert.rejects(access(path.join(root, ids[0])));
    await access(path.join(root, ids[1]));
    await access(path.join(root, ids[2]));
    await access(path.join(root, 'fixtures', 'keep.fs'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('incremental status excludes large artifacts and returns only appended log text', () => {
  const first = incrementalStatus(
    {
      id,
      logs: 'one\ntwo\n',
      status: 'running',
      rtl: { huge: true },
      technology: {},
      vcd: 'wave',
      placed: {},
      report: {},
      stage: 'work',
    },
    4,
  );
  assert.deepEqual(first, {
    id,
    logs: 'two\n',
    status: 'running',
    stage: 'work',
    nextLogOffset: 8,
    logReset: false,
  });
  assert.equal(incrementalStatus({ logs: 'a', status: 'success' }, 5).logReset, true);
  assert.throws(() => incrementalStatus({ logs: '', status: 'running' }, -1));
});

test('user admission prevents concurrent quota bypass and frees terminal jobs', async () => {
  const limits = new UserJobLimits(1, 5);
  const first = await limits.reserve('alice');
  await assert.rejects(
    limits.reserve('alice'),
    (error) => error instanceof RequestError && error.status === 429,
  );
  let status = 'running';
  first.register(id, async () => ({ status }));
  first.release();
  await assert.rejects(limits.reserve('alice'));
  const other = await limits.reserve('bob');
  other.release();
  status = 'success';
  const next = await limits.reserve('alice');
  next.release();
});

test('server project storage separates users, checks stable identity and rejects concurrent overwrite', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-users-'));
  try {
    const store = new UserStore(root),
      saved = await store.save('alice', id, project);
    assert.equal(saved.project.id, id);
    await assert.rejects(
      store.get('bob', id),
      (error) => error instanceof RequestError && error.status === 404,
    );
    await assert.rejects(
      store.save('alice', id, { ...project, name: 'new' }),
      (error) => error instanceof RequestError && error.status === 409,
    );
    const updated = await store.save('alice', id, { ...project, name: 'new' }, saved.revision);
    assert.notEqual(updated.revision, saved.revision);
    assert.equal((await store.list('alice'))[0].name, 'new');
    await assert.rejects(store.save('alice', '../escape', project));
    await store.saveProgress('alice', { course: { lesson: 'led', completed: ['welcome'] } });
    assert.equal(await store.progress('bob'), null);
    await store.delete('alice', id);
    assert.deepEqual(await store.list('alice'), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
