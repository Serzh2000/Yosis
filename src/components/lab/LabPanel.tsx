import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  StepForward,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LabDesign } from '../../../shared/lab';
import { validateProject } from '../../../shared/project-validation';
import type { Diagnostic, Project } from '../../../shared/types';
import { request } from '../../lib/api';
import { applyPinEdit, readCst } from '../../lib/pin-planner';
import { behaviourKey, partById, partPins, type PartDef } from '../../lib/lab/catalog';
import { BOARD_CLOCK_HZ } from '../../lib/lab/devices';
import {
  addPart,
  addPartAt,
  addWire,
  disconnectParts,
  duplicatePart,
  movePart,
  removeItems,
  replugWire,
  setPartProps,
  setWireColor,
  terminalOwner,
  turnPart,
} from '../../lib/lab/layout-ops';
import { defaultBench } from '../../lib/lab/bench';
import { headerByFpga } from '../../lib/lab/pads';
import {
  BOARD_BUTTONS,
  BOARD_UART,
  LabRuntime,
  loadLayout,
  saveLayout,
  type LabPart,
  type LabWire,
} from '../../lib/lab/runtime';
import { wireFpga, wirePins } from '../../lib/lab/wire-info';
import { AssignPopover } from './AssignForm';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { LabScene, type SceneHandle } from './LabScene';
import { Library } from './Library';
import { PartProperties } from './PartProperties';
import { SidePanel } from './SidePanel';
import { NOTHING, type Selection } from './selection';
import { useLabHistory } from './useLabHistory';
import { Dialog } from '../Dialog';
import { resolveConnections, toProject } from './reference/bridge';
import { actionFor, liveOf } from './reference/live';
import { wirePalette } from './reference/src/mcu/scene/layout';
import '../virtual-board.css';
import './lab.css';

interface Props {
  project: Project;
  /** The tab is on screen: the design runs only then. */
  active: boolean;
  onChange: (project: Project) => void;
  onOpenPins: () => void;
}
const SPEEDS = [
  ['max', 'как можно быстрее'],
  ['100000', '100 000 тактов/с'],
  ['1000', '1000 тактов/с'],
  ['20', '20 тактов/с'],
  ['2', '2 такта/с'],
] as const;
const WIRE_COLOR_NAMES = [
  'Оранжевый',
  'Зелёный',
  'Синий',
  'Фиолетовый',
  'Коралловый',
  'Жёлтый',
  'Бирюзовый',
  'Коричневый',
];
/** About 30 redraws a second; the slack keeps every second 60 Hz frame from being skipped by jitter. */
const REDRAW_INTERVAL_MS = 1000 / 30 - 4;
const formatRate = (rate: number) =>
  rate >= 1e6
    ? `${(rate / 1e6).toFixed(1).replace('.', ',')} млн тактов/с`
    : rate >= 1e3
      ? `${Math.round(rate / 1e3)} тыс. тактов/с`
      : `${Math.round(rate)} тактов/с`;
const partDef = (part: LabPart): PartDef => partById.get(part.def)!;

