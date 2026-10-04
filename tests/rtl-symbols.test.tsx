import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { YosysCell, YosysNetlist } from '../shared/types';
import { buildGraph } from '../src/lib/netlist';
import { getRtlSymbol, RtlSymbol } from '../src/components/RtlSymbol';

function fixture(
  type: string,
  connections: YosysCell['connections'],
  parameters: YosysCell['parameters'] = {},
) {
  const cell: YosysCell = {
    type,
    connections,
    parameters,
    attributes: {},
    port_directions: Object.fromEntries(
      Object.keys(connections).map((name) => [
        name,
        name === 'Y' || name === 'Q' ? 'output' : 'input',
      ]),
    ),
  };
  const netlist: YosysNetlist = {
    creator: 'test',
    modules: { top: { attributes: {}, ports: {}, netnames: {}, cells: { example: cell } } },
  };
  const node = buildGraph(netlist, 'top').nodes.find((item) => item.cellName === 'example')!;
  const spec = getRtlSymbol(node, cell);
  assert.ok(spec);
  const render = () =>
    renderToStaticMarkup(createElement('svg', null, createElement(RtlSymbol, { node, spec })));
  return { cell, node, spec, render };
}
const bus = (count: number, start = 2) =>
  Array.from({ length: count }, (_, index) => index + start);

test('bitwise AND uses ANSI D shape and exposes both bus widths at matching terminal anchors', () => {
  const { spec, render } = fixture('$and', { A: bus(8), B: bus(8, 10), Y: bus(8, 18) });
  assert.equal(spec.kind, 'and');
  assert.equal(spec.detail, '×8 · побитовое');
  assert.deepEqual(
    spec.ports.map((port) => [port.name, port.x, port.y, port.side]),
    [
      ['A', 0, 46, 'WEST'],
      ['B', 0, 78, 'WEST'],
      ['Y', 180, 62, 'EAST'],
    ],
  );
  const svg = render();
  assert.match(svg, /A34,34/);
  assert.match(svg, /d="M0,46 L40,46"/);
  assert.match(svg, /d="M180,62 L114,62"/);
  assert.match(svg, /A\[7:0\]/);
});

test('logical NOT and reduction NOT distinguish scalar results from a bank of inverters', () => {
  const bitwise = fixture('$not', { A: bus(2), Y: bus(2, 4) });
  const logical = fixture('$logic_not', { A: bus(2), Y: [4] });
  const reduction = fixture('$reduce_xnor', { A: bus(8), Y: [10] });
  assert.equal(bitwise.spec.detail, '~ · ×2 · побитовое');
  assert.equal(logical.spec.detail, 'A == 0 · логическое 2→1');
  assert.equal(logical.spec.inverted, true);
  assert.match(logical.render(), /rtl-inversion/);
  assert.equal(reduction.spec.kind, 'xor');
  assert.equal(reduction.spec.inverted, true);
  assert.equal(reduction.spec.detail, 'свёртка 8→1');
});

test('OR/XOR curves differ, while NAND output carries an inversion bubble', () => {
  const or = fixture('$or', { A: [2], B: [3], Y: [4] });
  const xor = fixture('$_XOR_', { A: [2], B: [3], Y: [4] });
  const nand = fixture('$_NAND_', { A: [2], B: [3], Y: [4] });
  assert.equal(or.spec.kind, 'or');
  assert.equal(xor.spec.kind, 'xor');
  assert.match(xor.render(), /M31,28 Q53,62 31,96/);
  assert.doesNotMatch(or.render(), /M31,28 Q53,62 31,96/);
  assert.equal(nand.spec.kind, 'and');
  assert.equal(nand.spec.inverted, true);
});

test('pmux preserves default A, wide concatenated B and one-hot S instead of a binary selector', () => {
  const { spec, render } = fixture('$pmux', {
    A: bus(8),
    B: bus(32, 10),
    S: bus(4, 42),
    Y: bus(8, 46),
  });
  assert.equal(spec.parallelMux, true);
  assert.equal(spec.detail, 'one-hot · 4×8');
  const selector = spec.ports.find((port) => port.name === 'S')!;
  assert.deepEqual(
    [selector.label, selector.side, selector.x, selector.y],
    ['S[3:0]', 'SOUTH', 88, 166],
  );
  assert.equal(spec.ports.find((port) => port.name === 'B')?.label, 'B[31:0]');
  const svg = render();
  assert.match(svg, /one-hot/);
  assert.match(svg, /B\[31:0\]/);
  assert.match(svg, /d="M88,166 L88,108.4"/);
});

