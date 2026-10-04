import type { VcdSignal, VcdTrace } from './vcd';

export type WaveformRadix = 'hex' | 'bin' | 'dec';
export interface TimeWindow {
  start: number;
  end: number;
}
export interface WaveSegment {
  start: number;
  end: number;
  value: string;
}

function upperBound(changes: VcdSignal['changes'], time: number): number {
  let low = 0;
  let high = changes.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (changes[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** The final assignment at a timestamp is the value visible at that timestamp. */
export function valueAt(signal: VcdSignal, time: number): string {
  const index = upperBound(signal.changes, time) - 1;
  return index >= 0 ? signal.changes[index].value : 'x'.repeat(signal.width);
}

export function visibleSegments(
  signal: VcdSignal,
  window: TimeWindow,
  limit = 2000,
): { segments: WaveSegment[]; truncated: boolean } {
  if (window.end <= window.start) return { segments: [], truncated: false };
  const begin = upperBound(signal.changes, window.start);
  const finish = upperBound(signal.changes, window.end);
  if (finish - begin > limit) return { segments: [], truncated: true };
  const segments: WaveSegment[] = [];
  let position = window.start;
  let currentValue = valueAt(signal, position);
  for (let index = begin; index < finish; index++) {
    const change = signal.changes[index];
    if (change.time > position)
      segments.push({ start: position, end: change.time, value: currentValue });
    position = change.time;
    currentValue = change.value;
  }
  if (position < window.end)
    segments.push({ start: position, end: window.end, value: currentValue });
  return { segments, truncated: false };
}

export function formatWaveValue(value: string, width: number, radix: WaveformRadix): string {
  const normalized = value.toLowerCase();
  if (!normalized || /[^01xz]/.test(normalized)) return '?';
  if (width === 1) return normalized.at(-1)!.toUpperCase();
  if (radix === 'bin') return `0b${normalized.toUpperCase()}`;
  if (radix === 'dec') {
    if (/[xz]/.test(normalized))
      return /x/.test(normalized) && /z/.test(normalized)
        ? 'X/Z'
        : /x/.test(normalized)
          ? 'X'
          : 'Z';
    return BigInt(`0b${normalized}`).toString(10);
  }
  const padded = normalized.padStart(Math.ceil(width / 4) * 4, '0');
  let result = '';
  for (let index = 0; index < padded.length; index += 4) {
    const nibble = padded.slice(index, index + 4);
    result += /x/.test(nibble)
      ? 'X'
      : /z/.test(nibble)
        ? 'Z'
        : parseInt(nibble, 2).toString(16).toUpperCase();
  }
  return `0x${result}`;
}

export function traceDomain(trace: VcdTrace): TimeWindow {
  return { start: trace.startTime, end: Math.max(trace.endTime, trace.startTime + 1) };
}

export function clampWindow(window: TimeWindow, domain: TimeWindow): TimeWindow {
  const fullSpan = domain.end - domain.start;
  const span = Math.min(fullSpan, Math.max(Math.min(1, fullSpan), window.end - window.start));
  const start = Math.max(domain.start, Math.min(domain.end - span, window.start));
  return { start, end: start + span };
}

/** Move a window using its original span, including when the domain clamps its position. */
export function panWindow(window: TimeWindow, domain: TimeWindow, start: number): TimeWindow {
  return clampWindow({ start, end: start + (window.end - window.start) }, domain);
}

export function zoomWindow(
  window: TimeWindow,
  domain: TimeWindow,
  factor: number,
  anchor: number,
): TimeWindow {
  const span = window.end - window.start;
  const fraction = Math.max(0, Math.min(1, (anchor - window.start) / span));
  const newSpan = Math.min(
    domain.end - domain.start,
    Math.max(Math.min(1, domain.end - domain.start), span * factor),
  );
  return clampWindow(
    { start: anchor - fraction * newSpan, end: anchor + (1 - fraction) * newSpan },
    domain,
  );
}

export function initialWindow(trace: VcdTrace): TimeWindow {
  const domain = traceDomain(trace);
  const clock = trace.signals.find(
    (signal) => signal.width === 1 && /^(clk|clock)(?:\[0\])?$/i.test(signal.name),
  );
  const rising = clock?.changes.filter((change) => change.value === '1');
  if (rising && rising.length > 1) {
    const period = rising[1].time - rising[0].time;
    if (period > 0)
      return clampWindow({ start: domain.start, end: domain.start + period * 32 }, domain);
  }
  return domain;
}

export function timeTicks(window: TimeWindow, pixelWidth: number): number[] {
  const span = window.end - window.start;
  const count = Math.max(2, Math.floor(pixelWidth / 110));
  const desired = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(desired));
  const relative = desired / magnitude;
  // Subtracting a fractional pan position from its end can put an unchanged
  // span just above 1/2/5. Without this allowance the ruler changes its step.
  const roundingAllowance = Math.max(
    1e-9,
    (Number.EPSILON * Math.max(Math.abs(window.start), Math.abs(window.end)) * 4) /
      count /
      magnitude,
  );
  const step =
    (relative <= 1 + roundingAllowance
      ? 1
      : relative <= 2 + roundingAllowance
        ? 2
        : relative <= 5 + roundingAllowance
          ? 5
          : 10) * magnitude;
  const ticks: number[] = [];
  for (
    let value = Math.ceil(window.start / step) * step;
    value <= window.end + step * 1e-8 && ticks.length < 100;
    value += step
  )
    ticks.push(Number(value.toPrecision(12)));
  return ticks;
}

export function formatWaveTime(time: number, timescaleFs: number, span: number): string {
  const units = [
    { factor: 1e15, label: 'с' },
    { factor: 1e12, label: 'мс' },
    { factor: 1e9, label: 'мкс' },
    { factor: 1e6, label: 'нс' },
    { factor: 1e3, label: 'пс' },
    { factor: 1, label: 'фс' },
  ];
  const unit = units.find((candidate) => span * timescaleFs >= candidate.factor) || units.at(-1)!;
  const value = Number(((time * timescaleFs) / unit.factor).toPrecision(10));
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4, useGrouping: false }).format(value)} ${unit.label}`;
}
