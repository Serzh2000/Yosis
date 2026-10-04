import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { PhysicalResult } from '../shared/physical';
import type { ProgrammingJob } from '../shared/programming';
import {
  ProgrammingClient,
  ProgrammingSubmissionError,
  helperOrigin,
  physicalIsFresh,
  sha256Text,
  validateBitstreamText,
} from '../src/lib/programming-client';

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const secret = 'private-session-code-346ab';
const bits = '// Gowin test fixture\n00001011\n';
const requestId = '9a8a1d62-5234-4ab1-934b-16b60d75781a';

test('helper URL accepts exact local spellings and rejects remote, credential and normalisation tricks', () => {
  assert.equal(helperOrigin('http://127.0.0.1:3211/'), 'http://127.0.0.1:3211');
  assert.equal(helperOrigin('http://localhost:43210'), 'http://localhost:43210');
  assert.equal(helperOrigin(' http://LOCALHOST '), 'http://localhost:3211');
  for (const url of [
    'https://127.0.0.1:3211',
    'http://192.168.1.5:3211',
    'http://example.com',
    'http://localhost.evil:3211',
    'http://localhost@evil:3211',
    'http://secret@localhost:3211',
    'http://localhost:3211/api',
    'http://localhost:3211?token=x',
    'http://localhost:3211#x',
    'http://127.1:3211',
    'http://2130706433:3211',
    'http://0x7f000001:3211',
    'http://[::1]:3211',
    'http://localhost:0',
    'http://localhost:65536',
  ])
    assert.throws(() => helperOrigin(url), /Помощник должен/);
});

test('session authentication stays in the Bearer header and redirects cannot forward it', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = (async (url, init) => {
    calls.push({ url: String(url), init });
    return response({ version: 1, backend: 'gowin', available: true, detail: 'Готов' });
  }) as typeof fetch;
  const client = new ProgrammingClient('http://127.0.0.1:3211', secret, mock);
  assert.equal((await client.health()).available, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:3211/api/health');
  assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), `Bearer ${secret}`);
  assert.equal(calls[0].init?.redirect, 'error');
  assert.equal(calls[0].init?.credentials, 'omit');
  assert.equal(calls[0].init?.referrerPolicy, 'no-referrer');
  assert.ok(!JSON.stringify(client).includes(secret));
  assert.ok(!calls[0].url.includes(secret));
});

test('local helper failure cannot expose the session code in UI errors or logs', async () => {
  const errorClient = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response({ error: `Rejected ${secret}` }, 400)) as typeof fetch);
  await assert.rejects(
    errorClient.health(),
    (error) => error instanceof Error && error.message === 'Rejected [код скрыт]',
  );
  const networkClient = new ProgrammingClient('http://localhost:3211', secret, (async () => {
    throw new Error(`Network at ${secret}`);
  }) as typeof fetch);
  await assert.rejects(
    networkClient.health(),
    (error) => error instanceof Error && !error.message.includes(secret),
  );
  const authClient = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response({ error: secret }, 401)) as typeof fetch);
  await assert.rejects(authClient.health(), /Код подключения не подходит/);
  const sha256 = await sha256Text(bits);
  const job: ProgrammingJob = {
    id: 'j1',
    status: 'running',
    stage: `Запуск ${secret}`,
    logs: `output ${secret}`,
    sha256,
    deviceId: 'board-A',
    projectName: 'counter',
    startedAt: '2026-10-02T00:00:00Z',
  };
  const logsClient = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response(job)) as typeof fetch);
  const received = await logsClient.job('j1');
  assert.ok(!received.logs.includes(secret));
  assert.ok(!received.stage.includes(secret));
  assert.equal(received.status, 'running');
});

test('only a completed physical build tied to the exact current snapshot can supply a project bitstream', async () => {
  const snapshot = JSON.stringify({
    top: 'top',
    files: [{ name: 'top.v', content: 'module top; endmodule' }],
  });
  const hash = await sha256Text(snapshot);
  assert.equal(hash, createHash('sha256').update(snapshot).digest('hex'));
  const result = {
    status: 'success',
    bitstreamAvailable: true,
    projectHash: hash,
  } as PhysicalResult;
  assert.ok(physicalIsFresh(result, snapshot, snapshot, hash));
  assert.ok(!physicalIsFresh(result, snapshot, `${snapshot} `, hash));
  assert.ok(!physicalIsFresh(result, snapshot, snapshot, 'a'.repeat(64)));
  assert.ok(!physicalIsFresh(result, '', snapshot, hash));
  assert.ok(!physicalIsFresh({ ...result, status: 'running' }, snapshot, snapshot, hash));
  assert.ok(!physicalIsFresh({ ...result, bitstreamAvailable: false }, snapshot, snapshot, hash));
  assert.ok(!physicalIsFresh(null, snapshot, snapshot, hash));
});

