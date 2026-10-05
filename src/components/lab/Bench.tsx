import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  BENCH,
  GRID,
  HEADER,
  EXIT,
  bendIndex,
  partBox,
  pinPoint,
  rubberPath,
  routeWires,
  wireColor,
  type Point,
  type WireEnds,
} from '../../lib/lab/bench';
import { partById, partPins } from '../../lib/lab/catalog';
import { PART_DRAG_TYPE } from './Library';
import { BOARD_BUTTONS, BOARD_LEDS, type LabRuntime } from '../../lib/lab/runtime';
import { BoardView } from './BoardView';
import { PartShell, type PartHandlers } from './PartShell';
import { NOTHING, useBenchGestures, type Selection } from './useBenchGestures';
import type { useLabHistory } from './useLabHistory';

export type Pending = { part: string; pin: string } | { fpga: number } | null;
export type MenuTarget =
  | { kind: 'part'; uid: string }
  | { kind: 'wire'; id: string }
  | { kind: 'pad'; fpga: number }
  | { kind: 'bench' };

/** What the keyboard can ask of the bench; the panel decides what each does. */
export interface BenchCommands {
  rotate: (clockwise: boolean) => void;
  remove: () => void;
  duplicate: () => void;
  copy: () => void;
  paste: () => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  nudge: (dx: number, dy: number) => void;
  openProperties: (uid: string) => void;
  fit: () => void;
}

interface Props {
  history: ReturnType<typeof useLabHistory>;
  runtime: LabRuntime | null;
  top: string;
  zoom: number;
  /** Zoom so that the screen point stays where it is on the bench. */
  onZoomAbout: (zoom: number, client: Point) => void;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onRemoveBend: (wire: string, index: number) => void;
  /** A card from the library was dropped at this point of the bench. */
  onDropPart: (def: string, at: Point) => void;
  pending: Pending;
  /** Escape cancels a half-made wire. */
  onCancelPending: () => void;
  /** A pin or a pad was clicked (not dragged): the click-then-click way to wire. */
  onPickPin: (part: string, pin: string) => void;
  onPickPad: (fpga: number) => void;
  muted: boolean;
  act: (uid: string, name: string, value?: unknown) => void;
  commands: BenchCommands;
  onMenu: (target: MenuTarget, at: Point) => void;
  /** A wire was made; `at` is where it ended, in bench coordinates. */
  onConnected: (wireId: string, at: Point) => void;
  viewport: RefObject<HTMLDivElement | null>;
  /** Drawn inside the bench, in bench coordinates. */
  overlay?: ReactNode;
}

