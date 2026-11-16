import { zoomCanvas, type CanvasView } from './canvas-view';

/**
 * Two-finger pinch/pan on an SVG surface. Runs in the capture phase and swallows the pointer
 * events while two fingers are down, so one-finger handlers (drag a block, drag a wire, pan)
 * never see them; `onStart` lets the owner cancel whatever one-finger gesture had begun.
 */
export function attachPinch(
  surface: Element,
  api: {
    getView: () => CanvasView;
    setView: (view: CanvasView) => void;
    onStart?: () => void;
  },
): () => void {
  const touches = new Map<number, { x: number; y: number }>();
  let start: { distance: number; mid: { x: number; y: number }; view: CanvasView } | null = null;
  const measure = () => {
    const [a, b] = [...touches.values()];
    const box = surface.getBoundingClientRect();
    return {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mid: { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top },
    };
  };
  const down = (raw: Event) => {
    const event = raw as PointerEvent;
    if (event.pointerType !== 'touch') return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 2) {
      api.onStart?.();
      start = { ...measure(), view: api.getView() };
      event.stopPropagation();
    } else if (touches.size > 2) event.stopPropagation();
  };
  const move = (raw: Event) => {
    const event = raw as PointerEvent;
    if (!touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size < 2 || !start) return;
    event.stopPropagation();
    event.preventDefault();
    const now = measure();
    const zoomed = zoomCanvas(start.view, now.distance / start.distance, start.mid);
    api.setView({
      ...zoomed,
      x: zoomed.x + now.mid.x - start.mid.x,
      y: zoomed.y + now.mid.y - start.mid.y,
    });
  };
  const up = (raw: Event) => {
    const event = raw as PointerEvent;
    if (!touches.delete(event.pointerId)) return;
    if (start) event.stopPropagation();
    if (touches.size < 2) start = null;
  };
  surface.addEventListener('pointerdown', down, true);
  surface.addEventListener('pointermove', move, true);
  surface.addEventListener('pointerup', up, true);
  surface.addEventListener('pointercancel', up, true);
  return () => {
    surface.removeEventListener('pointerdown', down, true);
    surface.removeEventListener('pointermove', move, true);
    surface.removeEventListener('pointerup', up, true);
    surface.removeEventListener('pointercancel', up, true);
  };
}
