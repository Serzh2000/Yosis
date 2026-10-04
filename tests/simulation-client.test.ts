import test from 'node:test';
import assert from 'node:assert/strict';
import type { Project, SimulationResult } from '../shared/types';
import { runSimulation } from '../src/lib/simulation-client';

const project: Project = { name: 'test', top: 'top', board: 'tangnano20k', files: [] };
const config = {
  clock: null,
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 2,
  periodNs: 10,
  inputs: {},
};
const queued: SimulationResult = {
  id: 'simulation-id',
  status: 'queued',
  stage: 'queued',
  startedAt: '',
  logs: '',
  diagnostics: [],
  top: 'top',
  projectHash: '',
  config,
  engine: 'Icarus',
};

test('an already cancelled simulation does not submit a new job', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json(queued);
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runSimulation(project, config, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('cancellation from a progress callback cancels the server job and skips polling', async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return Response.json(queued);
  });
  const controller = new AbortController();
  await assert.rejects(
    runSimulation(project, config, controller.signal, () => controller.abort()),
    { name: 'AbortError' },
  );
  assert.deepEqual(urls, ['/api/simulations', '/api/simulations/simulation-id/cancel']);
});

test('a finished simulation removes its cancellation listener', async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return Response.json({ ...queued, status: 'success', vcd: 'trace' });
  });
  const controller = new AbortController();
  const result = await runSimulation(project, config, controller.signal);
  controller.abort();
  assert.equal(result.vcd, 'trace');
  assert.deepEqual(urls, ['/api/simulations']);
});

test('a polling failure cancels a job instead of leaving it in the simulator queue', async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    if (url === '/api/simulations/simulation-id/status?logOffset=0')
      throw new Error('network failed');
    return Response.json(queued);
  });
  await assert.rejects(
    runSimulation(project, config, new AbortController().signal),
    /network failed/,
  );
  assert.deepEqual(urls, [
    '/api/simulations',
    '/api/simulations/simulation-id/status?logOffset=0',
    '/api/simulations/simulation-id/cancel',
  ]);
});

test('cancelling during submission retrieves its id and cancels the queued job', async (context) => {
  const urls: string[] = [];
  let resolveSubmission!: (response: Response) => void;
  context.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    urls.push(url);
    if (url === '/api/simulations') {
      assert.equal(
        init?.signal,
        undefined,
        'submission must return its id even if the user cancels',
      );
      return new Promise<Response>((resolve) => {
        resolveSubmission = resolve;
      });
    }
    return Response.json(queued);
  });
  const controller = new AbortController();
  const promise = runSimulation(project, config, controller.signal);
  controller.abort();
  resolveSubmission(Response.json(queued));
  await assert.rejects(promise, { name: 'AbortError' });
  assert.deepEqual(urls, ['/api/simulations', '/api/simulations/simulation-id/cancel']);
});
