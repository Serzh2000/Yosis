export interface CanvasView {
  x: number;
  y: number;
  scale: number;
}
export const initialCanvasView: CanvasView = { x: 0, y: 0, scale: 1 };
export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function fitCanvas(width: number, height: number, bounds?: CanvasBounds): CanvasView {
  if (!bounds) return initialCanvasView;
  const scale = Math.max(
    0.35,
    Math.min(5, width / (bounds.width + 96), height / (bounds.height + 96)),
  );
  return {
    scale,
    x: width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: height / 2 - (bounds.y + bounds.height / 2) * scale,
  };
}
export function zoomCanvas(
  view: CanvasView,
  factor: number,
  anchor: { x: number; y: number },
): CanvasView {
  const scale = Math.max(0.35, Math.min(5, view.scale * factor));
  const ratio = scale / view.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  };
}
export function canvasPoint(view: CanvasView, point: { x: number; y: number }) {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}
