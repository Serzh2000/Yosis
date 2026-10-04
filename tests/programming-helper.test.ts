import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ProgrammingDevice, ProgrammingJob } from '../shared/programming';
import {
  createProgrammingHelperApp,
  parseProgrammingHelperArguments,
  ProgrammingManager,
  validateProgrammingRequest,
  type ProgrammingBitstreamValidator,
} from '../server/programming-helper';
import {
  assertGowinIdentity,
  assertOpenFpgaloaderIdentity,
  GowinProgrammingAdapter,
  OpenFpgaloaderProgrammingAdapter,
  parseGowinCableLocations,
  parseOpenFpgaloaderSerials,
  runProgrammingCommand,
  type CommandRunner,
  type ProgrammingAdapter,
  type ProgrammingProgress,
} from '../server/programming-adapters';

const token = 'ab'.repeat(32);
const device: ProgrammingDevice = {
  id: 'gowin:529',
  label: 'Tang Nano 20K',
  board: 'tangnano20k',
  model: 'GW2AR-18C',
  deviceID: '0x0000081b',
  backend: 'gowin',
  location: 529,
};
const origin = 'http://127.0.0.1:3001';
const bitstream = '// test fixture\n01010101\n';
const sha256 = createHash('sha256').update(bitstream).digest('hex');
const request = {
  requestId: randomUUID(),
  deviceId: device.id,
  projectName: 'LED test',
  bitstream,
  sha256,
};
const validator: ProgrammingBitstreamValidator = (text, hash) => {
  assert.equal(text, bitstream);
  if (hash !== sha256) throw new Error('SHA256 отличается');
  return {
    sha256: hash,
    userCode: '000035B1',
    frames: 1342,
    wireBytes: new Uint8Array(),
    programmerText: '// adapted\n' + text,
  };
};

class FakeAdapter implements ProgrammingAdapter {
  readonly backend = 'gowin' as const;
  calls = 0;
  devicesCalls = 0;
  release: (() => void) | undefined;
  failure: Error | undefined;
  scanGate: Promise<void> | undefined;
  scanFailure: Error | undefined;
  readonly pending = new Promise<void>((resolve) => {
    this.release = resolve;
  });
  async health() {
    return { version: 1 as const, backend: this.backend, available: true, detail: 'fake' };
  }
  async devices() {
    this.devicesCalls++;
    await this.scanGate;
    if (this.scanFailure) throw this.scanFailure;
    return [device];
  }
  async program(
    selected: ProgrammingDevice,
    filename: string,
    code: string,
    progress: ProgrammingProgress,
  ) {
    this.calls++;
    assert.deepEqual(selected, device);
    assert.equal(code, '000035B1');
    assert.equal(await readFile(filename, 'ascii'), '// adapted\n' + bitstream);
    progress.stage('Загрузка в SRAM');
    progress.log('fake SRAM write\n');
    await this.pending;
    if (this.failure) throw this.failure;
  }
}

async function withHelper(
  run: (context: {
    base: string;
    adapter: FakeAdapter;
    manager: ProgrammingManager;
    root: string;
  }) => Promise<void>,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-helper-'));
  const adapter = new FakeAdapter();
  const { app, manager } = createProgrammingHelperApp({
    adapter,
    root,
    token,
    validateBitstream: validator,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await run({ base: `http://127.0.0.1:${address.port}`, adapter, manager, root });
  } finally {
    adapter.release?.();
    await manager.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}

const headers = {
  Origin: origin,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

test('helper authenticates health and every API and rejects foreign origins and Host rebinding', async () => {
  await withHelper(async ({ base, adapter }) => {
    for (const endpoint of ['/api/health', '/api/devices', '/api/programs/missing', '/api']) {
      assert.equal((await fetch(base + endpoint, { headers: { Origin: origin } })).status, 401);
    }
    assert.equal(
      (await fetch(base + '/api/health', { headers: { ...headers, Authorization: 'Bearer bad' } }))
        .status,
      401,
    );
    const health = await fetch(base + '/api/health', { headers });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), origin);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await health.json(), {
      version: 1,
      backend: 'gowin',
      available: true,
      detail: 'fake',
    });
    for (const forbidden of [
      'https://attacker.example',
      'http://127.0.0.1:3001.attacker.example',
      'null',
    ]) {
      assert.equal(
        (await fetch(base + '/api/devices', { headers: { ...headers, Origin: forbidden } })).status,
        403,
      );
    }
    const reboundStatus = await new Promise<number>((resolve, reject) => {
      const rebound = httpRequest(
        base + '/api/devices',
        { headers: { ...headers, Host: 'attacker.example' } },
        (response) => {
          response.resume();
          resolve(response.statusCode!);
        },
      );
      rebound.once('error', reject);
      rebound.end();
    });
    assert.equal(reboundStatus, 403);
    assert.equal(adapter.devicesCalls, 0, 'Origin and authentication run before any USB access');
  });
});

