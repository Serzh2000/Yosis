import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Minus,
  Plus,
  Search,
  TriangleAlert,
} from 'lucide-react';
import type { VcdSignal, VcdTrace } from '../lib/vcd';
import {
  formatWaveTime,
  formatWaveValue,
  initialWindow,
  panWindow,
  timeTicks,
  traceDomain,
  valueAt,
  visibleSegments,
  zoomWindow,
} from '../lib/waveform';
import type { TimeWindow, WaveformRadix } from '../lib/waveform';
import './waveform.css';

export interface WaveformViewerProps {
  trace: VcdTrace;
  onRevealSignal?: (signal: VcdSignal) => void;
  canRevealSignal?: (signal: VcdSignal) => boolean;
}
const ROW_HEIGHT = 36;
const MAX_DEFAULT_SIGNALS = 24;

function signalKey(signal: VcdSignal, index: number): string {
  return `${JSON.stringify(signal.scope)}:${signal.name}:${index}`;
}
function signalPath(signal: VcdSignal): string {
  return [...signal.scope, signal.name].join('.');
}

const SignalDrawing = memo(function SignalDrawing({
  signal,
  window,
  width,
  radix,
}: {
  signal: VcdSignal;
  window: TimeWindow;
  width: number;
  radix: WaveformRadix;
}) {
  const { segments, truncated } = useMemo(() => visibleSegments(signal, window), [signal, window]);
  const x = (time: number) => ((time - window.start) / (window.end - window.start)) * width;
  if (truncated)
    return (
      <g className="waveform-dense">
        <rect x="0" y="7" width={width} height="23" />
        <text x={width / 2} y="21" textAnchor="middle">
          Много переходов — увеличьте масштаб
        </text>
      </g>
    );
  return (
    <g>
      {segments.map((segment, index) => {
        const start = x(segment.start);
        const end = x(segment.end);
        const value = segment.value;
        const unknown = /[xz]/i.test(value);
        if (signal.width === 1) {
          if (unknown)
            return (
              <g
                key={segment.start}
                className={`waveform-unknown ${value === 'z' ? 'high-impedance' : ''}`}
              >
                {value === 'z' ? (
                  <line x1={start} x2={end} y1="18" y2="18" />
                ) : (
                  <>
                    <rect x={start} y="9" width={Math.max(0, end - start)} height="18" />
                    {end - start > 18 && (
                      <text x={(start + end) / 2} y="21" textAnchor="middle">
                        X
                      </text>
                    )}
                  </>
                )}
                <title>
                  {value.toUpperCase()} · {segment.start}…{segment.end}
                </title>
              </g>
            );
          const y = value === '1' ? 9 : 27;
          const previous = segments[index - 1]?.value;
          const previousY = previous === '1' ? 9 : 27;
          const path =
            previous && !/[xz]/i.test(previous) && previous !== value
              ? `M${start},${previousY}V${y}H${end}`
              : `M${start},${y}H${end}`;
          return (
            <path key={segment.start} d={path} className="waveform-bit">
              <title>
                {value} · {segment.start}…{segment.end}
              </title>
            </path>
          );
        }
        const bevel = Math.min(4, Math.max(0, (end - start) / 3));
        const label = formatWaveValue(value, signal.width, radix);
        return (
          <g key={segment.start} className={`waveform-bus ${unknown ? 'is-unknown' : ''}`}>
            <path
              d={`M${start},18L${start + bevel},9H${end - bevel}L${end},18L${end - bevel},27H${start + bevel}Z`}
            />
            {end - start > label.length * 6.4 + 12 && (
              <text x={(start + end) / 2} y="21" textAnchor="middle">
                {label}
              </text>
            )}
            <title>
              {label} · {value} · {segment.start}…{segment.end}
            </title>
          </g>
        );
      })}
    </g>
  );
});

