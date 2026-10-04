import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Code2,
  Copy,
  FlipHorizontal2,
  Hand,
  HelpCircle,
  LayoutTemplate,
  Maximize,
  Minus,
  Play,
  Plus,
  Redo2,
  RotateCw,
  Scissors,
  ClipboardPaste,
  Search,
  StepForward,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import type { Project, SourceFile } from '../../shared/types';
import {
  blocks,
  circuitPins,
  circuitProblems,
  compileCircuit,
  connectCircuit,
  newLibraryNode,
  parseCircuit,
  removeCircuitNodes,
  resolveSource,
  type CircuitDocument,
  type CircuitIssue,
  type CircuitNode,
  type Endpoint,
} from '../../shared/schematic';
import {
  alignNodes,
  isClipboardText,
  moveNodes,
  pasteSelection,
  rotateNodes,
  serializeSelection,
  updateNode,
  type AlignMode,
} from '../../shared/circuit-edit';
import {
  previewClockSources,
  previewInit,
  previewSetInput,
  previewSettle,
  previewStep,
  type PreviewState,
  type PreviewValues,
} from '../../shared/circuit-eval';
import { circuitExamples } from '../../shared/circuit-examples';
import {
  circuitGeometry,
  docBounds,
  endpointPoint,
  midpoint,
  pathOf,
  routeWire,
  snap,
  GRID,
  type Point,
} from '../lib/circuit-geometry';
import { fullCheck, quickCheck, type ConnectCheck } from '../lib/circuit-connect';
import { syncBoardConstraints } from '../lib/circuit-board';
import { canvasPoint, fitCanvas, zoomCanvas, type CanvasView } from '../lib/canvas-view';
import { CircuitSymbol } from './CircuitSymbol';
import { CircuitPalette, BLOCK_DRAG_TYPE } from './CircuitPalette';
import { CircuitProperties } from './CircuitProperties';
import './circuit-editor.css';

type Selection = { nodes: string[]; wires: string[] };
const noSelection: Selection = { nodes: [], wires: [] };
const kindTitle = (node: CircuitNode) => blocks[node.kind].title;

const shortcuts: [string, string][] = [
  ['Перетащить от контакта', 'Провести провод; цель подсвечивается'],
  ['Щелчок на выход, затем на вход', 'Соединить без перетаскивания'],
  ['Shift + щелчок', 'Добавить к выделению или убрать'],
  ['Рамка на пустом месте', 'Выделить несколько элементов'],
  ['Ctrl + A', 'Выделить всё'],
  ['Ctrl + C / X / V', 'Копировать, вырезать, вставить (в том числе в другой проект)'],
  ['Ctrl + D', 'Дублировать'],
  ['Delete', 'Удалить выделенное'],
  ['R', 'Повернуть на 90°'],
  ['M', 'Отразить по горизонтали'],
  ['Стрелки', 'Сдвинуть выделенное на шаг сетки (Shift — на 5 шагов)'],
  ['F2 или двойной щелчок', 'Переименовать элемент'],
  ['Ctrl + F', 'Найти элемент по имени'],
  ['F', 'Показать всю схему; Z — приблизить к выделению'],
  ['+ / −', 'Масштаб; колесо мыши — масштаб к курсору'],
  ['Пробел + перетаскивание, колёсико мыши или «Рука»', 'Двигать полотно'],
  ['Ctrl + Z / Ctrl + Y', 'Отменить и повторить'],
  ['Esc', 'Отменить действие или снять выделение'],
  ['? или F1', 'Эта подсказка'],
];

interface NodeViewProps {
  node: CircuitNode;
  selected: boolean;
  related: boolean;
  level: 'error' | 'warning' | null;
  badPins: string[];
  connectedPins: string[];
  pendingPin: string | null;
  targets: Record<string, 'ok' | 'bad'> | null;
  live: Record<string, bigint | null> | null;
  api: NodeApi;
}
interface NodeApi {
  nodePointerDown(event: ReactPointerEvent, node: CircuitNode): void;
  nodeKeyDown(event: ReactKeyboardEvent, node: CircuitNode): void;
  nodeDoubleClick(node: CircuitNode): void;
  pinPointerDown(event: ReactPointerEvent, node: CircuitNode, pin: string): void;
  pinKeyDown(event: ReactKeyboardEvent, node: CircuitNode, pin: string): void;
  nodeContext(event: React.MouseEvent, node: CircuitNode): void;
}
const formatValue = (value: bigint | null | undefined, width: number) =>
  value === null || value === undefined
    ? '?'
    : width === 1
      ? value.toString()
      : width <= 4
        ? value.toString(2).padStart(width, '0')
        : `0x${value.toString(16).toUpperCase()}`;