test('helper only allows an exact known-origin preflight and keeps hardware untouched', async () => {
  await withHelper(async ({ base, adapter }) => {
    const preflight = await fetch(base + '/api/programs', {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
        'Access-Control-Request-Private-Network': 'true',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(await preflight.text(), '');
    assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
    assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'OPTIONS',
          headers: { Origin: origin, 'Access-Control-Request-Method': 'DELETE' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-executable',
          },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'OPTIONS',
          headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' },
        })
      ).status,
      403,
    );
    assert.equal(adapter.devicesCalls, 0);
  });
});

test('SRAM jobs use a validated immutable file, hold the device lock, and preserve receipts', async () => {
  await withHelper(async ({ base, adapter, manager, root }) => {
    const response = await fetch(base + '/api/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    assert.equal(response.status, 202);
    const accepted = (await response.json()) as ProgrammingJob;
    assert.equal(accepted.status, 'running');
    assert.equal(accepted.sha256, sha256);
    assert.equal(accepted.projectName, request.projectName);
    assert.equal(accepted.id, request.requestId);
    const busy = await fetch(base + '/api/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, requestId: randomUUID() }),
    });
    assert.equal(busy.status, 409);
    assert.equal(
      (await fetch(base + '/api/devices', { headers })).status,
      409,
      'Scanning is blocked while SRAM writing uses JTAG',
    );
    assert.equal(
      (await fetch(base + `/api/programs/${accepted.id}/cancel`, { method: 'POST', headers }))
        .status,
      404,
    );
    const running = await fetch(base + `/api/programs/${accepted.id}`, { headers });
    assert.equal(((await running.json()) as ProgrammingJob).status, 'running');
    adapter.release?.();
    await manager.close();
    const result = await fetch(base + `/api/programs/${accepted.id}`, { headers });
    const finished = (await result.json()) as ProgrammingJob;
    assert.equal(finished.status, 'success');
    assert.ok(finished.finishedAt);
    assert.match(finished.logs, /fake SRAM write/);
    assert.equal(adapter.calls, 1);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, accepted.id, 'receipt.json'), 'utf8')),
      finished,
    );
    assert.equal((await fetch(base + '/api/devices', { headers })).status, 200);
  });
});

test('failed SRAM jobs retain programmer diagnostics and release the device lock', async () => {
  await withHelper(async ({ adapter, manager }) => {
    adapter.failure = new Error('UserCode differs');
    const job = await manager.create(request);
    adapter.release?.();
    await manager.close();
    const result = manager.get(job.id);
    assert.equal(result.status, 'error');
    assert.equal(result.error, 'UserCode differs');
    assert.ok(result.finishedAt);
    assert.equal((await manager.devices()).length, 1);
  });
});

