import test from 'node:test';
import { request as httpRequest } from 'node:http';
import { requireJobOwner } from '../server/api-security';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Project } from '../shared/types';
import { BuildManager } from '../server/builds';
import { createApp } from '../server/index';
import { parseDiagnostics, projectHash, RequestError, validateProject } from '../server/validation';

const project: Project = {
  name: 'Тест',
  top: 'top',
  board: 'tangnano20k',
  files: [{ name: 'top.v', content: 'module top(input a, output y); assign y=a; endmodule' }],
};

test('project validation protects source snapshots and Yosys command arguments', () => {
  assert.deepEqual(validateProject(project), project);
  const constrained = {
    ...project,
    files: [...project.files, { name: 'pins/board.cst', content: 'IO_LOC "clk" 4;' }],
  };
  assert.deepEqual(validateProject(constrained), constrained);
  assert.throws(
    () => validateProject({ ...project, files: [{ name: 'board.cst', content: '' }] }),
    /исходный файл/,
  );
  for (const name of [
    '../top.v',
    '/top.v',
    'C:/top.v',
    'top.v; shell ls',
    'top\\file.v',
    'aux.v',
    'dir/con.v',
  ]) {
    assert.throws(
      () => validateProject({ ...project, files: [{ name, content: '' }] }),
      RequestError,
      name,
    );
  }
  for (const top of ['top; shell echo', '-top', 'a\nb', 'top name'])
    assert.throws(() => validateProject({ ...project, top }), RequestError);
  assert.throws(
    () =>
      validateProject({
        ...project,
        files: [
          { name: 'top.v', content: '' },
          { name: 'TOP.v', content: '' },
        ],
      }),
    /повторяется/,
  );
  assert.throws(
    () =>
      validateProject({
        ...project,
        files: [{ name: 'top.v', content: ' '.repeat(512 * 1024 + 1) }],
      }),
    /512/,
  );
  assert.notEqual(
    projectHash(project),
    projectHash({ ...project, files: [{ name: 'top.v', content: 'module top; endmodule' }] }),
  );
});

test('diagnostics identify Verilog line and deduplicate repeated errors', () => {
  const logs =
    'top.v:12: ERROR: syntax error, unexpected end\nWarning: Wire unused is undriven.\ntop.v:12: ERROR: syntax error, unexpected end';
  assert.deepEqual(parseDiagnostics(logs), [
    { severity: 'error', message: 'syntax error, unexpected end', file: 'top.v', line: 12 },
    { severity: 'warning', message: 'Wire unused is undriven.' },
  ]);
});