const NodeView = memo(function NodeView({
  node,
  selected,
  related,
  level,
  badPins,
  connectedPins,
  pendingPin,
  targets,
  live,
  api,
}: NodeViewProps) {
  const geo = circuitGeometry(node),
    def = blocks[node.kind];
  const inputPin = geo.pins.find((pin) => pin.direction === 'input');
  const lit = live && node.kind === 'led' && live[inputPin?.name ?? ''] === 1n;
  const bank = live && node.kind === 'ledbank' ? live.A : undefined;
  const inputValue = live && def.port?.direction === 'input' ? live.Y : undefined;
  return (
    <g
      className={`circuit-node ${selected ? 'selected' : ''} ${related ? 'related' : ''} ${level ? `has-${level}` : ''} ${node.kind === 'note' ? 'is-note' : ''}`}
      transform={`translate(${node.x} ${node.y})`}
      data-node={node.id}
    >
      <g
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Элемент ${node.name}: ${kindTitle(node)}${level === 'error' ? ', есть ошибка' : ''}`}
        onPointerDown={(event) => api.nodePointerDown(event, node)}
        onDoubleClick={() => api.nodeDoubleClick(node)}
        onContextMenu={(event) => api.nodeContext(event, node)}
        onKeyDown={(event) => api.nodeKeyDown(event, node)}
      >
        <rect
          className="circuit-node-selection"
          x={-10}
          y={node.kind === 'note' ? -6 : -24}
          width={geo.width + 20}
          height={geo.height + (node.kind === 'note' ? 12 : 40)}
          rx={8}
        />
        <CircuitSymbol node={node} hideDetail={bank !== undefined} />
        {lit && <circle className="led-lit" cx={geo.width - 24} cy={geo.height / 2} r={9} />}
        {bank !== undefined &&
          Array.from({ length: 6 }, (_, bit) => (
            <circle
              key={bit}
              className={
                bank !== null && ((bank >> BigInt(bit)) & 1n) === 1n ? 'led-lit' : 'led-off'
              }
              cx={14 + bit * 15}
              cy={geo.height / 2 + 10}
              r={5}
            />
          ))}
        {inputValue !== undefined && (
          <text className="live-badge" x={geo.width / 2} y={geo.height + 15} textAnchor="middle">
            {formatValue(inputValue, circuitPins(node)[0].width)}
          </text>
        )}
        {level && (
          <g className={`node-marker ${level}`} transform={`translate(${geo.width + 6} -16)`}>
            <circle r={9} />
            <text textAnchor="middle" y={4}>
              {level === 'error' ? '!' : '?'}
            </text>
          </g>
        )}
      </g>
      {geo.pins.map((pin) => {
        const key = `${node.id}.${pin.name}`,
          state = targets?.[key],
          connected = connectedPins.includes(pin.name);
        return (
          <g
            key={pin.name}
            role="button"
            tabIndex={0}
            aria-label={`${node.name}.${pin.name}: ${pin.direction === 'input' ? 'вход' : 'выход'}, ${pin.width} бит${pin.hint ? `, ${pin.hint}` : ''}${badPins.includes(pin.name) ? ', не соединён' : ''}`}
            aria-pressed={pendingPin === pin.name}
            data-pin={key}
            className={`circuit-terminal ${pin.direction} ${connected ? 'connected' : ''} ${badPins.includes(pin.name) ? 'problem' : ''} ${state ? `target-${state}` : ''} ${pendingPin === pin.name ? 'pending' : ''}`}
            onPointerDown={(event) => api.pinPointerDown(event, node, pin.name)}
            onKeyDown={(event) => api.pinKeyDown(event, node, pin.name)}
          >
            <circle className="circuit-terminal-hit" cx={pin.x} cy={pin.y} r={11} />
            {pin.width > 1 ? (
              <rect className="pin-bus" x={pin.x - 5} y={pin.y - 5} width={10} height={10} />
            ) : (
              <circle className="pin-bit" cx={pin.x} cy={pin.y} r={4} />
            )}
            {pin.width > 1 && (
              <text
                className="pin-width"
                x={pin.x + pin.dx * 12 - (pin.dy ? 10 : 0)}
                y={pin.y + pin.dy * 12 - (pin.dy < 0 ? 3 : 0) + (pin.dx ? -7 : 0)}
                textAnchor={pin.dx > 0 ? 'start' : pin.dx < 0 ? 'end' : 'middle'}
                aria-hidden="true"
              >
                {pin.width}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

interface WireViewProps {
  id: string;
  d: string;
  bus: boolean;
  selected: boolean;
  bad: boolean;
  related: boolean;
  live: 'high' | 'low' | 'unknown' | 'bus' | null;
  label: string;
  labelAt: Point;
  ends: [Point, Point];
  title: string;
  onPointerDown(event: ReactPointerEvent, id: string): void;
  onEndPointerDown(event: ReactPointerEvent, id: string): void;
  onKeyDown(event: ReactKeyboardEvent, id: string): void;
}
const WireView = memo(function WireView(props: WireViewProps) {
  const { id, d, bus, selected, bad, live, label, labelAt, ends } = props;
  return (
    <g
      className={`circuit-wire ${bus ? 'bus' : ''} ${selected ? 'selected' : ''} ${bad ? 'bad' : ''} ${props.related ? 'related' : ''} ${live ? `live-${live}` : ''}`}
      role="button"
      tabIndex={0}
      aria-label={props.title}
      aria-pressed={selected}
      onPointerDown={(event) => props.onPointerDown(event, id)}
      onKeyDown={(event) => props.onKeyDown(event, id)}
    >
      <path className="circuit-wire-hit" d={d} />
      <path className="circuit-wire-line" d={d} />
      {label && (
        <g
          className="wire-label"
          transform={`translate(${labelAt.x} ${labelAt.y})`}
          aria-hidden="true"
        >
          <rect
            x={-label.length * 3.6 - 3}
            y={-17}
            width={label.length * 7.2 + 6}
            height={15}
            rx={3}
          />
          <text textAnchor="middle" y={-5}>
            {label}
          </text>
        </g>
      )}
      {selected &&
        ends.map((end, index) => (
          <circle
            key={index}
            className="wire-handle"
            cx={end.x}
            cy={end.y}
            r={6}
            onPointerDown={(event) => props.onEndPointerDown(event, `${id}:${index}`)}
          />
        ))}
    </g>
  );
});

type Gesture =
  | {
      type: 'move';
      pointer: number;
      start: Point;
      ids: string[];
      moved: boolean;
      shift: boolean;
      wasSelected: boolean;
    }
  | { type: 'band'; pointer: number; start: Point; additive: boolean; moved: boolean }
  | { type: 'pan'; pointer: number; startClient: Point; origin: CanvasView }
  | {
      type: 'wire';
      pointer: number;
      from: Endpoint;
      replace?: string;
      startClient: Point;
      moved: boolean;
    };

interface MenuState {
  x: number;
  y: number;
}

export function CircuitEditor({
  project,
  source,
  busy,
  onChange,
  onPins,
}: {
  project: Project;
  source: SourceFile;
  busy: boolean;
  onChange: (project: Project) => void;
  onPins: (signal: string) => void;
}) {
  const parsed = useMemo(() => {
    try {
      return { doc: parseCircuit(source.content), error: '' };
    } catch (cause) {
      return {
        doc: { format: 'yosis-schematic', version: 2, nodes: [], wires: [] } as CircuitDocument,
        error: cause instanceof Error ? cause.message : 'Не удалось прочитать схему.',
      };
    }
  }, [source.content]);
  const doc = parsed.doc;
  const [selection, setSelection] = useState<Selection>(noSelection),
    [pending, setPending] = useState<Endpoint | null>(null),
    [message, setMessage] = useState(''),
    [notice, setNotice] = useState(''),
    [code, setCode] = useState(false),
    [help, setHelp] = useState(false),
    [gallery, setGallery] = useState(false),
    [menu, setMenu] = useState<MenuState | null>(null),
    [tool, setTool] = useState<'select' | 'hand'>('select'),
    [find, setFind] = useState(''),
    [rename, setRename] = useState<{ id: string; field: 'name' | 'text'; value: string } | null>(
      null,
    ),
    [view, setView] = useState<CanvasView>({ x: 40, y: 60, scale: 1 }),
    [size, setSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<{ undo: string[]; redo: string[] }>({
    undo: [],
    redo: [],
  });
  const [moveDelta, setMoveDelta] = useState<Point | null>(null),
    [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null),
    [wireDrag, setWireDrag] = useState<{
      from: Endpoint;
      at: Point;
      hover: Endpoint | null;
      check: ConnectCheck | null;
      replace?: string;
    } | null>(null);
  const [preview, setPreview] = useState<{
    on: boolean;
    state: PreviewState;
    fast: boolean;
    running: boolean;
    cycles: number;
  }>({ on: false, state: {}, fast: true, running: false, cycles: 0 });
  const svgRef = useRef<SVGSVGElement>(null),
    wrapRef = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    spaceDown = useRef(false),
    clipboardText = useRef(''),
    pasteCount = useRef(0),
    findIndex = useRef(0),
    fitted = useRef(false);

  const problems = useMemo(() => circuitProblems(doc), [doc]);
  const nodesById = useMemo(() => new Map(doc.nodes.map((node) => [node.id, node])), [doc.nodes]);
  const selectedNodes = useMemo(() => new Set(selection.nodes), [selection.nodes]);
  const selectedWires = useMemo(() => new Set(selection.wires), [selection.wires]);
  const single =
    selection.nodes.length === 1 && !selection.wires.length
      ? nodesById.get(selection.nodes[0])
      : undefined;

  // ——— размер полотна ———
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const box = wrap.getBoundingClientRect();
      if (box.width > 0) setSize({ width: box.width, height: box.height });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [code]);
  useEffect(() => {
    const surface = svgRef.current;
    if (!surface) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = surface.getBoundingClientRect(),
        anchor = { x: event.clientX - box.left, y: event.clientY - box.top };
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1);
      setView((previous) => zoomCanvas(previous, Math.exp(-delta * 0.002), anchor));
    };
    surface.addEventListener('wheel', wheel, { passive: false });
    return () => surface.removeEventListener('wheel', wheel);
  }, [size.height, code]);

  const worldPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const box = svgRef.current?.getBoundingClientRect();
      return canvasPoint(view, { x: clientX - (box?.left ?? 0), y: clientY - (box?.top ?? 0) });
    },
    [view],
  );
  const fitAll = useCallback(
    (ids?: Set<string>) => {
      const bounds = docBounds(doc, ids);
      if (!bounds) return setView({ x: 40, y: 60, scale: 1 });
      const next = fitCanvas(size.width, size.height, bounds);
      setView(
        ids
          ? { ...next, scale: Math.min(next.scale, 2.5) }
          : { ...next, scale: Math.min(next.scale, 1.6) },
      );
    },
    [doc, size.height, size.width],
  );
  useEffect(() => {
    if (fitted.current || !doc.nodes.length || size.width < 100) return;
    fitted.current = true;
    fitAll();
  }, [doc.nodes.length, fitAll, size.width]);
  const centerOn = useCallback(
    (nodeId: string) => {
      const node = nodesById.get(nodeId);
      if (!node) return;
      const geo = circuitGeometry(node);
      setView((previous) => ({
        scale: previous.scale,
        x: size.width / 2 - (node.x + geo.width / 2) * previous.scale,
        y: size.height / 2 - (node.y + geo.height / 2) * previous.scale,
      }));
    },
    [nodesById, size.height, size.width],
  );

  // ——— сохранение и история ———
  const save = useCallback(
    (next: CircuitDocument, track = true) => {
      if (busy) return false;
      const content = JSON.stringify(parseCircuit(JSON.stringify(next)), null, 2);
      if (content === source.content) return false;
      if (track)
        setHistory((previous) => ({
          undo: [...previous.undo.slice(-99), source.content],
          redo: [],
        }));
      const synced = syncBoardConstraints(project, doc, parseCircuit(content));
      onChange({
        ...synced.project,
        files: synced.project.files.map((file) =>
          file.name === source.name ? { ...file, content } : file,
        ),
      });
      setNotice(synced.messages.length ? `Вывод платы: ${synced.messages.join('; ')}` : '');
      setMessage('');
      return true;
    },
    [busy, doc, onChange, project, source.content, source.name],
  );
  const guard = useCallback((action: () => void) => {
    try {
      action();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message.replace(/^Схема: /, '') : 'Действие невозможно.',
      );
    }
  }, []);
  const undo = useCallback(
    (redo = false) => {
      if (busy) return;
      const stack = redo ? history.redo : history.undo,
        content = stack.at(-1);
      if (!content) return;
      save(parseCircuit(content), false);
      setPending(null);
      setHistory(
        redo
          ? { undo: [...history.undo, source.content], redo: history.redo.slice(0, -1) }
          : { undo: history.undo.slice(0, -1), redo: [...history.redo, source.content] },
      );
    },
    [busy, history, save, source.content],
  );

  // ——— предпросмотр значений ———
  const previewOptions = useMemo(() => ({ fast: preview.fast }), [preview.fast]);
  const sigRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!preview.on) return;
    // Новые и изменённые элементы получают начальное состояние, остальные его сохраняют.
    setPreview((previous) => {
      const fresh = previewInit(doc, previewOptions),
        next: PreviewState = {};
      const signatures: Record<string, string> = {};
      for (const node of doc.nodes) {
        signatures[node.id] = JSON.stringify([node.kind, node.params]);
        next[node.id] =
          previous.state[node.id] && sigRef.current[node.id] === signatures[node.id]
            ? previous.state[node.id]
            : fresh[node.id];
      }
      sigRef.current = signatures;
      return { ...previous, state: previewSettle(doc, next, previewOptions).state };
    });
  }, [doc, preview.on, previewOptions]);
  const live = useMemo(() => {
    if (!preview.on) return null;
    return previewSettle(doc, preview.state, previewOptions).values as PreviewValues;
  }, [doc, preview.on, preview.state, previewOptions]);
  const clocks = useMemo(() => previewClockSources(doc), [doc]);
  function stepClock(count = 1) {
    setPreview((previous) => {
      let state = previous.state;
      for (let index = 0; index < count; index++)
        state = previewStep(
          doc,
          state,
          clocks.length === 1 ? clocks[0] : undefined,
          previewOptions,
        );
      return { ...previous, state, cycles: previous.cycles + count };
    });
  }
  useEffect(() => {
    if (!preview.on || !preview.running) return;
    const timer = window.setInterval(() => stepClock(1), 120);
    return () => window.clearInterval(timer);
  });
  function setInputValue(node: CircuitNode, value: bigint) {
    const width = circuitPins(node)[0].width;
    setPreview((previous) => ({
      ...previous,
      state: previewSettle(
        doc,
        previewSetInput(previous.state, node.id, value, width),
        previewOptions,
      ).state,
    }));
  }
  function inputValue(node: CircuitNode): bigint {
    return preview.state[node.id]?.v ?? 0n;
  }

  // ——— геометрия проводов ———
  const displayNode = useCallback(
    (node: CircuitNode): CircuitNode =>
      moveDelta && selectedNodes.has(node.id)
        ? { ...node, x: node.x + moveDelta.x, y: node.y + moveDelta.y }
        : node,
    [moveDelta, selectedNodes],
  );
  const displayMap = useMemo(
    () => new Map(doc.nodes.map((node) => [node.id, displayNode(node)])),
    [doc.nodes, displayNode],
  );
  const wireViews = useMemo(() => {
    const badWires = new Set(
      problems
        .filter((issue) => issue.wire && issue.severity !== 'warning')
        .map((issue) => issue.wire!),
    );
    const related = new Set<string>();
    return doc.wires.map((wire) => {
      const a = endpointPoint(displayMap, wire.from),
        b = endpointPoint(displayMap, wire.to);
      if (!a || !b) return null;
      const points = routeWire(a, b);
      const sourceNode = nodesById.get(wire.from.node)!,
        width = circuitPins(sourceNode).find((pin) => pin.name === wire.from.pin)?.width ?? 1;
      let liveClass: WireViewProps['live'] = null,
        label = width > 1 ? String(width) : '';
      if (live) {
        const origin = resolveSource(doc, wire.from) ?? wire.from;
        const value =
          live.get(`${origin.node}.${origin.pin}`) ??
          live.get(`${wire.from.node}.${wire.from.pin}`);
        liveClass =
          value === null || value === undefined
            ? 'unknown'
            : width > 1
              ? 'bus'
              : value === 1n
                ? 'high'
                : 'low';
        label = formatValue(value, width);
      }
      return {
        wire,
        points,
        d: pathOf(points),
        width,
        liveClass,
        label,
        labelAt: midpoint(points),
        bad: badWires.has(wire.id),
        ends: [points[0], points[points.length - 1]] as [Point, Point],
        title: `Провод ${sourceNode.name}.${wire.from.pin} → ${nodesById.get(wire.to.node)?.name}.${wire.to.pin}, ${width} бит. Delete — удалить.`,
        related: related.has(wire.id),
      };
    });
  }, [displayMap, doc, live, nodesById, problems]);
  const junctions = useMemo(() => {
    const count = new Map<string, { at: Point; n: number }>();
    for (const wire of doc.wires) {
      const a = endpointPoint(displayMap, wire.from);
      if (!a) continue;
      const key = `${wire.from.node}.${wire.from.pin}`,
        entry = count.get(key) ?? { at: { x: a.x + a.dx * 20, y: a.y + a.dy * 20 }, n: 0 };
      entry.n++;
      count.set(key, entry);
    }
    return [...count.values()].filter((entry) => entry.n > 1).map((entry) => entry.at);
  }, [displayMap, doc.wires]);
  const nodeProblems = useMemo(() => {
    const map = new Map<string, { level: 'error' | 'warning'; pins: string[] }>();
    for (const issue of problems) {
      if (!issue.node) continue;
      const entry = map.get(issue.node) ?? { level: 'warning' as const, pins: [] };
      if (issue.severity !== 'warning') entry.level = 'error';
      if (issue.pin) entry.pins.push(issue.pin);
      map.set(issue.node, entry);
    }
    return map;
  }, [problems]);
  const connected = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const wire of doc.wires) {
      map.set(wire.from.node, [...(map.get(wire.from.node) ?? []), wire.from.pin]);
      map.set(wire.to.node, [...(map.get(wire.to.node) ?? []), wire.to.pin]);
    }
    return map;
  }, [doc.wires]);
  const relatedTags = useMemo(() => {
    const names = new Set(
      selection.nodes
        .map((id) => nodesById.get(id))
        .filter(
          (node): node is CircuitNode =>
            !!node && (node.kind === 'tag_in' || node.kind === 'tag_out'),
        )
        .map((node) => node.name),
    );
    return new Set(
      doc.nodes
        .filter(
          (node) => (node.kind === 'tag_in' || node.kind === 'tag_out') && names.has(node.name),
        )
        .map((node) => node.id),
    );
  }, [doc.nodes, nodesById, selection.nodes]);

  // ——— цели соединения ———
  const targets = useMemo(() => {
    const source = wireDrag?.from ?? pending;
    if (!source) return null;
    const result: Record<string, 'ok' | 'bad'> = {};
    for (const node of doc.nodes)
      for (const pin of circuitPins(node)) {
        const check = quickCheck(doc, source, { node: node.id, pin: pin.name }, wireDrag?.replace);
        result[`${node.id}.${pin.name}`] = check.ok ? 'ok' : 'bad';
      }
    return result;
  }, [doc, pending, wireDrag?.from, wireDrag?.replace]);

  // ——— операции над выделением ———
  const selectAll = () => setSelection({ nodes: doc.nodes.map((node) => node.id), wires: [] });
  function deleteSelection() {
    if (busy) return;
    guard(() => {
      let next = removeCircuitNodes(doc, selection.nodes);
      const wires = new Set(selection.wires);
      next = { ...next, wires: next.wires.filter((wire) => !wires.has(wire.id)) };
      save(next);
      setSelection(noSelection);
      setPending(null);
    });
  }
  function transform(action: (ids: string[]) => CircuitDocument) {
    if (!selection.nodes.length || busy) return;
    guard(() => save(action(selection.nodes)));
  }
  async function copy(cut = false) {
    if (!selection.nodes.length) return;
    const text = serializeSelection(doc, selection.nodes);
    clipboardText.current = text;
    pasteCount.current = 0;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* буфер недоступен: работает внутренний */
    }
    if (cut) deleteSelection();
    else setNotice(`Скопировано элементов: ${selection.nodes.length}.`);
  }
  function pasteText(text: string) {
    if (busy) return;
    guard(() => {
      pasteCount.current++;
      const offset = GRID * 2 * pasteCount.current;
      const result = pasteSelection(doc, text, offset, offset);
      save(result.doc);
      setSelection({ nodes: result.ids, wires: [] });
    });
  }
  async function paste() {
    let text = clipboardText.current;
    try {
      const system = await navigator.clipboard?.readText();
      if (system && isClipboardText(system)) {
        if (system !== text) pasteCount.current = 0;
        text = system;
      }
    } catch {
      /* используем внутренний буфер */
    }
    if (!text) return setMessage('Буфер пуст. Сначала скопируйте элементы (Ctrl+C).');
    pasteText(text);
  }
  function duplicate() {
    if (!selection.nodes.length) return;
    clipboardText.current = serializeSelection(doc, selection.nodes);
    pasteCount.current = 0;
    pasteText(clipboardText.current);
  }
  const align = (mode: AlignMode) =>
    transform((ids) => alignNodes(doc, ids, mode, (node) => circuitGeometry(node)));

  function addFromLibrary(entryId: string, at?: Point) {
    if (busy) return;
    guard(() => {
      const node = newLibraryNode(doc, entryId);
      if (at) {
        node.x = snap(at.x - circuitGeometry(node).width / 2);
        node.y = snap(at.y - circuitGeometry(node).height / 2);
      } else {
        const center = canvasPoint(view, { x: size.width / 2, y: size.height / 2 });
        node.x = snap(center.x - circuitGeometry(node).width / 2);
        node.y = snap(center.y - circuitGeometry(node).height / 2);
        const geo = circuitGeometry(node);
        const clash = (x: number, y: number) =>
          doc.nodes.some((other) => {
            const g = circuitGeometry(other);
            return (
              x < other.x + g.width + 20 &&
              x + geo.width + 20 > other.x &&
              y < other.y + g.height + 30 &&
              y + geo.height + 30 > other.y
            );
          });
        const startY = node.y;
        for (let attempt = 0; attempt < 400 && clash(node.x, node.y); attempt++) {
          node.y += 40;
          if (attempt % 8 === 7) {
            node.y = startY;
            node.x += geo.width + 40;
          }
        }
      }
      save({ ...doc, nodes: [...doc.nodes, node] });
      setSelection({ nodes: [node.id], wires: [] });
    });
  }
  function connectEndpoints(a: Endpoint, b: Endpoint, replace?: string) {
    const check = fullCheck(doc, a, b, replace);
    if (!check.ok) {
      setMessage(check.reason);
      return false;
    }
    guard(() => {
      save(connectCircuit(doc, check.from, check.to, replace));
    });
    setMessage('');
    return true;
  }

  // ——— указатель ———
  const api = useMemo<NodeApi>(() => ({}) as NodeApi, []);
  Object.assign(api, {
    nodePointerDown(event: ReactPointerEvent, node: CircuitNode) {
      if (event.button !== 0 || tool === 'hand') return;
      event.stopPropagation();
      setMenu(null);
      const toggle = event.shiftKey || event.ctrlKey || event.metaKey;
      const wasSelected = selectedNodes.has(node.id);
      let ids = selection.nodes;
      if (toggle) {
        ids = wasSelected ? ids.filter((id) => id !== node.id) : [...ids, node.id];
        setSelection({ nodes: ids, wires: selection.wires });
        if (wasSelected) return;
      } else if (!wasSelected) {
        ids = [node.id];
        setSelection({ nodes: ids, wires: [] });
      }
      if (preview.on && blocks[node.kind].port?.direction === 'input') {
        // Кнопка платы нажимается, пока кнопка мыши удержана; обычный вход переключается щелчком.
        if (node.kind === 'button') setInputValue(node, 1n);
        else if (node.kind === 'clock27') stepClock(1);
        else if (circuitPins(node)[0].width === 1) setInputValue(node, inputValue(node) ^ 1n);
        const release = () => {
          if (node.kind === 'button') setInputValue(node, 0n);
          window.removeEventListener('pointerup', release);
        };
        window.addEventListener('pointerup', release);
        return;
      }
      if (busy) return;
      gesture.current = {
        type: 'move',
        pointer: event.pointerId,
        start: worldPoint(event.clientX, event.clientY),
        ids,
        moved: false,
        shift: toggle,
        wasSelected,
      };
      svgRef.current?.setPointerCapture(event.pointerId);
    },
    nodeKeyDown(event: ReactKeyboardEvent, node: CircuitNode) {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (preview.on && node.kind === 'button') {
          setInputValue(node, inputValue(node) ^ 1n);
          return;
        }
        setSelection((previous) =>
          event.shiftKey
            ? {
                nodes: previous.nodes.includes(node.id)
                  ? previous.nodes.filter((id) => id !== node.id)
                  : [...previous.nodes, node.id],
                wires: [],
              }
            : { nodes: [node.id], wires: [] },
        );
      }
    },
    nodeDoubleClick(node: CircuitNode) {
      if (busy) return;
      if (node.kind === 'note')
        setRename({ id: node.id, field: 'text', value: String(node.params.text) });
      else setRename({ id: node.id, field: 'name', value: node.name });
    },
    nodeContext(event: React.MouseEvent, node: CircuitNode) {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedNodes.has(node.id)) setSelection({ nodes: [node.id], wires: [] });
      const box = wrapRef.current?.getBoundingClientRect();
      setMenu({ x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) });
    },
    pinPointerDown(event: ReactPointerEvent, node: CircuitNode, pin: string) {
      if (event.button !== 0 || tool === 'hand') return;
      event.stopPropagation();
      setMenu(null);
      if (busy) return;
      gesture.current = {
        type: 'wire',
        pointer: event.pointerId,
        from: { node: node.id, pin },
        startClient: { x: event.clientX, y: event.clientY },
        moved: false,
      };
      svgRef.current?.setPointerCapture(event.pointerId);
    },
    pinKeyDown(event: ReactKeyboardEvent, node: CircuitNode, pin: string) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      clickPin({ node: node.id, pin });
    },
  });
  function clickPin(endpoint: Endpoint) {
    if (busy) return;
    if (!pending) {
      setPending(endpoint);
      setMessage('');
      return;
    }
    if (pending.node === endpoint.node && pending.pin === endpoint.pin) return setPending(null);
    if (connectEndpoints(pending, endpoint)) setPending(null);
  }
  const wireApi = useMemo(
    () => ({
      pointerDown(event: ReactPointerEvent, id: string) {
        if (event.button !== 0) return;
        event.stopPropagation();
        setMenu(null);
        setSelection((previous) =>
          event.shiftKey
            ? {
                nodes: previous.nodes,
                wires: previous.wires.includes(id)
                  ? previous.wires.filter((value) => value !== id)
                  : [...previous.wires, id],
              }
            : { nodes: [], wires: [id] },
        );
      },
      endPointerDown(event: ReactPointerEvent, token: string) {
        if (event.button !== 0 || busy) return;
        event.stopPropagation();
        const [id, index] = token.split(':'),
          wire = doc.wires.find((value) => value.id === id);
        if (!wire) return;
        // Тянем конец провода: второй конец остаётся на месте, первый можно перенести на другой контакт.
        const keep = index === '0' ? wire.to : wire.from;
        gesture.current = {
          type: 'wire',
          pointer: event.pointerId,
          from: keep,
          replace: id,
          startClient: { x: event.clientX, y: event.clientY },
          moved: false,
        };
        svgRef.current?.setPointerCapture(event.pointerId);
      },
      keyDown(event: ReactKeyboardEvent, id: string) {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSelection({ nodes: [], wires: [id] });
        }
      },
    }),
    [busy, doc.wires],
  );

  function onBackgroundDown(event: ReactPointerEvent<SVGSVGElement>) {
    setMenu(null);
    svgRef.current?.focus({ preventScroll: true });
    if (event.button === 2) return;
    const pan = event.button === 1 || tool === 'hand' || spaceDown.current;
    if (pan) {
      gesture.current = {
        type: 'pan',
        pointer: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        origin: view,
      };
    } else if (event.button === 0) {
      const start = worldPoint(event.clientX, event.clientY);
      gesture.current = {
        type: 'band',
        pointer: event.pointerId,
        start,
        additive: event.shiftKey || event.ctrlKey || event.metaKey,
        moved: false,
      };
    } else return;
    svgRef.current?.setPointerCapture(event.pointerId);
  }
  function onMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.type === 'pan') {
      setView({
        ...current.origin,
        x: current.origin.x + event.clientX - current.startClient.x,
        y: current.origin.y + event.clientY - current.startClient.y,
      });
    } else if (current.type === 'move') {
      const point = worldPoint(event.clientX, event.clientY),
        dx = snap(point.x - current.start.x),
        dy = snap(point.y - current.start.y);
      if (!current.moved && Math.abs(dx) + Math.abs(dy) < GRID) return;
      current.moved = true;
      setMoveDelta((previous) =>
        previous && previous.x === dx && previous.y === dy ? previous : { x: dx, y: dy },
      );
    } else if (current.type === 'band') {
      const point = worldPoint(event.clientX, event.clientY);
      if (Math.abs(point.x - current.start.x) + Math.abs(point.y - current.start.y) > 4)
        current.moved = true;
      if (current.moved)
        setBand({ x0: current.start.x, y0: current.start.y, x1: point.x, y1: point.y });
    } else if (current.type === 'wire') {
      const distance =
        Math.abs(event.clientX - current.startClient.x) +
        Math.abs(event.clientY - current.startClient.y);
      if (distance > 5) current.moved = true;
      if (!current.moved) return;
      const point = worldPoint(event.clientX, event.clientY);
      const under = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-pin]');
      const key = under?.getAttribute('data-pin') ?? null;
      let hover: Endpoint | null = null,
        check: ConnectCheck | null = null;
      if (key) {
        const [node, pin] = key.split('.');
        hover = { node, pin };
        check = fullCheck(doc, current.from, hover, current.replace);
      }
      setWireDrag({ from: current.from, at: point, hover, check, replace: current.replace });
    }
  }
  function finish(event: ReactPointerEvent<SVGSVGElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    gesture.current = null;
    if (svgRef.current?.hasPointerCapture(event.pointerId))
      svgRef.current.releasePointerCapture(event.pointerId);
    if (current.type === 'move') {
      const delta = moveDelta;
      setMoveDelta(null);
      if (cancelled) return;
      if (current.moved && delta && (delta.x || delta.y))
        save(moveNodes(doc, current.ids, delta.x, delta.y));
      else if (!current.moved && !current.shift && current.wasSelected && current.ids.length > 1)
        setSelection({ nodes: [current.ids.find((id) => id) ?? ''].filter(Boolean), wires: [] });
    } else if (current.type === 'band') {
      const rect = band;
      setBand(null);
      if (cancelled) return;
      if (!current.moved || !rect) {
        if (!current.additive) setSelection(noSelection);
        setPending(null);
        return;
      }
      const x0 = Math.min(rect.x0, rect.x1),
        x1 = Math.max(rect.x0, rect.x1),
        y0 = Math.min(rect.y0, rect.y1),
        y1 = Math.max(rect.y0, rect.y1);
      const inside = doc.nodes
        .filter((node) => {
          const geo = circuitGeometry(node);
          return node.x < x1 && node.x + geo.width > x0 && node.y < y1 && node.y + geo.height > y0;
        })
        .map((node) => node.id);
      setSelection((previous) => ({
        nodes: current.additive ? [...new Set([...previous.nodes, ...inside])] : inside,
        wires: [],
      }));
    } else if (current.type === 'wire') {
      const drag = wireDrag;
      setWireDrag(null);
      if (cancelled) return;
      if (!current.moved) {
        if (current.replace) return;
        clickPin(current.from);
        return;
      }
      if (drag?.hover && drag.check?.ok) {
        if (connectEndpoints(current.from, drag.hover, current.replace)) setPending(null);
      } else if (drag?.hover && drag.check && !drag.check.ok) setMessage(drag.check.reason);
    }
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    const target = event.target as Element;
    if (target.closest('input,select,textarea')) return;
    const mod = event.ctrlKey || event.metaKey,
      key = event.key.toLowerCase();
    if (event.key === ' ') spaceDown.current = true;
    if (mod && key === 'z') {
      event.preventDefault();
      undo(event.shiftKey);
    } else if (mod && key === 'y') {
      event.preventDefault();
      undo(true);
    } else if (mod && key === 'a') {
      event.preventDefault();
      selectAll();
    } else if (mod && key === 'd') {
      event.preventDefault();
      duplicate();
    } else if (mod && key === 'f') {
      event.preventDefault();
      document.getElementById('circuit-find')?.focus();
    } else if (mod) return;
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (selection.nodes.length || selection.wires.length) deleteSelection();
    } else if (key === 'r') transform((ids) => rotateNodes(doc, ids));
    else if (key === 'm') transform((ids) => rotateNodes(doc, ids, true));
    else if (key === 'f') fitAll();
    else if (key === 'z') fitAll(selectedNodes.size ? selectedNodes : undefined);
    else if (event.key === 'F2' && single) api.nodeDoubleClick(single);
    else if (event.key === '+' || event.key === '=')
      setView((v) => zoomCanvas(v, 1.25, { x: size.width / 2, y: size.height / 2 }));
    else if (event.key === '-')
      setView((v) => zoomCanvas(v, 1 / 1.25, { x: size.width / 2, y: size.height / 2 }));
    else if (event.key === '?' || event.key === 'F1') {
      event.preventDefault();
      setHelp(true);
    } else if (event.key === 'Escape') {
      if (gesture.current) {
        gesture.current = null;
        setMoveDelta(null);
        setBand(null);
        setWireDrag(null);
      } else if (menu || help || gallery) {
        setMenu(null);
        setHelp(false);
        setGallery(false);
      } else if (pending) setPending(null);
      else setSelection(noSelection);
      setMessage('');
    } else if (
      event.key.startsWith('Arrow') &&
      selection.nodes.length &&
      target === event.currentTarget.querySelector('svg')
    ) {
      event.preventDefault();
      const step = GRID * (event.shiftKey ? 5 : 1);
      transform((ids) =>
        moveNodes(
          doc,
          ids,
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        ),
      );
    } else if (
      event.key.startsWith('Arrow') &&
      selection.nodes.length &&
      (target as HTMLElement).getAttribute('role') === 'button' &&
      target.closest('[data-node]') &&
      !target.closest('[data-pin]')
    ) {
      event.preventDefault();
      const step = GRID * (event.shiftKey ? 5 : 1);
      transform((ids) =>
        moveNodes(
          doc,
          ids,
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        ),
      );
    }
  }
  function findNext() {
    const needle = find.trim().toLowerCase();
    if (!needle) return;
    const hits = doc.nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(needle) || kindTitle(node).toLowerCase().includes(needle),
    );
    if (!hits.length) return setMessage(`Элемент «${find}» не найден.`);
    findIndex.current = (findIndex.current + 1) % hits.length;
    const hit = hits[findIndex.current];
    setSelection({ nodes: [hit.id], wires: [] });
    centerOn(hit.id);
    setMessage('');
    setNotice(`Найдено: ${hit.name} (${findIndex.current + 1} из ${hits.length}).`);
  }
  function selectProblem(issue: CircuitIssue) {
    if (issue.node) {
      setSelection({ nodes: [issue.node], wires: [] });
      centerOn(issue.node);
    } else if (issue.wire) {
      setSelection({ nodes: [], wires: [issue.wire] });
      const wire = doc.wires.find((value) => value.id === issue.wire);
      if (wire) centerOn(wire.to.node);
    }
  }
  function onDrop(event: DragEvent) {
    const id = event.dataTransfer.getData(BLOCK_DRAG_TYPE);
    if (!id) return;
    event.preventDefault();
    addFromLibrary(id, worldPoint(event.clientX, event.clientY));
  }
  function commitRename() {
    if (!rename) return;
    const node = nodesById.get(rename.id);
    setRename(null);
    if (!node || busy) return;
    guard(() =>
      save(
        rename.field === 'name'
          ? updateNode(doc, node.id, { name: rename.value.trim() })
          : updateNode(doc, node.id, { params: { ...node.params, text: rename.value } }),
      ),
    );
  }

  const generated = useMemo(() => {
    if (!code) return '';
    try {
      return compileCircuit(doc, project.top);
    } catch (cause) {
      return cause instanceof Error ? cause.message : 'Проверьте имя верхнего модуля.';
    }
  }, [code, doc, project.top]);
  const errors = problems.filter((issue) => issue.severity !== 'warning'),
    warnings = problems.filter((issue) => issue.severity === 'warning');
  const renameNode = rename ? nodesById.get(rename.id) : undefined;
  const status = wireDrag
    ? wireDrag.hover && wireDrag.check
      ? wireDrag.check.ok
        ? 'Отпустите кнопку мыши, чтобы соединить.'
        : wireDrag.check.reason
      : 'Ведите провод к контакту. Подходящие контакты подсвечены зелёным, неподходящие — красным.'
    : pending
      ? `Выбран контакт ${nodesById.get(pending.node)?.name}.${pending.pin}. Нажмите другой контакт, чтобы соединить. Esc — отмена.`
      : preview.on
        ? 'Предпросмотр: нажимайте входы и кнопки, шагайте тактом. Это быстрая проверка; точное моделирование — на вкладках «Диаграммы» и «Виртуальная».'
        : 'Перетащите элемент из библиотеки. Протяните провод от контакта к контакту. Подсказки — клавиша «?».';

  const toolbarButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    disabled = false,
    pressed?: boolean,
  ) => (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <section
      className="circuit-workspace"
      onKeyDown={onKeyDown}
      onKeyUp={(event) => {
        if (event.key === ' ') spaceDown.current = false;
      }}
      onCopy={(event) => {
        if ((event.target as Element).closest('input,textarea') || !selection.nodes.length) return;
        event.preventDefault();
        const text = serializeSelection(doc, selection.nodes);
        event.clipboardData.setData('text/plain', text);
        clipboardText.current = text;
        pasteCount.current = 0;
      }}
      onCut={(event) => {
        if ((event.target as Element).closest('input,textarea') || !selection.nodes.length) return;
        event.preventDefault();
        const text = serializeSelection(doc, selection.nodes);
        event.clipboardData.setData('text/plain', text);
        clipboardText.current = text;
        pasteCount.current = 0;
        deleteSelection();
      }}
      onPaste={(event) => {
        if ((event.target as Element).closest('input,textarea')) return;
        const text = event.clipboardData.getData('text/plain');
        event.preventDefault();
        if (text && isClipboardText(text)) {
          if (text !== clipboardText.current) pasteCount.current = 0;
          clipboardText.current = text;
          pasteText(text);
        } else if (clipboardText.current) pasteText(clipboardText.current);
        else setMessage('В буфере нет схемы Yosis.');
      }}
    >
      <header className="circuit-toolbar" role="toolbar" aria-label="Инструменты конструктора">
        {toolbarButton(
          'Отменить (Ctrl+Z)',
          <Undo2 size={16} />,
          () => undo(),
          !history.undo.length || busy,
        )}
        {toolbarButton(
          'Повторить (Ctrl+Y)',
          <Redo2 size={16} />,
          () => undo(true),
          !history.redo.length || busy,
        )}
        <span className="toolbar-sep" aria-hidden="true" />
        {toolbarButton(
          'Вырезать (Ctrl+X)',
          <Scissors size={16} />,
          () => void copy(true),
          !selection.nodes.length || busy,
        )}
        {toolbarButton(
          'Копировать (Ctrl+C)',
          <Copy size={16} />,
          () => void copy(),
          !selection.nodes.length,
        )}
        {toolbarButton('Вставить (Ctrl+V)', <ClipboardPaste size={16} />, () => void paste(), busy)}
        {toolbarButton(
          'Повернуть на 90° (R)',
          <RotateCw size={16} />,
          () => transform((ids) => rotateNodes(doc, ids)),
          !selection.nodes.length || busy,
        )}
        {toolbarButton(
          'Отразить (M)',
          <FlipHorizontal2 size={16} />,
          () => transform((ids) => rotateNodes(doc, ids, true)),
          !selection.nodes.length || busy,
        )}
        {toolbarButton(
          'Удалить (Delete)',
          <Trash2 size={16} />,
          deleteSelection,
          (!selection.nodes.length && !selection.wires.length) || busy,
        )}
        <span className="toolbar-sep" aria-hidden="true" />
        <form
          className="circuit-find"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            findNext();
          }}
        >
          <Search size={14} aria-hidden="true" />
          <input
            id="circuit-find"
            type="search"
            aria-label="Найти элемент по имени"
            placeholder="Найти по имени"
            value={find}
            onChange={(event) => {
              setFind(event.target.value);
              findIndex.current = -1;
            }}
          />
        </form>
        {toolbarButton(
          'Рука: двигать полотно',
          <Hand size={16} />,
          () => setTool(tool === 'hand' ? 'select' : 'hand'),
          false,
          tool === 'hand',
        )}
        {toolbarButton('Уменьшить масштаб (−)', <Minus size={16} />, () =>
          setView((v) => zoomCanvas(v, 1 / 1.25, { x: size.width / 2, y: size.height / 2 })),
        )}
        <output aria-label="Текущий масштаб">{Math.round(view.scale * 100)}%</output>
        {toolbarButton('Увеличить масштаб (+)', <Plus size={16} />, () =>
          setView((v) => zoomCanvas(v, 1.25, { x: size.width / 2, y: size.height / 2 })),
        )}
        {toolbarButton('Показать всю схему (F)', <Maximize size={16} />, () => fitAll())}
        <span className="toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          className="button subtle"
          aria-pressed={preview.on}
          onClick={() =>
            setPreview((previous) =>
              previous.on
                ? { ...previous, on: false, running: false }
                : {
                    ...previous,
                    on: true,
                    state: previewSettle(doc, previewInit(doc, previewOptions), previewOptions)
                      .state,
                    cycles: 0,
                  },
            )
          }
        >
          <Zap size={14} />
          Предпросмотр
        </button>
        <button type="button" className="button subtle" onClick={() => setGallery(true)}>
          <LayoutTemplate size={14} />
          Примеры
        </button>
        <button
          type="button"
          className="button subtle"
          aria-pressed={code}
          onClick={() => setCode(!code)}
        >
          <Code2 size={14} />
          {code ? 'Вернуться к схеме' : 'Verilog'}
        </button>
        {toolbarButton('Горячие клавиши (?)', <HelpCircle size={16} />, () => setHelp(true))}
      </header>
      <div className="circuit-instruction">
        <span role="status">{status}</span>
        <small>
          {source.name} · {doc.nodes.length} элементов · {doc.wires.length} проводов
        </small>
      </div>
      {(message || parsed.error || notice) && (
        <p
          className={message || parsed.error ? 'circuit-error' : 'circuit-notice'}
          role={message || parsed.error ? 'alert' : 'status'}
        >
          {message || parsed.error || notice}
        </p>
      )}
      {code ? (
        <pre className="circuit-code" aria-label="Verilog из схемы">
          {generated && !errors.length
            ? generated
            : `Сначала исправьте схему:\n${errors.map((issue) => issue.message).join('\n')}`}
        </pre>
      ) : (
        <div className="circuit-columns">
          <CircuitPalette disabled={busy} onAdd={(id) => addFromLibrary(id)} />
          <div
            className={`circuit-canvas ${tool === 'hand' ? 'hand' : ''}`}
            ref={wrapRef}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes(BLOCK_DRAG_TYPE)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={onDrop}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`}
              role="group"
              aria-label="Конструктор логической схемы"
              tabIndex={0}
              onPointerDown={onBackgroundDown}
              onPointerMove={onMove}
              onPointerUp={(event) => finish(event)}
              onPointerCancel={(event) => finish(event, true)}
              onContextMenu={(event) => {
                event.preventDefault();
                const box = wrapRef.current?.getBoundingClientRect();
                setMenu({
                  x: event.clientX - (box?.left ?? 0),
                  y: event.clientY - (box?.top ?? 0),
                });
              }}
            >
              <defs>
                <pattern
                  id="circuit-grid"
                  width={GRID * 2 * view.scale}
                  height={GRID * 2 * view.scale}
                  patternUnits="userSpaceOnUse"
                  x={view.x}
                  y={view.y}
                >
                  <circle cx={0} cy={0} r={1} className="grid-dot" />
                </pattern>
              </defs>
              <rect className="circuit-grid" width="100%" height="100%" fill="url(#circuit-grid)" />
              <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
                {wireViews.map(
                  (item) =>
                    item && (
                      <WireView
                        key={item.wire.id}
                        id={item.wire.id}
                        d={item.d}
                        bus={item.width > 1}
                        selected={selectedWires.has(item.wire.id)}
                        bad={item.bad}
                        related={item.related}
                        live={item.liveClass}
                        label={item.label}
                        labelAt={item.labelAt}
                        ends={item.ends}
                        title={item.title}
                        onPointerDown={wireApi.pointerDown}
                        onEndPointerDown={wireApi.endPointerDown}
                        onKeyDown={wireApi.keyDown}
                      />
                    ),
                )}
                {junctions.map((point, index) => (
                  <circle key={index} className="junction" cx={point.x} cy={point.y} r={4.5} />
                ))}
                {doc.nodes.map((node) => {
                  const shown = displayMap.get(node.id)!,
                    problem = nodeProblems.get(node.id);
                  const pins = circuitPins(node);
                  const liveNode =
                    live &&
                    Object.fromEntries(
                      pins.map((pin) => [
                        pin.name,
                        pin.direction === 'input'
                          ? (() => {
                              const wire = doc.wires.find(
                                (value) => value.to.node === node.id && value.to.pin === pin.name,
                              );
                              if (!wire) return null;
                              const origin = resolveSource(doc, wire.from) ?? wire.from;
                              return live.get(`${origin.node}.${origin.pin}`) ?? null;
                            })()
                          : (live.get(`${node.id}.${pin.name}`) ?? null),
                      ]),
                    );
                  return (
                    <NodeView
                      key={node.id}
                      node={shown}
                      selected={selectedNodes.has(node.id)}
                      related={relatedTags.has(node.id) && !selectedNodes.has(node.id)}
                      level={problem?.level ?? null}
                      badPins={problem?.pins ?? EMPTY}
                      connectedPins={connected.get(node.id) ?? EMPTY}
                      pendingPin={pending?.node === node.id ? pending.pin : null}
                      targets={targets}
                      live={liveNode ?? null}
                      api={api}
                    />
                  );
                })}
                {wireDrag &&
                  (() => {
                    const from = endpointPoint(displayMap, wireDrag.from);
                    if (!from) return null;
                    const to = wireDrag.hover ? endpointPoint(displayMap, wireDrag.hover) : null;
                    const points = to
                      ? routeWire(from, to)
                      : [
                          { x: from.x, y: from.y },
                          { x: from.x + from.dx * 20, y: from.y + from.dy * 20 },
                          wireDrag.at,
                        ];
                    return (
                      <path
                        className={`wire-ghost ${wireDrag.check && !wireDrag.check.ok ? 'bad' : ''}`}
                        d={pathOf(points)}
                      />
                    );
                  })()}
                {band && (
                  <rect
                    className="selection-band"
                    x={Math.min(band.x0, band.x1)}
                    y={Math.min(band.y0, band.y1)}
                    width={Math.abs(band.x1 - band.x0)}
                    height={Math.abs(band.y1 - band.y0)}
                  />
                )}
              </g>
            </svg>
            {!doc.nodes.length && (
              <div className="circuit-empty">
                <p>Схема пуста. Выберите элемент в библиотеке слева или откройте готовый пример.</p>
                <button type="button" className="button primary" onClick={() => setGallery(true)}>
                  Открыть примеры
                </button>
              </div>
            )}
            {renameNode && rename && (
              <div
                className="circuit-rename"
                style={{
                  left: (renameNode.x - 10) * view.scale + view.x,
                  top: (renameNode.y - 30) * view.scale + view.y,
                }}
              >
                {rename.field === 'text' ? (
                  <textarea
                    autoFocus
                    aria-label="Текст заметки"
                    value={rename.value}
                    onChange={(event) => setRename({ ...rename, value: event.target.value })}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setRename(null);
                      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commitRename();
                    }}
                  />
                ) : (
                  <input
                    autoFocus
                    aria-label="Новое имя элемента"
                    value={rename.value}
                    maxLength={128}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => setRename({ ...rename, value: event.target.value })}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename();
                      if (event.key === 'Escape') setRename(null);
                    }}
                  />
                )}
              </div>
            )}
            {menu && (
              <ul className="circuit-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
                {[
                  ['Копировать', () => void copy(), !selection.nodes.length],
                  ['Вырезать', () => void copy(true), !selection.nodes.length],
                  ['Вставить', () => void paste(), false],
                  ['Дублировать', duplicate, !selection.nodes.length],
                  [
                    'Повернуть (R)',
                    () => transform((ids) => rotateNodes(doc, ids)),
                    !selection.nodes.length,
                  ],
                  [
                    'Отразить (M)',
                    () => transform((ids) => rotateNodes(doc, ids, true)),
                    !selection.nodes.length,
                  ],
                  ['Переименовать (F2)', () => single && api.nodeDoubleClick(single), !single],
                  [
                    'Приблизить к выделению (Z)',
                    () => fitAll(selectedNodes),
                    !selection.nodes.length,
                  ],
                  ['Выделить всё', selectAll, false],
                  ['Удалить', deleteSelection, !selection.nodes.length && !selection.wires.length],
                ].map(([label, action, disabled]) => (
                  <li key={label as string} role="none">
                    <button
                      role="menuitem"
                      disabled={(disabled as boolean) || busy}
                      onClick={() => {
                        setMenu(null);
                        (action as () => void)();
                      }}
                    >
                      {label as string}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <span className="canvas-hint">
              Рамка — выделение · колесо — масштаб · пробел + мышь — сдвиг
            </span>
          </div>
          <aside className="circuit-inspector" aria-label="Свойства и проверка схемы">
            {preview.on && (
              <section className="preview-panel" aria-label="Предпросмотр значений">
                <h3>Предпросмотр</h3>
                <p>
                  Быстрая проверка в браузере: показывает значения на проводах. Точное моделирование
                  выполняют вкладки «Диаграммы» и «Виртуальная».
                </p>
                <div className="preview-actions">
                  <button type="button" className="button subtle" onClick={() => stepClock(1)}>
                    <StepForward size={14} />
                    Такт
                  </button>
                  <button type="button" className="button subtle" onClick={() => stepClock(10)}>
                    ×10
                  </button>
                  <button
                    type="button"
                    className="button subtle"
                    aria-pressed={preview.running}
                    onClick={() => setPreview({ ...preview, running: !preview.running })}
                  >
                    <Play size={14} />
                    {preview.running ? 'Стоп' : 'Ход'}
                  </button>
                  <button
                    type="button"
                    className="button subtle"
                    onClick={() =>
                      setPreview({
                        ...preview,
                        running: false,
                        cycles: 0,
                        state: previewSettle(doc, previewInit(doc, previewOptions), previewOptions)
                          .state,
                      })
                    }
                  >
                    Сброс
                  </button>
                </div>
                <label className="prop-check">
                  <input
                    type="checkbox"
                    checked={preview.fast}
                    onChange={(event) => setPreview({ ...preview, fast: event.target.checked })}
                  />
                  <span>Ускорить делители частоты (период — несколько тактов)</span>
                </label>
                <p>
                  Выполнено тактов: {preview.cycles}. «?» — значение неизвестно до сброса или
                  загрузки.
                </p>
                {doc.nodes
                  .filter(
                    (node) =>
                      blocks[node.kind].port?.direction === 'input' && node.kind !== 'clock27',
                  )
                  .map((node) => {
                    const width = circuitPins(node)[0].width;
                    return (
                      <label key={node.id} className="prop-field">
                        <span>
                          {node.name} ({width} бит)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={Number(2n ** BigInt(Math.min(width, 52)) - 1n)}
                          value={Number(inputValue(node))}
                          onChange={(event) =>
                            setInputValue(
                              node,
                              BigInt(Math.max(0, Math.floor(Number(event.target.value) || 0))),
                            )
                          }
                        />
                      </label>
                    );
                  })}
              </section>
            )}
            {selection.nodes.length > 1 && (
              <section className="multi-panel">
                <h3>Выбрано элементов: {selection.nodes.length}</h3>
                <div className="preview-actions">
                  {(
                    [
                      ['left', 'По левому краю'],
                      ['top', 'По верху'],
                      ['hcenter', 'По центру ↔'],
                      ['vcenter', 'По центру ↕'],
                      ['hdistribute', 'Распределить ↔'],
                      ['vdistribute', 'Распределить ↕'],
                    ] as [AlignMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className="button subtle"
                      disabled={busy}
                      onClick={() => align(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {single ? (
              <CircuitProperties
                key={`${single.id}:${JSON.stringify(single.params)}:${single.name}`}
                node={single}
                disabled={busy}
                problems={problems
                  .filter((issue) => issue.node === single.id)
                  .map((issue) => issue.message)}
                onApply={({ name, params }) => save(updateNode(doc, single.id, { name, params }))}
                onDelete={deleteSelection}
                onPins={() => onPins(single.name)}
              />
            ) : (
              !selection.nodes.length && (
                <p>Выберите элемент, чтобы изменить имя, ширину и другие свойства.</p>
              )
            )}
            {single && (single.kind === 'tag_in' || single.kind === 'tag_out') && (
              <p className="prop-note">
                Связанные метки «{single.name}»:{' '}
                {doc.nodes
                  .filter(
                    (node) =>
                      (node.kind === 'tag_in' || node.kind === 'tag_out') &&
                      node.name === single.name,
                  )
                  .map((node) => (node.kind === 'tag_out' ? 'передаёт' : 'принимает'))
                  .join(', ')}
                .
              </p>
            )}
            <details className="circuit-issues" open>
              <summary>
                {errors.length
                  ? `Исправьте перед сборкой · ${errors.length}`
                  : warnings.length
                    ? `Схема готова · замечаний ${warnings.length}`
                    : 'Схема готова к сборке'}
              </summary>
              {problems.length ? (
                <ul>
                  {problems.map((issue, i) => (
                    <li key={i} className={issue.severity === 'warning' ? 'warning' : 'error'}>
                      <button onClick={() => selectProblem(issue)}>
                        <b aria-hidden="true">{issue.severity === 'warning' ? '⚠' : '✖'}</b>{' '}
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Можно синтезировать и проверить диаграммы. Выводы платы для кнопок и светодиодов
                  назначаются автоматически.
                </p>
              )}
            </details>
          </aside>
        </div>
      )}
      {help && (
        <div
          className="circuit-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Горячие клавиши конструктора"
        >
          <div>
            <h3>Горячие клавиши</h3>
            <dl>
              {shortcuts.map(([keys, text]) => (
                <div key={keys}>
                  <dt>{keys}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <button className="button primary" autoFocus onClick={() => setHelp(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
      {gallery && (
        <div className="circuit-dialog" role="dialog" aria-modal="true" aria-label="Готовые схемы">
          <div>
            <h3>Готовые схемы</h3>
            <p>
              Выбранный пример заменит текущую схему. Это можно отменить кнопкой «Отменить»
              (Ctrl+Z). Кнопки, светодиоды и такт получат выводы платы автоматически.
            </p>
            <ul className="example-list">
              {circuitExamples.map((example) => (
                <li key={example.id}>
                  <strong>{example.title}</strong>
                  <span>{example.description}</span>
                  <em>{example.behavior}</em>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      guard(() => {
                        save(example.build());
                        setSelection(noSelection);
                        fitted.current = false;
                      });
                      setGallery(false);
                    }}
                  >
                    Открыть
                  </button>
                </li>
              ))}
            </ul>
            <button className="button subtle" onClick={() => setGallery(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
const EMPTY: string[] = [];
