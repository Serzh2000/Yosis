import type { PlacedCell, PlacementMap, PlacementTile } from '../../shared/physical';

/** Layers a beginner can switch on and off. */
export type ChipLayer = 'logic' | 'registers' | 'memory' | 'pins' | 'routing';
export const chipLayers: { id: ChipLayer; label: string; hint: string; color: string }[] = [
  {
    id: 'logic',
    label: 'Логика',
    hint: 'LUT: маленькие «таблицы ответов», из которых собраны ваши логические выражения.',
    color: '#db9550',
  },
  {
    id: 'registers',
    label: 'Регистры',
    hint: 'Триггеры: ячейки, которые запоминают один бит между тактами.',
    color: '#7fa47d',
  },
  {
    id: 'memory',
    label: 'Память и DSP',
    hint: 'Блоки памяти и умножители. В учебных схемах их обычно нет.',
    color: '#a58abd',
  },
  {
    id: 'pins',
    label: 'Выводы',
    hint: 'Ячейки ввода-вывода у края кристалла: здесь схема выходит к ножкам микросхемы.',
    color: '#7caaa2',
  },
  {
    id: 'routing',
    label: 'Трассировка',
    hint: 'Сколько переключателей связей включено в тайле: чем темнее, тем больше проводов проходит.',
    color: '#c9bd5c',
  },
];

export function layerOfCell(cell: PlacedCell): Exclude<ChipLayer, 'routing'> {
  switch (cell.category) {
    case 'FF':
      return 'registers';
    case 'BRAM':
    case 'DSP':
      return 'memory';
    case 'IO':
      return 'pins';
    default:
      return 'logic';
  }
}

export interface TileBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
/** Tiles that hold at least one placed cell. */
export function usedBounds(map: PlacementMap): TileBounds | null {
  const used = map.tiles.filter((tile) => tile.cells.length);
  if (!used.length) return null;
  return {
    minX: Math.min(...used.map((tile) => tile.x)),
    maxX: Math.max(...used.map((tile) => tile.x)),
    minY: Math.min(...used.map((tile) => tile.y)),
    maxY: Math.max(...used.map((tile) => tile.y)),
  };
}