test('API rejects cross-origin requests, malicious project paths and unknown artifacts', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-api-'));
  const manager = new BuildManager(directory);
  const server = createApp(manager).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const foreign = await fetch(`${base}/api/builds`, {
      method: 'POST',
      headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    assert.equal(foreign.status, 403);
    const proxiedDevelopment = await fetch(`${base}/api/builds`, {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { ...project, top: 'top; shell ls' } }),
    });
    assert.equal(
      proxiedDevelopment.status,
      400,
      'Known Vite origin should reach project validation through the proxy',
    );
    const invalid = await fetch(`${base}/api/builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { ...project, top: 'top; shell ls' } }),
    });
    assert.equal(invalid.status, 400);
    const artifact = await fetch(
      `${base}/api/builds/00000000-0000-0000-0000-000000000000/artifacts/project.json`,
    );
    assert.equal(artifact.status, 404);
    // A queued cancellation should work even without a JSON body.
    const created = await manager.create(project);
    const cancelled = await manager.cancel(created.id);
    assert.equal(cancelled.status, 'cancelled');
    const snapshot = await readFile(path.join(directory, created.id, 'sources', 'top.v'), 'utf8');
    assert.equal(snapshot, project.files[0].content);
    const restored = await new BuildManager(directory).get(created.id);
    assert.equal(restored.status, 'cancelled');
  } finally {
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('production requires the exact server origin and rejects the development origin', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-origin-'));
  const manager = new BuildManager(directory);
  const server = createApp(manager, true).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ project: { ...project, top: 'bad; command' } });
    const development = await fetch(`${base}/api/builds`, {
      method: 'POST',
      headers: { ...headers, Origin: 'http://127.0.0.1:5173' },
      body,
    });
    assert.equal(development.status, 403);
    const sameOrigin = await fetch(`${base}/api/builds`, {
      method: 'POST',
      headers: { ...headers, Origin: base },
      body,
    });
    assert.equal(sameOrigin.status, 400, 'Same-origin request should reach validation');
  } finally {
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('local mode lets the localhost → 127.0.0.1 page redirect through but keeps the API closed to cross-site requests', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-redirect-'));
  const manager = new BuildManager(directory);
  const server = createApp(manager, true).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  // Node fetch подставляет собственный Sec-Fetch-Mode, поэтому заголовки браузера задаём через http.
  const statusOf = (route: string, headers: Record<string, string>) =>
    new Promise<number>((resolve, reject) => {
      const request = httpRequest(
        { host: '127.0.0.1', port: address.port, path: route, headers },
        (response) => {
          response.resume();
          response.on('end', () => resolve(response.statusCode ?? 0));
        },
      );
      request.on('error', reject);
      request.end();
    });
  const navigation = {
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
  };
  try {
    assert.notEqual(
      await statusOf('/', navigation),
      403,
      'the document navigation must reach the static page',
    );
    assert.equal(await statusOf('/api/health', navigation), 403);
    assert.equal(await statusOf('/', { ...navigation, 'Sec-Fetch-Dest': 'iframe' }), 403);
    assert.equal(
      await statusOf('/', { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors' }),
      403,
    );
  } finally {
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('active cancellation frees the queue and persists both source snapshots', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-cancel-'));
  const manager = new BuildManager(directory);
  try {
    const first = await manager.create(project);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal((await manager.get(first.id)).status, 'running');
    const second = await manager.create({ ...project, name: 'Следующий' });
    assert.equal(second.status, 'queued');
    const cancelled = await manager.cancel(first.id);
    assert.equal(cancelled.status, 'cancelled');
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal((await manager.get(second.id)).status, 'running');
    await manager.cancel(second.id);
    const restored = await new BuildManager(directory).get(first.id);
    assert.equal(restored.status, 'cancelled');
    assert.equal(restored.projectHash, first.projectHash);
    assert.equal(
      await readFile(path.join(directory, second.id, 'sources', 'top.v'), 'utf8'),
      project.files[0].content,
    );
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('a hard build deadline stops the isolated Yosys process', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-deadline-'));
  const manager = new BuildManager(directory, 20);
  try {
    const created = await manager.create(project);
    const deadline = Date.now() + 5000;
    let result = await manager.get(created.id);
    while (result.status === 'queued' || result.status === 'running') {
      assert.ok(
        Date.now() < deadline,
        'Timeout should stop the child and leave a terminal build status',
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      result = await manager.get(created.id);
    }
    assert.equal(result.status, 'error');
    assert.equal(result.stage, 'Истекло время сборки');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
  } finally {
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('public API authenticates personal keys and isolates every job route between users', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-auth-'));
  const manager = new BuildManager(directory);
  const alice = 'a'.repeat(40),
    bob = 'b'.repeat(40);
  const app = createApp(manager, true, undefined, undefined, {
    publicOrigin: 'https://school.test',
    users: { alice, bob },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const request = (route: string, token?: string, init: RequestInit = {}) =>
    new Promise<Response>((resolve, reject) => {
      const req = httpRequest(
        base + route,
        {
          method: init.method ?? 'GET',
          headers: {
            Host: 'school.test',
            Origin: 'https://school.test',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.headers as Record<string, string>),
          },
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk));
          });
          incoming.on('end', () => {
            const headers = Object.fromEntries(
              Object.entries(incoming.headers)
                .filter(([, value]) => value !== undefined)
                .map(([name, value]) => [
                  name,
                  Array.isArray(value) ? value.join('; ') : String(value),
                ]),
            );
            resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers }));
          });
        },
      );
      req.on('error', reject);
      req.end(typeof init.body === 'string' ? init.body : undefined);
    });
  try {
    assert.equal((await request('/api/builds/' + '0'.repeat(36))).status, 401);
    assert.equal(
      (await fetch(base + '/api/session', { headers: { Host: 'attacker.test' } })).status,
      403,
    );
    const login = await request('/api/session', undefined, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: alice }),
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly/);
    assert.match(login.headers.get('set-cookie') ?? '', /Secure/);
    const createdResponse = await request('/api/builds', alice, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    assert.equal(createdResponse.status, 202);
    const created = (await createdResponse.json()) as { id: string };
    await manager.cancel(created.id);
    const saved = await manager.get(created.id);
    saved.logs = 'first\nsecond\n';
    saved.rtl = { creator: 'test', modules: {} };
    saved.technology = { creator: 'test', modules: {} };
    for (const route of [
      `/api/builds/${created.id}`,
      `/api/builds/${created.id}/status`,
      `/api/builds/${created.id}/artifacts/logs.txt`,
    ])
      assert.equal((await request(route, bob)).status, 404);
    assert.equal(
      (await request(`/api/builds/${created.id}/cancel`, bob, { method: 'POST' })).status,
      404,
    );
    const progress = (await (
      await request(`/api/builds/${created.id}/status?logOffset=6`, alice)
    ).json()) as Record<string, unknown>;
    assert.equal(progress.logs, 'second\n');
    assert.equal(progress.nextLogOffset, 13);
    assert.equal(progress.rtl, undefined);
    assert.equal(progress.technology, undefined);
    assert.equal((await request(`/api/builds/${created.id}`, alice)).status, 200);
    await requireJobOwner(directory, created.id, 'alice', false);
    await assert.rejects(
      requireJobOwner(directory, created.id, 'bob', false),
      (error) => error instanceof RequestError && error.status === 404,
    );
  } finally {
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('public service refuses unauthenticated deployment configuration', () => {
  assert.throws(
    () =>
      createApp(new BuildManager('unused'), true, undefined, undefined, {
        publicOrigin: 'https://school.test',
      }),
    /персональными ключами/,
  );
  assert.throws(
    () =>
      createApp(new BuildManager('unused'), true, undefined, undefined, {
        publicOrigin: 'http://school.test',
        users: { alice: 'a'.repeat(40) },
      }),
    /HTTPS/,
  );
});