test('adder width follows Y and retains differently sized operands', () => {
  const { spec, render } = fixture('$add', { A: bus(4), B: bus(32, 6), Y: bus(32, 38) });
  assert.equal(spec.detail, '32 бит');
  assert.deepEqual(
    spec.ports.map((port) => port.label),
    ['A[3:0]', 'B[31:0]', 'Y[31:0]'],
  );
  assert.match(render(), /rtl-adder-operation/);
  assert.match(render(), /cx="90" cy="62" r="38"/);
});

test('comparators expose their operation and operand widths without an inversion bubble', () => {
  for (const [type, label] of Object.entries({
    $eq: '=',
    $ne: '≠',
    $lt: '<',
    $le: '≤',
    $gt: '>',
    $ge: '≥',
    $eqx: '===',
    $nex: '!==',
  })) {
    const { spec, render } = fixture(
      type,
      { A: bus(3), B: bus(5, 5), Y: [10] },
      { A_SIGNED: 1, B_SIGNED: 1 },
    );
    assert.equal(spec.kind, 'comparator');
    assert.equal(spec.label, label);
    assert.match(spec.detail, /знаковое/);
    assert.deepEqual(
      spec.ports.map((port) => port.label),
      ['A[2:0]', 'B[4:0]', 'Y'],
    );
    const svg = render();
    assert.match(svg, /x="44" y="28" width="88" height="68"/);
    assert.match(svg, /d="M0,44 L44,44"/);
    assert.match(svg, /d="M0,80 L44,80"/);
    assert.match(svg, /d="M180,62 L132,62"/);
    assert.doesNotMatch(svg, /rtl-inversion|rtl-clock-triangle/);
  }
  const mixed = fixture('$lt', { A: bus(3), B: bus(5, 5), Y: [10] }, { A_SIGNED: 1, B_SIGNED: 0 });
  assert.doesNotMatch(mixed.spec.detail, /знаковое/);
});

test('shift blocks show direction and keep the shift amount separate from mux selectors', () => {
  for (const [type, label] of Object.entries({
    $shl: '<<',
    $shr: '>>',
    $sshl: '<<<',
    $sshr: '>>>',
  })) {
    const { spec, render } = fixture(
      type,
      { A: bus(4), B: bus(2, 6), Y: bus(8, 8) },
      { A_SIGNED: 1 },
    );
    assert.equal(spec.kind, 'shift');
    assert.equal(spec.label, label);
    assert.equal(spec.ports.find((port) => port.name === 'B')?.role, 'input');
    assert.deepEqual(
      spec.ports.map((port) => port.label),
      ['A[3:0]', 'B[1:0]', 'Y[7:0]'],
    );
    assert.match(spec.detail, /8 бит/);
    assert.equal(spec.detail.includes('со знаком'), type === '$sshr');
    assert.match(render(), /d="M180,62 L132,62"/);
  }
});

test('synchronous DFF uses D/Q, edge clock and separate reset/enable with parameter polarity', () => {
  const { spec, render } = fixture(
    '$sdffe',
    { CLK: [2], D: bus(8, 3), EN: [11], Q: bus(8, 12), SRST: [20] },
    {
      CLK_POLARITY: '00000000',
      EN_POLARITY: '00000000',
      SRST_POLARITY: '00000001',
      SRST_VALUE: '00000000',
    },
  );
  assert.equal(spec.kind, 'dff');
  assert.equal(spec.resetInfo, 'sync R=0');
  assert.equal(spec.detail, '8 бит · R > EN');
  assert.deepEqual(
    spec.ports.map((port) => [port.name, port.role, port.side, !!port.negative]),
    [
      ['CLK', 'clock', 'WEST', true],
      ['D', 'input', 'WEST', false],
      ['EN', 'enable', 'WEST', true],
      ['Q', 'output', 'EAST', false],
      ['SRST', 'reset', 'NORTH', false],
    ],
  );
  const svg = render();
  assert.match(svg, /rtl-clock-triangle/);
  assert.match(svg, /спад тактового сигнала/);
  assert.match(svg, /d="M0,108 L32,108"/);
  assert.match(svg, /d="M88,0 L88,32"/);
});