export function LabPanel({ project, active, onChange, onOpenPins }: Props) {
  const [design, setDesign] = useState<LabDesign | null>(null);
  const [problem, setProblem] = useState<{ error: string; diagnostics: Diagnostic[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [runtime, setRuntime] = useState<LabRuntime | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<string>('max');
  const [muted, setMuted] = useState(false);
  const [, setTick] = useState(0);
  const [rate, setRate] = useState(0);
  const [pending, setPending] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [restart, setRestart] = useState(0);
  const [propertiesOf, setPropertiesOf] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    label: string;
    items: MenuItem[];
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [popover, setPopover] = useState('');
  const [notice, setNotice] = useState('');
  const scene = useRef<SceneHandle>(null);
  const projectRef = useRef(project);
  projectRef.current = project;

  const history = useLabHistory(
    () => loadLayout(project),
    (next) => saveLayout(projectRef.current, next),
  );
  const layout = history.layout;
  const historyRef = useRef(history);
  historyRef.current = history;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const connections = useMemo(() => resolveConnections(layout), [layout]);

  // A different project brings its own bench.
  const projectKey = project.id ?? project.name;
  const loadedFor = useRef(projectKey);
  useEffect(() => {
    if (loadedFor.current === projectKey) return;
    loadedFor.current = projectKey;
    historyRef.current.reset(loadLayout(projectRef.current));
    setSelectedId('');
    setPending('');
    setPropertiesOf(null);
    setPopover('');
  }, [projectKey]);

  // Undo, a deleted part or a new project can leave the selection pointing at nothing.
  useEffect(() => {
    const exists = new Set([
      ...layout.parts.map((part) => part.uid),
      ...layout.wires.map((wire) => wire.id),
    ]);
    setSelectedId((value) => (exists.has(value) ? value : ''));
    setPropertiesOf((value) => (value && exists.has(value) ? value : null));
    setPending((value) =>
      value && !exists.has(terminalOwner(value)) && terminalOwner(value) !== 'board' ? '' : value,
    );
  }, [layout.parts, layout.wires]);
  const selection: Selection = useMemo(() => {
    if (layout.parts.some((part) => part.uid === selectedId))
      return { parts: [selectedId], wire: null };
    if (layout.wires.some((wire) => wire.id === selectedId)) return { parts: [], wire: selectedId };
    return NOTHING;
  }, [layout, selectedId]);

  // The gate-level form depends on the HDL only; pin assignments are applied in the browser.
  const hdl = useMemo(
    () =>
      JSON.stringify([
        project.top,
        project.files
          .filter((file) => /\.(v|sv|svh|vh|ysch)$/i.test(file.name))
          .map((file) => [file.name, file.content]),
      ]),
    [project.top, project.files],
  );
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      let validated: Project;
      try {
        validated = validateProject(projectRef.current);
      } catch (cause) {
        setProblem({
          error: cause instanceof Error ? cause.message : String(cause),
          diagnostics: [],
        });
        return;
      }
      setLoading(true);
      void request<{ design?: LabDesign; error?: string; diagnostics: Diagnostic[] }>('/api/lab', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: validated }),
      })
        .then((result) => {
          if (controller.signal.aborted) return;
          if (result.design) {
            setDesign(result.design);
            setProblem(null);
          } else
            setProblem({
              error: result.error ?? 'Не удалось подготовить схему.',
              diagnostics: result.diagnostics,
            });
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setProblem({
              error: cause instanceof Error ? cause.message : 'Сервис недоступен.',
              diagnostics: [],
            });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [hdl, active]);

  // Rewiring, like on a real bench, restarts the design; moving, turning, colouring and
  // renaming parts does not.
  const cst = useMemo(
    () =>
      project.files
        .filter((file) => file.name.endsWith('.cst'))
        .map((file) => file.content)
        .join('\n'),
    [project.files],
  );
  const structure = useMemo(
    () =>
      JSON.stringify([
        layout.parts.map((part) => [
          part.uid,
          part.def,
          behaviourKey(partDef(part), part.opts),
          part.mount ? [part.mount.on, part.mount.hole] : 0,
        ]),
        connections.wires.map((wire) => [wire.id, wire.fpga]),
      ]),
    [layout.parts, connections],
  );
  useEffect(() => {
    if (!design) {
      setRuntime(null);
      return;
    }
    try {
      setRuntime(new LabRuntime(design, projectRef.current, layoutRef.current));
      setRuntimeError('');
    } catch (cause) {
      setRuntime(null);
      setRuntimeError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [design, cst, structure, restart]);
  // An edit makes new option objects; parts keep their state in the ones the layout holds.
  useEffect(() => {
    if (!runtime) return;
    for (const part of layout.parts) {
      const device = runtime.devices.get(part.uid);
      if (device) device.opts = part.opts;
    }
  }, [runtime, layout.parts]);

  // The design runs in slices of a few milliseconds between screen frames.
  useEffect(() => {
    if (!runtime || !active || !running) return;
    let frame = 0;
    let last = performance.now();
    let owed = 0;
    let counted = 0;
    let since = last;
    // The design is simulated on every frame, but the bench is redrawn at most 30 times a second.
    let drawn = last;
    const loop = (now: number) => {
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;
      // The real board is the ceiling: a small design must not run faster than it would.
      owed = Math.min(
        owed + (speed === 'max' ? BOARD_CLOCK_HZ : Number(speed)) * elapsed,
        BOARD_CLOCK_HZ / 10,
      );
      const cycles = Math.floor(owed);
      owed -= cycles;
      const done = runtime.advance(cycles, 7);
      counted += done;
      // What the time slice could not fit is dropped: the design simply runs slower.
      if (done < cycles) owed = 0;
      if (now - since > 500) {
        setRate((counted / (now - since)) * 1000);
        counted = 0;
        since = now;
      }
      if (now - drawn >= REDRAW_INTERVAL_MS) {
        drawn = now;
        setTick((value) => value + 1);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [runtime, active, running, speed]);
  const poke = useCallback(() => {
    runtime?.advance(0, 0);
    setTick((value) => value + 1);
  }, [runtime]);

  const act = useCallback(
    (part: string, name: string, value?: unknown) => {
      runtime?.devices.get(part)?.act(name, value);
      // Parts keep their running state in the layout's own option objects.
      saveLayout(projectRef.current, layoutRef.current);
      poke();
    },
    [runtime, poke],
  );

  // What the scene draws: the bench and, from the running design, the lights and controls.
  const live = liveOf(runtime, layout);
  const inputKey = JSON.stringify([...live.inputs]);
  const scenery = useMemo(() => {
    const base = toProject(layout, project.name);
    return {
      ...base,
      parts: base.parts.map((part) => {
        const value = live.inputs.get(part.id)?.value;
        return value === undefined ? part : { ...part, value };
      }),
    };
    // `live.inputs` is a new map each time; its content is what `inputKey` says.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, project.name, inputKey]);

  // Undo and redo work wherever the focus is on this tab, except while typing text or in a window.
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.('input, textarea, select, [contenteditable], [data-dialog]')) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (event.code === 'KeyZ' || event.code === 'KeyY') {
          event.preventDefault();
          if (event.code === 'KeyY' || event.shiftKey) historyRef.current.redo();
          else historyRef.current.undo();
        } else if (event.code === 'KeyD' && selectedRef.current) {
          event.preventDefault();
          duplicate();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedRef.current) return;
        event.preventDefault();
        remove();
      } else if (event.code === 'KeyR') {
        if (!selectedRef.current) return;
        event.preventDefault();
        rotate(!event.shiftKey);
      } else if (event.key === 'Enter') {
        const part = layoutRef.current.parts.find((item) => item.uid === selectedRef.current);
        if (part) setPropertiesOf(part.uid);
      } else if (event.key === 'Escape') {
        setPending('');
        setSelectedId('');
        setPopover('');
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
    // The commands read the bench through refs; they are the same on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Editing. Each command works on the selection as it is when the command runs.
  const edit = () => historyRef.current;
  const rotate = (clockwise: boolean) => {
    const part = edit()
      .get()
      .parts.find((item) => item.uid === selectedRef.current);
    if (part) edit().commit(turnPart(edit().get(), part.uid, clockwise));
  };
  const remove = () => {
    const id = selectedRef.current;
    if (!id) return;
    const isPart = edit()
      .get()
      .parts.some((part) => part.uid === id);
    edit().commit(removeItems(edit().get(), isPart ? [id] : [], isPart ? null : id));
    setSelectedId('');
    scene.current?.focus();
  };
  const duplicate = () => {
    const made = duplicatePart(edit().get(), selectedRef.current);
    if (!made.uid) return;
    edit().commit(made.layout);
    setSelectedId(made.uid);
  };
  const onAdd = useCallback((id: string) => {
    if (!partById.has(id)) return;
    const made = addPart(historyRef.current.get(), id);
    historyRef.current.commit(made.layout);
    setSelectedId(made.uid);
  }, []);
  const onDrop = useCallback(
    (id: string, spot: { x: number; y: number; mount: LabPart['mount'] | null } | null) => {
      if (!partById.has(id)) return;
      if (!spot) return onAdd(id);
      const made = addPartAt(historyRef.current.get(), id, {
        x: spot.x,
        y: spot.y,
        mount: spot.mount ?? null,
      });
      historyRef.current.commit(made.layout);
      setSelectedId(made.uid);
    },
    [onAdd],
  );

  // Wiring: drag from one terminal to another, or click the two of them in turn.
  const connect = (from: string, to: string) => {
    const made = addWire(edit().get(), from, to);
    setPending('');
    if (!made.wire) return;
    edit().commit(made.layout);
    setSelectedId(made.wire.id);
    setPopover(made.wire.id);
    setAssignError('');
  };
  const onTerminal = (id: string) => {
    if (!pending) setPending(id);
    else if (pending === id) setPending('');
    else connect(pending, id);
  };

  // Context menus.
  function openMenu(target: { type: string; id?: string } | null, x: number, y: number) {
    let label = 'Стол';
    let items: MenuItem[];
    if (target?.type === 'part') {
      const part = edit()
        .get()
        .parts.find((item) => item.uid === target.id);
      if (!part) return;
      setSelectedId(part.uid);
      label = part.label || partDef(part).title;
      const wired = edit()
        .get()
        .wires.some(
          (wire) => terminalOwner(wire.from) === part.uid || terminalOwner(wire.to) === part.uid,
        );
      items = [
        { label: 'Свойства…', shortcut: 'Enter', onSelect: () => setPropertiesOf(part.uid) },
        { kind: 'separator' },
        { label: 'Повернуть по часовой', shortcut: 'R', onSelect: () => rotate(true) },
        { label: 'Повернуть против часовой', shortcut: 'Shift+R', onSelect: () => rotate(false) },
        { label: 'Дублировать', shortcut: 'Ctrl+D', onSelect: duplicate },
        {
          label: 'Отключить провода',
          disabled: !wired,
          onSelect: () => edit().commit(disconnectParts(edit().get(), [part.uid])),
        },
        { kind: 'separator' },
        { label: 'Удалить', shortcut: 'Delete', danger: true, onSelect: remove },
      ];
    } else if (target?.type === 'wire') {
      const wire = edit()
        .get()
        .wires.find((item) => item.id === target.id);
      if (!wire) return;
      setSelectedId(wire.id);
      label = 'Провод';
      items = [
        {
          kind: 'colors',
          label: 'Цвет провода',
          value: wire.color,
          colors: wirePalette.map((value, index) => ({ value, label: WIRE_COLOR_NAMES[index] })),
          onSelect: (color) => edit().commit(setWireColor(edit().get(), wire.id, color)),
        },
        { kind: 'separator' },
        { label: 'Удалить', shortcut: 'Delete', danger: true, onSelect: remove },
      ];
    } else {
      items = [
        ...(target?.type === 'board'
          ? ([{ label: 'Открыть в «Выводах»', onSelect: onOpenPins }] as MenuItem[])
          : []),
        { label: 'Показать всё', shortcut: '0', onSelect: () => scene.current?.fit() },
        {
          label: 'Убрать всё со стола',
          danger: true,
          disabled: !edit().get().parts.length,
          onSelect: () => setConfirmClear(true),
        },
      ];
    }
    setMenu({ x, y, label, items });
  }

  const selectedWire = selection.wire
    ? layout.wires.find((wire) => wire.id === selection.wire)
    : undefined;
  const terminal = runtime?.devices.get(BOARD_UART);
  const boardTime = runtime ? runtime.sim.cycle / BOARD_CLOCK_HZ : 0;
  const pendingText = pending
    ? `Выбран вывод ${pending.replace('board:', 'платы ').replace(/^(\w+):/, '$1, ')}. Теперь нажмите второй вывод.`
    : '';

  const selectedFpga = selectedWire ? wireFpga(connections, selectedWire) : undefined;
  // Signals that could go on the pad of the selected wire: right direction, not placed yet.
  const freeSignals = useMemo(() => {
    if (!design || !selectedWire) return [];
    const joined = wirePins(connections, selectedWire)[0];
    const owner = joined && layout.parts.find((part) => part.uid === joined.part);
    const direction = owner
      ? partPins(partDef(owner), owner.opts).find((pin) => pin[0] === joined.pin)?.[2]
      : undefined;
    if (!direction) return [];
    const placed = new Set(
      readCst(project)
        .filter((item) => item.kind === 'IO_LOC')
        .map((item) => item.signal),
    );
    return design.ports
      .filter((port) =>
        direction === 'in' ? port.direction !== 'input' : port.direction !== 'output',
      )
      .flatMap((port) =>
        port.bits.map((_, bit) =>
          port.bits.length === 1 && !port.offset
            ? port.name
            : `${port.name}[${port.offset + (port.upto ? port.bits.length - 1 - bit : bit)}]`,
        ),
      )
      .filter((name) => !placed.has(name));
  }, [design, selectedWire, connections, layout, project]);
  function assign(signal: string, wire: LabWire) {
    const fpga = wireFpga(connections, wire);
    if (!design || !signal || fpga === undefined) return;
    const file = project.files.find((item) => item.name.endsWith('.cst'))?.name;
    if (!file) {
      setAssignError('В проекте нет файла .cst. Создайте его во вкладке «Выводы».');
      return;
    }
    try {
      const signals = design.ports.flatMap((port) =>
        port.bits.map((_, bit) => ({
          name:
            port.bits.length === 1 && !port.offset
              ? port.name
              : `${port.name}[${port.offset + (port.upto ? port.bits.length - 1 - bit : bit)}]`,
          direction: port.direction,
        })),
      );
      onChange(applyPinEdit(project, signals, { signal, pin: fpga, file, pull: 'NONE' }));
      setAssignError('');
    } catch (cause) {
      setAssignError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const propertiesPart = propertiesOf
    ? layout.parts.find((part) => part.uid === propertiesOf)
    : undefined;
  const propertiesWires = useMemo(
    () => connections.wires.filter((wire) => wire.part === propertiesOf),
    [connections, propertiesOf],
  );
  const changeProperties = useCallback(
    (change: { opts?: Record<string, unknown>; label?: string }, key: string) =>
      historyRef.current.commit(
        (value) => setPartProps(value, propertiesOf!, change),
        `${propertiesOf}:${key}`,
      ),
    [propertiesOf],
  );
  const removeFromProperties = useCallback(() => {
    historyRef.current.commit((value) => removeItems(value, [propertiesOf!], null));
    setPropertiesOf(null);
    setSelectedId('');
    setTimeout(() => scene.current?.focus(), 0);
  }, [propertiesOf]);
  const closeProperties = useCallback(() => setPropertiesOf(null), []);

  const showPopover =
    selectedWire &&
    popover === selectedWire.id &&
    runtime &&
    selectedFpga !== undefined &&
    !headerByFpga.get(selectedFpga)?.rail &&
    !runtime.targets.has(selectedFpga);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((value) => (value === text ? '' : value)), 6000);
  }, []);

  return (
    <section className="lab-workspace" aria-label="Лаборатория">
      <header className="lab-toolbar">
        <div className="lab-run" role="group" aria-label="Ход времени">
          <button
            type="button"
            className="button primary"
            disabled={!runtime}
            onClick={() => setRunning((value) => !value)}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? 'Пауза' : 'Пуск'}
          </button>
          <button
            type="button"
            className="button subtle"
            disabled={!runtime || running}
            title="Один такт"
            onClick={() => {
              runtime?.advance(1, Infinity);
              setTick((value) => value + 1);
            }}
          >
            <StepForward size={15} />
            Такт
          </button>
          <button
            type="button"
            className="button subtle"
            disabled={!runtime}
            title="Начать сначала, как после включения питания"
            onClick={() => setRestart((value) => value + 1)}
          >
            <RotateCcw size={15} />
            Сброс
          </button>
        </div>
        <label className="lab-speed">
          Скорость
          <select value={speed} onChange={(event) => setSpeed(event.target.value)}>
            {SPEEDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="lab-tools lab-keys" role="group" aria-label="Кнопки платы">
          {['S1', 'S2'].map((name, pin) => (
            <button
              key={name}
              type="button"
              className="button subtle"
              disabled={!runtime}
              title={`Кнопка ${name} на плате: держите нажатой`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                act(BOARD_BUTTONS, 'set', { pin, on: true });
              }}
              onPointerUp={() => act(BOARD_BUTTONS, 'set', { pin, on: false })}
              onPointerCancel={() => act(BOARD_BUTTONS, 'set', { pin, on: false })}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="lab-tools" role="group" aria-label="Правка стола">
          <button
            type="button"
            className="icon-button"
            aria-label="Отменить"
            title="Отменить (Ctrl+Z)"
            disabled={!history.canUndo}
            onClick={history.undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Повторить"
            title="Повторить (Ctrl+Shift+Z)"
            disabled={!history.canRedo}
            onClick={history.redo}
          >
            <Redo2 size={17} />
          </button>
          <button
            type="button"
            className="button subtle"
            title="Показать весь стол (клавиша 0)"
            onClick={() => scene.current?.fit()}
          >
            <Maximize2 size={15} />
            Показать всё
          </button>
        </div>
        <div className="lab-clock">
          <p
            className="lab-status"
            role="status"
            title={
              runtime && running
                ? `Схема считается на ${formatRate(rate)}. Настоящая плата делает ${Math.round(BOARD_CLOCK_HZ / 1e6)} млн тактов в секунду: браузер столько не успевает, поэтому время на плате идёт медленнее часов.`
                : undefined
            }
          >
            {loading && !runtime ? (
              'Готовим схему…'
            ) : runtime ? (
              <>
                {!runtime.hasClock && 'Такта на выводе 4 нет · '}
                {!running && 'Пауза · '}
                Время на плате:{' '}
                <b>
                  {boardTime >= 1
                    ? `${boardTime.toFixed(2).replace('.', ',')} с`
                    : `${(boardTime * 1000).toFixed(0)} мс`}
                </b>
              </>
            ) : null}
          </p>
          <button
            type="button"
            className="icon-button"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            onClick={() => setMuted((value) => !value)}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </header>
      {(problem || runtimeError) && (
        <div className="lab-problem" role="alert">
          <strong>Схема не запущена.</strong> {problem?.error ?? runtimeError}
          {problem?.diagnostics
            .filter((item) => item.severity === 'error' && item.message !== problem.error)
            .slice(0, 3)
            .map((item, index) => (
              <span key={index}>
                {item.file ? `${item.file}:${item.line}: ` : ''}
                {item.message}
              </span>
            ))}
        </div>
      )}
      {(pending || notice) && (
        <div className="lab-pending" role="status">
          {pending ? pendingText : notice}
          <button
            type="button"
            className="lab-mini"
            onClick={() => (pending ? setPending('') : setNotice(''))}
          >
            {pending ? 'Отмена' : 'Закрыть'}
          </button>
        </div>
      )}
      <div className="lab-columns">
        <Library onAdd={onAdd} />
        <LabScene
          handle={scene}
          project={scenery}
          frame={live.frame}
          solution={live.solution}
          boardLeds={live.boardLeds}
          boardKeys={live.boardKeys}
          selected={selectedId}
          pending={pending}
          select={(id) => {
            setSelectedId(id);
            setAssignError('');
            if (!id) setPopover('');
          }}
          terminal={onTerminal}
          connect={connect}
          replug={(wire, end, to) => edit().commit(replugWire(edit().get(), wire, end, to))}
          move={(id, x, y, mount) => {
            edit().commit(movePart(edit().get(), id, x, y, mount));
            setSelectedId(id);
          }}
          context={(info) => openMenu(info.target, info.x, info.y)}
          value={(id, value, index) => {
            const part = layoutRef.current.parts.find((item) => item.uid === id);
            const device = runtime?.devices.get(id);
            if (!part || !device) return;
            for (const [name, argument] of actionFor(part, device, value, index))
              device.act(name, argument);
            saveLayout(projectRef.current, layoutRef.current);
            poke();
          }}
          cancel={() => setPending('')}
          notice={showNotice}
          boardKey={(id, down) => act(BOARD_BUTTONS, 'set', { pin: id === 'S1' ? 0 : 1, on: down })}
          drop={onDrop}
        >
          {layout.parts.every((part) => partDef(part).kind === 'breadboard') && (
            <p className="lab-empty">
              Плата стоит на макетке, как на настоящем столе: её контакты выведены в отверстия, а
              кнопки S1, S2 и шесть светодиодов уже работают. Добавьте деталь из списка слева: она
              встанет на макетку правее платы. Соедините плюс (VCC) с 3V3, минус (GND) с GND, а
              сигналы с нужными контактами платы.
            </p>
          )}
          {showPopover && (
            <AssignPopover
              fpga={selectedFpga}
              signals={freeSignals}
              label="Сигнал для контакта"
              empty="В схеме нет подходящих свободных сигналов. Добавьте порт в верхний модуль."
              error={assignError}
              onAssign={(signal) => assign(signal, selectedWire)}
              onClose={() => setPopover('')}
            />
          )}
        </LabScene>
        <SidePanel
          layout={layout}
          connections={connections}
          selection={selection}
          runtime={runtime}
          freeSignals={freeSignals}
          assignError={assignError}
          terminal={terminal}
          actTerminal={(name, value) => act(BOARD_UART, name, value)}
          onAssign={assign}
          onOpenPins={onOpenPins}
          onOpenProperties={setPropertiesOf}
          onRotate={() => rotate(true)}
          onRemove={remove}
          onClear={() => setConfirmClear(true)}
          partDef={partDef}
        />
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={menu.label}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
      {propertiesPart && (
        <PartProperties
          part={propertiesPart}
          def={partDef(propertiesPart)}
          wires={propertiesWires}
          targets={runtime?.targets}
          onChange={changeProperties}
          onRemove={removeFromProperties}
          onClose={closeProperties}
        />
      )}
      {confirmClear && (
        <Dialog
          title="Убрать всё со стола?"
          className="dialog lab-confirm"
          onClose={() => setConfirmClear(false)}
        >
          <p>
            Со стола исчезнут все детали и провода ({layout.parts.length} деталей,{' '}
            {layout.wires.length} проводов). Это можно отменить кнопкой «Отменить».
          </p>
          <div className="dialog-actions">
            <button type="button" className="button subtle" onClick={() => setConfirmClear(false)}>
              Отмена
            </button>
            <button
              type="button"
              className="button stop"
              onClick={() => {
                history.commit(defaultBench());
                setSelectedId('');
                setConfirmClear(false);
              }}
            >
              Убрать всё
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