test('malformed requests, hashes, and unknown devices never write SRAM', async () => {
  await withHelper(async ({ base, adapter }) => {
    for (const invalid of [
      null,
      [],
      { ...request, requestId: undefined },
      { ...request, requestId: '../../upload' },
      { ...request, operation: 8 },
      { ...request, executable: 'cmd.exe' },
      { ...request, deviceId: 'bad\naddress' },
      { ...request, bitstream: '\u0000' },
      { ...request, bitstream: 'кириллица' },
      { ...request, sha256: 'x'.repeat(64) },
      { ...request, projectName: '' },
    ]) {
      assert.equal(
        (
          await fetch(base + '/api/programs', {
            method: 'POST',
            headers,
            body: JSON.stringify(invalid),
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...request, sha256: 'ff'.repeat(32) }),
        })
      ).status,
      400,
    );
    assert.equal(adapter.devicesCalls, 0, 'Invalid bitstreams are rejected before scanning');
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...request, requestId: randomUUID(), deviceId: 'gowin:999' }),
        })
      ).status,
      404,
    );
    assert.equal(adapter.calls, 0);
    assert.equal(
      (
        await fetch(base + '/api/programs', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'text/plain' },
          body: '{}',
        })
      ).status,
      415,
    );
    assert.equal(
      (await fetch(base + '/api/programs', { method: 'POST', headers, body: '{' })).status,
      400,
    );
  });
});