test('async reset, enable-over-reset and gate-level encoded polarities are preserved', () => {
  const async = fixture(
    '$adff',
    { CLK: [2], D: [3], Q: [4], ARST: [5] },
    { CLK_POLARITY: 1, ARST_POLARITY: 0, ARST_VALUE: '1' },
  );
  assert.equal(async.spec.resetInfo, 'async R=1');
  assert.equal(async.spec.ports.find((port) => port.name === 'ARST')?.negative, true);
  assert.match(async.render(), /фронт тактового сигнала/);
  const enabledReset = fixture('$sdffce', { CLK: [2], D: [3], Q: [4], EN: [5], SRST: [6] });
  assert.equal(enabledReset.spec.detail, '1 бит · EN > R');
  const encoded = fixture('$_SDFFE_NN0P_', { C: [2], D: [3], Q: [4], E: [5], R: [6] });
  assert.equal(encoded.spec.ports.find((port) => port.name === 'C')?.negative, true);
  assert.equal(encoded.spec.ports.find((port) => port.name === 'R')?.negative, true);
  assert.equal(encoded.spec.ports.find((port) => port.name === 'E')?.negative, false);
});

test('gate-level DFFE decodes enable independently of optional asynchronous reset', () => {
  const negativeEnable = fixture('$_DFFE_PN_', { C: [2], D: [3], Q: [4], E: [5] });
  assert.equal(negativeEnable.spec.ports.find((port) => port.name === 'C')?.negative, false);
  assert.equal(negativeEnable.spec.ports.find((port) => port.name === 'E')?.negative, true);
  assert.equal(negativeEnable.spec.resetInfo, undefined);
  const async = fixture('$_DFFE_NP1N_', { C: [2], D: [3], Q: [4], E: [5], R: [6] });
  assert.equal(async.spec.ports.find((port) => port.name === 'C')?.negative, true);
  assert.equal(async.spec.ports.find((port) => port.name === 'E')?.negative, true);
  assert.equal(async.spec.ports.find((port) => port.name === 'R')?.negative, false);
  assert.equal(async.spec.resetInfo, 'async R=1');
  const sr = fixture('$_DFFSRE_PNPN_', { C: [2], D: [3], Q: [4], E: [5], R: [6], S: [7] });
  assert.equal(sr.spec.ports.find((port) => port.name === 'S')?.negative, true);
  assert.equal(sr.spec.ports.find((port) => port.name === 'R')?.negative, false);
  assert.equal(sr.spec.ports.find((port) => port.name === 'E')?.negative, true);
});

test('level-sensitive latches show D/Q/EN and never a clock triangle', () => {
  const simple = fixture('$dlatch', { D: bus(4), Q: bus(4, 6), EN: [10] }, { EN_POLARITY: 0 });
  assert.equal(simple.spec.kind, 'latch');
  assert.equal(simple.spec.label, 'LATCH');
  assert.equal(simple.spec.detail, '4 бит · по уровню EN');
  assert.equal(simple.spec.ports.find((port) => port.name === 'EN')?.negative, true);
  assert.match(simple.render(), /d="M0,82 L32,82"/);
  assert.doesNotMatch(simple.render(), /rtl-clock-triangle|role-clock/);
  const async = fixture(
    '$adlatch',
    { D: [2], Q: [3], EN: [4], ARST: [5] },
    { EN_POLARITY: 1, ARST_POLARITY: 0, ARST_VALUE: '1' },
  );
  assert.equal(async.spec.resetInfo, 'async R=1');
  assert.equal(async.spec.ports.find((port) => port.name === 'ARST')?.negative, true);
  assert.match(async.render(), /d="M88,0 L88,20"/);
  assert.doesNotMatch(async.render(), /rtl-clock-triangle/);
  const encoded = fixture('$_DLATCH_NP0_', { D: [2], Q: [3], E: [4], R: [5] });
  assert.equal(encoded.spec.ports.find((port) => port.name === 'E')?.negative, true);
  assert.equal(encoded.spec.ports.find((port) => port.name === 'R')?.negative, false);
  assert.equal(encoded.spec.resetInfo, 'async R=0');
  const setReset = fixture('$_DLATCHSR_NPN_', { D: [2], Q: [3], E: [4], R: [5], S: [6] });
  assert.equal(setReset.spec.ports.find((port) => port.name === 'E')?.negative, true);
  assert.equal(setReset.spec.ports.find((port) => port.name === 'S')?.negative, false);
  assert.equal(setReset.spec.ports.find((port) => port.name === 'R')?.negative, true);
  assert.doesNotMatch(setReset.render(), /rtl-clock-triangle/);
});

test('technology LUTs and nested modules retain their explicit blocks', () => {
  const { node, cell } = fixture('$and', { A: [2], B: [3], Y: [4] });
  assert.equal(getRtlSymbol({ ...node, type: 'LUT4' }, { ...cell, type: 'LUT4' }), null);
  assert.equal(getRtlSymbol({ ...node, moduleName: '$and' }, cell), null);
  assert.equal(getRtlSymbol({ ...node, type: '$unknown' }, { ...cell, type: '$unknown' }), null);
});
