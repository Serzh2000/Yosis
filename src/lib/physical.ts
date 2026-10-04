import type { PlacedCell, PlacementMap, PlacementTile } from '../../shared/physical';
import { resourceCategory } from './netlist';

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function location(value: string): { x: number; y: number } | null {
  // Himbaechel/Gowin names come directly from nextpnr's chip database.
  const match = value.match(/^X(\d+)Y(\d+)\//);
  if (!match) return null;
  const x = Number(match[1]),
    y = Number(match[2]);
  return x <= 1024 && y <= 1024 ? { x, y } : null;
}

export function parsePlacement(value: unknown): PlacementMap {
  const netlist = object(value),
    modules = object(netlist?.modules);
  if (!modules) throw new Error('Ожидается JSON из nextpnr --write с полем modules.');
  const moduleEntries = Object.entries(modules);
  if (moduleEntries.length > 4096) throw new Error('В файле слишком много модулей.');
  const candidates = moduleEntries.filter(([, module]) => {
    const cells = object(object(module)?.cells);
    return (
      cells &&
      Object.values(cells).some(
        (cell) => typeof object(object(cell)?.attributes)?.NEXTPNR_BEL === 'string',
      )
    );
  });
  if (!candidates.length)
    throw new Error(
      'В файле нет координат NEXTPNR_BEL. Загрузите результат размещения nextpnr, а не результат синтеза.',
    );
  if (candidates.length > 1)
    throw new Error('Ожидается плоский результат nextpnr с одним размещённым модулем.');
  const [top, rawModule] = candidates[0],
    module = object(rawModule)!;
  const cells = object(module.cells)!;
  if (Object.keys(cells).length > 100000) throw new Error('Файл содержит больше 100 000 ячеек.');
  const tiles = new Map<string, PlacementTile>();
  const placed: PlacedCell[] = [];
  const warnings: string[] = [];
  let unplaced = 0,
    ignoredConstants = 0,
    routingPips = 0,
    maxX = 0,
    maxY = 0;
  function tile(x: number, y: number): PlacementTile {
    const key = `${x},${y}`;
    let item = tiles.get(key);
    if (!item) {
      item = { x, y, cells: [], routingPips: 0 };
      tiles.set(key, item);
    }
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    return item;
  }
  for (const [name, rawCell] of Object.entries(cells)) {
    const cell = object(rawCell),
      attrs = object(cell?.attributes);
    const bel = attrs?.NEXTPNR_BEL;
    if (typeof bel === 'string' && /^(?:.*\/)?(?:VCC|GND)$/.test(bel)) {
      ignoredConstants++;
      continue;
    }
    const point = typeof bel === 'string' ? location(bel) : null;
    if (!cell || typeof cell.type !== 'string' || !point) {
      unplaced++;
      continue;
    }
    const hier = attrs?.hdlname;
    const hierarchy =
      typeof hier === 'string' && hier.trim()
        ? hier.trim().split(/\s+/).slice(0, -1).join('/') || top
        : name.includes('.')
          ? name.slice(0, name.lastIndexOf('.'))
          : top;
    const item: PlacedCell = {
      name,
      type: cell.type,
      bel: bel as string,
      ...point,
      category: cell.type === 'IOB' ? 'IO' : resourceCategory(cell.type),
      hierarchy,
    };
    placed.push(item);
    tile(point.x, point.y).cells.push(item);
  }
  if (!placed.length) throw new Error('Координаты файла не соответствуют формату Gowin X…Y…/BEL.');
  const nets = object(module.netnames);
  if (nets && Object.keys(nets).length > 200000) throw new Error('В файле слишком много сигналов.');
  let examinedPips = 0;
  for (const rawNet of Object.values(nets ?? {})) {
    const routing = object(object(rawNet)?.attributes)?.ROUTING;
    if (typeof routing !== 'string') continue;
    const pieces = routing.split(';');
    // nextpnr ROUTING stores triples: wire, pip, strength. Count programmed pips once per signal.
    const seen = new Set<string>();
    for (let index = 1; index < pieces.length; index += 3) {
      if (++examinedPips > 2000000)
        throw new Error('Маршрутизация превышает лимит 2 000 000 переходов.');
      const pip = pieces[index],
        point = location(pip);
      if (!point || seen.has(pip)) continue;
      seen.add(pip);
      tile(point.x, point.y).routingPips++;
      routingPips++;
    }
  }
  if (unplaced)
    warnings.push(
      `${unplaced} ячеек не имеют распознанной физической координаты и исключены из карты.`,
    );
  if (!routingPips)
    warnings.push('В файле нет распознанной трассировки ROUTING; доступна карта размещения.');
  const settings = object(module.settings);
  const family = settings?.['packer.chipdb'],
    device = settings?.['packer.partno'];
  // GW2A-18C tile grid was checked against Apycula 0.32's device database
  // (load_chipdb: cols=56, rows=55), rather than inferred from used cells.
  const fullChipBounds = family === 'GW2A-18C' && maxX <= 55 && maxY <= 54;
  if (fullChipBounds) {
    maxX = 55;
    maxY = 54;
  }
  return {
    top,
    cells: placed,
    tiles: [...tiles.values()],
    unplaced,
    ignoredConstants,
    routingPips,
    maxX,
    maxY,
    fullChipBounds,
    warnings,
    ...(typeof family === 'string' ? { family } : {}),
    ...(typeof device === 'string' ? { device } : {}),
  };
}

export function parseCstPins(
  files: { name: string; content: string }[],
): { signal: string; pin: string; file: string; line: number }[] {
  const pins: { signal: string; pin: string; file: string; line: number }[] = [];
  for (const file of files.filter((item) => /\.cst$/i.test(item.name))) {
    let inBlock = false;
    file.content.split(/\r?\n/).forEach((sourceLine, index) => {
      let cleaned = '',
        cursor = 0;
      while (cursor < sourceLine.length) {
        if (inBlock) {
          const end = sourceLine.indexOf('*/', cursor);
          if (end < 0) break;
          cursor = end + 2;
          inBlock = false;
        } else if (sourceLine.startsWith('//', cursor)) break;
        else if (sourceLine.startsWith('/*', cursor)) {
          inBlock = true;
          cursor += 2;
        } else {
          cleaned += sourceLine[cursor++];
        }
      }
      const matcher = /\bIO_LOC\s+"([^"\r\n]+)"\s+([A-Za-z0-9]+)\s*;/g;
      for (const match of cleaned.matchAll(matcher))
        pins.push({ signal: match[1], pin: match[2], file: file.name, line: index + 1 });
    });
  }
  return pins;
}
