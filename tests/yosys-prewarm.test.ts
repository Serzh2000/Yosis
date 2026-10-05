import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BuildManager } from '../server/builds';
import type { Project } from '../shared/types';

const project: Project = {
  name: 'prewarm',
  top: 'top',
  board: 'tangnano20k',
  files: [
    {
      name: 'top.v',
      content: 'module top(input a, input b, output y); assign y = a & b; endmodule\n',
    },
  ],
};

test('a prewarmed worker builds a project and its warm-up stays out of the log', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yosis-prewarm-'));
  const manager = new BuildManager(root);
  try {
    manager.prewarm();
    for (let round = 0; round < 2; round++) {
      const { id } = await manager.create(project);
      let result = await manager.get(id);
      const deadline = Date.now() + 100_000;
      while (result.status === 'queued' || result.status === 'running') {
        assert.ok(Date.now() < deadline, 'build did not finish');
        await new Promise((resolve) => setTimeout(resolve, 100));
        result = await manager.get(id);
      }
      assert.equal(result.status, 'success', result.error);
      assert.ok(result.technology?.modules.top);
      assert.ok(!/module warm|warm.v/.test(result.logs), 'warm-up output leaked into the job log');
    }
  } finally {
    await manager.close();
    await rm(root, { recursive: true, force: true });
  }
});