export function WaveformViewer({ trace, onRevealSignal, canRevealSignal }: WaveformViewerProps) {
  const indexedSignals = useMemo(
    () => trace.signals.map((signal, index) => ({ signal, key: signalKey(signal, index) })),
    [trace],
  );
  const domain = useMemo(() => traceDomain(trace), [trace]);
  const [window, setWindow] = useState<TimeWindow>(() => initialWindow(trace));
  const [cursor, setCursor] = useState(trace.startTime);
  const [radix, setRadix] = useState<WaveformRadix>('hex');
  const [search, setSearch] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(
    () => new Set(indexedSignals.slice(0, MAX_DEFAULT_SIGNALS).map((item) => item.key)),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 400, height: 180 });
  const [scrollTop, setScrollTop] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    mode: 'cursor' | 'pan';
    originX: number;
    initialWindow: TimeWindow;
  } | null>(null);
  const sliderWindow = useRef<TimeWindow | null>(null);
  const width = dimensions.width;
  const span = window.end - window.start;
  const ticks = useMemo(() => timeTicks(window, width), [window, width]);
  const toX = (time: number) => ((time - window.start) / span) * width;
  const cursorX = toX(cursor);
  const cursorVisible = cursorX >= 0 && cursorX <= width;
  const filteredSignals = useMemo(
    () =>
      indexedSignals.filter((item) =>
        signalPath(item.signal).toLowerCase().includes(search.toLowerCase()),
      ),
    [indexedSignals, search],
  );
  const shownSignals = useMemo(
    () => filteredSignals.filter((item) => visibleKeys.has(item.key)),
    [filteredSignals, visibleKeys],
  );
  const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const lastRow = Math.min(
    shownSignals.length,
    firstRow + Math.ceil(dimensions.height / ROW_HEIGHT) + 5,
  );
  const renderedSignals = shownSignals.slice(firstRow, lastRow);
  const denseCount = useMemo(
    () =>
      shownSignals.reduce(
        (count, item) => count + Number(visibleSegments(item.signal, window, 2000).truncated),
        0,
      ),
    [shownSignals, window],
  );

  useEffect(() => {
    sliderWindow.current = null;
    drag.current = null;
    setWindow(initialWindow(trace));
    setCursor(trace.startTime);
    setSearch('');
    setScrollTop(0);
    setPickerOpen(false);
    setWarningsOpen(false);
    setVisibleKeys(new Set(indexedSignals.slice(0, MAX_DEFAULT_SIGNALS).map((item) => item.key)));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [trace, indexedSignals]);

  useEffect(() => {
    const update = () =>
      setDimensions({
        width: Math.max(1, plotRef.current?.clientWidth || 400),
        height: Math.max(1, scrollRef.current?.clientHeight || 180),
      });
    const observer = new ResizeObserver(update);
    if (plotRef.current) observer.observe(plotRef.current);
    if (scrollRef.current) observer.observe(scrollRef.current);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // A filtered list can shrink while the browser retains its old scroll offset.
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, [shownSignals.length]);

  const zoom = (
    factor: number,
    anchor = cursor >= window.start && cursor <= window.end
      ? cursor
      : (window.start + window.end) / 2,
  ) => setWindow((previous) => zoomWindow(previous, domain, factor, anchor));
  const pan = (fraction: number) =>
    setWindow((previous) => {
      const offset = (previous.end - previous.start) * fraction;
      return panWindow(previous, domain, previous.start + offset);
    });
  const setCursorAtX = (x: number) =>
    setCursor(
      Math.max(
        trace.startTime,
        Math.min(trace.endTime, Math.round(window.start + (x / width) * span)),
      ),
    );
  const localX = (event: PointerEvent<SVGSVGElement>) =>
    event.clientX - event.currentTarget.getBoundingClientRect().left;
  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    event.currentTarget.focus();
    const x = localX(event);
    const mode = event.shiftKey || event.button === 1 ? 'pan' : 'cursor';
    drag.current = { pointerId: event.pointerId, mode, originX: x, initialWindow: window };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (mode === 'cursor') setCursorAtX(x);
  };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const x = localX(event);
    if (current.mode === 'cursor') setCursorAtX(x);
    else {
      const offset =
        ((current.originX - x) / width) * (current.initialWindow.end - current.initialWindow.start);
      setWindow(panWindow(current.initialWindow, domain, current.initialWindow.start + offset));
    }
  };
  const pointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).matches('input,select,button')) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom(0.5);
    } else if (event.key === '-') {
      event.preventDefault();
      zoom(2);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      if (event.shiftKey) pan(direction * 0.15);
      else
        setCursor((previous) =>
          Math.max(
            trace.startTime,
            Math.min(trace.endTime, previous + direction * Math.max(1, Math.round(span / 100))),
          ),
        );
    }
  };
  const toggleSignal = (key: string) =>
    setVisibleKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="waveform-viewer" onKeyDown={onKeyDown}>
      <div className="waveform-toolbar">
        <label className="waveform-search">
          <Search size={12} />
          <input
            aria-label="Поиск сигнала"
            placeholder="Найти сигнал…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (scrollRef.current) scrollRef.current.scrollTop = 0;
              setScrollTop(0);
            }}
          />
        </label>
        <div className="waveform-picker-wrap">
          <button
            type="button"
            className="waveform-text-button"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen(!pickerOpen)}
          >
            <Eye size={12} />
            Сигналы{' '}
            <small>
              {visibleKeys.size}/{trace.signals.length}
            </small>
            <ChevronDown size={11} />
          </button>
          {pickerOpen && (
            <>
              <button
                type="button"
                className="waveform-picker-backdrop"
                aria-label="Закрыть выбор сигналов"
                onClick={() => setPickerOpen(false)}
              />
              <div className="waveform-signal-picker">
                <div className="waveform-picker-actions">
                  <button
                    type="button"
                    onClick={() => setVisibleKeys(new Set(filteredSignals.map((item) => item.key)))}
                  >
                    Показать найденные
                  </button>
                  <button type="button" onClick={() => setVisibleKeys(new Set())}>
                    Скрыть все
                  </button>
                </div>
                <div className="waveform-picker-list">
                  {filteredSignals.slice(0, 500).map((item) => (
                    <label key={item.key} title={signalPath(item.signal)}>
                      <input
                        type="checkbox"
                        checked={visibleKeys.has(item.key)}
                        onChange={() => toggleSignal(item.key)}
                      />
                      <span>{signalPath(item.signal)}</span>
                      <small>{item.signal.width}</small>
                    </label>
                  ))}
                  {filteredSignals.length > 500 && <p>Первые 500 сигналов. Уточните поиск.</p>}
                  {!filteredSignals.length && <p>Сигналы не найдены.</p>}
                </div>
              </div>
            </>
          )}
        </div>
        <label className="waveform-radix">
          Формат
          <select
            aria-label="Формат значений шин"
            value={radix}
            onChange={(event) => setRadix(event.target.value as WaveformRadix)}
          >
            <option value="hex">HEX</option>
            <option value="dec">DEC</option>
            <option value="bin">BIN</option>
          </select>
        </label>
        <div className="waveform-zoom-controls">
          <button
            type="button"
            className="icon-button"
            title="Сдвинуть влево · Shift + ←"
            aria-label="Сдвинуть диаграмму влево"
            disabled={window.start <= domain.start}
            onClick={() => pan(-0.25)}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Уменьшить масштаб · −"
            aria-label="Уменьшить масштаб диаграммы"
            disabled={span >= domain.end - domain.start}
            onClick={() => zoom(2)}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Увеличить масштаб · +"
            aria-label="Увеличить масштаб диаграммы"
            disabled={span <= 1}
            onClick={() => zoom(0.5)}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Показать весь интервал"
            aria-label="Показать весь интервал диаграммы"
            onClick={() => setWindow(domain)}
          >
            <Focus size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Сдвинуть вправо · Shift + →"
            aria-label="Сдвинуть диаграмму вправо"
            disabled={window.end >= domain.end}
            onClick={() => pan(0.25)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <span className="waveform-cursor-readout">
          Курсор <strong>{formatWaveTime(cursor, trace.timescaleFs, span)}</strong>
        </span>
      </div>
      <div className="waveform-table-header">
        <span className="waveform-signal-heading">
          Сигнал <small>{shownSignals.length}</small>
        </span>
        <div className="waveform-axis" ref={plotRef}>
          <svg width={width} height="28" aria-hidden="true">
            {ticks.map((time) => (
              <g key={time}>
                <line x1={toX(time)} x2={toX(time)} y1="20" y2="28" />
                <text
                  x={Math.max(3, Math.min(width - 3, toX(time)))}
                  y="13"
                  textAnchor={toX(time) < 32 ? 'start' : toX(time) > width - 32 ? 'end' : 'middle'}
                >
                  {formatWaveTime(time, trace.timescaleFs, span)}
                </text>
              </g>
            ))}
            {cursorVisible && (
              <path
                d={`M${cursorX - 4},0H${cursorX + 4}L${cursorX},6Z`}
                className="waveform-cursor-marker"
              />
            )}
          </svg>
        </div>
        <span className="waveform-value-heading">На курсоре</span>
      </div>
      <div
        className="waveform-scroll"
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {shownSignals.length ? (
          <div className="waveform-rows" style={{ height: shownSignals.length * ROW_HEIGHT }}>
            {renderedSignals.map((item, index) => {
              const value = valueAt(item.signal, cursor);
              const formatted = formatWaveValue(value, item.signal.width, radix);
              return (
                <div
                  className="waveform-row"
                  key={item.key}
                  style={{ top: (firstRow + index) * ROW_HEIGHT }}
                >
                  <div className="waveform-signal-label">
                    <button
                      type="button"
                      title="Скрыть сигнал"
                      aria-label={`Скрыть сигнал ${signalPath(item.signal)}`}
                      onClick={() => toggleSignal(item.key)}
                    >
                      <EyeOff size={12} />
                    </button>
                    <div title={signalPath(item.signal)}>
                      {onRevealSignal ? (
                        <button
                          className="waveform-rtl-link"
                          aria-label={`Показать ${item.signal.name} в RTL`}
                          disabled={!canRevealSignal?.(item.signal)}
                          title={
                            canRevealSignal?.(item.signal)
                              ? 'Открыть RTL и подсветить связи этого сигнала'
                              : 'Нет соответствия в RTL текущей сборки'
                          }
                          onClick={() => onRevealSignal(item.signal)}
                        >
                          <strong>{item.signal.name}</strong>
                        </button>
                      ) : (
                        <strong>{item.signal.name}</strong>
                      )}
                      <small>
                        {item.signal.scope.join('.') || 'верхний уровень'}
                        <span>{item.signal.width > 1 ? `${item.signal.width} бит` : ''}</span>
                      </small>
                    </div>
                  </div>
                  <div className="waveform-track">
                    <svg
                      className="waveform-track-svg"
                      width={width}
                      height={ROW_HEIGHT}
                      tabIndex={0}
                      role="img"
                      aria-label={`Диаграмма ${signalPath(item.signal)}; значение на курсоре ${formatted}. Стрелки перемещают курсор, Shift и стрелки сдвигают интервал.`}
                      onPointerDown={pointerDown}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={pointerUp}
                    >
                      {ticks.map((time) => (
                        <line
                          className="waveform-grid-line"
                          key={time}
                          x1={toX(time)}
                          x2={toX(time)}
                          y1="0"
                          y2={ROW_HEIGHT}
                        />
                      ))}
                      <SignalDrawing
                        signal={item.signal}
                        window={window}
                        width={width}
                        radix={radix}
                      />
                    </svg>
                    {cursorVisible && (
                      <span className="waveform-cursor-line" style={{ left: cursorX }} />
                    )}
                  </div>
                  <code
                    className={`waveform-value ${/[xz]/i.test(value) ? 'is-unknown' : ''}`}
                    title={`${formatted}\nДвоичное значение: ${value}`}
                  >
                    {formatted}
                  </code>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="waveform-no-signals">
            <Search size={17} />
            <span>
              {search
                ? 'Подходящих видимых сигналов нет. Измените поиск или выбор сигналов.'
                : 'Выберите сигналы в меню над диаграммой.'}
            </span>
          </div>
        )}
      </div>
      <div className="waveform-footer">
        <span
          className="waveform-range-label"
          title={`${formatWaveTime(window.start, trace.timescaleFs, span)} — ${formatWaveTime(window.end, trace.timescaleFs, span)}`}
        >
          {formatWaveTime(window.start, trace.timescaleFs, span)} —{' '}
          {formatWaveTime(window.end, trace.timescaleFs, span)}
        </span>
        <input
          className="waveform-pan-slider"
          type="range"
          aria-label="Перемещение по времени"
          title="Сдвигает видимый интервал, сохраняя масштаб"
          min={domain.start}
          max={Math.max(
            domain.start,
            domain.end -
              (sliderWindow.current ? sliderWindow.current.end - sliderWindow.current.start : span),
          )}
          step="any"
          value={window.start}
          disabled={span >= domain.end - domain.start}
          onPointerDown={() => {
            sliderWindow.current = window;
          }}
          onPointerUp={() => {
            sliderWindow.current = null;
          }}
          onPointerCancel={() => {
            sliderWindow.current = null;
          }}
          onBlur={() => {
            sliderWindow.current = null;
          }}
          onChange={(event) => {
            const start = Number(event.target.value);
            setWindow(panWindow(sliderWindow.current ?? window, domain, start));
          }}
        />
        <div className="waveform-footer-tools">
          <span
            className="waveform-gesture-hint"
            title="Клик — курсор · Shift + перетаскивание — сдвиг"
          >
            Shift ↔
          </span>
          {(trace.warnings.length > 0 || denseCount > 0) && (
            <button
              type="button"
              className="waveform-warning-button"
              title="Предупреждения диаграмм"
              onClick={() => setWarningsOpen(!warningsOpen)}
              aria-expanded={warningsOpen}
            >
              <TriangleAlert size={12} />
              {trace.warnings.length + Number(denseCount > 0)}
            </button>
          )}
        </div>
      </div>
      {warningsOpen && (
        <div className="waveform-warnings" role="status">
          {denseCount > 0 && (
            <p>
              {denseCount} сигналов содержат более 2000 переходов в окне. Их диаграммы скрыты:
              увеличьте масштаб, чтобы увидеть переходы.
            </p>
          )}
          {trace.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default WaveformViewer;
