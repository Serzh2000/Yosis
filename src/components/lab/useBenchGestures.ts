import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  EXIT,
  HEADER,
  GRID,
  fitOnBench,
  headerByFpga,
  nextWireColor,
  padExit,
  partBox,
  pinPoint,
  snap,
  type Box,
  type Point,
} from '../../lib/lab/bench';
import { partById, partPins, type PinDir } from '../../lib/lab/catalog';
import {
  busConnect,
  connectWire,
  moveParts,
  replugWire,
  setWireBends,
} from '../../lib/lab/layout-ops';
import type { LabLayout, LabRuntime } from '../../lib/lab/runtime';
import { linkStatus, type LinkStatus } from '../../lib/lab/wiring';
import type { useLabHistory } from './useLabHistory';

export type Selection = { parts: string[]; wire: string | null };
export const NOTHING: Selection = { parts: [], wire: null };

/** The fixed end of a wire that is being dragged: a pin of a part or a pad of the header. */
type Anchor = { kind: 'pin'; part: string; pin: string } | { kind: 'pad'; fpga: number };
export interface Rubber {
  anchor: Anchor;
  /** A wire whose end is being moved; it is hidden meanwhile. */
  replug?: string;
  from: Point;
  exit: Point;
  cursor: Point;
  color: string;
  /** What the cursor is over and cannot connect to. */
  hint: string;
}

const THRESHOLD = 4;
const INTERACTIVE = 'button, input, select, textarea, a, label, [data-nodrag]';

interface Env {
  history: ReturnType<typeof useLabHistory>;
  runtime: LabRuntime | null;
  zoom: number;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** A wire was made or moved; `at` is where it ended, on the bench. */
  onConnected: (wireId: string, at: Point) => void;
  viewport: RefObject<HTMLDivElement | null>;
  bench: RefObject<HTMLDivElement | null>;
  space: RefObject<boolean>;
}

