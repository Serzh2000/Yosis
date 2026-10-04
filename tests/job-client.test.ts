import test from 'node:test';
import assert from 'node:assert/strict';
import { pollJob } from '../src/lib/job-client';

const running = { id: 'id', status: 'running', logs: 'first\n', stage: 'synthesis' };

test('polling requests only new logs and preserves metadata', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, '/api/builds/id/status?logOffset=6');
    return Response.json({
      status: 'running',
      stage: 'mapping',
      logs: 'next\n',
      nextLogOffset: 11,
      logReset: false,
    });
  });
  assert.deepEqual(await pollJob('/api/builds/id', running, new AbortController().signal), {
    ...running,
    stage: 'mapping',
    logs: 'first\nnext\n',
  });
});

test('a truncated server log replaces the previous text', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ status: 'running', logs: 'new', nextLogOffset: 3, logReset: true }),
  );
  assert.equal(
    (await pollJob('/api/builds/id', running, new AbortController().signal)).logs,
    'new',
  );
});

test('completion fetches the full artifacts once after metadata', async (context) => {
  const urls: string[] = [];
  const complete = { ...running, status: 'success', logs: 'first\ndone', rtl: { modules: {} } };
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return Response.json(
      url.includes('/status?')
        ? { status: 'success', logs: 'done', nextLogOffset: 10, logReset: false }
        : complete,
    );
  });
  assert.deepEqual(
    await pollJob('/api/builds/id', running, new AbortController().signal),
    complete,
  );
  assert.deepEqual(urls, ['/api/builds/id/status?logOffset=6', '/api/builds/id']);
});