/** `scale` is pixels per tile; (x, y) is the screen position of tile 0,0's top-left corner. */
export interface ChipView {
  scale: number;
  x: number;
  y: number;
}
export const MIN_SCALE = 4;
export const MAX_SCALE = 200;
const clampScale = (scale: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

export function fitBounds(
  bounds: TileBounds,
  width: number,
  height: number,
  marginTiles = 1.5,
  maxScale = 90,
): ChipView {
  const tilesX = bounds.maxX - bounds.minX + 1 + marginTiles * 2;
  const tilesY = bounds.maxY - bounds.minY + 1 + marginTiles * 2;
  const scale = Math.min(clampScale(Math.min(width / tilesX, height / tilesY)), maxScale);
  const centerX = (bounds.minX + bounds.maxX + 1) / 2;
  const centerY = (bounds.minY + bounds.maxY + 1) / 2;
  return { scale, x: width / 2 - centerX * scale, y: height / 2 - centerY * scale };
}
export function zoomAt(view: ChipView, factor: number, anchorX: number, anchorY: number): ChipView {
  const scale = clampScale(view.scale * factor);
  const ratio = scale / view.scale;
  return {
    scale,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
}
export function tileAt(view: ChipView, px: number, py: number): { x: number; y: number } {
  return { x: Math.floor((px - view.x) / view.scale), y: Math.floor((py - view.y) / view.scale) };
}
/** The part of the die (in tiles) that is visible in a viewport of this size. */
export function visibleTiles(view: ChipView, width: number, height: number): TileBounds {
  return {
    minX: Math.floor(-view.x / view.scale),
    minY: Math.floor(-view.y / view.scale),
    maxX: Math.ceil((width - view.x) / view.scale),
    maxY: Math.ceil((height - view.y) / view.scale),
  };
}

export const LUT_SLOTS = Array.from({ length: 8 }, (_, i) => `LUT${i}`);
export const FF_SLOTS = Array.from({ length: 6 }, (_, i) => `DFF${i}`);
export function slotName(cell: PlacedCell): string {
  return cell.bel.slice(cell.bel.lastIndexOf('/') + 1);
}

export interface TileSummary {
  logic: number;
  registers: number;
  memory: number;
  pins: number;
  routing: number;
  total: number;
}
export function tileSummary(tile: PlacementTile): TileSummary {
  const result: TileSummary = {
    logic: 0,
    registers: 0,
    memory: 0,
    pins: 0,
    routing: tile.routingPips,
    total: tile.cells.length,
  };
  for (const cell of tile.cells) result[layerOfCell(cell)]++;
  return result;
}

/** The layer that decides a tile's colour, taking only the switched-on layers into account. */
export function dominantLayer(
  summary: TileSummary,
  enabled: ReadonlySet<ChipLayer>,
): Exclude<ChipLayer, 'routing'> | null {
  let best: Exclude<ChipLayer, 'routing'> | null = null;
  let count = 0;
  for (const layer of ['logic', 'registers', 'memory', 'pins'] as const) {
    if (enabled.has(layer) && summary[layer] > count) {
      best = layer;
      count = summary[layer];
    }
  }
  return best;
}

export interface ModuleSummary {
  hierarchy: string;
  cells: number;
  luts: number;
  registers: number;
  tiles: number;
}
export function moduleSummaries(map: PlacementMap): ModuleSummary[] {
  const result = new Map<string, ModuleSummary & { places: Set<string> }>();
  for (const cell of map.cells) {
    let item = result.get(cell.hierarchy);
    if (!item) {
      item = {
        hierarchy: cell.hierarchy,
        cells: 0,
        luts: 0,
        registers: 0,
        tiles: 0,
        places: new Set(),
      };
      result.set(cell.hierarchy, item);
    }
    item.cells++;
    if (cell.category === 'LUT' || cell.category === 'ALU') item.luts++;
    if (cell.category === 'FF') item.registers++;
    item.places.add(`${cell.x},${cell.y}`);
  }
  return [...result.values()]
    .map(({ places, ...rest }) => ({ ...rest, tiles: places.size }))
    .sort((a, b) => b.cells - a.cells || a.hierarchy.localeCompare(b.hierarchy));
}

/** Edge tiles are where the I/O cells of the die live (Gowin puts them around the border). */
export function isBorderTile(map: PlacementMap, x: number, y: number): boolean {
  return x === 0 || y === 0 || x === map.maxX || y === map.maxY;
}
/** Columns with placed block RAM or DSP cells: the only memory columns the placement data reveals. */
export function memoryColumns(map: PlacementMap): number[] {
  return [
    ...new Set(
      map.cells
        .filter((cell) => cell.category === 'BRAM' || cell.category === 'DSP')
        .map((cell) => cell.x),
    ),
  ].sort((a, b) => a - b);
}

/** Pick coordinate labels that fit: every tile when zoomed in, every 5th when zoomed out. */
export function axisStep(scale: number): number {
  return scale >= 28 ? 1 : scale >= 14 ? 2 : scale >= 9 ? 5 : 10;
}

/**
 * Where the design's own logic sits. I/O cells are excluded on purpose: they are always on the
 * die edge, so including them would make a tiny design look as if it filled the whole chip.
 */
export function logicBounds(map: PlacementMap): TileBounds | null {
  const tiles = map.tiles.filter((tile) => tile.cells.some((cell) => cell.category !== 'IO'));
  if (!tiles.length) return usedBounds(map);
  return {
    minX: Math.min(...tiles.map((tile) => tile.x)),
    maxX: Math.max(...tiles.map((tile) => tile.x)),
    minY: Math.min(...tiles.map((tile) => tile.y)),
    maxY: Math.max(...tiles.map((tile) => tile.y)),
  };
}

/** Bounds of the largest group of neighbouring logic tiles. A clock buffer or an oscillator
 * sits at a fixed site far from the logic; fitting the view to everything would show an
 * almost empty die. Tiles closer than `gap` tiles (Chebyshev distance) belong together;
 * the group holding the most cells wins. */
export function mainClusterBounds(map: PlacementMap, gap = 3): TileBounds | null {
  const tiles = map.tiles.filter((tile) => tile.cells.some((cell) => cell.category !== 'IO'));
  if (!tiles.length) return usedBounds(map);
  const group = tiles.map((_, index) => index);
  const find = (index: number): number =>
    group[index] === index ? index : (group[index] = find(group[index]));
  for (let a = 0; a < tiles.length; a++)
    for (let b = a + 1; b < tiles.length; b++)
      if (Math.max(Math.abs(tiles[a].x - tiles[b].x), Math.abs(tiles[a].y - tiles[b].y)) <= gap)
        group[find(a)] = find(b);
  const weight = new Map<number, number>();
  tiles.forEach((tile, index) =>
    weight.set(find(index), (weight.get(find(index)) ?? 0) + tile.cells.length),
  );
  const best = [...weight.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const members = tiles.filter((_, index) => find(index) === best);
  return {
    minX: Math.min(...members.map((tile) => tile.x)),
    maxX: Math.max(...members.map((tile) => tile.x)),
    minY: Math.min(...members.map((tile) => tile.y)),
    maxY: Math.max(...members.map((tile) => tile.y)),
  };
}
