import assert from 'node:assert/strict';
import test from 'node:test';
import type { YosysModule, YosysNetlist } from '../shared/types';
import type { VcdSignal } from '../src/lib/vcd';
import { linkVcdSignal } from '../src/lib/signal-link';
import { TESTBENCH_TOP } from '../server/simulation-testbench';

const module = (): YosysModule => ({ attributes: {}, ports: {}, cells: {}, netnames: {} });
const top = module();
top.netnames.bus = { bits: [2, 3, 4] };
top.netnames.alias = { bits: [2, 3, 4] };
top.netnames.constant = { bits: ['0', '1'] };
top.netnames.mixed = { bits: [2, '0', 2] };
top.netnames['literal[2:0]'] = { bits: [10] };
top.ports.button = { direction: 'input', bits: [5] };
top.cells.child = {
  type: '$paramod\\alu',
  attributes: {},
  parameters: {},
  connections: {},
  port_directions: {},
};
const alu = module();
alu.netnames.result = { bits: [6, 7] };
const rtl: YosysNetlist = { creator: 'test', modules: { top, '$paramod\\alu': alu } };
const signal = (name: string, width: number, scope = [TESTBENCH_TOP, 'dut']): VcdSignal => ({
  id: '!',
  name,
  width,
  scope,
  changes: [],
});

test('DUT ports, bus ranges, aliases and escaped names resolve to numeric RTL bits', () => {
  for (const name of ['bus', 'bus [2:0]', '\\bus [2:0]', 'alias [2:0]']) {
    assert.deepEqual(linkVcdSignal(rtl, 'top', signal(name, 3))?.bits, [2, 3, 4]);
  }
  assert.deepEqual(linkVcdSignal(rtl, 'top', signal('button', 1)), {
    module: 'top',
    name: 'button',
    bits: [5],
  });
  assert.deepEqual(linkVcdSignal(rtl, 'top', signal('bus', 3, ['top']))?.bits, [2, 3, 4]);
  assert.equal(linkVcdSignal(rtl, 'top', signal('literal[2:0]', 1))?.name, 'literal[2:0]');
});

test('nested instance follows its parameterized module type', () => {
  assert.deepEqual(
    linkVcdSignal(rtl, 'top', signal('result [1:0]', 2, [TESTBENCH_TOP, 'dut', 'child'])),
    { module: '$paramod\\alu', name: 'result', bits: [6, 7] },
  );
});

test('testbench-only, missing, unrelated and width-mismatched signals never produce false highlights', () => {
  for (const item of [
    signal('bus', 3, [TESTBENCH_TOP]),
    signal('bus', 3, ['unrelated']),
    signal('result', 2, [TESTBENCH_TOP, 'dut', 'missing']),
    signal('missing', 1),
    signal('bus', 2),
    signal('constant', 2),
  ])
    assert.equal(linkVcdSignal(rtl, 'top', item), null);
  assert.equal(linkVcdSignal(rtl, 'missing', signal('bus', 3)), null);
});

test('constant bits are excluded and aliases are deduplicated', () => {
  assert.deepEqual(linkVcdSignal(rtl, 'top', signal('mixed', 3))?.bits, [2]);
});
