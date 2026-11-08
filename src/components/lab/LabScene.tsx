import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Cable, Maximize2, Minus, Plus, RotateCcw, RotateCw, Tag } from 'lucide-react';
import type { McuProject, SimulationFrame } from './reference/shared/mcu';
import type { CircuitSolution } from './reference/shared/sim/circuit';
import {
  Stage,
  type ContextInfo,
  type HoverInfo,
  type PlacementInfo,
  type StageEvents,
} from './reference/src/mcu/scene/stage';
import type { Mount } from './reference/shared/mount';
import { circuitPart } from './reference/bridge';
import { PART_DRAG_TYPE } from './Library';
import './lab-scene.css';

export interface SceneEvents {
  select: (id: string) => void;
  terminal: (id: string) => void;
  connect: (from: string, to: string) => void;
  replug: (wire: string, end: 'from' | 'to', terminal: string) => void;
  move: StageEvents['move'];
  context: (info: ContextInfo) => void;
  value: (id: string, value: number, index?: number) => void;
  cancel: () => void;
  notice: (text: string) => void;
  /** A key of the FPGA board was pressed or let go. */
  boardKey: (id: 'S1' | 'S2', down: boolean) => void;
  /** A part from the library let go over the bench; `spot` is null when nothing is under it. */
  drop: (def: string, spot: { x: number; y: number; mount: Mount | null } | null) => void;
}
export interface SceneHandle {
  fit: () => void;
  focus: () => void;
}
interface Props extends SceneEvents {
  project: McuProject;
  frame: SimulationFrame;
  solution: CircuitSolution;
  selected: string;
  pending: string;
  boardLeds: readonly number[];
  boardKeys: readonly boolean[];
  handle?: Ref<SceneHandle>;
  children?: ReactNode;
}

/** The bench: the reference's own scene, driven by the laboratory's parts and wires. */
export function LabScene({
  project,
  frame,
  solution,
  selected,
  pending,
  boardLeds,
  boardKeys,
  handle,
  children,
  ...events
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [failed, setFailed] = useState('');
  const [labels, setLabels] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [placement, setPlacement] = useState<PlacementInfo | null>(null);
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let created: Stage;
    try {
      created = new Stage(element, {
        select: (id) => handlers.current.select(id),
        terminal: (id) => handlers.current.terminal(id),
        connect: (from, to) => handlers.current.connect(from, to),
        replug: (id, end, terminal) => handlers.current.replug(id, end, terminal),
        move: (id, x, y, mount) => handlers.current.move(id, x, y, mount),
        context: (info) => {
          const box = element.getBoundingClientRect();
          handlers.current.context({ ...info, x: info.x + box.left, y: info.y + box.top });
        },
        value: (id, value, index) => handlers.current.value(id, value, index),
        cancel: () => handlers.current.cancel(),
        hover: setHover,
        placement: (info) =>
          setPlacement((before) =>
            JSON.stringify(before) === JSON.stringify(info) ? before : info,
          ),
        view: () => undefined,
        notice: (text) => handlers.current.notice(text),
        boardKey: (id, down) => handlers.current.boardKey(id, down),
      });
    } catch (error) {
      setFailed(error instanceof Error ? error.message : String(error));
      return;
    }
    stage.current = created;
    created.setPinLabels(true);
    const root = document.documentElement;
    const theme = () => created.setTheme({ dark: root.dataset.theme !== 'light' });
    theme();
    const observer = new MutationObserver(theme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      observer.disconnect();
      created.dispose();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    stage.current?.sync({ project, frame, solution, selected, pending, boardLeds, boardKeys });
  }, [project, frame, solution, selected, pending, boardLeds, boardKeys]);
  useImperativeHandle(handle, () => ({
    fit: () => stage.current?.fit(),
    focus: () => host.current?.focus({ preventScroll: true }),
  }));

  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== host.current) return;
    const current = stage.current;
    if (!current) return;
    if (event.code === 'KeyQ') current.rotate(1);
    else if (event.code === 'KeyE') current.rotate(-1);
    else if (event.key === '+' || event.key === '=') current.zoomBy(1.3);
    else if (event.key === '-') current.zoomBy(1 / 1.3);
    else if (event.key === '0') current.fit();
    else if (/^(Key[WASD]|Arrow|Shift)/.test(event.code)) current.key(event.code, true);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={host}
      className="bench"
      style={{ flex: 1 }}
      tabIndex={0}
      role="application"
      aria-label="Монтажный стол: плата, детали и провода"
      onKeyDown={keyDown}
      onKeyUp={(event) => stage.current?.key(event.code, false)}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(PART_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        const def = event.dataTransfer.getData(PART_DRAG_TYPE);
        if (!def) return;
        event.preventDefault();
        const part = circuitPart({ uid: '__drop', def, x: 0, y: 0, turn: 0, opts: {} });
        handlers.current.drop(def, stage.current?.dropAt(event, part) ?? null);
      }}
    >
      {failed && (
        <p className="bench-error" role="alert">
          Не удалось запустить 3D-сцену (WebGL): {failed}
        </p>
      )}
      <p className="bench-hint">
        <Cable size={14} />
        <span>Тяните от контакта к контакту</span>
        <kbd>Q</kbd>
        <kbd>E</kbd>
        <span>поворот</span>
      </p>
      {placement && (
        <div
          className={`bench-placement bench-placement-${placement.tone}`}
          role="status"
          aria-live="polite"
        >
          <strong>{placement.title}</strong>
          <span>{placement.detail}</span>
        </div>
      )}
      {hover && (
        <div className="bench-tooltip" role="tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.title}</strong>
          {hover.detail && <span>{hover.detail}</span>}
        </div>
      )}
      {children}
      <div className="bench-viewbar" role="toolbar" aria-label="Вид">
        <button
          type="button"
          aria-label="Подписи выводов"
          aria-pressed={labels}
          title="Подписи выводов"
          onClick={() => {
            setLabels(!labels);
            stage.current?.setPinLabels(!labels);
          }}
        >
          <Tag size={15} />
        </button>
        <button
          type="button"
          aria-label="Повернуть влево"
          title="Повернуть влево · Q"
          onClick={() => stage.current?.rotate(1)}
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          aria-label="Повернуть вправо"
          title="Повернуть вправо · E"
          onClick={() => stage.current?.rotate(-1)}
        >
          <RotateCw size={15} />
        </button>
        <button type="button" aria-label="Уменьшить" onClick={() => stage.current?.zoomBy(1 / 1.3)}>
          <Minus size={15} />
        </button>
        <button type="button" aria-label="Увеличить" onClick={() => stage.current?.zoomBy(1.3)}>
          <Plus size={15} />
        </button>
        <button
          type="button"
          aria-label="Показать весь стол"
          title="Показать всё · 0"
          onClick={() => stage.current?.fit()}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}
