import assert from 'node:assert/strict';
import test from 'node:test';
import { cellTitle, describeBits, parameterLabel } from '../src/lib/cell-names';
import { resourceCategory } from '../src/lib/netlist';

test('Yosys cell types get plain Russian names, unknown ones stay as they are', () => {
  assert.equal(cellTitle('$add'), 'Сумматор');
  assert.equal(cellTitle('$dff'), 'Триггер (запоминает бит по такту)');
  assert.equal(cellTitle('LUT4'), 'Таблица LUT на 4 входа');
  assert.equal(cellTitle('SPX9'), 'Блочная память SPX9');
  assert.equal(cellTitle('$something_new'), '$something_new');
  assert.equal(parameterLabel('A_WIDTH'), 'Ширина входа A');
  assert.equal(parameterLabel('MY_PARAM'), 'MY_PARAM');
});

const nets = {
  count: { bits: [10, 11, 12, 13] },
  clk: { bits: [2] },
  $hidden: { bits: [20, 21], hide_name: 1 },
};

test('ports are described by the pupil’s signal names, most significant bit first', () => {
  assert.equal(describeBits([10, 11, 12, 13], nets), 'count');
  assert.equal(describeBits([10, 11], nets), 'count[1:0]');
  assert.equal(describeBits([12], nets), 'count[2]');
  assert.equal(describeBits([2], nets), 'clk');
});

test('constants and unnamed wires are not shown as Yosys numbers', () => {
  assert.equal(describeBits(['1', '0', '0', '0'], nets), 'константа 0001');
  assert.equal(describeBits(['0', '0', '0'], nets), 'константа 0 (×3)');
  assert.equal(describeBits([20, 21], nets), 'внутренний сигнал (2 бит)');
  assert.equal(describeBits([10, 11, 'x'], nets), 'X, count[1:0]');
  assert.equal(describeBits([], nets), 'не подключено');
});

test('memory ports and initial contents are not counted as block RAM', () => {
  assert.equal(resourceCategory('$meminit_v2'), 'other');
  assert.equal(resourceCategory('$memrd_v2'), 'other');
  assert.equal(resourceCategory('$memwr_v2'), 'other');
  assert.equal(resourceCategory('$mem_v2'), 'BRAM');
});
