import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ApiSecurity,
  claimJob,
  createJobLimits,
  environmentApiOptions,
  type ApiOptions,
} from '../server/api-security';
import { BuildManager, toolchainStatus } from '../server/builds';
import { SimulationManager } from '../server/simulations';
import { PhysicalManager } from '../server/physical';
import { createApp, startServer } from '../server/index';
import { request as apiRequest } from '../src/lib/api';

type Reply = { status: number; cookies: string[]; content: string };
const guestCookie = (reply: Reply) =>
  reply.cookies.find((cookie) => cookie.startsWith('yosis_guest='))?.split(';')[0];

async function fixture(options: ApiOptions = { standalone: true }) {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-standalone-'));
  const manager = new BuildManager(path.join(directory, '.builds'));
  const simulations = new SimulationManager(path.join(directory, '.simulations'));
  const physical = new PhysicalManager(path.join(directory, '.physical'), manager);
  let app = createApp(manager, true, simulations, physical, options);
  let server: Server;
  let port = 0;
  const listen = async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    port = address.port;
  };
  await listen();
  const request = (
    route: string,
    headers: Record<string, string> = {},
    body?: unknown,
    method?: string,
  ) =>
    new Promise<Reply>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const outgoing = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path: route,
          method: method ?? (payload === undefined ? 'GET' : 'POST'),
          headers: {
            Host: 'school.test:4444',
            ...(payload === undefined
              ? {}
              : {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payload),
                }),
            ...headers,
          },
        },
        (response) => {
          let content = '';
          response.setEncoding('utf8');
          response.on('data', (part) => (content += part));
          response.once('end', () =>
            resolve({
              status: response.statusCode ?? 0,
              cookies: response.headers['set-cookie'] ?? [],
              content,
            }),
          );
        },
      );
      outgoing.once('error', reject);
      outgoing.end(payload);
    });
  const closeServer = async () => {
    app.locals.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return {
    directory,
    manager,
    simulations,
    physical,
    request,
    async restart() {
      await closeServer();
      app = createApp(manager, true, simulations, physical, options);
      await listen();
    },
    async close() {
      await closeServer();
      await manager.close();
      await simulations.close();
      await physical.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test('standalone creates separate HttpOnly guests and restores their identity after a restart', async () => {
  const f = await fixture();
  try {
    const first = await f.request('/api/session');
    assert.equal(first.status, 200);
    const cookie = guestCookie(first);
    assert.ok(cookie);
    assert.match(first.cookies[0], /HttpOnly/);
    assert.match(first.cookies[0], /SameSite=Strict/);
    assert.match(first.cookies[0], /Path=\/api/);
    assert.doesNotMatch(first.cookies[0], /; Secure/);
    const account = JSON.parse(first.content);
    assert.equal(account.local, false);
    assert.equal(account.guest, true);
    assert.match(account.user, /^guest_[a-f0-9]{58}$/);
    assert.ok(
      !first.content.includes(cookie.slice(12)),
      'the guest secret must never be returned in JSON',
    );
    const another = await f.request('/api/session');
    assert.notEqual(JSON.parse(another.content).user, account.user);
    await f.restart();
    const restored = await f.request('/api/session', { Cookie: cookie });
    assert.equal(JSON.parse(restored.content).user, account.user);
    assert.equal(restored.cookies.length, 0);
    const publicIdReplay = await f.request('/api/session', {
      Cookie: `yosis_guest=${account.user}`,
    });
    assert.notEqual(JSON.parse(publicIdReplay.content).user, account.user);
    const bearerReplay = await f.request('/api/session', {
      Authorization: `Bearer ${cookie.slice(12)}`,
    });
    assert.notEqual(JSON.parse(bearerReplay.content).user, account.user);
    const logout = await f.request('/api/session', { Cookie: cookie }, undefined, 'DELETE');
    assert.equal(logout.status, 204);
    assert.match(logout.cookies[0], /yosis_guest=;.*Expires=Thu, 01 Jan 1970/);
  } finally {
    await f.close();
  }
});

test('a slow anonymous health request cannot replace the guest established by the session endpoint', async (context) => {
  const f = await fixture();
  let releaseHealth!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseHealth = resolve;
  });
  let healthStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    healthStarted = resolve;
  });
  context.mock.method(f.manager, 'health', async () => {
    healthStarted();
    await held;
    return toolchainStatus(false);
  });
  context.mock.method(f.simulations, 'health', async () => ({
    available: false,
    engine: 'Icarus Verilog',
  }));
  context.mock.method(f.physical, 'health', async () => ({
    available: false,
    engine: 'nextpnr',
    bitstreamAvailable: false,
  }));
  try {
    const pendingHealth = f.request('/api/health');
    await started;
    const session = await f.request('/api/session');
    const cookie = guestCookie(session)!;
    assert.equal(
      (await f.request('/api/projects')).status,
      401,
      'private APIs require an established guest cookie',
    );
    releaseHealth();
    const health = await pendingHealth;
    assert.equal(health.status, 200);
    assert.equal(health.cookies.length, 0);
    const retained = await f.request('/api/session', { Cookie: cookie });
    assert.equal(JSON.parse(retained.content).user, JSON.parse(session.content).user);
    assert.equal(retained.cookies.length, 0);
  } finally {
    releaseHealth();
    await f.close();
  }
});

