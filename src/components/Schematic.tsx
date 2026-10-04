import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Focus, Maximize2, Minus, Plus } from 'lucide-react';
import ELK, { type ElkNode, type ElkPort } from 'elkjs/lib/elk-api.js';
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';
import type { YosysCell, YosysNetlist } from '../../shared/types';
import { buildGraph, resourceCategory, type GraphNode, type SourceLocation } from '../lib/netlist';
import { getBusTapAnnotation } from '../lib/schematic-labels';
import { getRtlSymbol, RtlSymbol } from './RtlSymbol';
import './schematic.css';

export interface SchematicProps {
  netlist: YosysNetlist;
  moduleName: string;
  selectedCell?: string | null;
  onSelectCell: (name: string | null) => void;
  onSourceNavigate?: (file: string, line: number) => void;
  canNavigateSource?: (file: string) => boolean;
  highlightedSource?: { file: string; line: number } | null;
  highlightedBits?: number[];
  onSelectModule?: (moduleName: string) => void;
}

interface View {
  x: number;
  y: number;
  scale: number;
}
const MAX_CELLS = 180;
const clampScale = (scale: number) => Math.max(0.04, Math.min(3, scale));

function displayName(name: string, max = 23): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function matchesSource(
  source: SourceLocation[],
  highlighted?: SchematicProps['highlightedSource'],
): boolean {
  if (!highlighted) return false;
  const normalize = (file: string) => file.replace(/\\/g, '/').toLowerCase();
  return source.some((item) => {
    const file = normalize(item.file);
    const selected = normalize(highlighted.file);
    return (
      (file === selected || file.endsWith(`/${selected}`)) &&
      highlighted.line >= item.line &&
      highlighted.line <= (item.endLine ?? item.line)
    );
  });
}

function makeElkNode(node: GraphNode, yosysCell?: YosysCell): ElkNode {
  const symbol = getRtlSymbol(node, yosysCell);
  if (symbol)
    return {
      id: node.id,
      width: symbol.width,
      height: symbol.height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: symbol.ports.map((port) => ({
        id: port.id,
        width: 6,
        height: 6,
        x: port.x - 3,
        y: port.y - 3,
        layoutOptions: { 'elk.port.side': port.side },
      })),
    };
  const cell = node.kind === 'cell';
  const inputs = node.ports.filter((port) => port.direction !== 'output').length;
  const outputs = node.ports.filter((port) => port.direction === 'output').length;
  const width = cell ? 190 : 128;
  const height = cell ? Math.max(96, Math.max(inputs, outputs) * 22 + 72) : 54;
  let inputIndex = 0;
  let outputIndex = 0;
  return {
    id: node.id,
    width,
    height,
    layoutOptions: {
      'elk.portConstraints': 'FIXED_POS',
      'elk.layered.layering.layerConstraint':
        node.kind === 'input' || node.kind === 'constant' || node.kind === 'undriven'
          ? 'FIRST'
          : node.kind === 'output'
            ? 'LAST'
            : 'NONE',
    },
    ports: node.ports.map((port) => {
      const output = port.direction === 'output';
      const index = output ? outputIndex++ : inputIndex++;
      return {
        id: port.id,
        width: 6,
        height: 6,
        x: output ? width - 3 : -3,
        y: (cell ? 52 + index * 22 : height / 2) - 3,
        layoutOptions: { 'elk.port.side': output ? 'EAST' : 'WEST' },
      };
    }),
  };
}

