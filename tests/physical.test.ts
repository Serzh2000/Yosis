import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlacement, parseCstPins } from '../src/lib/physical';
import { validatePhysicalConfig } from '../server/physical';
import type { Project } from '../shared/types';

const project: Project = {
  name: 'Физика',
  board: 'tangnano20k',
  top: 'top',
  files: [
    { name: 'top.v', content: 'module top(input a, output y); assign y=a; endmodule' },
    { name: 'pins/board.cst', content: 'IO_LOC "a" 87; IO_LOC "y" 15;' },
  ],
};
test('placement comes from Gowin BEL coordinates and retains occupied tiles and hierarchical names', () => {
  const map = parsePlacement({
    modules: {
      top: {
        settings: { 'packer.chipdb': 'GW2A-18C', 'packer.partno': 'GW2AR-LV18QN88C8/I7' },
        cells: {
          'core.and0': {
            type: 'LUT4',
            attributes: { NEXTPNR_BEL: 'X12Y18/LUT0', hdlname: 'core and0' },
          },
          'core.ff0': { type: 'DFF', attributes: { NEXTPNR_BEL: 'X12Y18/DFF0' } },
          a: { type: 'IOB', attributes: { NEXTPNR_BEL: 'X0Y22/IOBA' } },
          constant: { type: 'VCC', attributes: { NEXTPNR_BEL: 'X2Y1/VCC' } },
          absent: { type: 'LUT4', attributes: {} },
        },
        netnames: {
          routed: {
            attributes: {
              ROUTING: 'X12Y18/F0;X12Y18/I0/F0;1;X12Y18/I0;X12Y18/I1/I0;1;X12Y18/F0;X12Y18/I0/F0;1',
            },
          },
        },
      },
    },
  });
  assert.equal(map.cells.length, 3);
  assert.equal(map.unplaced, 1);
  assert.equal(map.ignoredConstants, 1);
  assert.equal(map.family, 'GW2A-18C');
  assert.equal(map.maxX, 55);
  assert.equal(map.maxY, 54);
  assert.equal(map.fullChipBounds, true);
  const logic = map.tiles.find((tile) => tile.x === 12 && tile.y === 18)!;
  assert.equal(logic.cells.length, 2);
  assert.equal(logic.routingPips, 2);
  assert.equal(map.routingPips, 2);
  assert.equal(map.cells[0].hierarchy, 'core');
  assert.equal(map.cells[2].category, 'IO');
});
test('unplaced synthesis JSON and coordinates from other architectures cannot become a fabricated map', () => {
  assert.throws(
    () =>
      parsePlacement({ modules: { top: { cells: { gate: { type: 'LUT4', attributes: {} } } } } }),
    /нет координат/,
  );
  assert.throws(
    () =>
      parsePlacement({
        modules: {
          top: { cells: { gate: { type: 'LC', attributes: { NEXTPNR_BEL: 'X4/Y12/lc4' } } } },
        },
      }),
    /формату Gowin/,
  );
  assert.throws(
    () =>
      parsePlacement({
        modules: {
          top: { cells: { gate: { type: 'LUT4', attributes: { NEXTPNR_BEL: 'X999999Y0/LUT0' } } } },
        },
      }),
    /формату Gowin/,
  );
});
test('CST pin parsing ignores line and multiline comments and reads more than one instruction per line', () => {
  const pins = parseCstPins([
    {
      name: 'board.cst',
      content:
        '// IO_LOC "wrong" 1;\nIO_LOC "clk" 4; /* IO_LOC "wrong2" 2;\n still comment */ IO_LOC "led[0]" 15; IO_LOC "key" 87;',
    },
  ]);
  assert.deepEqual(
    pins.map(({ signal, pin, line }) => ({ signal, pin, line })),
    [
      { signal: 'clk', pin: '4', line: 2 },
      { signal: 'led[0]', pin: '15', line: 3 },
      { signal: 'key', pin: '87', line: 3 },
    ],
  );
});
test('physical pipeline selects a real CST snapshot and a bounded target clock frequency', () => {
  assert.deepEqual(
    validatePhysicalConfig({ cstFile: 'pins/board.cst', frequencyMHz: 27 }, project),
    { cstFile: 'pins/board.cst', frequencyMHz: 27 },
  );
  for (const cstFile of ['../board.cst', 'top.v', 'missing.cst'])
    assert.throws(
      () => validatePhysicalConfig({ cstFile, frequencyMHz: 27 }, project),
      /существующий/,
    );
  for (const frequencyMHz of [0, 501, NaN, Infinity, '27'])
    assert.throws(
      () => validatePhysicalConfig({ cstFile: 'pins/board.cst', frequencyMHz }, project),
      /частота/,
    );
});
