import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { YosysNetlist, YosysCell } from '../shared/types';

const worker = fileURLToPath(new URL('../server/physical-yosys-runner.mjs', import.meta.url));

function cell(
  type: string,
  connections: YosysCell['connections'],
  parameters: Record<string, string> = {},
  port_directions: YosysCell['port_directions'] = { A: 'input', Y: 'output' },
): YosysCell {
  return { hide_name: 0, type, parameters, attributes: {}, port_directions, connections };
}

// A hierarchy-preserving Gowin snapshot with the same generic named-wire
// buffers produced by newer Yosys. Include single/multi-bit chains, constants,
// an unused padded alias, and real I/O cells that must survive preparation.
function fixture(): YosysNetlist {
  return {
    creator: 'physical regression',
    modules: {
      top: {
        attributes: { top: '1' },
        ports: {
          a: { direction: 'input', bits: [2, 3] },
          y: { direction: 'output', bits: [4, 5, 6, 7] },
        },
        cells: {
          input0: cell('IBUF', { I: [2], O: [10] }, {}, { I: 'input', O: 'output' }),
          input1: cell('IBUF', { I: [3], O: [11] }, {}, { I: 'input', O: 'output' }),
          nested: cell('bridge', { A: [10, 11], Y: [20, 21, 22, 23] }),
          output0: cell('OBUF', { I: [20], O: [4] }, {}, { I: 'input', O: 'output' }),
          output1: cell('OBUF', { I: [21], O: [5] }, {}, { I: 'input', O: 'output' }),
          output2: cell('OBUF', { I: [22], O: [6] }, {}, { I: 'input', O: 'output' }),
          output3: cell('OBUF', { I: [23], O: [7] }, {}, { I: 'input', O: 'output' }),
        },
        netnames: {
          a: { hide_name: 0, bits: [2, 3], attributes: {} },
          y: { hide_name: 0, bits: [4, 5, 6, 7], attributes: {} },
        },
      },
      bridge: {
        attributes: {},
        ports: {
          A: { direction: 'input', bits: [2, 3] },
          Y: { direction: 'output', bits: [8, 5, 6, 7] },
        },
        cells: {
          word_alias: cell(
            '$buf',
            { A: [2, 3, '0', '1'], Y: [4, 5, 6, 7] },
            { WIDTH: '00000000000000000000000000000100' },
          ),
          bit_alias: cell('$_BUF_', { A: [4], Y: [8] }),
          unused_padded_alias: cell(
            '$buf',
            { A: [2, 3, 'z', 'z'], Y: [9, 10, 11, 12] },
            { WIDTH: '00000000000000000000000000000100' },
          ),
        },
        netnames: {
          A: { hide_name: 0, bits: [2, 3], attributes: {} },
          Y: { hide_name: 0, bits: [8, 5, 6, 7], attributes: {} },
          word_alias_Y: { hide_name: 0, bits: [4, 5, 6, 7], attributes: {} },
          bit_alias_Y: { hide_name: 0, bits: [8], attributes: {} },
          sample: { hide_name: 0, bits: [9, 10, 11, 12], attributes: {} },
        },
      },
      IBUF: {
        attributes: { blackbox: '1' },
        ports: { I: { direction: 'input', bits: [2] }, O: { direction: 'output', bits: [3] } },
        cells: {},
        netnames: {},
      },
      OBUF: {
        attributes: { blackbox: '1' },
        ports: { I: { direction: 'input', bits: [2] }, O: { direction: 'output', bits: [3] } },
        cells: {},
        netnames: {},
      },
    },
  };
}

function prepare(technology: YosysNetlist): Promise<YosysNetlist> {
  return new Promise((resolve, reject) => {
    const child = fork(worker, [], {
      execArgv: [],
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let result: YosysNetlist | undefined,
      error = '',
      logs = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Physical preparation worker timeout'));
    }, 30_000);
    child.on('message', (message) => {
      const value = message as { type: string; text?: string; error?: string };
      if (value.type === 'flat') result = JSON.parse(value.text!) as YosysNetlist;
      if (value.type === 'error') error = value.error ?? '';
      if (value.type === 'log') logs += value.text ?? '';
    });
    child.stderr?.on('data', (data) => {
      logs += String(data);
    });
    child.once('error', (cause) => {
      clearTimeout(timeout);
      reject(cause);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && result) resolve(result);
      else reject(new Error(`${error || `Worker exit ${code}`}\n${logs}`));
    });
    child.send({ technology, top: 'top' });
  });
}

test('physical preparation removes generic alias buffers while preserving Gowin I/O and bit connectivity', async () => {
  const technology = fixture();
  const before = structuredClone(technology);
  const prepared = await prepare(technology);
  const top = prepared.modules.top;
  assert.deepEqual(technology, before, 'preparation must not mutate the saved technology view');
  assert.deepEqual(
    top.ports,
    before.modules.top.ports,
    'physical top pins and widths remain unchanged',
  );
  assert.deepEqual(
    Object.values(top.cells)
      .map((item) => item.type)
      .sort(),
    ['IBUF', 'IBUF', 'OBUF', 'OBUF', 'OBUF', 'OBUF'],
  );
  assert.deepEqual(
    top.cells.output0.connections.I,
    top.cells.input0.connections.O,
    'first bus bit survives the mixed buffer chain',
  );
  assert.deepEqual(
    top.cells.output1.connections.I,
    top.cells.input1.connections.O,
    'second bus bit keeps its order',
  );
  assert.deepEqual(top.cells.output2.connections.I, ['0'], 'constant zero remains zero');
  assert.deepEqual(top.cells.output3.connections.I, ['1'], 'constant one remains one');
  assert.ok(
    Object.values(top.cells).every(
      (item) => item.type !== '$buf' && item.type !== '$_BUF_' && item.type !== 'bridge',
    ),
  );
});
