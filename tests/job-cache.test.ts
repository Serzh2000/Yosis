import test from 'node:test';
import assert from 'node:assert/strict';
import { JobCache, sourceKey } from '../server/job-cache';
import type { Project } from '../shared/types';

const project = (content: string, cst = ''): Project => ({
  name: 'x',
  top: 'top',
  board: 'tangnano20k',
  files: [
    { name: 'top.v', content },
    { name: 'top.cst', content: cst },
  ],
});

test('sources decide the key; the name and the pin file do not', () => {
  assert.equal(sourceKey(project('a', '1')), sourceKey({ ...project('a', '2'), name: 'y' }));
  assert.notEqual(sourceKey(project('a')), sourceKey(project('b')));
  assert.notEqual(sourceKey(project('a')), sourceKey({ ...project('a'), top: 'other' }));
});

test('the same sources are produced once, for all who ask at the same time and later', async () => {
  const cache = new JobCache<number>();
  let runs = 0;
  const produce = async () => {
    runs++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { result: runs, final: true };
  };
  const answers = await Promise.all([cache.get('k', produce), cache.get('k', produce)]);
  assert.deepEqual(answers, [1, 1]);
  assert.equal(await cache.get('k', produce), 1);
  assert.equal(runs, 1);
});

test('a run that ended by a cancel is not an answer: those who waited run again', async () => {
  const cache = new JobCache<string>();
  let runs = 0;
  const first = cache.get('k', async () => {
    runs++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { result: 'cancelled', final: false };
  });
  const second = cache.get('k', async () => {
    runs++;
    return { result: 'done', final: true };
  });
  assert.equal(await first, 'cancelled');
  assert.equal(await second, 'done');
  assert.equal(runs, 2);
  assert.equal(await cache.get('k', async () => ({ result: 'again', final: true })), 'done');
});

test('the oldest results are dropped past the capacity', async () => {
  const cache = new JobCache<number>(2);
  for (const key of ['a', 'b', 'c']) await cache.get(key, async () => ({ result: 1, final: true }));
  let reran = false;
  await cache.get('a', async () => {
    reran = true;
    return { result: 2, final: true };
  });
  assert.ok(reran);
});
