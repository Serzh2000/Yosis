import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Focus, Maximize2, Minus, Plus, ScanSearch } from 'lucide-react';
import type { PlacedCell, PlacementMap, PlacementTile } from '../../shared/physical';
import {
  FF_SLOTS,
  LUT_SLOTS,
  axisStep,
  chipLayers,
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
  visibleTiles,
  zoomAt,
  type ChipLayer,
  type ChipView,
  type TileBounds,
} from '../lib/chip-map';
import './chip-map.css';

const AXIS_X = 30;
const AXIS_Y = 20;
const layerColor = Object.fromEntries(chipLayers.map((layer) => [layer.id, layer.color])) as Record<
  ChipLayer,
  string
>;
const shortName = (cell: PlacedCell) => cell.name.slice(cell.name.lastIndexOf('.') + 1);

export function ChipMap({
  map,
  artifactName,
  selected,
  onSelect,
}: {
  map: PlacementMap;
  artifactName: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; view: ChipView; moved: boolean } | null>(null);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [view, setView] = useState<ChipView>({ scale: 10, x: 0, y: 0 });
  const [layers, setLayers] = useState<Set<ChipLayer>>(
    () => new Set<ChipLayer>(['logic', 'registers', 'memory', 'pins']),
  );
  const [module, setModule] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const used = useMemo(() => logicBounds(map), [map]);
  const whole: TileBounds = useMemo(
    () => ({ minX: 0, minY: 0, maxX: map.maxX, maxY: map.maxY }),
    [map.maxX, map.maxY],
  );
  const modules = useMemo(() => moduleSummaries(map), [map]);
  const columns = useMemo(() => memoryColumns(map), [map]);
  const tiles = useMemo(
    () => new Map(map.tiles.map((tile) => [`${tile.x},${tile.y}`, tile] as const)),
    [map],
  );
  const maxRouting = useMemo(
    () => Math.max(1, ...map.tiles.map((tile) => tile.routingPips)),
    [map],
  );
  const moduleTiles = useMemo(
    () =>
      new Set(
        module
          ? map.cells
              .filter((cell) => cell.hierarchy === module)
              .map((cell) => `${cell.x},${cell.y}`)
          : [],
      ),
    [map, module],
  );
  const viewport = useMemo(
    () => ({ width: Math.max(1, size.width - AXIS_X), height: Math.max(1, size.height - AXIS_Y) }),
    [size],
  );
  const fit = useCallback(
    (bounds: TileBounds, margin = 1.5) =>
      setView(fitBounds(bounds, viewport.width, viewport.height, margin)),
    [viewport],
  );

  // Size follows the container.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // First display of a result: zoom to the used area (a tiny design on a big die is easy to find).
  const fittedFor = useRef<PlacementMap | null>(null);
  useEffect(() => {
    if (fittedFor.current === map || size.width < 50) return;
    fittedFor.current = map;
    setView(
      fitBounds(used ?? whole, size.width - AXIS_X, size.height - AXIS_Y, used ? 2.5 : 0.5, 60),
    );
  }, [map, size, used, whole]);

  function toggleLayer(id: ChipLayer) {
    setLayers((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }
  function focusTiles(bounds: TileBounds | null) {
    if (bounds) fit(bounds, 3);
  }
  function boundsOf(keys: Iterable<string>): TileBounds | null {
    const points = [...keys].map((key) => key.split(',').map(Number));
    if (!points.length) return null;
    return {
      minX: Math.min(...points.map(([x]) => x)),
      maxX: Math.max(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  }
  const selectionBounds = selected ? boundsOf([selected]) : module ? boundsOf(moduleTiles) : null;

  // Drawing ---------------------------------------------------------------------------------
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    element.width = Math.round(size.width * dpr);
    element.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(element);
    const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const bg = color('--chip-bg', '#222');
    const dieColor = color('--chip-empty', '#333');
    const line = color('--border', '#555');
    const text = color('--text', '#fff');
    const soft = color('--text-soft', '#ccc');
    const accent = color('--accent', '#bbd88b');
    const panel = color('--panel', '#222');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(AXIS_X, AXIS_Y, viewport.width, viewport.height);
    ctx.clip();
    ctx.translate(AXIS_X, AXIS_Y);
    const { scale } = view;
    const visible = visibleTiles(view, viewport.width, viewport.height);
    const x0 = Math.max(0, visible.minX);
    const y0 = Math.max(0, visible.minY);
    const x1 = Math.min(map.maxX, visible.maxX);
    const y1 = Math.min(map.maxY, visible.maxY);
    // Die and its regions.
    ctx.fillStyle = dieColor;
    ctx.fillRect(view.x, view.y, (map.maxX + 1) * scale, (map.maxY + 1) * scale);
    ctx.globalAlpha = 0.16;
    if (layers.has('pins')) {
      ctx.fillStyle = layerColor.pins;
      for (let x = x0; x <= x1; x++) {
        ctx.fillRect(view.x + x * scale, view.y, scale, scale);
        ctx.fillRect(view.x + x * scale, view.y + map.maxY * scale, scale, scale);
      }
      for (let y = y0; y <= y1; y++) {
        ctx.fillRect(view.x, view.y + y * scale, scale, scale);
        ctx.fillRect(view.x + map.maxX * scale, view.y + y * scale, scale, scale);
      }
    }
    if (layers.has('memory')) {
      ctx.fillStyle = layerColor.memory;
      for (const column of columns)
        ctx.fillRect(view.x + column * scale, view.y, scale, (map.maxY + 1) * scale);
    }
    ctx.globalAlpha = 1;
    if (scale >= 9) {
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) {
        ctx.moveTo(Math.round(view.x + x * scale) + 0.5, view.y + y0 * scale);
        ctx.lineTo(Math.round(view.x + x * scale) + 0.5, view.y + (y1 + 1) * scale);
      }
      for (let y = y0; y <= y1 + 1; y++) {
        ctx.moveTo(view.x + x0 * scale, Math.round(view.y + y * scale) + 0.5);
        ctx.lineTo(view.x + (x1 + 1) * scale, Math.round(view.y + y * scale) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Used tiles.
    const dimmed = module !== null;
    for (const tile of map.tiles) {
      if (tile.x < x0 || tile.x > x1 || tile.y < y0 || tile.y > y1) continue;
      const summary = tileSummary(tile);
      const layer = dominantLayer(summary, layers);
      const heat = layers.has('routing') && tile.routingPips > 0;
      if (!layer && !heat) continue;
      const px = view.x + tile.x * scale;
      const py = view.y + tile.y * scale;
      const key = `${tile.x},${tile.y}`;
      ctx.globalAlpha = dimmed && !moduleTiles.has(key) ? 0.3 : 1;
      if (heat) {
        const level = Math.sqrt(tile.routingPips / maxRouting);
        ctx.fillStyle = layer ? panel : layerColor.routing;
        if (!layer) {
          ctx.globalAlpha *= 0.25 + 0.7 * level;
          ctx.fillRect(px + 1, py + 1, scale - 2, scale - 2);
          ctx.globalAlpha = dimmed && !moduleTiles.has(key) ? 0.3 : 1;
        }
      }
      if (layer) {
        if (scale >= 34) drawSlots(ctx, tile, px, py, scale, layers, soft, panel, text);
        else {
          ctx.fillStyle = layerColor[layer];
          ctx.fillRect(px + 1, py + 1, scale - 2, scale - 2);
        }
      }
      if (heat && layer) {
        ctx.fillStyle = layerColor.routing;
        ctx.globalAlpha *= 0.4 + 0.6 * Math.sqrt(tile.routingPips / maxRouting);
        ctx.fillRect(
          px + 1,
          py + scale - Math.max(3, scale * 0.14) - 1,
          scale - 2,
          Math.max(3, scale * 0.14),
        );
      }
      ctx.globalAlpha = 1;
    }
    // Selected module and tile outlines.
    if (module) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      for (const key of moduleTiles) {
        const [tx, ty] = key.split(',').map(Number);
        ctx.strokeRect(view.x + tx * scale + 1, view.y + ty * scale + 1, scale - 2, scale - 2);
      }
    }
    for (const [key, width, stroke] of [
      [selected, 3, text],
      [hover ? `${hover.x},${hover.y}` : null, 1.5, soft],
    ] as const) {
      if (!key) continue;
      const [tx, ty] = key.split(',').map(Number);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.strokeRect(view.x + tx * scale, view.y + ty * scale, scale, scale);
    }
    // Die border.
    ctx.strokeStyle = soft;
    ctx.lineWidth = 2;
    ctx.strokeRect(view.x, view.y, (map.maxX + 1) * scale, (map.maxY + 1) * scale);
    ctx.restore();
    // Coordinate bands.
    ctx.fillStyle = panel;
    ctx.fillRect(0, 0, size.width, AXIS_Y);
    ctx.fillRect(0, 0, AXIS_X, size.height);
    ctx.fillStyle = soft;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const step = axisStep(scale);
    ctx.textAlign = 'center';
    for (let x = x0; x <= x1; x++)
      if (x % step === 0) ctx.fillText(String(x), AXIS_X + view.x + (x + 0.5) * scale, AXIS_Y / 2);
    ctx.textAlign = 'right';
    for (let y = y0; y <= y1; y++)
      if (y % step === 0) ctx.fillText(String(y), AXIS_X - 5, AXIS_Y + view.y + (y + 0.5) * scale);
    ctx.textAlign = 'left';
  }, [
    map,
    view,
    size,
    viewport,
    layers,
    module,
    moduleTiles,
    selected,
    hover,
    columns,
    maxRouting,
  ]);

  // Minimap ---------------------------------------------------------------------------------
  const MINI_W = 150;
  const miniH = Math.round((MINI_W * (map.maxY + 1)) / (map.maxX + 1));
  useEffect(() => {
    const element = mini.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    element.width = MINI_W * dpr;
    element.height = miniH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(element);
    ctx.fillStyle = css.getPropertyValue('--chip-empty').trim() || '#333';
    ctx.fillRect(0, 0, MINI_W, miniH);
    const k = MINI_W / (map.maxX + 1);
    for (const tile of map.tiles) {
      const layer = dominantLayer(
        tileSummary(tile),
        new Set(['logic', 'registers', 'memory', 'pins']),
      );
      if (!layer) continue;
      ctx.fillStyle = layerColor[layer];
      ctx.fillRect(tile.x * k - 1, tile.y * k - 1, Math.max(3, k) + 1, Math.max(3, k) + 1);
    }
    ctx.strokeStyle = css.getPropertyValue('--text').trim() || '#fff';
    ctx.lineWidth = 1.5;
    const v = visibleTiles(view, viewport.width, viewport.height);
    ctx.strokeRect(
      Math.max(0, v.minX) * k,
      Math.max(0, v.minY) * k,
      (Math.min(map.maxX + 1, v.maxX) - Math.max(0, v.minX)) * k,
      (Math.min(map.maxY + 1, v.maxY) - Math.max(0, v.minY)) * k,
    );
  }, [map, view, viewport, miniH]);

  // Pointer ---------------------------------------------------------------------------------
  function local(event: { clientX: number; clientY: number }) {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left - AXIS_X, y: event.clientY - rect.top - AXIS_Y };
  }
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const { x, y } = local(event);
      setView((previous) => zoomAt(previous, Math.exp(-event.deltaY * 0.0015), x, y));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const tileAtEvent = (event: PointerEvent | MouseEvent) => {
    const p = local(event);
    const tile = tileAt(view, p.x, p.y);
    return tile.x >= 0 && tile.y >= 0 && tile.x <= map.maxX && tile.y <= map.maxY ? tile : null;
  };
  const hovered = hover ? tiles.get(`${hover.x},${hover.y}`) : undefined;
  const miniClick = (event: React.MouseEvent) => {
    const rect = mini.current!.getBoundingClientRect();
    const tx = ((event.clientX - rect.left) / rect.width) * (map.maxX + 1);
    const ty = ((event.clientY - rect.top) / rect.height) * (map.maxY + 1);
    setView((previous) => ({
      ...previous,
      x: viewport.width / 2 - tx * previous.scale,
      y: viewport.height / 2 - ty * previous.scale,
    }));
  };
  const hoveredSummary = hovered ? tileSummary(hovered) : null;
  const hoverModules = hovered
    ? [...new Set(hovered.cells.map((cell) => cell.hierarchy))].slice(0, 4)
    : [];
  const moduleCells = module ? map.cells.filter((cell) => cell.hierarchy === module) : [];

  return (
    <div className="chip-map">
      <div className="chip-map-main">
        <div className="chip-map-toolbar" role="toolbar" aria-label="Масштаб карты кристалла">
          <button
            onClick={() => fit(used ?? whole, used ? 2.5 : 0.5)}
            title="Приблизить к области, где разместилась ваша логика"
          >
            <Focus size={14} /> Моя логика
          </button>
          <button onClick={() => fit(whole, 0.5)} title="Показать весь кристалл">
            <Maximize2 size={14} /> Весь кристалл
          </button>
          <button
            disabled={!selectionBounds}
            onClick={() => focusTiles(selectionBounds)}
            title="Приблизить к выбранному тайлу или модулю"
          >
            <ScanSearch size={14} /> К выбору
          </button>
          <span className="chip-zoom-buttons">
            <button
              aria-label="Уменьшить"
              onClick={() =>
                setView((v) => zoomAt(v, 1 / 1.4, viewport.width / 2, viewport.height / 2))
              }
            >
              <Minus size={14} />
            </button>
            <output aria-label="Масштаб">{Math.round(view.scale)} px/тайл</output>
            <button
              aria-label="Увеличить"
              onClick={() =>
                setView((v) => zoomAt(v, 1.4, viewport.width / 2, viewport.height / 2))
              }
            >
              <Plus size={14} />
            </button>
          </span>
        </div>
        <div className="chip-map-frame" ref={frame}>
          <canvas
            ref={canvas}
            role="img"
            aria-label="Тепловая карта размещённых элементов FPGA"
            style={{ width: size.width, height: size.height }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { x: event.clientX, y: event.clientY, view, moved: false };
            }}
            onPointerMove={(event) => {
              const current = drag.current;
              if (current && event.buttons) {
                const dx = event.clientX - current.x;
                const dy = event.clientY - current.y;
                if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
                if (current.moved)
                  setView({ ...current.view, x: current.view.x + dx, y: current.view.y + dy });
                return;
              }
              const tile = tileAtEvent(event);
              const p = local(event);
              setHover(tile ? { ...tile, px: p.x + AXIS_X, py: p.y + AXIS_Y } : null);
            }}
            onPointerUp={(event) => {
              const current = drag.current;
              drag.current = null;
              if (current && !current.moved) {
                const tile = tileAtEvent(event);
                onSelect(tile ? `${tile.x},${tile.y}` : null);
              }
            }}
            onPointerLeave={() => setHover(null)}
            onDoubleClick={(event) => {
              const p = local(event);
              setView((v) => zoomAt(v, 2, p.x, p.y));
            }}
            tabIndex={0}
            onKeyDown={(event) => {
              const move = (dx: number, dy: number) =>
                setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
              if (event.key === '+' || event.key === '=')
                setView((v) => zoomAt(v, 1.4, viewport.width / 2, viewport.height / 2));
              else if (event.key === '-')
                setView((v) => zoomAt(v, 1 / 1.4, viewport.width / 2, viewport.height / 2));
              else if (event.key === '0') fit(whole, 0.5);
              else if (event.key === 'ArrowLeft') move(40, 0);
              else if (event.key === 'ArrowRight') move(-40, 0);
              else if (event.key === 'ArrowUp') move(0, 40);
              else if (event.key === 'ArrowDown') move(0, -40);
              else return;
              event.preventDefault();
            }}
          />
          {hovered && hover && hoveredSummary && (
            <div
              className="chip-tooltip"
              role="status"
              style={{
                left: Math.min(hover.px + 14, size.width - 230),
                top: Math.min(hover.py + 14, size.height - 120),
              }}
            >
              <strong>
                Тайл X{hovered.x} Y{hovered.y}
              </strong>
              <span>
                {hovered.cells.length
                  ? `LUT: ${hoveredSummary.logic} · регистры: ${hoveredSummary.registers}${hoveredSummary.pins ? ` · выводы: ${hoveredSummary.pins}` : ''}${hoveredSummary.memory ? ` · память: ${hoveredSummary.memory}` : ''}`
                  : 'Свободный тайл'}
              </span>
              {!!hovered.routingPips && <span>Включено связей: {hovered.routingPips}</span>}
              {!!hoverModules.length && <span>Модуль: {hoverModules.join(', ')}</span>}
            </div>
          )}
          {hover && !hovered && (
            <div
              className="chip-tooltip"
              role="status"
              style={{
                left: Math.min(hover.px + 14, size.width - 230),
                top: Math.min(hover.py + 14, size.height - 80),
              }}
            >
              <strong>
                Тайл X{hover.x} Y{hover.y}
              </strong>
              <span>
                {isBorderTile(map, hover.x, hover.y)
                  ? 'Край кристалла (ввод-вывод)'
                  : 'Свободный тайл'}
              </span>
            </div>
          )}
          <button
            className="chip-minimap"
            aria-label="Мини-карта: нажмите, чтобы перейти"
            title="Мини-карта всего кристалла. Рамка показывает, что вы видите сейчас."
            onClick={miniClick}
          >
            <canvas ref={mini} style={{ width: MINI_W, height: miniH }} />
          </button>
        </div>
        <div className="chip-map-subtitle">
          <span>
            {map.family ?? 'Gowin'} · {artifactName}
          </span>
          <span>
            Тайлы X: 0–{map.maxX} · Y: 0–{map.maxY} · колесо — масштаб, перетаскивание — сдвиг
          </span>
        </div>
      </div>
      <aside className="chip-map-side">
        <fieldset className="chip-layers">
          <legend>Слои карты</legend>
          {chipLayers.map((layer) => (
            <label key={layer.id}>
              <input
                type="checkbox"
                checked={layers.has(layer.id)}
                onChange={() => toggleLayer(layer.id)}
              />
              <i style={{ background: layer.color }} />
              <span>
                <strong>{layer.label}</strong>
                <small>{layer.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="chip-regions">
          <strong>Области кристалла</strong>
          <small>
            Тонкая цветная подложка по краю: ряд ввода-вывода. Вертикальная полоса: колонка блочной
            памяти или DSP (видна, только если схема её использует).
          </small>
        </div>
        <div className="chip-modules">
          <strong>Модули вашей схемы</strong>
          <small>Выберите модуль: все его ячейки подсветятся на карте.</small>
          <ul>
            {modules.map((item) => (
              <li key={item.hierarchy}>
                <button
                  aria-pressed={module === item.hierarchy}
                  className={module === item.hierarchy ? 'active' : ''}
                  onClick={() => setModule(module === item.hierarchy ? null : item.hierarchy)}
                >
                  <span title={item.hierarchy}>{item.hierarchy}</span>
                  <small>
                    {item.cells} яч. · {item.tiles} тайл.
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {module && (
            <div className="chip-module-cells" aria-label={`Ячейки модуля ${module}`}>
              {moduleCells.slice(0, 40).map((cell) => (
                <button
                  key={cell.name}
                  title={`${cell.name} · ${cell.bel}`}
                  onClick={() => {
                    onSelect(`${cell.x},${cell.y}`);
                    fit({ minX: cell.x, maxX: cell.x, minY: cell.y, maxY: cell.y }, 3);
                  }}
                >
                  <b>{cell.type}</b>
                  <span>{shortName(cell)}</span>
                  <small>
                    X{cell.x} Y{cell.y}
                  </small>
                </button>
              ))}
              {moduleCells.length > 40 && (
                <small>Показаны первые 40 из {moduleCells.length}.</small>
              )}
            </div>
          )}
        </div>
        <div className="chip-scale" aria-label="Шкала цвета">
          <strong>Цвет</strong>
          <small>
            Цвет тайла: ресурс, которого в нём больше всего. Полоска внизу тайла: плотность
            трассировки от 1 до {maxRouting} связей. Это занятость, а не температура и не мощность.
          </small>
          <span className="chip-gradient" />
          <span className="chip-gradient-labels">
            <small>мало</small>
            <small>много связей</small>
          </span>
        </div>
      </aside>
    </div>
  );
}

function drawSlots(
  ctx: CanvasRenderingContext2D,
  tile: PlacementTile,
  px: number,
  py: number,
  scale: number,
  layers: ReadonlySet<ChipLayer>,
  soft: string,
  panel: string,
  text: string,
) {
  const pad = 3;
  const inner = scale - pad * 2;
  const usedBySlot = new Map(tile.cells.map((cell) => [slotName(cell), cell] as const));
  const extra = tile.cells.filter(
    (cell) => !LUT_SLOTS.includes(slotName(cell)) && !FF_SLOTS.includes(slotName(cell)),
  );
  ctx.fillStyle = panel;
  ctx.fillRect(px + 1, py + 1, scale - 2, scale - 2);
  if (scale >= 110) {
    // Zoomed far in: a readable list of the placed cells.
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const rows = Math.max(1, Math.floor((scale - 10) / 17));
    tile.cells.slice(0, rows).forEach((cell, index) => {
      const layer = layerOfCell(cell);
      const y = py + 6 + index * 17;
      ctx.fillStyle = layers.has(layer)
        ? chipLayers.find((item) => item.id === layer)!.color
        : soft;
      ctx.fillRect(px + 5, y, 6, 14);
      ctx.fillStyle = text;
      const label = `${slotName(cell)} ${shortName(cell)}`;
      let shown = label;
      while (shown.length > 2 && ctx.measureText(shown).width > scale - 22)
        shown = shown.slice(0, -2) + '…';
      ctx.fillText(shown, px + 15, y + 7);
    });
    if (tile.cells.length > rows) {
      ctx.fillStyle = soft;
      ctx.fillText(`ещё ${tile.cells.length - rows}…`, px + 15, py + 6 + rows * 17 - 6);
    }
    return;
  }
  const gap = 2;
  const cols = 4;
  const sw = (inner - gap * (cols - 1)) / cols;
  const sh = Math.max(3, (inner - gap * 3) / 5);
  const slot = (row: number, col: number, name: string) => {
    const cell = usedBySlot.get(name);
    const x = px + pad + col * (sw + gap);
    const y = py + pad + row * (sh + gap);
    if (cell) {
      const layer = layerOfCell(cell);
      ctx.fillStyle = chipLayers.find((item) => item.id === layer)!.color;
      ctx.fillRect(x, y, sw, sh);
    } else {
      ctx.strokeStyle = soft;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, sw - 1, sh - 1);
      ctx.globalAlpha = 1;
    }
  };
  LUT_SLOTS.forEach((name, i) => slot(Math.floor(i / 4), i % 4, name));
  FF_SLOTS.forEach((name, i) => slot(2 + Math.floor(i / 4), i % 4, name));
  extra.slice(0, 4).forEach((cell, i) => {
    ctx.fillStyle = chipLayers.find((item) => item.id === layerOfCell(cell))!.color;
    ctx.fillRect(px + pad + i * (sw + gap), py + pad + 4 * (sh + gap), sw, sh);
  });
}
