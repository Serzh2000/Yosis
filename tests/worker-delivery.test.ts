import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildManager } from '../server/builds';
import type { Project } from '../shared/types';

const fixture = fileURLToPath(new URL('./fixtures/ipc-delivery-runner.mjs', import.meta.url));

test(
  'workers drain large IPC artifacts and preceding logs before closing',
  { timeout: 30_000 },
  async () => {
    for (let repeat = 0; repeat < 3; repeat++) {
      const messages: { type: string; index?: number; text?: string }[] = [];
      const child = fork(fixture, [], {
        execArgv: [],
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      });
      let stderr = '';
      child.stderr!.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('message', (message) => messages.push(message as (typeof messages)[number]));
      const closed = new Promise<number | null>((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      child.send({ size: 8 * 1024 * 1024, logs: 64 });
      assert.equal(await closed, 0, stderr);
      assert.equal(messages.length, 66);
      for (let index = 0; index < 64; index++) {
        assert.equal(messages[index].type, 'log');
        assert.equal(messages[index].index, index);
        assert.equal(messages[index].text!.length, 16 * 1024);
      }
      assert.equal(messages[64].type, 'artifact');
      assert.equal(messages[64].text, 'A'.repeat(8 * 1024 * 1024));
      assert.equal(messages[65].type, 'success');
      assert.equal(stderr, '');
    }
  },
);

test(
  'closing IPC during cancellation does not produce an unhandled send error',
  { timeout: 10_000 },
  async () => {
    const child = fork(fixture, [], {
      execArgv: [],
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let stderr = '';
    child.stderr!.on('data', (chunk) => {
      stderr += String(chunk);
    });
    const closed = new Promise<number | null>((resolve, reject) => {
      // Node on Windows does not emit close after parent-initiated disconnect.
      // Cancellation only checks that the worker exits without an uncaught error.
      child.once('error', reject);
      child.once('exit', resolve);
    });
    await new Promise<void>((resolve, reject) => {
      child.send({ size: 1024, logs: 2, cancel: true }, (error) =>
        error ? reject(error) : resolve(),
      );
    });
    child.disconnect();
    assert.equal(await closed, 1);
    assert.equal(stderr, '');
  },
);

test(
  'actual Yosys results survive repeated delivery and persist both netlists',
  { timeout: 120_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yosis-delivery-'));
    const manager = new BuildManager(directory);
    const project: Project = {
      name: 'IPC delivery',
      top: 'top',
      board: 'tangnano20k',
      files: [
        {
          name: 'top.v',
          content:
            'module top(input [127:0] a,b,c, output [127:0] y); assign y=(a & b) | c; endmodule',
        },
      ],
    };
    try {
      for (let repeat = 0; repeat < 3; repeat++) {
        let result = await manager.create(project);
        const deadline = Date.now() + 35_000;
        while (result.status === 'queued' || result.status === 'running') {
          assert.ok(Date.now() < deadline, 'The real worker should deliver its complete result');
          await new Promise((resolve) => setTimeout(resolve, 25));
          result = await manager.get(result.id);
        }
        assert.equal(result.status, 'success', `${result.error}\n${result.logs.slice(-2000)}`);
        assert.equal(result.rtl!.modules.top.ports.y.bits.length, 128);
        assert.ok(
          Object.values(result.technology!.modules.top.cells).some((cell) => cell.type === 'LUT3'),
        );
        const artifact = await manager.artifact(result.id, 'technology.json');
        assert.deepEqual(JSON.parse(await readFile(artifact, 'utf8')), result.technology);
        assert.equal((await new BuildManager(directory).get(result.id)).status, 'success');
      }
    } finally {
      await manager.close();
      // mkdtemp guarantees a dedicated directory under the system temporary root.
      await rm(directory, { recursive: true, force: true });
    }
  },
);