test('programming submits the chosen file identity, checks digest before USB request and rejects swapped receipts', async () => {
  const sha256 = await sha256Text(bits);
  const input = { requestId, deviceId: 'board-A', bitstream: bits, sha256, projectName: 'lesson' };
  let calls = 0;
  let payload: unknown;
  const receipt: ProgrammingJob = {
    id: requestId,
    status: 'running',
    stage: 'Сканирование',
    logs: '',
    sha256,
    projectName: 'lesson',
    deviceId: 'board-A',
    startedAt: '2026-10-02T00:00:00Z',
  };
  const client = new ProgrammingClient('http://localhost:3211', secret, (async (_url, init) => {
    calls++;
    payload = JSON.parse(String(init?.body));
    return response(receipt, 202);
  }) as typeof fetch);
  await assert.rejects(client.start({ ...input, sha256: '0'.repeat(64) }), /SHA-256/);
  assert.equal(calls, 0);
  assert.equal((await client.start(input)).status, 'running');
  assert.deepEqual(payload, input);
  assert.equal(calls, 1);
  const forgedClient = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response({ ...receipt, deviceId: 'other-board' }, 202)) as typeof fetch);
  await assert.rejects(forgedClient.start(input), /другой загрузке/);
});

test('lost POST reply retains a known request ID for polling and is distinct from a definite rejection', async () => {
  const sha256 = await sha256Text(bits);
  const input = { requestId, deviceId: 'board-A', bitstream: bits, sha256, projectName: 'lesson' };
  const accepted: ProgrammingJob = {
    id: requestId,
    status: 'running',
    stage: 'Пишем SRAM',
    logs: '',
    sha256,
    projectName: 'lesson',
    deviceId: 'board-A',
    startedAt: '2026-10-02T00:00:00Z',
  };
  const calls: string[] = [];
  const client = new ProgrammingClient('http://localhost:3211', secret, (async (url, init) => {
    calls.push(String(url));
    if (init?.method === 'POST')
      throw new Error('The helper accepted the job, then the reply was lost');
    return response(accepted);
  }) as typeof fetch);
  await assert.rejects(
    client.start(input),
    (cause) =>
      cause instanceof ProgrammingSubmissionError &&
      cause.unknownAcceptance &&
      cause.requestId === requestId,
  );
  assert.equal((await client.job(requestId)).status, 'running');
  assert.deepEqual(calls, [
    'http://localhost:3211/api/programs',
    `http://localhost:3211/api/programs/${requestId}`,
  ]);
  for (const status of [400, 401, 403, 409, 413]) {
    const rejected = new ProgrammingClient('http://localhost:3211', secret, (async () =>
      response({ error: 'Request rejected' }, status)) as typeof fetch);
    await assert.rejects(
      rejected.start(input),
      (cause) => cause instanceof ProgrammingSubmissionError && !cause.unknownAcceptance,
    );
  }
  for (const result of [
    new Response('broken JSON', { status: 202 }),
    response({ error: 'Failure after acceptance' }, 500),
    response({ ...accepted, id: 'different-request' }, 202),
  ]) {
    const uncertain = new ProgrammingClient(
      'http://localhost:3211',
      secret,
      (async () => result) as typeof fetch,
    );
    await assert.rejects(
      uncertain.start(input),
      (cause) => cause instanceof ProgrammingSubmissionError && cause.unknownAcceptance,
    );
  }
});

test('preflight digest and cancellation errors do not claim a submitted request', async () => {
  let calls = 0;
  const client = new ProgrammingClient('http://localhost:3211', secret, (async () => {
    calls++;
    return response({});
  }) as typeof fetch);
  const input = {
    requestId,
    deviceId: 'board-A',
    bitstream: bits,
    sha256: await sha256Text(bits),
    projectName: 'lesson',
  };
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    client.start(input, abort.signal),
    (cause) => cause instanceof DOMException && cause.name === 'AbortError',
  );
  await assert.rejects(
    client.start({ ...input, sha256: '0'.repeat(64) }),
    (cause) => cause instanceof Error && !(cause instanceof ProgrammingSubmissionError),
  );
  assert.equal(calls, 0);
});

test('non-text binaries and malformed helper responses remain errors, never a successful programming state', async () => {
  assert.throws(() => validateBitstreamText('binary\x00'), /текстовый битстрим/);
  assert.throws(() => validateBitstreamText(''), /текстовый битстрим/);
  const client = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response({ status: 'success' })) as typeof fetch);
  await assert.rejects(client.job('unknown'), /некорректный статус/);
  const devicesClient = new ProgrammingClient('http://localhost:3211', secret, (async () =>
    response({ devices: [{ id: 'x', model: 'other', deviceID: '0x0000081b' }] })) as typeof fetch);
  await assert.rejects(devicesClient.devices(), /некорректный список/);
});