export function Schematic({
  netlist,
  moduleName,
  selectedCell,
  onSelectCell,
  onSourceNavigate,
  canNavigateSource,
  highlightedSource,
  highlightedBits,
  onSelectModule,
}: SchematicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [layout, setLayout] = useState<ElkNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ x: 30, y: 30, scale: 1 });
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    view: View;
    moved: boolean;
    target: string | null;
    edge: string | null;
  } | null>(null);
  const selectedIndex = selectedCell
    ? Object.keys(netlist.modules[moduleName]?.cells ?? {}).indexOf(selectedCell)
    : -1;
  const hiddenSelection = selectedIndex >= MAX_CELLS ? selectedCell : null;
  const graph = useMemo(
    () => buildGraph(netlist, moduleName, { maxCells: MAX_CELLS, selectedCell: hiddenSelection }),
    [netlist, moduleName, hiddenSelection],
  );
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  const edgeMap = useMemo(() => new Map(graph.edges.map((edge) => [edge.id, edge])), [graph]);
  const portMap = useMemo(
    () =>
      new Map(graph.nodes.flatMap((node) => node.ports.map((port) => [port.id, port] as const))),
    [graph],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLayout(null);
    setError(null);
    setActiveEdge(null);
    let disposed = false;
    // ELK's worker is a classic script. Loading its API separately avoids a nested worker
    // and keeps the bundled GWT engine off the browser's main thread.
    const worker = new Worker(elkWorkerUrl);
    worker.onerror = (event) => setError(event.message || 'Не удалось построить схему');
    const elk = new ELK({ workerFactory: () => worker });
    void elk
      .layout({
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.layered.spacing.nodeNodeBetweenLayers': '90',
          'elk.spacing.nodeNode': '35',
          'elk.spacing.edgeNode': '20',
          'elk.padding': '[top=35,left=35,bottom=35,right=35]',
        },
        children: graph.nodes.map((node) =>
          makeElkNode(
            node,
            node.cellName ? netlist.modules[moduleName]?.cells[node.cellName] : undefined,
          ),
        ),
        edges: graph.edges.map((edge) => ({
          id: edge.id,
          sources: [edge.sourcePort],
          targets: [edge.targetPort],
        })),
      })
      .then((result) => {
        if (!disposed) setLayout(result);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      disposed = true;
      elk.terminateWorker();
    };
  }, [graph, netlist, moduleName]);

  const fit = useCallback(() => {
    if (!layout) return;
    const width = layout.width ?? 1;
    const height = layout.height ?? 1;
    const scale = clampScale(Math.min((size.width - 48) / width, (size.height - 95) / height, 1));
    setView({
      scale,
      x: (size.width - width * scale) / 2,
      y: 56 + (size.height - 56 - height * scale) / 2,
    });
  }, [layout, size]);

  useEffect(() => {
    fit();
  }, [fit]);

  function zoom(multiplier: number, anchorX = size.width / 2, anchorY = size.height / 2) {
    setView((previous) => {
      const scale = clampScale(previous.scale * multiplier);
      return {
        scale,
        x: anchorX - ((anchorX - previous.x) * scale) / previous.scale,
        y: anchorY - ((anchorY - previous.y) * scale) / previous.scale,
      };
    });
  }

  function focusSelection() {
    const node = layout?.children?.find((item) => item.id === `cell:${selectedCell}`);
    if (!node) return;
    const scale = Math.max(0.7, Math.min(view.scale, 1.2));
    setView({
      scale,
      x: size.width / 2 - ((node.x ?? 0) + (node.width ?? 0) / 2) * scale,
      y: size.height / 2 - ((node.y ?? 0) + (node.height ?? 0) / 2) * scale,
    });
  }

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target =
      event.target instanceof Element
        ? (event.target.closest('[data-cell]')?.getAttribute('data-cell') ?? null)
        : null;
    const edge =
      event.target instanceof Element
        ? (event.target.closest('[data-edge]')?.getAttribute('data-edge') ?? null)
        : null;
    drag.current = { x: event.clientX, y: event.clientY, view, moved: false, target, edge };
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) {
      drag.current.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (drag.current.moved)
      setView({ ...drag.current.view, x: drag.current.view.x + dx, y: drag.current.view.y + dy });
  }

  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current && !current.moved) {
      if (current.target) onSelectCell(current.target);
      else if (current.edge) setActiveEdge(current.edge);
      else {
        onSelectCell(null);
        setActiveEdge(null);
      }
    }
  }

  const selectedNodeId = selectedCell ? `cell:${selectedCell}` : null;
  const active = activeEdge ? edgeMap.get(activeEdge) : null;
  const activeTap = active
    ? getBusTapAnnotation(active, portMap.get(active.sourcePort), portMap.get(active.targetPort))
    : null;

  return (
    <div className="schematic-root" ref={containerRef}>
      <div className="schematic-toolbar">
        <div className="schematic-summary">
          <span>{moduleName}</span>
          <small>
            {graph.totalCells} элементов · {graph.edges.length} связей
          </small>
        </div>
        <div className="schematic-tools">
          <button
            type="button"
            onClick={() => zoom(1 / 1.25)}
            title="Уменьшить"
            aria-label="Уменьшить"
          >
            <Minus size={15} />
          </button>
          <span className="schematic-scale">{Math.round(view.scale * 100)}%</span>
          <button type="button" onClick={() => zoom(1.25)} title="Увеличить" aria-label="Увеличить">
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={fit}
            title="Показать всю схему"
            aria-label="Показать всю схему"
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            onClick={focusSelection}
            disabled={!selectedCell}
            title="Найти выбранный элемент"
            aria-label="Найти выбранный элемент"
          >
            <Focus size={15} />
          </button>
        </div>
      </div>
      {(graph.hiddenCells > 0 || graph.hiddenEdges > 0) && (
        <div className="schematic-limit" role="status">
          Показано {graph.totalCells - graph.hiddenCells} из {graph.totalCells} элементов.{' '}
          {graph.hiddenCells > 0
            ? 'Связи со скрытыми элементами опущены. Откройте вложенный модуль для подробностей.'
            : `${graph.hiddenEdges} связей опущено.`}
        </div>
      )}
      {error ? (
        <div className="schematic-message schematic-error">Не удалось построить схему: {error}</div>
      ) : !layout ? (
        <div className="schematic-message" role="status">
          Раскладываем элементы…
        </div>
      ) : (
        <svg
          className={`schematic-canvas ${dragging ? 'is-dragging' : ''}`}
          width="100%"
          height="100%"
          role="group"
          aria-label={`Схема модуля ${moduleName}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
          }}
          onWheel={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            zoom(
              event.deltaY > 0 ? 1 / 1.12 : 1.12,
              event.clientX - rect.left,
              event.clientY - rect.top,
            );
          }}
        >
          <defs>
            <pattern
              id="schematic-grid"
              width={20 * view.scale}
              height={20 * view.scale}
              patternUnits="userSpaceOnUse"
              x={view.x}
              y={view.y}
            >
              <circle cx="1" cy="1" r="0.7" fill="var(--border, #233142)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#schematic-grid)" />
          <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
            {layout.edges?.map((edge) => {
              const data = edgeMap.get(edge.id);
              if (!data) return null;
              const tap = getBusTapAnnotation(
                data,
                portMap.get(data.sourcePort),
                portMap.get(data.targetPort),
              );
              const highlight =
                data.bits.some(
                  (bit) => typeof bit === 'number' && highlightedBits?.includes(bit),
                ) ||
                activeEdge === edge.id ||
                data.source === selectedNodeId ||
                data.target === selectedNodeId;
              return (
                <g
                  key={edge.id}
                  data-edge={edge.id}
                  data-bus-slice={tap?.label}
                  className={`schematic-edge ${highlight ? 'is-highlighted' : ''}`}
                  onClick={() => setActiveEdge(edge.id)}
                >
                  <title>
                    {tap?.description ?? `${data.label || 'Связь'} · ${data.width} бит`} · ID:{' '}
                    {data.bits.join(', ')}
                  </title>
                  {edge.sections?.map((section, index) => {
                    const points = [
                      section.startPoint,
                      ...(section.bendPoints ?? []),
                      section.endPoint,
                    ];
                    const path = points
                      .map((point, pointIndex) => `${pointIndex ? 'L' : 'M'}${point.x},${point.y}`)
                      .join(' ');
                    return (
                      <g key={index}>
                        <path d={path} className="schematic-edge-hit" />
                        <path
                          d={path}
                          className="schematic-edge-line"
                          style={{ strokeWidth: data.width > 1 ? 2.1 : 1.3 }}
                        />
                        {(tap || data.width > 1) && (
                          <text
                            x={(points[0].x + (points[1]?.x ?? points[0].x)) / 2}
                            y={points[0].y - 6}
                            textAnchor="middle"
                            className={`schematic-bus-width ${tap ? 'schematic-bus-tap' : ''}`}
                          >
                            {tap
                              ? `${data.width > 1 ? `/${data.width} · ` : ''}${tap.label}`
                              : `/${data.width}`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            {layout.children?.map((position) => {
              const node = nodeMap.get(position.id);
              if (!node) return null;
              const selected = node.cellName === selectedCell;
              const sourceHighlighted =
                matchesSource(node.source, highlightedSource) ||
                node.ports.some((port) =>
                  port.bits.some(
                    (bit) => typeof bit === 'number' && highlightedBits?.includes(bit),
                  ),
                );
              const navigableSource = node.source.find(
                (item) => !canNavigateSource || canNavigateSource(item.file),
              );
              const kindClass =
                node.kind === 'cell' ? resourceCategory(node.type).toLowerCase() : node.kind;
              const symbol = getRtlSymbol(
                node,
                node.cellName ? netlist.modules[moduleName]?.cells[node.cellName] : undefined,
              );
              const width = position.width ?? 190;
              const height = position.height ?? 88;
              return (
                <g
                  key={node.id}
                  data-cell={node.cellName}
                  transform={`translate(${position.x ?? 0},${position.y ?? 0})`}
                  className={`schematic-node kind-${kindClass} ${symbol ? 'is-rtl' : ''} ${selected ? 'is-selected' : ''} ${sourceHighlighted ? 'source-highlighted' : ''}`}
                  role={node.cellName ? 'button' : undefined}
                  tabIndex={node.cellName ? 0 : undefined}
                  aria-label={`${node.name}, ${node.type}`}
                  onKeyDown={(event) => {
                    if (node.cellName && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onSelectCell(node.cellName);
                    }
                  }}
                  onDoubleClick={() => {
                    if (node.moduleName && onSelectModule) onSelectModule(node.moduleName);
                    else if (navigableSource && onSourceNavigate)
                      onSourceNavigate(navigableSource.file, navigableSource.line);
                  }}
                >
                  <title>
                    {[
                      node.name,
                      node.type,
                      ...node.source.map((item) => `${item.file}:${item.line}`),
                      ...(node.moduleName
                        ? ['Двойной щелчок: открыть модуль']
                        : navigableSource
                          ? ['Двойной щелчок: открыть исходник']
                          : []),
                    ].join('\n')}
                  </title>
                  {symbol ? (
                    <RtlSymbol node={node} spec={symbol} />
                  ) : (
                    <>
                      <rect
                        className="schematic-node-body"
                        width={width}
                        height={height}
                        rx={node.kind === 'cell' ? 8 : 15}
                      />
                      {node.kind === 'cell' ? (
                        <>
                          <path d={`M0,37 H${width}`} className="schematic-node-divider" />
                          <text x={12} y={23} className="schematic-node-type">
                            {displayName(node.type, 21)}
                          </text>
                          <text x={12} y={height - 12} className="schematic-node-name">
                            {displayName(node.name, 26)}
                          </text>
                          {node.moduleName && (
                            <text
                              x={width - 14}
                              y={24}
                              textAnchor="end"
                              className="schematic-module-mark"
                            >
                              ↗
                            </text>
                          )}
                        </>
                      ) : (
                        <>
                          <text
                            x={width / 2}
                            y={23}
                            textAnchor="middle"
                            className="schematic-node-type"
                          >
                            {displayName(node.name, 17)}
                          </text>
                          <text
                            x={width / 2}
                            y={41}
                            textAnchor="middle"
                            className="schematic-node-name"
                          >
                            {node.type}
                          </text>
                        </>
                      )}
                      {position.ports?.map((port: ElkPort) => {
                        const data = node.ports.find((item) => item.id === port.id);
                        if (!data) return null;
                        const input = data.direction !== 'output';
                        const x = (port.x ?? (input ? 0 : width)) + (port.width ?? 6) / 2;
                        const y = (port.y ?? height / 2) + (port.height ?? 6) / 2;
                        return (
                          <g key={port.id}>
                            {data.bits.length > 1 ? (
                              <>
                                <path
                                  d={`M${x - 4},${y + 5} L${x + 4},${y - 5}`}
                                  className="schematic-bus-terminal"
                                />
                                <text
                                  x={input ? x - 8 : x + 8}
                                  y={y - 8}
                                  textAnchor={input ? 'end' : 'start'}
                                  className="schematic-bus-width"
                                >
                                  /{data.bits.length}
                                </text>
                              </>
                            ) : (
                              <circle cx={x} cy={y} r={3} className="schematic-port" />
                            )}
                            <title>
                              {data.name}: {data.bits.length} бит
                              {data.bits.length > 1
                                ? ' · ветви с индексами подключают отдельные разряды шины'
                                : ''}
                            </title>
                            {node.kind === 'cell' && (
                              <text
                                x={input ? 10 : width - 10}
                                y={y + 3}
                                textAnchor={input ? 'start' : 'end'}
                                className="schematic-port-label"
                              >
                                {displayName(data.name, 12)}
                                {data.bits.length > 1 ? ` [${data.bits.length}]` : ''}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {active ? (
        <div className="schematic-edge-info" title={activeTap?.description}>
          <strong>{activeTap?.label ?? (active.label || 'Связь')}</strong>
          <span>
            {active.width} бит{activeTap ? ' · разряды шины' : ''} · ID:{' '}
            {active.bits.slice(0, 12).join(', ')}
            {active.bits.length > 12 ? '…' : ''}
          </span>
          <button
            type="button"
            onClick={() => setActiveEdge(null)}
            aria-label="Закрыть сведения о связи"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="schematic-hint">
          Колесо — масштаб · перетаскивание — перемещение · щелчок — выбрать элемент
        </div>
      )}
    </div>
  );
}

export default Schematic;
