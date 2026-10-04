import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobLimits, environmentApiOptions } from '../server/api-security';
import { RequestError } from '../server/validation';

const id = '11111111-1111-1111-1111-111111111111';

async function submit(limits: ReturnType<typeof createJobLimits>, user: string) {
  const reservation = await limits.reserve(user);
  reservation.register(id, async () => ({ status: 'success' }));
  reservation.release();
}

test('локальный режим не имеет часовой квоты', async () => {
  const limits = createJobLimits({ maxJobsPerHour: 2, maxUserJobs: 1 }, true);
  for (let index = 0; index < 200; index += 1) await submit(limits, 'local');
});

test('публичный режим применяет настроенные часовой и активный лимиты', async () => {
  const hourly = createJobLimits({ maxJobsPerHour: 3, maxUserJobs: 10 }, false);
  for (let index = 0; index < 3; index += 1) await submit(hourly, 'alice');
  await assert.rejects(
    submit(hourly, 'alice'),
    (error) => error instanceof RequestError && error.status === 429,
  );
  await submit(hourly, 'bob');

  const active = createJobLimits({ maxJobsPerHour: 100, maxUserJobs: 1 }, false);
  const first = await active.reserve('alice');
  await assert.rejects(
    active.reserve('alice'),
    (error) => error instanceof RequestError && error.status === 429,
  );
  first.release();
});

test('публичный режим сохраняет значения по умолчанию 4 и 30', async () => {
  const limits = createJobLimits({}, false);
  for (let index = 0; index < 30; index += 1) await submit(limits, 'alice');
  await assert.rejects(submit(limits, 'alice'));
  const concurrent = createJobLimits({}, false);
  for (let index = 0; index < 4; index += 1) await concurrent.reserve('alice');
  await assert.rejects(concurrent.reserve('alice'));
});

test('переменные окружения лимитов проверяются при запуске', () => {
  const names = ['YOSIS_MAX_USER_JOBS', 'YOSIS_MAX_JOBS_PER_HOUR'] as const;
  const saved = names.map((name) => process.env[name]);
  const restore = () =>
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
  try {
    for (const name of names) {
      for (const bad of ['0', '-1', '1.5', 'abc', '1e3']) {
        restore();
        process.env[name] = bad;
        assert.throws(() => environmentApiOptions(), new RegExp(name), `${name}=${bad}`);
      }
    }
    restore();
    process.env.YOSIS_MAX_USER_JOBS = '7';
    process.env.YOSIS_MAX_JOBS_PER_HOUR = '90';
    const options = environmentApiOptions();
    assert.equal(options.maxUserJobs, 7);
    assert.equal(options.maxJobsPerHour, 90);
    delete process.env.YOSIS_MAX_USER_JOBS;
    delete process.env.YOSIS_MAX_JOBS_PER_HOUR;
    assert.equal(environmentApiOptions().maxUserJobs, undefined);
  } finally {
    restore();
  }
});
