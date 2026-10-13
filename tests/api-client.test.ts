import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  download,
  fetchExternal,
  request,
  requestRaw,
  requestText,
  requestVoid,
} from '../src/lib/api';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('a private request waits for the guest session to be established', async (context) => {
  const session = deferred<Response>();
  const calls: string[] = [];
  context.mock.method(globalThis, 'fetch', (url: string) => {
    calls.push(url);
    return url === '/api/session' ? session.promise : Promise.resolve(Response.json({ ok: true }));
  });
  const opening = request('/api/session');
  const health = request('/api/health');
  const bytes = download('/api/debugger-backups/a');
  const raw = requestRaw('/api/physical/1');
  await tick();
  assert.deepEqual(calls, ['/api/session']);
  session.resolve(Response.json({ user: 'guest' }));
  await Promise.all([opening, health, raw]);
  await bytes.catch(() => {});
  assert.equal(calls[0], '/api/session');
  assert.equal(calls.length, 4);
});

test('simultaneous session requests share one network call', async (context) => {
  const session = deferred<Response>();
  let calls = 0;
  context.mock.method(globalThis, 'fetch', () => {
    calls++;
    return session.promise;
  });
  const first = request('/api/session'),
    second = request('/api/session');
  session.resolve(Response.json({ user: 'guest' }));
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
});

test('a failed session does not block later private requests', async (context) => {
  const session = deferred<Response>();
  context.mock.method(globalThis, 'fetch', (url: string) =>
    url === '/api/session' ? session.promise : Promise.resolve(Response.json({ ok: 1 })),
  );
  const opening = request('/api/session').catch(() => 'failed');
  const health = request('/api/health');
  session.resolve(Response.json({ error: 'нет' }, { status: 500 }));
  assert.equal(await opening, 'failed');
  assert.deepEqual(await health, { ok: 1 });
});

test('a server {error} becomes an ApiError that keeps the status', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Очередь заполнена.' }, { status: 429 }),
  );
  await assert.rejects(request('/api/builds'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Очередь заполнена.');
    assert.equal(error.status, 429);
    return true;
  });
});

test('an answer without an error text gets a generic message and a non-JSON answer is reported', async (context) => {
  let body: BodyInit = JSON.stringify({});
  context.mock.method(globalThis, 'fetch', async () => new Response(body, { status: 503 }));
  await assert.rejects(request('/api/x'), { message: 'Ошибка сервиса: 503' });
  body = '<html>';
  await assert.rejects(request('/api/x'), { message: 'Сервис вернул некорректный ответ.' });
  await assert.rejects(requestVoid('/api/x'), { message: 'Ошибка сервиса: 503' });
});

test('requestVoid, requestText and download use the caller wording and the status', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: string) =>
    url.endsWith('/ok')
      ? new Response(new Uint8Array([1, 2, 3]))
      : Response.json({ error: 'чужой текст' }, { status: 404 }),
  );
  await assert.rejects(requestVoid('/api/a', { method: 'DELETE' }, 'Не удалось удалить.'), {
    message: 'Не удалось удалить.',
    status: 404,
  });
  await assert.rejects(
    download('/api/a', undefined, (status) => `Недоступно (${status}).`),
    {
      message: 'Недоступно (404).',
    },
  );
  await assert.rejects(requestText('/api/a', undefined, 'Нет битстрима.'), {
    message: 'Нет битстрима.',
  });
  assert.deepEqual([...(await download('/api/ok'))], [1, 2, 3]);
  assert.equal(await requestText('/api/ok'), '\u0001\u0002\u0003');
  await requestVoid('/api/ok');
});

test('requestRaw returns the response untouched, so the caller decides about the status', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('x', { status: 500 }));
  const response = await requestRaw('/api/a');
  assert.equal(response.status, 500);
  assert.equal(await response.text(), 'x');
});

test('external requests bypass the session gate and use the current global fetch', async (context) => {
  const session = deferred<Response>();
  const calls: string[] = [];
  context.mock.method(globalThis, 'fetch', (url: string) => {
    calls.push(url);
    return url === '/api/session' ? session.promise : Promise.resolve(Response.json({}));
  });
  const opening = request('/api/session');
  await fetchExternal('http://127.0.0.1:3211/health');
  assert.deepEqual(calls, ['/api/session', 'http://127.0.0.1:3211/health']);
  session.resolve(Response.json({}));
  await opening;
});
