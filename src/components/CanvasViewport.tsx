import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { canvasPoint, fitCanvas, zoomCanvas, type CanvasBounds } from '../lib/canvas-view';
import './canvas-viewport.css';

export function CanvasViewport({
  label,
  width,
  height,
  children,
  className = '',
  bounds,
}: {
  label: string;
  width: number;
  height: number;
  className?: string;
  bounds?: CanvasBounds;
  children: (point: (clientX: number, clientY: number) => { x: number; y: number }) => ReactNode;
}) {
  const [view, setView] = useState(() => fitCanvas(width, height, bounds));
  const svg = useRef<SVGSVGElement>(null);
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  function localPoint(clientX: number, clientY: number) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function point(clientX: number, clientY: number) {
    return canvasPoint(view, localPoint(clientX, clientY));
  }
  function zoom(factor: number) {
    setView((previous) => zoomCanvas(previous, factor, { x: width / 2, y: height / 2 }));
  }
  useEffect(() => {
    const surface = svg.current;
    if (!surface) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const matrix = surface.getScreenCTM();
      if (!matrix) return;
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      setView((previous) => zoomCanvas(previous, Math.exp(-delta * 0.002), anchor));
    };
    surface.addEventListener('wheel', wheel, { passive: false });
    return () => surface.removeEventListener('wheel', wheel);
  }, [height]);
  return (
    <div className={`canvas-viewport ${className}`}>
      <div className="canvas-controls" role="group" aria-label={`Масштаб: ${label}`}>
        <button
          aria-label="Уменьшить масштаб"
          onClick={() => zoom(1 / 1.25)}
          disabled={view.scale <= 0.35}
        >
          <Minus size={14} />
        </button>
        <output aria-label="Текущий масштаб">{Math.round(view.scale * 100)}%</output>
        <button
          aria-label="Увеличить масштаб"
          onClick={() => zoom(1.25)}
          disabled={view.scale >= 5}
        >
          <Plus size={14} />
        </button>
        <button
          aria-label="Показать целиком"
          onClick={() => setView(fitCanvas(width, height, bounds))}
        >
          <Maximize size={14} />
        </button>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={label}
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as Element).closest('[data-no-pan]')) return;
          const p = localPoint(event.clientX, event.clientY);
          pan.current = {
            id: event.pointerId,
            ...p,
            originX: view.x,
            originY: view.y,
            moved: false,
          };
          suppressClick.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = pan.current;
          if (!current || current.id !== event.pointerId) return;
          const p = localPoint(event.clientX, event.clientY),
            dx = p.x - current.x,
            dy = p.y - current.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
          if (current.moved)
            setView((previous) => ({
              ...previous,
              x: current.originX + dx,
              y: current.originY + dy,
            }));
        }}
        onPointerUp={(event) => {
          suppressClick.current = !!pan.current?.moved;
          pan.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          pan.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === '+' || event.key === '=') zoom(1.25);
          else if (event.key === '-') zoom(1 / 1.25);
          else if (event.key === '0' || event.key === 'Home')
            setView(fitCanvas(width, height, bounds));
          else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
            setView((previous) => ({
              ...previous,
              x:
                previous.x +
                (event.key === 'ArrowLeft' ? 35 : event.key === 'ArrowRight' ? -35 : 0),
              y: previous.y + (event.key === 'ArrowUp' ? 35 : event.key === 'ArrowDown' ? -35 : 0),
            }));
          else return;
          event.preventDefault();
        }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>{children(point)}</g>
      </svg>
      <span className="canvas-hint">Колесо — масштаб · фон — перемещение · 0 — целиком</span>
    </div>
  );
}
