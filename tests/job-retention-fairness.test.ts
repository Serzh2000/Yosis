import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JobRetention, markJob } from '../server/job-retention';

const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

async function makeJob(
  root: string,
  index: number,
  owner: string | null,
  options: { minutesAgo?: number; bytes?: number; status?: string } = {},
) {
  const id = uuid(index);
  const directory = path.join(root, id);
  await mkdir(directory);
  const finished = new Date(Date.now() - (options.minutesAgo ?? 0) * 60000).toISOString();
  await writeFile(
    path.join(directory, 'metadata.json'),
    JSON.stringify({
      id,
      projectHash: 'a'.repeat(64),
      status: options.status ?? 'success',
      startedAt: finished,
      finishedAt: finished,
    }),
  );
  await markJob(directory, id);
  if (owner !== null)
    await writeFile(path.join(directory, '.owner.json'), JSON.stringify({ owner }));
  if (options.bytes) await writeFile(path.join(directory, 'data.bin'), Buffer.alloc(options.bytes));
  return id;
}

const exists = (root: string, id: string) =>
  access(path.join(root, id)).then(
    () => true,
    () => false,
  );

const day = 86400000;

test('при общем пределе по числу тихий пользователь сохраняет свои сборки, а лишнее удаляет самый активный', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-fair-'));
  try {
    // Старейшая сборка принадлежит тихому ученику: при глобальной очистке «самые старые» она пропала бы.
    const quiet = await makeJob(root, 1, 'quiet', { minutesAgo: 100 });
    const busy: string[] = [];
    for (let index = 0; index < 5; index++)
      busy.push(await makeJob(root, 10 + index, 'busy', { minutesAgo: 50 - index }));
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set(),
      (id) => void removed.push(id),
      { maxCount: 4, maxAgeMs: 7 * day, maxBytes: 1e12 },
    ).sweep();
    assert.equal(await exists(root, quiet), true, 'сборка тихого пользователя уцелела');
    // Всего 6 заданий, предел 4: удалены два самых старых задания активного пользователя.
    assert.deepEqual(removed, [busy[0], busy[1]]);
    assert.equal(await exists(root, busy[2]), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('общий предел сохраняется, когда у всех поровну: уходят самые старые', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-fair-'));
  try {
    const a1 = await makeJob(root, 1, 'a', { minutesAgo: 60 });
    const b1 = await makeJob(root, 2, 'b', { minutesAgo: 50 });
    const a2 = await makeJob(root, 3, 'a', { minutesAgo: 40 });
    const b2 = await makeJob(root, 4, 'b', { minutesAgo: 30 });
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set(),
      (id) => void removed.push(id),
      { maxCount: 2, maxAgeMs: 7 * day, maxBytes: 1e12 },
    ).sweep();
    assert.deepEqual(removed, [a1, b1]);
    assert.equal(await exists(root, a2), true);
    assert.equal(await exists(root, b2), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('предел по объёму освобождает место у владельца с наибольшим объёмом', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-fair-'));
  try {
    const small = await makeJob(root, 1, 'small', { minutesAgo: 90, bytes: 2000 });
    const big1 = await makeJob(root, 2, 'big', { minutesAgo: 20, bytes: 50_000 });
    const big2 = await makeJob(root, 3, 'big', { minutesAgo: 10, bytes: 50_000 });
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set(),
      (id) => void removed.push(id),
      { maxCount: 100, maxAgeMs: 7 * day, maxBytes: 60_000 },
    ).sweep();
    assert.deepEqual(removed, [big1]);
    assert.equal(await exists(root, small), true);
    assert.equal(await exists(root, big2), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('возраст по-прежнему удаляет устаревшие задания всех владельцев, а активные и без владельца не страдают', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-fair-'));
  try {
    const oldA = await makeJob(root, 1, 'a', { minutesAgo: 9 * 24 * 60 });
    const oldLocal = await makeJob(root, 2, null, { minutesAgo: 8 * 24 * 60 });
    const fresh = await makeJob(root, 3, 'a', { minutesAgo: 5 });
    const running = await makeJob(root, 4, 'b', { minutesAgo: 9 * 24 * 60, status: 'running' });
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set([running]),
      (id) => void removed.push(id),
      { maxCount: 100, maxAgeMs: 7 * day, maxBytes: 1e12 },
    ).sweep();
    assert.deepEqual(removed.sort(), [oldA, oldLocal].sort());
    assert.equal(await exists(root, fresh), true);
    assert.equal(await exists(root, running), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('задания без владельца (локальный режим) очищаются как раньше: самые старые первыми', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-fair-'));
  try {
    const first = await makeJob(root, 1, null, { minutesAgo: 30 });
    const second = await makeJob(root, 2, null, { minutesAgo: 20 });
    const third = await makeJob(root, 3, null, { minutesAgo: 10 });
    const removed: string[] = [];
    await new JobRetention(
      root,
      () => new Set(),
      (id) => void removed.push(id),
      { maxCount: 1, maxAgeMs: 7 * day, maxBytes: 1e12 },
    ).sweep();
    assert.deepEqual(removed, [first, second]);
    assert.equal(await exists(root, third), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
