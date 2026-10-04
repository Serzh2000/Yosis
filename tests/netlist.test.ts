import test from 'node:test';
import assert from 'node:assert/strict';
import type { YosysCell, YosysModule, YosysNetlist } from '../shared/types';
import {
  buildGraph,
  getHierarchy,
  getLutTruthTable,
  getResources,
  getSourceLocations,
  resourceCategory,
} from '../src/lib/netlist';

function cell(type: string, overrides: Partial<YosysCell> = {}): YosysCell {
  return {
    type,
    parameters: {},
    attributes: {},
    port_directions: {},
    connections: {},
    ...overrides,
  };
}
function module(cells: YosysModule['cells'], overrides: Partial<YosysModule> = {}): YosysModule {
  return { attributes: {}, ports: {}, cells, netnames: {}, ...overrides };
}
function netlist(modules: YosysNetlist['modules']): YosysNetlist {
  return { creator: 'test', modules };
}

test('LUT4 binary INIT implements (I0 & I1) | I2 and treats I0 as the address LSB', () => {
  const rows = getLutTruthTable(cell('LUT4', { parameters: { INIT: '1111100011111000' } }));
  assert.ok(rows);
  assert.equal(rows.length, 16);
  for (const row of rows) {
    const [a, b, c] = row.inputs;
    assert.equal(row.output, String((a & b) | c), `address ${row.index}`);
  }
  assert.deepEqual(rows[1].inputs, [1, 0, 0, 0]);
  assert.deepEqual(rows[8].inputs, [0, 0, 0, 1]);
});

test('LUT inspector handles internal $lut, numeric/hex INIT and explicit unknowns', () => {
  const internal = getLutTruthTable(
    cell('$lut', { parameters: { WIDTH: '00000010', LUT: '0110' } }),
  );
  assert.deepEqual(
    internal?.map((row) => row.output),
    ['0', '1', '1', '0'],
  );
  const numeric = getLutTruthTable(cell('LUT2', { parameters: { INIT: 6 } }));
  const hex = getLutTruthTable(cell('LUT2', { parameters: { INIT: "4'h6" } }));
  assert.deepEqual(numeric, internal);
  assert.deepEqual(hex, internal);
  assert.deepEqual(
    getLutTruthTable(cell('LUT2', { parameters: { INIT: 'xz10' } }))?.map((row) => row.output),
    ['0', '1', 'z', 'x'],
  );
  assert.deepEqual(
    getLutTruthTable(cell('LUT1'))?.map((row) => row.output),
    ['?', '?'],
  );
  assert.equal(getLutTruthTable(cell('DFF')), null);
});

test('resource totals expand each module instance without counting library implementation internals', () => {
  const design = netlist({
    top: module({ first: cell('unit'), second: cell('unit'), input: cell('IBUF') }),
    unit: module({ lut: cell('LUT3'), reg: cell('DFF'), blackbox: cell('DPB') }),
    LUT3: module({ implementation: cell('$and') }, { attributes: { blackbox: '00000001' } }),
    DFF: module({ implementation: cell('$dff') }, { attributes: { blackbox: 1 } }),
    DPB: module({ implementation: cell('$mem') }, { attributes: { blackbox: 1 } }),
  });
  assert.deepEqual(getResources(design, 'top'), {
    LUT: 2,
    FF: 2,
    ALU: 0,
    BRAM: 2,
    DSP: 0,
    IO: 1,
    other: 0,
    total: 7,
  });
  const hierarchy = getHierarchy(design, 'top');
  assert.deepEqual(
    hierarchy.children.map((item) => item.id),
    ['top/first', 'top/second'],
  );
  assert.equal(hierarchy.children[0].resources.total, 3);
  assert.equal(hierarchy.children[0].children.length, 0);
});