/** Moves a part drag, marquee, pan and wire drag; each is a short-lived window listener. */
export function useBenchGestures(env: Env) {
  const latest = useRef(env);
  latest.current = env;
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [rubber, setRubber] = useState<Rubber | null>(null);
  const [panning, setPanning] = useState(false);
  const clicked = useRef(false);

  /** Follows the pointer until it is released or the gesture is cancelled. */
  const track = useCallback(
    (
      move: (event: PointerEvent) => void,
      up: (event: PointerEvent) => void,
      cancel: () => void,
    ) => {
      const end = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', abort);
        window.removeEventListener('keydown', key, true);
        window.removeEventListener('contextmenu', context, true);
      };
      const release = (event: PointerEvent) => {
        end();
        up(event);
      };
      const abort = () => {
        end();
        cancel();
      };
      const key = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        abort();
      };
      // A right click while dragging cancels instead of opening a menu.
      const context = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        abort();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', abort);
      window.addEventListener('keydown', key, true);
      window.addEventListener('contextmenu', context, true);
    },
    [],
  );

  const toBench = (clientX: number, clientY: number): Point => {
    const { bench, zoom } = latest.current;
    const box = bench.current!.getBoundingClientRect();
    return { x: (clientX - box.left) / zoom, y: (clientY - box.top) / zoom };
  };

  function pinDir(layout: LabLayout, uid: string, pin: string): PinDir | null {
    const part = layout.parts.find((item) => item.uid === uid);
    const def = part && partById.get(part.def);
    return (def && partPins(def, part.opts).find((item) => item[0] === pin)?.[2]) || null;
  }

  /** Can the wire being dragged end on this target? */
  function evaluate(anchor: Anchor, target: Element | null | undefined): LinkStatus | null {
    const { history, runtime } = latest.current;
    const kind = target?.getAttribute('data-target');
    if (anchor.kind === 'pin' && kind === 'pad') {
      const fpga = Number(target!.getAttribute('data-fpga'));
      const direction = pinDir(history.get(), anchor.part, anchor.pin);
      return direction
        ? linkStatus(direction, Number.isNaN(fpga) ? null : fpga, runtime?.targets)
        : null;
    }
    if (anchor.kind === 'pad' && kind === 'pin') {
      const direction = pinDir(
        history.get(),
        target!.getAttribute('data-part')!,
        target!.getAttribute('data-pin')!,
      );
      return direction ? linkStatus(direction, anchor.fpga, runtime?.targets) : null;
    }
    return null;
  }
  const targetAt = (event: PointerEvent) =>
    document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-target]');

  /** Drag a wire from a pin or pad (or by one end of an existing wire) onto a target. */
  function startWire(event: ReactPointerEvent, anchor: Anchor, replug?: string, shiftBus = false) {
    if (event.button !== 0) return;
    const { history } = latest.current;
    const layout = history.get();
    let from: Point;
    let exit: Point;
    if (anchor.kind === 'pin') {
      const part = layout.parts.find((item) => item.uid === anchor.part);
      const def = part && partById.get(part.def);
      const index = def ? partPins(def, part.opts).findIndex((pin) => pin[0] === anchor.pin) : -1;
      if (!part || !def || index < 0) return;
      from = pinPoint(part, def, index);
      exit = EXIT[part.rot];
    } else {
      const pad = headerByFpga.get(anchor.fpga);
      if (!pad) return;
      from = { x: pad.x, y: pad.y };
      exit = padExit(pad.row);
    }
    const color = replug
      ? (layout.wires.find((wire) => wire.id === replug)?.color ?? nextWireColor(layout.wires))
      : nextWireColor(layout.wires);
    const start = { x: event.clientX, y: event.clientY };
    let active = false;
    track(
      (move) => {
        if (!active && Math.hypot(move.clientX - start.x, move.clientY - start.y) < THRESHOLD)
          return;
        active = true;
        const status = evaluate(anchor, targetAt(move));
        setRubber({
          anchor,
          replug,
          from,
          exit,
          color,
          cursor: toBench(move.clientX, move.clientY),
          hint: status && !status.ok ? (status.reason ?? '') : '',
        });
      },
      (up) => {
        setRubber(null);
        if (!active) return;
        // The click that follows a drag ending on its own start is not a wish to wire.
        clicked.current = true;
        setTimeout(() => (clicked.current = false), 0);
        const target = targetAt(up);
        if (!target || !evaluate(anchor, target)?.ok) return;
        const next = history.get();
        if (anchor.kind === 'pin') {
          const fpga = Number(target.getAttribute('data-fpga'));
          const pad = headerByFpga.get(fpga)!;
          if (replug) {
            history.commit(replugWire(next, replug, { fpga }));
            latest.current.onConnected(replug, { x: pad.x, y: pad.y });
            return;
          }
          const index = (() => {
            const part = next.parts.find((item) => item.uid === anchor.part)!;
            return partPins(partById.get(part.def)!, part.opts).findIndex(
              (p) => p[0] === anchor.pin,
            );
          })();
          const made =
            (up.shiftKey || shiftBus) && index >= 0
              ? busConnect(next, anchor.part, index, fpga)
              : (() => {
                  const one = connectWire(next, { part: anchor.part, pin: anchor.pin, fpga });
                  return { layout: one.layout, wires: [one.wire] };
                })();
          history.commit(made.layout);
          latest.current.onConnected(made.wires[0].id, { x: pad.x, y: pad.y });
        } else {
          const part = target.getAttribute('data-part')!;
          const pin = target.getAttribute('data-pin')!;
          const placed = next.parts.find((item) => item.uid === part)!;
          const def = partById.get(placed.def)!;
          const at = pinPoint(
            placed,
            def,
            partPins(def, placed.opts).findIndex((p) => p[0] === pin),
          );
          if (replug) {
            history.commit(replugWire(next, replug, { part, pin }));
            latest.current.onConnected(replug, at);
            return;
          }
          const made = connectWire(next, { part, pin, fpga: anchor.fpga });
          history.commit(made.layout);
          latest.current.onConnected(made.wire.id, at);
        }
      },
      () => setRubber(null),
    );
  }

  function startPartDrag(event: ReactPointerEvent, uid: string) {
    if (event.button !== 0) return;
    const { selection, onSelect, history, zoom } = latest.current;
    const interactive = !!(event.target as Element).closest(INTERACTIVE);
    const inSelection = selection.parts.includes(uid);
    let ids: string[];
    if (event.shiftKey) {
      ids = inSelection ? selection.parts.filter((id) => id !== uid) : [...selection.parts, uid];
      onSelect({ parts: ids, wire: null });
      if (inSelection) return;
    } else {
      ids = inSelection ? selection.parts : [uid];
      if (!inSelection || selection.wire) onSelect({ parts: ids, wire: null });
    }
    if (interactive) return;
    const base = history.get();
    const moving = base.parts.filter((part) => ids.includes(part.uid));
    const origins = new Map(moving.map((part) => [part.uid, { x: part.x, y: part.y }]));
    const boxes = moving.map((part) => partBox(part, partById.get(part.def)!));
    const group: Box = {
      x: Math.min(...boxes.map((box) => box.x)),
      y: Math.min(...boxes.map((box) => box.y)),
      w: 0,
      h: 0,
    };
    group.w = Math.max(...boxes.map((box) => box.x + box.w)) - group.x;
    group.h = Math.max(...boxes.map((box) => box.y + box.h)) - group.y;
    const grabbed = origins.get(uid)!;
    const start = { x: event.clientX, y: event.clientY };
    let dragging = false;
    track(
      (move) => {
        if (!dragging) {
          if (Math.hypot(move.clientX - start.x, move.clientY - start.y) < THRESHOLD) return;
          dragging = true;
          history.beginLive();
        }
        const rawX = (move.clientX - start.x) / zoom;
        const rawY = (move.clientY - start.y) / zoom;
        // The grabbed part lands on the grid; the others keep their distance to it. Alt is free.
        let dx = move.altKey ? Math.round(rawX) : snap(grabbed.x + rawX) - grabbed.x;
        let dy = move.altKey ? Math.round(rawY) : snap(grabbed.y + rawY) - grabbed.y;
        const shift = fitOnBench({ ...group, x: group.x + dx, y: group.y + dy });
        dx += shift.x;
        dy += shift.y;
        history.live(moveParts(base, origins, dx, dy));
      },
      () => {
        if (dragging) history.endLive(true);
        // A click on one part of a selection narrows the selection to it.
        else if (!event.shiftKey && ids.length > 1) onSelect({ parts: [uid], wire: null });
      },
      () => dragging && history.endLive(false),
    );
  }

  /** Empty bench: a marquee selects, middle button or Space pans. */
  function onBenchDown(event: ReactPointerEvent) {
    const { viewport, selection, onSelect, history, space } = latest.current;
    const element = viewport.current;
    if (!element) return;
    if (event.button === 1 || (event.button === 0 && space.current)) {
      event.preventDefault();
      const start = {
        x: event.clientX,
        y: event.clientY,
        left: element.scrollLeft,
        top: element.scrollTop,
      };
      setPanning(true);
      const stop = () => setPanning(false);
      track(
        (move) => {
          element.scrollLeft = start.left - (move.clientX - start.x);
          element.scrollTop = start.top - (move.clientY - start.y);
        },
        stop,
        stop,
      );
      return;
    }
    if (event.button !== 0) return;
    // A press on the scroll bars is not on the bench.
    const box = element.getBoundingClientRect();
    if (
      event.clientX > box.left + element.clientWidth ||
      event.clientY > box.top + element.clientHeight
    )
      return;
    if (
      (event.target as Element).closest(
        '.lab-part, .lab-hpin, .lab-popover, [data-wire], [data-nodrag]',
      )
    )
      return;
    if ((event.target as Element).closest(INTERACTIVE)) return;
    element.focus({ preventScroll: true });
    const origin = toBench(event.clientX, event.clientY);
    const kept = event.shiftKey ? selection.parts : [];
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    track(
      (move) => {
        if (!moved && Math.hypot(move.clientX - start.x, move.clientY - start.y) < THRESHOLD)
          return;
        moved = true;
        const now = toBench(move.clientX, move.clientY);
        const box = {
          x: Math.min(origin.x, now.x),
          y: Math.min(origin.y, now.y),
          w: Math.abs(origin.x - now.x),
          h: Math.abs(origin.y - now.y),
        };
        setMarquee(box);
        const hit = history
          .get()
          .parts.filter((part) => {
            const item = partBox(part, partById.get(part.def)!);
            return (
              item.x < box.x + box.w &&
              item.x + item.w > box.x &&
              item.y < box.y + box.h &&
              item.y + item.h > box.y
            );
          })
          .map((part) => part.uid);
        onSelect({ parts: [...new Set([...kept, ...hit])], wire: null });
      },
      () => {
        setMarquee(null);
        if (!moved && !event.shiftKey) onSelect(NOTHING);
      },
      () => setMarquee(null),
    );
  }

  /** Statuses for highlighting while a wire is dragged. */
  const statusOfPin = (uid: string, pin: string): LinkStatus | null => {
    if (!rubber || rubber.anchor.kind !== 'pad') return null;
    const direction = pinDir(latest.current.history.get(), uid, pin);
    return direction
      ? linkStatus(direction, rubber.anchor.fpga, latest.current.runtime?.targets)
      : null;
  };
  const statusOfPad = (fpga: number | null): LinkStatus | null => {
    if (!rubber || rubber.anchor.kind !== 'pin') return null;
    const direction = pinDir(latest.current.history.get(), rubber.anchor.part, rubber.anchor.pin);
    return direction ? linkStatus(direction, fpga, latest.current.runtime?.targets) : null;
  };

  /**
   * Bend a wire: a drag that starts on the wire makes a bend at that point, a drag that
   * starts on a bend moves it. `index` is the bend being moved, or where a new one goes.
   */
  function startBend(event: ReactPointerEvent, wireId: string, index: number, create: boolean) {
    if (event.button !== 0) return;
    const { history, zoom } = latest.current;
    const start = { x: event.clientX, y: event.clientY };
    const origin = toBench(event.clientX, event.clientY);
    const before = history.get().wires.find((wire) => wire.id === wireId)?.bends ?? [];
    let dragging = false;
    track(
      (move) => {
        if (!dragging) {
          if (Math.hypot(move.clientX - start.x, move.clientY - start.y) < THRESHOLD) return;
          dragging = true;
          history.beginLive();
        }
        const base = create ? origin : before[index];
        const raw = {
          x: base.x + (move.clientX - start.x) / zoom,
          y: base.y + (move.clientY - start.y) / zoom,
        };
        // Half a grid step keeps bends tidy; Alt places them freely.
        const step = GRID / 2;
        const point = move.altKey
          ? { x: Math.round(raw.x), y: Math.round(raw.y) }
          : { x: Math.round(raw.x / step) * step, y: Math.round(raw.y / step) * step };
        const bends = create
          ? [...before.slice(0, index), point, ...before.slice(index)]
          : before.map((bend, at) => (at === index ? point : bend));
        history.live((layout) => setWireBends(layout, wireId, bends));
      },
      () => dragging && history.endLive(true),
      () => dragging && history.endLive(false),
    );
  }

  return {
    marquee,
    rubber,
    panning,
    startWire,
    startBend,
    startPartDrag,
    onBenchDown,
    statusOfPin,
    statusOfPad,
    /** True once for the click that ends a wire drag. */
    consumeClick: () => {
      const was = clicked.current;
      clicked.current = false;
      return was;
    },
    toBench,
  };
}

export { GRID, HEADER };
