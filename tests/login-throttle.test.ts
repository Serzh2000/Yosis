import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { clientAddress, environmentApiOptions, type ApiOptions } from '../server/api-security';
import { BuildManager } from '../server/builds';
import { createApp } from '../server/index';

const alice = 'a'.repeat(40);

const fake = (remote: string | undefined, forwarded?: string) => ({
  socket: { remoteAddress: remote },
  get: (name: string) => (name.toLowerCase() === 'x-forwarded-for' ? forwarded : undefined),
});

test('адрес клиента: заголовок учитывается только при явной настройке proxy', () => {
  const request = fake('172.18.0.1', '203.0.113.7');
  assert.equal(clientAddress(request as never), '172.18.0.1');
  assert.equal(clientAddress(request as never, undefined), '172.18.0.1');
  assert.equal(clientAddress(request as never, 1), '203.0.113.7');
  // Левые записи подделывает клиент: считаем справа от доверенного proxy.
  assert.equal(
    clientAddress(fake('172.18.0.1', '198.51.100.9, 203.0.113.7') as never, 1),
    '203.0.113.7',
  );
  assert.equal(
    clientAddress(fake('172.18.0.1', '198.51.100.9, 203.0.113.7') as never, 2),
    '198.51.100.9',
  );
  // Меньше записей, чем proxy, мусор или отсутствие заголовка — адрес сокета.
  assert.equal(clientAddress(fake('172.18.0.1', '203.0.113.7') as never, 2), '172.18.0.1');
  assert.equal(clientAddress(fake('172.18.0.1', 'not-an-address') as never, 1), '172.18.0.1');
  assert.equal(clientAddress(fake('172.18.0.1') as never, 1), '172.18.0.1');
  assert.equal(clientAddress(fake(undefined) as never), 'unknown');
  assert.equal(clientAddress(fake('::1', '2001:db8::1') as never, 1), '2001:db8::1');
});

test('YOSIS_TRUSTED_PROXY_HOPS проверяется при запуске', () => {
  const saved = process.env.YOSIS_TRUSTED_PROXY_HOPS;
  try {
    for (const bad of ['0', '-1', 'yes', '1.5'])
      assert.throws(() => {
        process.env.YOSIS_TRUSTED_PROXY_HOPS = bad;
        environmentApiOptions();
      }, /YOSIS_TRUSTED_PROXY_HOPS/);
    process.env.YOSIS_TRUSTED_PROXY_HOPS = '1';
    assert.equal(environmentApiOptions().trustedProxyHops, 1);
    delete process.env.YOSIS_TRUSTED_PROXY_HOPS;
    assert.equal(environmentApiOptions().trustedProxyHops, undefined);
  } finally {
    if (saved === undefined) delete process.env.YOSIS_TRUSTED_PROXY_HOPS;
    else process.env.YOSIS_TRUSTED_PROXY_HOPS = saved;
  }
});

async function withServer(
  options: ApiOptions,
  body: (login: (token: string, forwardedFor?: string) => Promise<number>) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'yosis-throttle-'));
  const manager = new BuildManager(directory);
  const server = createApp(manager, true, undefined, undefined, {
    publicOrigin: 'https://school.test',
    users: { alice },
    ...options,
  }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const login = (token: string, forwardedFor?: string) =>
    new Promise<number>((resolve, reject) => {
      const payload = JSON.stringify({ token });
      const request = httpRequest(
        {
          host: '127.0.0.1',
          port: address.port,
          path: '/api/session',
          method: 'POST',
          headers: {
            Host: 'school.test',
            Origin: 'https://school.test',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
          },
        },
        (response) => {
          response.resume();
          response.on('end', () => resolve(response.statusCode ?? 0));
        },
      );
      request.on('error', reject);
      request.end(payload);
    });
  try {
    await body(login);
  } finally {
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}

test('без настройки proxy заголовок не обходит ограничение попыток', async () => {
  await withServer({}, async (login) => {
    // Десять неверных ключей с «разных» адресов считаются одним адресом сокета.
    for (let index = 0; index < 10; index++)
      assert.equal(await login('x'.repeat(40), `203.0.113.${index + 1}`), 401);
    assert.equal(await login('x'.repeat(40), '203.0.113.200'), 429);
    assert.equal(await login(alice, '203.0.113.201'), 429, 'и верный ключ блокируется');
  });
});

test('за доверенным proxy блокируется только сам нарушитель', async () => {
  await withServer({ trustedProxyHops: 1 }, async (login) => {
    for (let index = 0; index < 10; index++)
      assert.equal(await login('x'.repeat(40), '198.51.100.9, 203.0.113.7'), 401);
    assert.equal(await login('x'.repeat(40), '203.0.113.7'), 429);
    // Нарушитель не сбрасывает счётчик, подставляя левую запись.
    assert.equal(await login('x'.repeat(40), '192.0.2.1, 203.0.113.7'), 429);
    // Другой клиент за тем же proxy входит свободно.
    assert.equal(await login(alice, '203.0.113.8'), 200);
  });
});
