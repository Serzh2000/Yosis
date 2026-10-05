import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
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
import {
  BENCH,
  WIRE_COLORS,
  WIRE_COLOR_NAMES,
  headerByFpga,
  type Point,
} from '../../lib/lab/bench';
import { behaviourKey, partById, partPins, type PartDef } from '../../lib/lab/catalog';
import { BOARD_CLOCK_HZ } from '../../lib/lab/devices';
import {
  PASTE_OFFSET,
  addPart,
  connectWire,
  disconnectPad,
  disconnectParts,
  nudgeParts,
  pasteParts,
  removeItems,
  rotateParts,
  setPartProps,
  setAutoPower,
  setWireBends,
  setWireColor,
} from '../../lib/lab/layout-ops';
import {
  BOARD_UART,
  LabRuntime,
  loadLayout,
  saveLayout,
  type LabPart,
  type LabWire,
} from '../../lib/lab/runtime';
import { AssignPopover } from './AssignForm';
import { Bench, type BenchCommands, type MenuTarget, type Pending } from './Bench';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { Library } from './Library';
import { PartProperties } from './PartProperties';
import { SidePanel } from './SidePanel';
import { NOTHING, type Selection } from './useBenchGestures';
import { useLabHistory } from './useLabHistory';
import { Dialog } from '../Dialog';
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
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
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
  const [pending, setPending] = useState<Pending>(null);
  const [selection, setSelection] = useState<Selection>(NOTHING);
  const [assignError, setAssignError] = useState('');
  const [restart, setRestart] = useState(0);
  const [fit, setFit] = useState(1);
  const [propertiesOf, setPropertiesOf] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ at: Point; label: string; items: MenuItem[] } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [popover, setPopover] = useState<{ wire: string; at: Point } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const clipboard = useRef<{ parts: LabPart[]; pasted: number }>({ parts: [], pasted: 0 });
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
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const zoom = layout.zoom ?? fit;

  // A different project brings its own bench.
  const projectKey = project.id ?? project.name;
  const loadedFor = useRef(projectKey);
  useEffect(() => {
    if (loadedFor.current === projectKey) return;
    loadedFor.current = projectKey;
    historyRef.current.reset(loadLayout(projectRef.current));
    setSelection(NOTHING);
    setPending(null);
    setPropertiesOf(null);
    setPopover(null);
  }, [projectKey]);

  // Undo, a deleted part or a new project can leave the selection pointing at nothing.
  useEffect(() => {
    const exists = new Set(layout.parts.map((part) => part.uid));
    setSelection((value) => {
      const parts = value.parts.filter((id) => exists.has(id));
      const wire =
        value.wire && layout.wires.some((item) => item.id === value.wire) ? value.wire : null;
      return parts.length === value.parts.length && wire === value.wire ? value : { parts, wire };
    });
    setPropertiesOf((value) => (value && exists.has(value) ? value : null));
    setPending((value) => (value && 'part' in value && !exists.has(value.part) ? null : value));
  }, [layout.parts, layout.wires]);

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
        layout.parts.map((part) => [part.uid, part.def, behaviourKey(partDef(part), part.opts)]),
        layout.wires.map((wire) => [wire.id, wire.part, wire.pin, wire.fpga]),
        layout.autoPower !== false,
      ]),
    [layout],
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
      setTick((value) => value + 1);
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

  // Until the user zooms, the whole bench is fitted into the panel.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0)
        setFit(
          Math.max(
            MIN_ZOOM,
            Math.min(1, element.clientWidth / BENCH.w, element.clientHeight / BENCH.h),
          ),
        );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const zoomAnchor = useRef<{ bench: Point; client: Point } | null>(null);
  const zoomAbout = useCallback(
    (next: number, client: Point) => {
      const box = viewport.current?.querySelector('.lab-bench')?.getBoundingClientRect();
      const current = layoutRef.current.zoom ?? fit;
      if (box)
        zoomAnchor.current = {
          bench: { x: (client.x - box.left) / current, y: (client.y - box.top) / current },
          client,
        };
      historyRef.current.silent({
        zoom: Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)) * 1000) / 1000,
      });
    },
    [fit],
  );
  useLayoutEffect(() => {
    const at = zoomAnchor.current;
    zoomAnchor.current = null;
    const element = viewport.current;
    const box = element?.querySelector('.lab-bench')?.getBoundingClientRect();
    if (!at || !element || !box) return;
    // Keep the point under the cursor where it was.
    element.scrollLeft += box.left + at.bench.x * zoom - at.client.x;
    element.scrollTop += box.top + at.bench.y * zoom - at.client.y;
  }, [zoom]);
  const zoomCentered = (factor: number) => {
    const box = viewport.current?.getBoundingClientRect();
    if (box) zoomAbout(zoom * factor, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
  };
  const showAll = useCallback(() => {
    historyRef.current.silent({ zoom: undefined });
    viewport.current?.scrollTo(0, 0);
  }, []);

  // Undo and redo work wherever the focus is on this tab, except while typing text or in a window.
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as Element | null;
      if (target?.closest?.('input, textarea, select, [contenteditable], [data-dialog]')) return;
      if (event.code === 'KeyZ' || event.code === 'KeyY') {
        event.preventDefault();
        if (event.code === 'KeyY' || event.shiftKey) historyRef.current.redo();
        else historyRef.current.undo();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [active]);

  // Editing. Each command works on the selection as it is when the command runs.
  const edit = () => historyRef.current;
  const chosen = () => selectionRef.current.parts;
  const rotate = (clockwise: boolean) => {
    if (chosen().length) edit().commit(rotateParts(edit().get(), chosen(), clockwise));
  };
  const remove = () => {
    const { parts, wire } = selectionRef.current;
    if (!parts.length && !wire) return;
    edit().commit(removeItems(edit().get(), parts, wire));
    setSelection(NOTHING);
    // The part that had the focus is gone; keys must still reach the bench.
    viewport.current?.focus({ preventScroll: true });
  };
  const copy = () => {
    const parts = edit()
      .get()
      .parts.filter((part) => chosen().includes(part.uid));
    if (parts.length) clipboard.current = { parts: structuredClone(parts), pasted: 0 };
  };
  const paste = () => {
    const board = clipboard.current;
    if (!board.parts.length) return;
    board.pasted += 1;
    const made = pasteParts(edit().get(), board.parts, PASTE_OFFSET * board.pasted);
    edit().commit(made.layout);
    setSelection({ parts: made.uids, wire: null });
  };
  const duplicate = () => {
    const parts = edit()
      .get()
      .parts.filter((part) => chosen().includes(part.uid));
    if (!parts.length) return;
    const made = pasteParts(edit().get(), parts, PASTE_OFFSET);
    edit().commit(made.layout);
    setSelection({ parts: made.uids, wire: null });
  };
  const commands: BenchCommands = {
    rotate,
    remove,
    duplicate,
    copy,
    paste,
    undo: () => edit().undo(),
    redo: () => edit().redo(),
    selectAll: () =>
      setSelection({
        parts: edit()
          .get()
          .parts.map((part) => part.uid),
        wire: null,
      }),
    nudge: (dx, dy) => {
      if (chosen().length) edit().commit(nudgeParts(edit().get(), chosen(), dx, dy), 'nudge');
    },
    openProperties: setPropertiesOf,
    fit: showAll,
  };
  const onAdd = useCallback((id: string, at?: Point) => {
    if (!partById.has(id)) return;
    const made = addPart(historyRef.current.get(), id, at);
    historyRef.current.commit(made.layout);
    setSelection({ parts: [made.uid], wire: null });
  }, []);

  // Wiring by clicks: first the pin or the pad, then the other.
  function onConnected(wireId: string, at: Point) {
    setSelection({ parts: [], wire: wireId });
    setPending(null);
    setPopover({ wire: wireId, at });
    setAssignError('');
  }
  function connectByClicks(part: string, pin: string, fpga: number) {
    const made = connectWire(edit().get(), { part, pin, fpga });
    edit().commit(made.layout);
    const pad = headerByFpga.get(fpga)!;
    onConnected(made.wire.id, { x: pad.x, y: pad.y });
  }
  const pickPin = (part: string, pin: string) => {
    if (pending && 'fpga' in pending) connectByClicks(part, pin, pending.fpga);
    else setPending({ part, pin });
  };
  const pickPad = (fpga: number) => {
    if (pending && 'part' in pending) connectByClicks(pending.part, pending.pin, fpga);
    else setPending({ fpga });
  };

  // Context menus.
  function openMenu(target: MenuTarget, at: Point) {
    const wireCount = (uid: string) =>
      edit()
        .get()
        .wires.filter((wire) => wire.part === uid).length;
    let label = 'Стол';
    let items: MenuItem[];
    if (target.kind === 'part') {
      const ids = chosen().includes(target.uid) ? chosen() : [target.uid];
      const part = edit()
        .get()
        .parts.find((item) => item.uid === target.uid);
      label = part ? part.label || partDef(part).title : 'Деталь';
      items = [
        ...(ids.length === 1
          ? ([
              {
                label: 'Свойства…',
                shortcut: 'Enter',
                onSelect: () => setPropertiesOf(target.uid),
              },
              { kind: 'separator' },
            ] as MenuItem[])
          : []),
        { label: 'Повернуть по часовой', shortcut: 'R', onSelect: () => rotate(true) },
        { label: 'Повернуть против часовой', shortcut: 'Shift+R', onSelect: () => rotate(false) },
        { label: 'Дублировать', shortcut: 'Ctrl+D', onSelect: duplicate },
        { label: 'Копировать', shortcut: 'Ctrl+C', onSelect: copy },
        {
          label: 'Отключить провода',
          disabled: !ids.some((id) => wireCount(id)),
          onSelect: () => edit().commit(disconnectParts(edit().get(), ids)),
        },
        { kind: 'separator' },
        {
          label: ids.length > 1 ? 'Удалить выбранные' : 'Удалить',
          shortcut: 'Delete',
          danger: true,
          onSelect: remove,
        },
      ];
    } else if (target.kind === 'wire') {
      const wire = edit()
        .get()
        .wires.find((item) => item.id === target.id);
      label = 'Провод';
      items = [
        {
          kind: 'colors',
          label: 'Цвет провода',
          value: wire?.color,
          colors: WIRE_COLORS.map((value, index) => ({ value, label: WIRE_COLOR_NAMES[index] })),
          onSelect: (color) => edit().commit(setWireColor(edit().get(), target.id, color)),
        },
        {
          label: 'Убрать изгибы',
          disabled: !wire?.bends?.length,
          onSelect: () => edit().commit(setWireBends(edit().get(), target.id, [])),
        },
        { kind: 'separator' },
        { label: 'Удалить', shortcut: 'Delete', danger: true, onSelect: remove },
      ];
    } else if (target.kind === 'pad') {
      label = `Контакт платы ${target.fpga}`;
      items = [
        {
          label: 'Отключить провода от контакта',
          disabled: !edit()
            .get()
            .wires.some((wire) => wire.fpga === target.fpga),
          onSelect: () => edit().commit(disconnectPad(edit().get(), target.fpga)),
        },
        { label: 'Открыть в «Выводах»', onSelect: onOpenPins },
      ];
    } else {
      items = [
        ...(clipboard.current.parts.length
          ? ([{ label: 'Вставить', shortcut: 'Ctrl+V', onSelect: paste }] as MenuItem[])
          : []),
        { label: 'Показать всё', shortcut: '0', onSelect: showAll },
        {
          label: 'Убрать всё со стола',
          danger: true,
          disabled: !edit().get().parts.length,
          onSelect: () => setConfirmClear(true),
        },
      ];
    }
    setMenu({ at, label, items });
  }

  const selectedWire = selection.wire
    ? layout.wires.find((wire) => wire.id === selection.wire)
    : undefined;
  const terminal = runtime?.devices.get(BOARD_UART);
  const boardTime = runtime ? runtime.sim.cycle / BOARD_CLOCK_HZ : 0;
  const pendingText = !pending
    ? ''
    : 'fpga' in pending
      ? `Выбран контакт платы ${pending.fpga}. Теперь нажмите вывод детали.`
      : (() => {
          const part = layout.parts.find((item) => item.uid === pending.part);
          return `Выбран вывод ${pending.pin} детали «${part ? part.label || partDef(part).title : ''}». Теперь нажмите контакт на гребёнке платы.`;
        })();

  // Signals that could go on the pad of the selected wire: right direction, not placed yet.
  const freeSignals = useMemo(() => {
    if (!design || !selectedWire) return [];
    const owner = layout.parts.find((part) => part.uid === selectedWire.part);
    const direction = owner
      ? partPins(partDef(owner), owner.opts).find((pin) => pin[0] === selectedWire.pin)?.[2]
      : undefined;
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
  }, [design, selectedWire, layout.parts, project]);
  function assign(signal: string, wire: LabWire) {
    if (!design || !signal) return;
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
      onChange(applyPinEdit(project, signals, { signal, pin: wire.fpga, file, pull: 'NONE' }));
      setAssignError('');
    } catch (cause) {
      setAssignError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const propertiesPart = propertiesOf
    ? layout.parts.find((part) => part.uid === propertiesOf)
    : undefined;
  const propertiesWires = useMemo(
    () => layout.wires.filter((wire) => wire.part === propertiesOf),
    [layout.wires, propertiesOf],
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
    setSelection(NOTHING);
    setTimeout(() => viewport.current?.focus({ preventScroll: true }), 0);
  }, [propertiesOf]);
  const closeProperties = useCallback(() => setPropertiesOf(null), []);

  const popoverWire = popover ? layout.wires.find((wire) => wire.id === popover.wire) : undefined;
  const showPopover =
    popover &&
    popoverWire &&
    runtime &&
    selection.wire === popover.wire &&
    !runtime.targets.has(popoverWire.fpga);

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
        <label
          className="lab-pull"
          title="Пока флажок стоит, детали питаются сами. Снимите его — у каждой детали появятся выводы VCC и GND: их нужно соединить с контактами 3V3 (или 5V) и GND платы, иначе деталь не работает."
        >
          <input
            type="checkbox"
            checked={layout.autoPower !== false}
            onChange={(event) => history.commit(setAutoPower(history.get(), event.target.checked))}
          />
          Автопитание деталей
        </label>
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
        </div>
        <div className="lab-tools" role="group" aria-label="Масштаб стола">
          <button
            type="button"
            className="icon-button"
            aria-label="Уменьшить"
            title="Уменьшить (Ctrl+колесо вниз)"
            onClick={() => zoomCentered(1 / 1.2)}
          >
            <Minus size={17} />
          </button>
          <span className="lab-zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Увеличить"
            title="Увеличить (Ctrl+колесо вверх)"
            onClick={() => zoomCentered(1.2)}
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            className="button subtle"
            title="Показать весь стол (клавиша 0)"
            onClick={showAll}
          >
            <Maximize2 size={15} />
            Показать всё
          </button>
        </div>
        <p className="lab-status" role="status">
          {loading && !runtime
            ? 'Готовим схему…'
            : runtime
              ? `${runtime.hasClock ? '' : 'Такта на выводе 4 нет · '}${
                  running ? formatRate(rate) : 'пауза'
                } · на плате прошло ${
                  boardTime >= 1
                    ? `${boardTime.toFixed(2).replace('.', ',')} с`
                    : `${(boardTime * 1000).toFixed(2).replace('.', ',')} мс`
                }`
              : ''}
          {runtime && running && speed === 'max' && rate > 0 && (
            <small>
              {' '}
              ·{' '}
              {rate > BOARD_CLOCK_HZ * 0.9
                ? 'со скоростью настоящей платы'
                : `в ${Math.round(BOARD_CLOCK_HZ / rate)} раз медленнее настоящей платы`}
            </small>
          )}
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
      {pending && (
        <div className="lab-pending" role="status">
          {pendingText}
          <button type="button" className="lab-mini" onClick={() => setPending(null)}>
            Отмена
          </button>
        </div>
      )}
      <div className="lab-columns">
        <Library onAdd={onAdd} />
        <Bench
          history={history}
          runtime={runtime}
          top={project.top}
          zoom={zoom}
          onZoomAbout={zoomAbout}
          selection={selection}
          onSelect={(next) => {
            setSelection(next);
            if (next.wire !== selection.wire) setAssignError('');
          }}
          onDropPart={onAdd}
          onRemoveBend={(id, index) =>
            edit().commit((current) =>
              setWireBends(
                current,
                id,
                (current.wires.find((wire) => wire.id === id)?.bends ?? []).filter(
                  (_, at) => at !== index,
                ),
              ),
            )
          }
          pending={pending}
          onCancelPending={() => setPending(null)}
          onPickPin={pickPin}
          onPickPad={pickPad}
          muted={muted || !running || !active}
          act={act}
          commands={commands}
          onMenu={openMenu}
          onConnected={onConnected}
          viewport={viewport}
          overlay={
            <>
              {!layout.parts.length && (
                <p className="lab-empty">
                  Кнопки S1, S2 и шесть светодиодов платы уже работают. Добавьте деталь из списка
                  слева, затем нажмите её вывод и контакт на гребёнке платы — или потяните от вывода
                  к контакту — и появится провод.
                </p>
              )}
              {showPopover && (
                <AssignPopover
                  fpga={popoverWire.fpga}
                  at={popover.at}
                  zoom={zoom}
                  signals={freeSignals}
                  label="Сигнал для контакта"
                  empty="В схеме нет подходящих свободных сигналов. Добавьте порт в верхний модуль."
                  error={assignError}
                  onAssign={(signal) => assign(signal, popoverWire)}
                  onClose={() => setPopover(null)}
                />
              )}
            </>
          }
        />
        <SidePanel
          layout={layout}
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
          x={menu.at.x}
          y={menu.at.y}
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
                history.commit({ parts: [], wires: [], zoom: layout.zoom });
                setSelection(NOTHING);
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