/** The bench: board, parts, wires and header pads, with moving, selecting and wiring by pointer. */
export function Bench({
  history,
  runtime,
  top,
  zoom,
  onZoomAbout,
  selection,
  onSelect,
  onRemoveBend,
  onDropPart,
  pending,
  onCancelPending,
  onPickPin,
  onPickPad,
  muted,
  act,
  commands,
  onMenu,
  onConnected,
  viewport,
  overlay,
}: Props) {
  const layout = history.layout;
  const bench = useRef<HTMLDivElement>(null);
  const space = useRef(false);
  const [hoverWire, setHoverWire] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const gestures = useBenchGestures({
    history,
    runtime,
    zoom,
    selection,
    onSelect,
    onConnected,
    viewport,
    bench,
    space,
  });
  const { rubber, marquee } = gestures;

  // Ctrl+wheel (and a trackpad pinch, which arrives the same way) zooms about the cursor.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0015));
      onZoomAbout(zoomRef.current * factor, { x: event.clientX, y: event.clientY });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [viewport, onZoomAbout]);

  // Wires and what they connect to.
  const partOf = (uid: string) => layout.parts.find((part) => part.uid === uid);
  const wireEnds: WireEnds[] = layout.wires.flatMap((wire) => {
    const part = partOf(wire.part);
    const def = part && partById.get(part.def);
    const to = HEADER.find((pad) => pad.fpga === wire.fpga);
    const pin = def ? partPins(def, part.opts).findIndex((item) => item[0] === wire.pin) : -1;
    return part && def && to && pin >= 0 && wire.id !== rubber?.replug
      ? [
          {
            wire,
            from: pinPoint(part, def, pin),
            exit: EXIT[part.rot],
            rect: partBox(part, def),
            to,
          },
        ]
      : [];
  });
  const routes = routeWires(wireEnds);
  const wiredPads = new Set(layout.wires.map((wire) => wire.fpga));
  const wiredPins = new Map<string, Set<string>>();
  for (const wire of layout.wires)
    wiredPins.set(wire.part, (wiredPins.get(wire.part) ?? new Set()).add(wire.pin));
  const lit = layout.wires.find((wire) => wire.id === hoverWire);

  const handlers: PartHandlers = {
    onPress: (event, uid) => gestures.startPartDrag(event, uid),
    onOpen: commands.openProperties,
    onSelect: (uid) => {
      if (selection.parts.length !== 1 || selection.parts[0] !== uid)
        onSelect({ parts: [uid], wire: null });
    },
    onPinDown: (event, part, pin) => gestures.startWire(event, { kind: 'pin', part, pin }),
    onPinClick: (part, pin) => {
      if (!gestures.consumeClick()) onPickPin(part, pin);
    },
    onPinHover: (part, pin) =>
      setHoverWire(
        pin
          ? (layout.wires.find((wire) => wire.part === part && wire.pin === pin)?.id ?? null)
          : null,
      ),
    act,
  };

  function menuAt(target: MenuTarget, event: { clientX: number; clientY: number }) {
    onMenu(target, { x: event.clientX, y: event.clientY });
  }
  function openMenuForSelection() {
    const uid = selection.parts[0];
    const element = uid
      ? viewport.current?.querySelector(`[data-part="${uid}"].lab-part`)
      : selection.wire
        ? viewport.current?.querySelector(`[data-wire="${selection.wire}"]`)
        : null;
    const box = element?.getBoundingClientRect() ?? viewport.current?.getBoundingClientRect();
    if (!box) return;
    const at = {
      clientX: box.left + Math.min(box.width / 2, 120),
      clientY: box.top + Math.min(box.height / 2, 60),
    };
    if (uid) menuAt({ kind: 'part', uid }, at);
    else if (selection.wire) menuAt({ kind: 'wire', id: selection.wire }, at);
    else menuAt({ kind: 'bench' }, at);
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as Element;
    if (target.closest('input, select, textarea')) return;
    const mod = event.ctrlKey || event.metaKey;
    // Letters are matched by physical key so that they work in the Russian layout too.
    const code = event.code;
    const key = event.key;
    const handled = () => event.preventDefault();
    // Undo and redo are handled for the whole tab by the panel.
    if (mod && code === 'KeyC') {
      handled();
      commands.copy();
    } else if (mod && code === 'KeyV') {
      handled();
      commands.paste();
    } else if (mod && code === 'KeyD') {
      handled();
      commands.duplicate();
    } else if (mod && code === 'KeyA') {
      handled();
      commands.selectAll();
    } else if (mod) {
      return;
    } else if (key === 'Delete' || key === 'Backspace') {
      handled();
      commands.remove();
    } else if (code === 'KeyR') {
      handled();
      commands.rotate(!event.shiftKey);
    } else if (key.startsWith('Arrow') && selection.parts.length) {
      handled();
      const step = GRID * (event.shiftKey ? 5 : 1);
      commands.nudge(
        key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0,
        key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0,
      );
    } else if (key === 'Enter' && selection.parts.length === 1 && target.matches('.lab-part')) {
      handled();
      commands.openProperties(selection.parts[0]);
    } else if (code === 'Digit0' || code === 'Numpad0') {
      handled();
      commands.fit();
    } else if (key === '+' || key === '=' || key === '-') {
      handled();
      const box = viewport.current?.getBoundingClientRect();
      if (box)
        onZoomAbout(zoom * (key === '-' ? 1 / 1.2 : 1.2), {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        });
    } else if (key === 'Escape') {
      onCancelPending();
      onSelect(NOTHING);
    } else if (key === 'ContextMenu' || (key === 'F10' && event.shiftKey)) {
      handled();
      openMenuForSelection();
    } else if (key === ' ' && !target.closest('button, input, select')) {
      handled();
      space.current = true;
      setSpaceDown(true);
    }
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault();
    const target = event.target as Element;
    const pad = target.closest('.lab-hpin[data-fpga]');
    const wire = target.closest('[data-wire]');
    const part = target.closest('.lab-part');
    if (pad && !pad.classList.contains('power'))
      menuAt({ kind: 'pad', fpga: Number(pad.getAttribute('data-fpga')) }, event);
    else if (wire) {
      const id = wire.getAttribute('data-wire')!;
      onSelect({ parts: [], wire: id });
      menuAt({ kind: 'wire', id }, event);
    } else if (part) {
      const uid = part.getAttribute('data-part')!;
      if (!selection.parts.includes(uid)) onSelect({ parts: [uid], wire: null });
      menuAt({ kind: 'part', uid }, event);
    } else menuAt({ kind: 'bench' }, event);
  }

  const status = (fpga: number | null) => gestures.statusOfPad(fpga);
  return (
    <div
      className={`lab-viewport ${gestures.panning || spaceDown ? 'pan' : ''}`}
      ref={viewport}
      tabIndex={0}
      aria-label="Стол"
      onKeyDown={onKeyDown}
      onPointerDown={gestures.onBenchDown}
      onContextMenu={onContextMenu}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(PART_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        const def = event.dataTransfer.getData(PART_DRAG_TYPE);
        if (!def) return;
        event.preventDefault();
        onDropPart(def, gestures.toBench(event.clientX, event.clientY));
        viewport.current?.focus({ preventScroll: true });
      }}
      onKeyUp={(event) => {
        if (event.key !== ' ') return;
        space.current = false;
        setSpaceDown(false);
      }}
      onBlur={() => {
        space.current = false;
        setSpaceDown(false);
      }}
    >
      <div className="lab-scaler" style={{ width: BENCH.w * zoom, height: BENCH.h * zoom }}>
        <div
          ref={bench}
          className={`lab-bench ${pending ? 'wiring' : ''} ${rubber ? 'dragging-wire' : ''}`}
          style={{ width: BENCH.w, height: BENCH.h, transform: `scale(${zoom})` }}
        >
          <BoardView
            top={top}
            leds={(runtime?.devices.get(BOARD_LEDS)?.view.b as number[] | undefined) ?? []}
            pressed={(runtime?.devices.get(BOARD_BUTTONS)?.view.on as boolean[] | undefined) ?? []}
            onButton={(pin, on) => act(BOARD_BUTTONS, 'set', { pin, on })}
          />
          <svg className="lab-wires" width={BENCH.w} height={BENCH.h} aria-hidden="true">
            {wireEnds.map((end) => {
              const { wire, from, to } = end;
              const state = runtime?.wireState(wire.id) ?? 'ok';
              const chosen = selection.wire === wire.id;
              return (
                <g
                  key={wire.id}
                  data-wire={wire.id}
                  className={`lab-wire state-${state} ${chosen ? 'selected' : ''} ${
                    hoverWire === wire.id ? 'lit' : ''
                  }`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    onSelect({ parts: [], wire: wire.id });
                    viewport.current?.focus({ preventScroll: true });
                    // Dragging the wire itself pulls a bend out of it at that point.
                    const point = gestures.toBench(event.clientX, event.clientY);
                    gestures.startBend(event, wire.id, bendIndex(end, point), true);
                  }}
                  onPointerEnter={() => setHoverWire(wire.id)}
                  onPointerLeave={() => setHoverWire(null)}
                >
                  <path d={routes.get(wire.id)} className="lab-wire-hit" />
                  <path d={routes.get(wire.id)} className="lab-wire-skin" />
                  <path d={routes.get(wire.id)} style={{ stroke: wireColor(wire) }} />
                  {(chosen || hoverWire === wire.id) && (
                    <>
                      <circle className="lab-wire-end" cx={from.x} cy={from.y} r={chosen ? 7 : 5} />
                      <circle className="lab-wire-end" cx={to.x} cy={to.y} r={chosen ? 7 : 5} />
                    </>
                  )}
                  {(chosen || hoverWire === wire.id) &&
                    wire.bends?.map((bend, index) => (
                      <circle
                        key={index}
                        className="lab-wire-bend"
                        cx={bend.x}
                        cy={bend.y}
                        r={chosen ? 6 : 4.5}
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          event.stopPropagation();
                          onSelect({ parts: [], wire: wire.id });
                          gestures.startBend(event, wire.id, index, false);
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          onRemoveBend(wire.id, index);
                        }}
                      >
                        <title>Потяните, чтобы сдвинуть изгиб. Двойной щелчок убирает его.</title>
                      </circle>
                    ))}
                  {chosen && (
                    <>
                      <circle
                        className="lab-wire-handle"
                        cx={from.x}
                        cy={from.y}
                        r={9}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          gestures.startWire(event, { kind: 'pad', fpga: wire.fpga }, wire.id);
                        }}
                      >
                        <title>
                          Потяните, чтобы переставить конец провода на другой вывод детали
                        </title>
                      </circle>
                      <circle
                        className="lab-wire-handle"
                        cx={to.x}
                        cy={to.y}
                        r={9}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          gestures.startWire(
                            event,
                            { kind: 'pin', part: wire.part, pin: wire.pin },
                            wire.id,
                          );
                        }}
                      >
                        <title>
                          Потяните, чтобы переставить конец провода на другой контакт платы
                        </title>
                      </circle>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          {HEADER.map((pad) => {
            const target = pad.rail ? undefined : runtime?.targets.get(pad.fpga);
            const state = status(pad.fpga);
            const power = !!pad.rail;
            // Supply pads take wires only when parts have supply pins to wire.
            const closed = power && layout.autoPower !== false;
            return (
              <button
                key={`${pad.row}${pad.index}`}
                type="button"
                data-target="pad"
                data-fpga={pad.fpga}
                className={`lab-hpin row-${pad.row} ${power ? 'power' : ''} ${target ? 'assigned' : ''} ${
                  wiredPads.has(pad.fpga) ? 'wired' : ''
                } ${pending && 'fpga' in pending && pending.fpga === pad.fpga ? 'pending' : ''} ${
                  lit?.fpga === pad.fpga ? 'lit' : ''
                } ${state ? (state.ok ? 'target-ok' : 'target-bad') : ''}`}
                style={{ left: pad.x, top: pad.y }}
                aria-disabled={closed}
                tabIndex={closed ? -1 : 0}
                title={
                  power
                    ? `${pad.rail === 'GND' ? 'Земля' : `Питание ${pad.rail}`}${
                        closed
                          ? '. Детали питаются сами; снимите «Автопитание деталей», чтобы подключать питание проводами'
                          : pad.rail === 'GND'
                            ? ': сюда подключают выводы GND деталей'
                            : ': сюда подключают выводы VCC деталей'
                      }${state && !state.ok ? `. ${state.reason}` : ''}`
                    : `Контакт платы ${pad.fpga}${target ? ` · ${target.signal}` : ' · не назначен'}${
                        state && !state.ok ? `. ${state.reason}` : ''
                      }`
                }
                aria-label={
                  power
                    ? `Контакт ${pad.rail}, ${pad.row === 'top' ? 'верхний' : 'нижний'} ряд, место ${pad.index + 1}`
                    : `Контакт платы ${pad.fpga}`
                }
                onPointerDown={(event) =>
                  !closed && gestures.startWire(event, { kind: 'pad', fpga: pad.fpga })
                }
                onClick={() => {
                  if (!closed && !gestures.consumeClick()) onPickPad(pad.fpga);
                }}
              >
                <i />
                <b>{pad.rail ?? pad.fpga}</b>
              </button>
            );
          })}
          {layout.parts.map((part) => {
            const def = partById.get(part.def)!;
            const chosen = selection.parts.includes(part.uid);
            const wires = wiredPins.get(part.uid) ?? new Set<string>();
            return (
              <PartShell
                key={part.uid}
                part={part}
                def={def}
                device={runtime?.devices.get(part.uid)}
                selected={chosen}
                muted={muted}
                pending={
                  pending && 'part' in pending && pending.part === part.uid ? pending.pin : null
                }
                wired={wires}
                lit={lit?.part === part.uid ? lit.pin : null}
                status={(pin) => gestures.statusOfPin(part.uid, pin)}
                describe={(pin) => {
                  const wire = layout.wires.find(
                    (item) => item.part === part.uid && item.pin === pin,
                  );
                  if (!wire) return 'Не подключён.';
                  const signal = runtime?.targets.get(wire.fpga)?.signal;
                  const rail = HEADER.find((pad) => pad.fpga === wire.fpga)?.rail;
                  if (rail) return `Контакт ${rail}.`;
                  return `Контакт ${wire.fpga}${signal ? ` · ${signal}` : ', сигнал не назначен'}.`;
                }}
                unpowered={!!runtime?.unpowered.has(part.uid)}
                handlers={handlers}
              />
            );
          })}
          {marquee && (
            <div
              className="lab-marquee"
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
            />
          )}
          {rubber && (
            <>
              <svg className="lab-rubber" width={BENCH.w} height={BENCH.h} aria-hidden="true">
                <path
                  d={rubberPath(rubber.from, rubber.exit, rubber.cursor)}
                  style={{ stroke: rubber.color }}
                />
                <circle
                  cx={rubber.cursor.x}
                  cy={rubber.cursor.y}
                  r={4}
                  style={{ fill: rubber.color }}
                />
              </svg>
              {rubber.hint && (
                <div
                  className="lab-rubber-hint"
                  role="status"
                  style={{
                    left: rubber.cursor.x + 14 / zoom,
                    top: rubber.cursor.y + 14 / zoom,
                    transform: `scale(${1 / zoom})`,
                  }}
                >
                  {rubber.hint}
                </div>
              )}
            </>
          )}
          {overlay}
        </div>
      </div>
    </div>
  );
}
