import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlacement } from '../src/lib/physical';
import {
  axisStep,
  dominantLayer,
  fitBounds,
  isBorderTile,
  logicBounds,
  layerOfCell,
  memoryColumns,
  moduleSummaries,
  slotName,
  tileAt,
  tileSummary,
  usedBounds,
  visibleTiles,
  zoomAt,
  type ChipLayer,
} from '../src/lib/chip-map';

function placed(cells: Record<string, { type: string; bel: string; hdlname?: string }>) {
  return {
    modules: {
      top: {
        settings: { 'packer.chipdb': 'GW2A-18C', 'packer.partno': 'GW2AR-LV18QN88C8/I7' },
        cells: Object.fromEntries(
          Object.entries(cells).map(([name, cell]) => [
            name,
            {
              type: cell.type,
              attributes: {
                NEXTPNR_BEL: cell.bel,
                ...(cell.hdlname ? { hdlname: cell.hdlname } : {}),
              },
            },
          ]),
        ),
        netnames: {},
      },
    },
  };
}
const map = parsePlacement(
  placed({
    lut: { type: 'LUT4', bel: 'X10Y5/LUT2', hdlname: 'top counter lut' },
    lut2: { type: 'LUT4', bel: 'X10Y5/LUT3', hdlname: 'top counter lut2' },
    ff: { type: 'DFF', bel: 'X10Y5/DFF2', hdlname: 'top counter ff' },
    led: { type: 'IOB', bel: 'X0Y8/IOBA', hdlname: 'top led' },
    ram: { type: 'SP', bel: 'X28Y12/BSRAM', hdlname: 'top mem ram' },
  }),
);

test('cells are sorted into the layers a beginner sees', () => {
  const layers = Object.fromEntries(map.cells.map((cell) => [cell.name, layerOfCell(cell)]));
  assert.equal(layers.lut, 'logic');
  assert.equal(layers.ff, 'registers');
  assert.equal(layers.led, 'pins');
  assert.equal(layers.ram, 'memory');
});

test('used bounds ignore the empty die and tile summaries count per layer', () => {
  assert.deepEqual(usedBounds(map), { minX: 0, maxX: 28, minY: 5, maxY: 12 });
  const tile = map.tiles.find((item) => item.x === 10 && item.y === 5)!;
  assert.deepEqual(tileSummary(tile), {
    logic: 2,
    registers: 1,
    memory: 0,
    pins: 0,
    routing: 0,
    total: 3,
  });
  assert.equal(slotName(tile.cells[0]), 'LUT2');
});

test('a tile takes its colour from the strongest enabled layer only', () => {
  const summary = tileSummary(map.tiles.find((item) => item.x === 10 && item.y === 5)!);
  const all = new Set<ChipLayer>(['logic', 'registers', 'memory', 'pins']);
  assert.equal(dominantLayer(summary, all), 'logic');
  assert.equal(dominantLayer(summary, new Set<ChipLayer>(['registers'])), 'registers');
  assert.equal(dominantLayer(summary, new Set<ChipLayer>(['pins'])), null);
  assert.equal(dominantLayer(summary, new Set<ChipLayer>(['routing'])), null);
});

test('modules are summarised with their share of cells and tiles; selecting finds all cells', () => {
  const modules = moduleSummaries(map);
  const counter = modules.find((item) => item.hierarchy === 'top/counter')!;
  assert.deepEqual([counter.cells, counter.luts, counter.registers, counter.tiles], [3, 2, 1, 1]);
  assert.equal(modules[0].hierarchy, 'top/counter');
  assert.equal(
    modules.reduce((sum, item) => sum + item.cells, 0),
    map.cells.length,
  );
});

test('regions: border tiles are the I/O ring and memory columns come from placed RAM cells', () => {
  assert.equal(isBorderTile(map, 0, 8), true);
  assert.equal(isBorderTile(map, 10, 5), false);
  assert.equal(isBorderTile(map, map.maxX, 3), true);
  assert.deepEqual(memoryColumns(map), [28]);
});

test('fit shows the used area centred and large; zoom keeps the point under the cursor', () => {
  const view = fitBounds({ minX: 10, maxX: 11, minY: 5, maxY: 5 }, 800, 400);
  assert.ok(view.scale > 60, 'a tiny design is shown big');
  const centre = tileAt(view, 400, 200);
  assert.deepEqual(centre, { x: 11, y: 5 });
  const zoomed = zoomAt(view, 1.5, 300, 120);
  const before = { x: (300 - view.x) / view.scale, y: (120 - view.y) / view.scale };
  const after = { x: (300 - zoomed.x) / zoomed.scale, y: (120 - zoomed.y) / zoomed.scale };
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
  assert.equal(zoomAt(view, 1e6, 0, 0).scale, 200);
  assert.equal(zoomAt(view, 1e-6, 0, 0).scale, 4);
});

test('whole-die fit shows every tile, and visible tiles follow panning', () => {
  const whole = fitBounds({ minX: 0, maxX: 55, minY: 0, maxY: 54 }, 900, 700, 0.5);
  const visible = visibleTiles(whole, 900, 700);
  assert.ok(visible.minX <= 0 && visible.maxX >= 56 && visible.minY <= 0 && visible.maxY >= 55);
  const panned = visibleTiles({ ...whole, x: whole.x - whole.scale * 10 }, 900, 700);
  assert.equal(panned.minX, visible.minX + 10);
});

test('coordinate labels thin out when zoomed out', () => {
  assert.equal(axisStep(60), 1);
  assert.equal(axisStep(20), 2);
  assert.equal(axisStep(10), 5);
  assert.equal(axisStep(5), 10);
});

test('auto-zoom targets the logic, not the I/O cells on the die edge', () => {
  assert.deepEqual(logicBounds(map), { minX: 10, maxX: 28, minY: 5, maxY: 12 });
  const onlyIo = parsePlacement(placed({ led: { type: 'IOB', bel: 'X0Y8/IOBA' } }));
  assert.deepEqual(logicBounds(onlyIo), { minX: 0, maxX: 0, minY: 8, maxY: 8 });
});

test('the first view targets the body of the design, not a far-away single cell', async () => {
  const { mainClusterBounds } = await import('../src/lib/chip-map');
  const cells: Record<string, { type: string; bel: string }> = {};
  // A compact block of logic near the left edge…
  for (let x = 1; x <= 4; x++)
    for (let y = 44; y <= 47; y++)
      cells[`lut_${x}_${y}`] = { type: 'LUT4', bel: `X${x}Y${y}/LUT0` };
  // …and one clock-related cell at a fixed site on the other side of the die.
  cells.far = { type: 'DFF', bel: 'X50Y27/DFF0' };
  const map = parsePlacement(placed(cells));
  assert.deepEqual(logicBounds(map), { minX: 1, maxX: 50, minY: 27, maxY: 47 });
  assert.deepEqual(mainClusterBounds(map), { minX: 1, maxX: 4, minY: 44, maxY: 47 });
});