test('concurrent browser session effects share one request and private APIs wait for its cookie', async (context) => {
  const urls: string[] = [];
  let releaseSession!: (response: Response) => void;
  context.mock.method(globalThis, 'fetch', (url: string) => {
    urls.push(url);
    return url === '/api/session'
      ? new Promise<Response>((resolve) => {
          releaseSession = resolve;
        })
      : Promise.resolve(Response.json([]));
  });
  const first = apiRequest('/api/session');
  const second = apiRequest('/api/session');
  const projects = apiRequest('/api/projects');
  const health = apiRequest('/api/health');
  assert.deepEqual(urls, ['/api/session']);
  releaseSession(Response.json({ user: 'guest_test', local: false, guest: true }));
  assert.deepEqual(await first, await second);
  await Promise.all([projects, health]);
  assert.deepEqual(urls, ['/api/session', '/api/projects', '/api/health']);
});

test('standalone permits the current HTTP or HTTPS authority and blocks foreign origins, hosts and cross-site API requests', async () => {
  const f = await fixture();
  try {
    for (const origin of ['http://school.test:4444', 'https://school.test:4444']) {
      const reply = await f.request('/api/session', { Origin: origin }, {});
      assert.equal(reply.status, 200, origin);
      assert.equal(reply.cookies[0].includes('; Secure'), origin.startsWith('https:'));
    }
    const httpsNavigation = await f.request('/api/session', {
      Referer: 'https://school.test:4444/?tab=code',
    });
    assert.match(httpsNavigation.cookies[0], /; Secure/);
    for (const origin of [
      'https://other.test:4444',
      'https://school.test:4445',
      'null',
      'file://school.test:4444',
      'http://school.test:4444/path',
    ])
      assert.equal((await f.request('/api/session', { Origin: origin }, {})).status, 403, origin);
    for (const host of [
      'school.test:4444/',
      'someone@school.test:4444',
      'school.test:4444?ignored',
      'school.test:invalid',
    ])
      assert.equal((await f.request('/api/session', { Host: host })).status, 403, host);
    const blocked = await f.request('/api/session', { 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.cookies.length, 0, 'a cross-site request cannot create a guest');
    const proxied = await f.request('/api/session', {
      Origin: 'https://other.test',
      'X-Forwarded-Host': 'other.test',
    });
    assert.equal(proxied.status, 403, 'untrusted forwarded host cannot broaden the origin check');
  } finally {
    await f.close();
  }
});

test('standalone guests cannot read each other’s projects, progress or build artifacts', async () => {
  const f = await fixture();
  try {
    const alice = await f.request('/api/session'),
      bob = await f.request('/api/session');
    const a = { Cookie: guestCookie(alice)! },
      b = { Cookie: guestCookie(bob)! };
    const id = '12345678-1234-4123-8123-123456789abc';
    const project = {
      id,
      name: 'Guest project',
      top: 'top',
      board: 'tangnano20k',
      files: [{ name: 'top.v', content: 'module top(input a, output y); assign y=a; endmodule' }],
    };
    assert.equal((await f.request(`/api/projects/${id}`, a, { project }, 'PUT')).status, 200);
    assert.equal((await f.request(`/api/projects/${id}`, a)).status, 200);
    assert.equal((await f.request(`/api/projects/${id}`, b)).status, 404);
    assert.deepEqual(JSON.parse((await f.request('/api/projects', b)).content), []);
    assert.equal((await f.request('/api/progress', a, { lesson: 'ports' }, 'PUT')).status, 204);
    assert.deepEqual(JSON.parse((await f.request('/api/progress', a)).content), {
      lesson: 'ports',
    });
    assert.equal(JSON.parse((await f.request('/api/progress', b)).content), null);
    await mkdir(path.join(f.manager.root, id), { recursive: true });
    await claimJob(f.manager.root, id, JSON.parse(alice.content).user);
    await writeFile(path.join(f.manager.root, id, 'logs.txt'), 'Private build log');
    assert.equal((await f.request(`/api/builds/${id}/artifacts/logs.txt`, a)).status, 200);
    assert.equal((await f.request(`/api/builds/${id}/artifacts/logs.txt`, b)).status, 404);
    assert.equal((await f.request(`/api/builds/${id}/cancel`, b, {})).status, 404);
    await f.restart();
    assert.equal((await f.request(`/api/builds/${id}/artifacts/logs.txt`, a)).status, 200);
    assert.equal((await f.request(`/api/builds/${id}/artifacts/logs.txt`, b)).status, 404);
    assert.equal((await f.request(`/api/projects/${id}`, a)).status, 200);
  } finally {
    await f.close();
  }
});

test('explicit HTTPS credentials retain precedence over standalone and the old local profile stays restricted', async () => {
  assert.throws(
    () => new ApiSecurity({ standalone: true, publicOrigin: 'https://school.test' }),
    /персональными ключами/,
  );
  const f = await fixture({
    standalone: true,
    publicOrigin: 'https://school.test',
    users: { teacher: 'a'.repeat(40) },
  });
  try {
    assert.equal(
      (await f.request('/api/session', { Host: 'school.test', Origin: 'https://school.test' }))
        .status,
      401,
    );
    assert.equal(
      (await f.request('/api/session', { Host: 'school.test', Origin: 'http://school.test' }))
        .status,
      403,
    );
    const login = await f.request(
      '/api/session',
      { Host: 'school.test', Origin: 'https://school.test' },
      { token: 'a'.repeat(40) },
    );
    assert.equal(login.status, 200);
    assert.match(login.cookies[0], /^yosis_session=/);
    assert.equal(guestCookie(login), undefined);
    assert.equal(JSON.parse(login.content).user, 'teacher');
  } finally {
    await f.close();
  }
  const local = await fixture({});
  try {
    assert.equal((await local.request('/api/session')).status, 403);
  } finally {
    await local.close();
  }
});

test('standalone keeps public job quotas and accepts its opt-in only from the explicit environment flag', async () => {
  const limits = createJobLimits({}, false);
  for (let n = 0; n < 4; n++) {
    const reservation = await limits.reserve('guest_test');
    reservation.register(`job${n}`, async () => ({ status: 'running' }));
    reservation.release();
  }
  await assert.rejects(limits.reserve('guest_test'), /Лимит заданий/);
  const other = await limits.reserve('guest_other');
  other.release();
  const saved = process.env.YOSIS_STANDALONE;
  try {
    process.env.YOSIS_STANDALONE = '1';
    assert.equal(environmentApiOptions().standalone, true);
    process.env.YOSIS_STANDALONE = 'true';
    assert.equal(environmentApiOptions().standalone, false);
  } finally {
    if (saved === undefined) delete process.env.YOSIS_STANDALONE;
    else process.env.YOSIS_STANDALONE = saved;
  }
});

test('startup validates PORT and explicit YOSIS_API_PORT before allocating workers', () => {
  const original = { PORT: process.env.PORT, YOSIS_API_PORT: process.env.YOSIS_API_PORT };
  try {
    delete process.env.YOSIS_API_PORT;
    for (const port of ['0', '-1', '65536', 'no', '4444.5']) {
      process.env.PORT = port;
      assert.throws(startServer, /PORT/);
    }
    process.env.PORT = '4444';
    process.env.YOSIS_API_PORT = 'wrong';
    assert.throws(startServer, /PORT/, 'explicit application port takes precedence');
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('an occupied production port exits with failure even while the PM2 IPC channel is open', async () => {
  const occupied = createServer((_request, response) => response.end('occupied'));
  occupied.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => occupied.once('listening', resolve));
  const address = occupied.address();
  assert.ok(address && typeof address === 'object');
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-busy-port-'));
  try {
    const child = fork(fileURLToPath(new URL('../server/index.ts', import.meta.url)), [], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(address.port),
        YOSIS_API_PORT: undefined,
        YOSIS_LISTEN_HOST: '127.0.0.1',
        YOSIS_STANDALONE: '1',
        YOSIS_PUBLIC_ORIGIN: undefined,
        YOSIS_USERS_JSON: undefined,
        YOSIS_DATA_DIR: directory,
      },
    });
    let logs = '';
    child.stdout?.on('data', (part) => {
      logs += String(part);
    });
    child.stderr?.on('data', (part) => {
      logs += String(part);
    });
    const code = await new Promise<number | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('The server stayed alive after EADDRINUSE with an open IPC channel.'));
      }, 10000);
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (exit) => {
        clearTimeout(timeout);
        resolve(exit);
      });
    });
    assert.equal(code, 1, logs);
    assert.match(logs, /EADDRINUSE/);
  } finally {
    await new Promise<void>((resolve) => occupied.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