test('client-known IDs recover a lost acceptance and retries never repeat SRAM writing', async () => {
  await withHelper(async ({ base, adapter, manager }) => {
    let releaseScan!: () => void;
    adapter.scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    const controller = new AbortController();
    const lostResponse = fetch(base + '/api/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const deadline = Date.now() + 2000;
    while (!adapter.devicesCalls) {
      assert.ok(Date.now() < deadline, 'The request should reach device preparation');
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    // Drop the HTTP connection after acceptance began, before any response is available.
    controller.abort();
    await assert.rejects(lostResponse, /abort/i);
    const recovered = await fetch(base + `/api/programs/${request.requestId}`, { headers });
    assert.equal(recovered.status, 200);
    assert.equal(((await recovered.json()) as ProgrammingJob).status, 'running');
    releaseScan();
    while (!adapter.calls) {
      assert.ok(
        Date.now() < deadline,
        'Losing the HTTP response must not cancel accepted preparation',
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    const repeated = await fetch(base + '/api/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    assert.equal(repeated.status, 202);
    assert.equal(((await repeated.json()) as ProgrammingJob).id, request.requestId);
    assert.equal(adapter.devicesCalls, 1);
    assert.equal(adapter.calls, 1);
    for (const changed of [
      { ...request, projectName: 'different' },
      { ...request, deviceId: 'gowin:999' },
      { ...request, sha256: 'ff'.repeat(32) },
    ]) {
      assert.equal(
        (
          await fetch(base + '/api/programs', {
            method: 'POST',
            headers,
            body: JSON.stringify(changed),
          })
        ).status,
        409,
      );
    }
    adapter.release?.();
    await manager.close();
    const finishedReplay = await fetch(base + '/api/programs', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    assert.equal(finishedReplay.status, 202);
    assert.equal(((await finishedReplay.json()) as ProgrammingJob).status, 'success');
    assert.equal(adapter.calls, 1);
    assert.equal(adapter.devicesCalls, 1);
  });
});

test('job IDs are registered during device preparation and preparation errors remain recoverable', async () => {
  await withHelper(async ({ adapter, manager, root }) => {
    let releaseScan!: () => void;
    adapter.scanGate = new Promise<void>((resolve) => {
      releaseScan = resolve;
    });
    adapter.scanFailure = new Error('USB disconnected');
    const preparation = manager.create(request);
    const pending = manager.get(request.requestId);
    assert.equal(pending.status, 'running');
    assert.match(pending.stage, /Поиск/);
    const replayed = await manager.create(request);
    assert.equal(replayed.id, request.requestId);
    assert.equal(adapter.devicesCalls, 1);
    let closed = false;
    const closing = manager.close().then(() => {
      closed = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(closed, false, 'Shutdown also waits for preparation before writing can begin');
    releaseScan();
    await assert.rejects(preparation, /USB disconnected/);
    await closing;
    const result = manager.get(request.requestId);
    assert.equal(result.status, 'error');
    assert.equal(result.error, 'USB disconnected');
    assert.ok(result.finishedAt);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, request.requestId, 'receipt.json'), 'utf8')),
      result,
    );
    assert.equal(
      (await manager.create(request)).status,
      'error',
      'A failed request must use a new ID to retry hardware',
    );
    assert.equal(adapter.calls, 0);
    assert.equal(adapter.devicesCalls, 1);
  });
});

test('old idempotency records survive full-log pruning and cannot write a second time', async () => {
  await withHelper(async ({ adapter, manager }) => {
    adapter.release?.();
    const first = await manager.create(request);
    await manager.close();
    for (let index = 0; index < 20; index++) {
      await manager.create({ ...request, requestId: randomUUID() });
      await manager.close();
    }
    assert.equal(adapter.calls, 21);
    const receipt = await manager.create(request);
    assert.equal(receipt.id, first.id);
    assert.equal(receipt.status, 'success');
    assert.equal(adapter.calls, 21);
  });
});

const cableScan =
  ' Cable found:  USB Debugger A/0/529/null (USB location:529)\n Cable found:  USB Debugger A/1/530/null (USB location:530)\n Cost 0.13 second(s)\n';
const gowinDetected = ' Device found: GW2AR-18C(0x0000081B)\n';
const openDetected =
  'index 0:\n    idcode 0x81b\n    manufacturer Gowin\n    family GW2A\n    model GW2A(R)-18(C)\n    irlength 8\n';
const usbScan =
  "Bus device vid:pid       probe_type manufacturer serial     product\n001 002    0x0403:0x6010 FTDI2232   SIPEED       2025030317 20K's FRIEND\n";

test('device scans require a single exact ID and unambiguous JTAG channel or serial', () => {
  assert.deepEqual(parseGowinCableLocations(cableScan), [529]);
  assert.throws(() => parseGowinCableLocations(cableScan + cableScan), /одинаковым/);
  assert.throws(
    () => parseGowinCableLocations(cableScan.replace('USB location:529', 'USB location:777')),
    /однозначно/,
  );
  assert.doesNotThrow(() => assertGowinIdentity(gowinDetected));
  assert.throws(() => assertGowinIdentity(gowinDetected + gowinDetected), /единственный/);
  assert.throws(
    () => assertGowinIdentity(gowinDetected.replace('0000081B', '0000481B')),
    /единственный/,
  );
  assert.doesNotThrow(() => assertOpenFpgaloaderIdentity(openDetected));
  assert.throws(
    () => assertOpenFpgaloaderIdentity(openDetected + 'idcode 0xffffffff\n'),
    /единственный/,
  );
  assert.deepEqual(parseOpenFpgaloaderSerials(usbScan), ['2025030317']);
  assert.throws(() => parseOpenFpgaloaderSerials(usbScan + usbScan.split('\n')[1]), /одинаковыми/);
  assert.throws(
    () => parseOpenFpgaloaderSerials(usbScan.replace('2025030317', 'none      ')),
    /серийного/,
  );
});

test('Gowin adapter fixes all CLI arguments to SRAM and validates status and UserCode', async () => {
  const calls: string[][] = [];
  const runner: CommandRunner = async (_executable, args) => {
    calls.push([...args]);
    if (args.includes('--scan-cables')) return cableScan;
    if (args.includes('--scan')) return gowinDetected;
    const operation = args[args.indexOf('--operation') + 1];
    if (operation === '2') return 'Operation "SRAM Program" for device#1...\n Finished.\n';
    if (operation === '74') return 'Status Code is: 0x00006020\n Finished.\n';
    if (operation === '73') return 'User Code is: 0x000035B1\n Finished.\n';
    throw new Error('Unexpected command');
  };
  const adapter = new GowinProgrammingAdapter('/trusted/programmer_cli.exe', runner);
  assert.deepEqual(await adapter.devices(), [deviceWithLabel('Tang Nano 20K · USB 529')]);
  const stages: string[] = [];
  await adapter.program(device, '/safe/design.fs', '000035B1', {
    stage: (stage) => stages.push(stage),
    log: () => {},
  });
  assert.deepEqual(
    calls
      .filter((args) => args.includes('--operation'))
      .map((args) => args[args.indexOf('--operation') + 1]),
    ['2', '74', '73'],
  );
  assert.deepEqual(
    calls.find((args) => args.includes('--fsFile')),
    [
      '--device',
      'GW2AR-18C',
      '--cable-index',
      '4',
      '--location',
      '529',
      '--frequency',
      '2.5MHz',
      '--operation',
      '2',
      '--fsFile',
      '/safe/design.fs',
    ],
  );
  assert.equal(stages[1], 'Загрузка в SRAM');
  await assert.rejects(
    adapter.program(device, '/safe/design.fs', 'ffff', { stage: () => {}, log: () => {} }),
    /UserCode/,
  );
});

function deviceWithLabel(label: string) {
  return { ...device, label };
}

test('openFPGALoader adapter selects a serial and channel before explicit SRAM loading', async () => {
  const calls: string[][] = [];
  const runner: CommandRunner = async (_executable, args) => {
    calls.push([...args]);
    if (args.includes('--scan-usb')) return usbScan;
    if (args.includes('--detect')) return openDetected;
    if (args.includes('-m')) return 'write to ram\n Done\n';
    throw new Error('Unexpected command');
  };
  const adapter = new OpenFpgaloaderProgrammingAdapter('/trusted/openFPGALoader', runner);
  const devices = await adapter.devices();
  assert.equal(devices.length, 1);
  assert.equal(devices[0].serial, '2025030317');
  await adapter.program(devices[0], '/safe/design.fs', '35b1', { stage: () => {}, log: () => {} });
  assert.deepEqual(
    calls.find((args) => args.includes('-m')),
    [
      '-b',
      'tangnano20k',
      '--ftdi-serial',
      '2025030317',
      '--ftdi-channel',
      '0',
      '--freq',
      '2500000',
      '-m',
      '/safe/design.fs',
    ],
  );
  assert.ok(
    calls.every(
      (args) => !args.some((arg) => /^(?:-f|--write-flash|--bulk-erase|--mcufw)$/.test(arg)),
    ),
  );
});

test('helper configuration requires exact origins and excludes HTTP command or flash parameters', () => {
  assert.equal(parseProgrammingHelperArguments([]).port, 3211);
  assert.deepEqual(
    parseProgrammingHelperArguments([
      '--port',
      '3333',
      '--backend',
      'openfpgaloader',
      '--allow-origin',
      'https://school.example',
    ]).allowedOrigins,
    ['https://school.example'],
  );
  for (const args of [
    ['--port', '0'],
    ['--host', '0.0.0.0'],
    ['--allow-origin', 'https://school.example/'],
    ['--allow-origin', '*'],
    ['--operation', '8'],
    ['--backend', 'other'],
  ])
    assert.throws(() => parseProgrammingHelperArguments(args));
  assert.throws(
    () => createProgrammingHelperApp({ adapter: new FakeAdapter(), root: '.', token: 'short' }),
    /32/,
  );
  assert.deepEqual(validateProgrammingRequest(request), request);
});

test('programmer child processes enforce output and deadline limits without a shell', async () => {
  await assert.rejects(
    runProgrammingCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      timeoutMs: 30,
    }),
    /отведённое время/,
  );
  await assert.rejects(
    runProgrammingCommand(process.execPath, ['-e', 'process.stdout.write("x".repeat(600000))']),
    /журнал/i,
  );
  const output = await runProgrammingCommand(process.execPath, [
    '-e',
    'process.stdout.write(process.argv[1])',
    '$(never-executed); & literal',
  ]);
  assert.equal(output, '$(never-executed); & literal');
});