test('DSP and distributed memory categories reflect physical primitive families', () => {
  assert.equal(resourceCategory('ALU54D'), 'DSP');
  assert.equal(resourceCategory('ALU'), 'ALU');
  assert.equal(resourceCategory('MULT9X9'), 'DSP');
  assert.equal(resourceCategory('DPB'), 'BRAM');
  assert.equal(resourceCategory('SP'), 'BRAM');
  assert.equal(resourceCategory('RAM16S4'), 'other');
  assert.equal(resourceCategory('TBUF'), 'IO');
  for (const type of [
    '$dlatch',
    '$adlatch',
    '$dlatchsr',
    '$_DLATCH_P_',
    '$_DLATCH_NN0_',
    '$_DLATCHSR_PNP_',
    '$aldff',
    '$aldffe',
    '$ff',
    '$_FF_',
    '$sr',
  ]) {
    assert.equal(resourceCategory(type), 'FF', type);
  }
  assert.equal(resourceCategory('$unknown_dff'), 'other');
});

test('source locations preserve multiple mappings and Windows drive letters', () => {
  assert.deepEqual(
    getSourceLocations({ src: 'C:\\fpga\\logic.v:2.1-5.12|helper.v:9.3-9.8|helper.v:9.3-9.8' }),
    [
      { file: 'C:\\fpga\\logic.v', line: 2, endLine: 5 },
      { file: 'helper.v', line: 9, endLine: 9 },
    ],
  );
  assert.deepEqual(getSourceLocations({ src: 1 }), []);
});

test('graph connects bus ports, constants and output ports using signal bits', () => {
  const design = netlist({
    top: module(
      {
        logic: cell('$add', {
          port_directions: { A: 'input', B: 'input', Y: 'output' },
          connections: { A: [2, 3], B: ['0', '0'], Y: [4, 5] },
        }),
      },
      {
        ports: {
          a: { direction: 'input', bits: [2, 3] },
          y: { direction: 'output', bits: [4, 5] },
        },
        netnames: { a: { bits: [2, 3] }, y: { bits: [4, 5] } },
      },
    ),
  });
  const graph = buildGraph(design, 'top');
  assert.equal(graph.edges.length, 3);
  assert.deepEqual(
    graph.edges.map((edge) => [edge.source, edge.target, edge.width, edge.label]),
    [
      ['cell:logic', 'port:y', 2, 'y'],
      ['port:a', 'cell:logic', 2, 'a'],
      ['constant:0', 'cell:logic', 2, '2 бит'],
    ],
  );
  assert.ok(graph.nodes.find((node) => node.id === 'constant:0'));
});

test('bus fanout repeating a bit does not multiply its drivers', () => {
  const design = netlist({
    top: module({
      source: cell('SOURCE', { port_directions: { Y: 'output' }, connections: { Y: [2, 2] } }),
      target: cell('TARGET', { port_directions: { A: 'input' }, connections: { A: [2, 2] } }),
    }),
  });
  const graph = buildGraph(design, 'top');
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].width, 2);
});

test('capped graphs disclose omitted cells and include selected hidden cell without inventing undriven inputs', () => {
  const design = netlist({
    top: module({
      producer: cell('SOURCE', { port_directions: { Y: 'output' }, connections: { Y: [2] } }),
      consumer: cell('TARGET', { port_directions: { A: 'input' }, connections: { A: [2] } }),
    }),
  });
  const graph = buildGraph(design, 'top', { maxCells: 1, selectedCell: 'consumer' });
  assert.equal(graph.hiddenCells, 1);
  assert.ok(graph.nodes.find((node) => node.cellName === 'consumer'));
  assert.equal(
    graph.nodes.some((node) => node.kind === 'undriven'),
    false,
  );
  assert.equal(graph.edges.length, 0);
});

test('recursive module references terminate and hierarchy marks recursion', () => {
  const design = netlist({ top: module({ recursive: cell('top'), gate: cell('LUT1') }) });
  assert.equal(getResources(design, 'top').LUT, 1);
  assert.equal(getHierarchy(design, 'top').children[0].recursive, true);
});
