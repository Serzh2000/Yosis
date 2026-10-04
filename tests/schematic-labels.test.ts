import test from 'node:test';
import assert from 'node:assert/strict';
import type { Bit, YosysNetlist } from '../shared/types';
import { buildGraph, type GraphEdge, type GraphPort } from '../src/lib/netlist';
import { getBusTapAnnotation, graphPortBitIndex } from '../src/lib/schematic-labels';

function port(name: string, bits: Bit[], offset = 0, upto = 0): GraphPort {
  return { id: name, name, direction: 'input', bits, offset, upto };
}
function edge(bits: Bit[]): GraphEdge {
  return {
    id: 'edge',
    source: 'source',
    sourcePort: 'Y',
    target: 'target',
    targetPort: 'A',
    bits,
    width: bits.length,
    label: '',
  };
}

test('three scalar drivers into an output vector are labelled as three separate lanes', () => {
  const netlist: YosysNetlist = {
    creator: 'test',
    modules: {
      top: {
        attributes: {},
        netnames: {},
        ports: { led_n: { direction: 'output', bits: [2, 3, 4] } },
        cells: Object.fromEntries(
          [2, 3, 4].map((bit) => [
            `not${bit}`,
            {
              type: '$not',
              parameters: {},
              attributes: {},
              port_directions: { A: 'input', Y: 'output' },
              connections: { A: ['0'], Y: [bit] },
            },
          ]),
        ),
      },
    },
  };
  const graph = buildGraph(netlist, 'top');
  const portMap = new Map(
    graph.nodes.flatMap((node) => node.ports.map((value) => [value.id, value] as const)),
  );
  const connections = graph.edges.filter((value) => value.target === 'port:led_n');
  assert.equal(connections.length, 3);
  assert.deepEqual(
    connections.map(
      (value) =>
        getBusTapAnnotation(value, portMap.get(value.sourcePort), portMap.get(value.targetPort))
          ?.label,
    ),
    ['led_n[0]', 'led_n[1]', 'led_n[2]'],
  );
  assert.deepEqual(
    connections.map((value) => value.bits),
    [[2], [3], [4]],
  );
});

test('shifted and ascending declarations preserve their real Verilog bit numbers', () => {
  const shifted = port('led_n', [2, 3, 4, 5], 4);
  assert.deepEqual(
    shifted.bits.map((_, index) => graphPortBitIndex(shifted, index)),
    [4, 5, 6, 7],
  );
  assert.equal(getBusTapAnnotation(edge([2]), undefined, shifted)?.label, 'led_n[4]');
  assert.equal(getBusTapAnnotation(edge([3, 4]), undefined, shifted)?.label, 'led_n[6:5]');
  const ascending = port('data', [2, 3, 4, 5], 4, 1);
  assert.deepEqual(
    ascending.bits.map((_, index) => graphPortBitIndex(ascending, index)),
    [7, 6, 5, 4],
  );
  assert.equal(getBusTapAnnotation(edge([2]), ascending)?.label, 'data[7]');
  assert.equal(getBusTapAnnotation(edge([3, 4]), ascending)?.label, 'data[5:6]');
});

test('full buses need no tap label, while partial and reordered fanout show exact positions', () => {
  const source = port('Y', [2, 3, 4, 5]);
  assert.equal(getBusTapAnnotation(edge([2, 3, 4, 5]), source, port('A', [2, 3, 4, 5])), null);
  assert.equal(getBusTapAnnotation(edge([2, 4]), source)?.label, 'Y{2,0}');
  assert.equal(getBusTapAnnotation(edge([5, 4, 3, 2]), source)?.label, 'Y{0,1,2,3}');
  assert.equal(
    getBusTapAnnotation(edge([4, 3]), source)?.label,
    'Y{1,2}',
    'a reversed partial slice preserves its wire order',
  );
  assert.equal(
    getBusTapAnnotation(edge([3, 3]), source)?.label,
    'Y{1,1}',
    'replicated source bits remain explicit',
  );
  assert.equal(getBusTapAnnotation(edge([2, 2, 3]), source)?.label, 'Y{1,0,0}');
  assert.match(getBusTapAnnotation(edge([2, 2, 3]), source)!.description, /один и тот же сигнал/);
  assert.equal(getBusTapAnnotation(edge([3]), source, port('A', [8, 3, 9]))?.label, 'Y[1] → A[1]');
});

test('asynchronous latches and load registers belong to the same storage resource group', async () => {
  const { resourceCategory } = await import('../src/lib/netlist');
  for (const type of [
    '$dlatch',
    '$adlatch',
    '$dlatchsr',
    '$aldff',
    '$aldffe',
    '$_ALDFF_PN_',
    '$_ALDFFE_PNP_',
    '$_DLATCH_N_',
    '$_DLATCH_NN1_',
    '$_DLATCHSR_PNN_',
    '$_FF_',
  ]) {
    assert.equal(resourceCategory(type), 'FF', type);
  }
  assert.equal(resourceCategory('$unknown'), 'other');
});

test('repeated net IDs identify every aliased lane instead of choosing the first occurrence', () => {
  const target = port('B', [2, 2, 3]);
  const annotation = getBusTapAnnotation(edge([2, 2]), port('Y', [2]), target);
  assert.equal(annotation?.label, 'B[1:0]');
  assert.match(annotation!.description, /один и тот же сигнал/);
  assert.equal(
    getBusTapAnnotation(edge(['0', '0']), undefined, port('B', ['0', '1', '0']))?.label,
    'B{2,0}',
  );
});

test('buildGraph carries index metadata for top-level and hierarchical module ports', () => {
  const netlist: YosysNetlist = {
    creator: 'test',
    modules: {
      top: {
        attributes: {},
        netnames: {},
        ports: { data: { direction: 'input', bits: [2, 3], offset: 4, upto: 1 } },
        cells: {
          unit: {
            type: 'unit',
            attributes: {},
            parameters: {},
            port_directions: { A: 'input' },
            connections: { A: [2, 3] },
          },
        },
      },
      unit: {
        attributes: {},
        netnames: {},
        cells: {},
        ports: { A: { direction: 'input', bits: [2, 3], offset: 6, upto: 1 } },
      },
    },
  };
  const graph = buildGraph(netlist, 'top');
  assert.equal(graph.nodes.find((value) => value.id === 'port:data')?.ports[0].offset, 4);
  assert.equal(graph.nodes.find((value) => value.id === 'port:data')?.ports[0].upto, 1);
  assert.equal(graph.nodes.find((value) => value.id === 'cell:unit')?.ports[0].offset, 6);
  assert.equal(graph.nodes.find((value) => value.id === 'cell:unit')?.ports[0].upto, 1);
});
