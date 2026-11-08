// What the virtual oscilloscope draws. A channel shows the voltage on the net its probe touches:
// when a board pin drives that net the picture is rebuilt from the pin's exact edge times, so
// PWM and fast blinking stay sharp; other nets (a divider, a sensor) are drawn from samples
// taken while the simulation runs.
export interface ScopeEdge {
  time: number;
  level: 0 | 1 | null;
}
export interface ScopeSample {
  time: number;
  volts: number;
}
export interface ScopeChannel {
  /** The probe sits on a net that something else touches too. */
  connected: boolean;
  /** Transitions of the board pin that drives the net, if there is one. */
  edges?: ScopeEdge[];
  /** Samples of a net that no board pin drives. */
  samples?: ScopeSample[];
  /** Voltage on the net right now. */
  volts: number | null;
}
export interface ScopeFeed {
  now: number;
  /** Seconds per horizontal division. */
  timeDiv: number;
  /** Volts per vertical division. */
  voltDiv: number;
  vcc: number;
  /** Beam intensity and focus, 0 … 1; a dim, soft beam is a thin, blurred line. */
  brightness: number;
  focus: number;
  /** The channel the sweep waits on, and the voltage it must cross going up. */
  trigger: { source: 0 | 1; level: number };
  /** The scope's own GND reaches ground of the board. */
  grounded: boolean;
  channels: [ScopeChannel, ScopeChannel];
}
export const DIVISIONS = { x: 10, y: 8 };
/** Where 0 V sits, in divisions above the bottom edge: leaves 6.5 divisions for 5 V at 1 V/div. */
export const ZERO_DIV = 1.5;

export interface TracePoint {
  time: number;
  volts: number;
}
/** The polyline of a channel between `from` and `to`, with square corners at every edge. */
export function channelTrace(
  channel: ScopeChannel,
  vcc: number,
  from: number,
  to: number,
): TracePoint[] {
  const volts = (level: 0 | 1 | null | undefined) => (level ? vcc : 0);
  if (channel.edges) {
    const before = [...channel.edges].reverse().find((edge) => edge.time <= from);
    const inside = channel.edges.filter((edge) => edge.time > from && edge.time <= to);
    const points: TracePoint[] = [{ time: from, volts: volts(before?.level) }];
    for (const edge of inside) {
      points.push({ time: edge.time, volts: points[points.length - 1]!.volts });
      points.push({ time: edge.time, volts: volts(edge.level) });
    }
    points.push({ time: to, volts: points[points.length - 1]!.volts });
    return points;
  }
  const samples = (channel.samples ?? []).filter(
    (sample) => sample.time >= from && sample.time <= to,
  );
  if (samples.length) return samples.map((sample) => ({ time: sample.time, volts: sample.volts }));
  const now = channel.volts;
  return now === null
    ? []
    : [
        { time: from, volts: now },
        { time: to, volts: now },
      ];
}

/**
 * Start time of the picture. When the trigger channel crosses the trigger level going up, and that
 * leaves a whole screen of history after it, the picture starts one division before the crossing,
 * so a repeating signal stands still; otherwise the screen simply rolls with the newest data at
 * the right. A level outside the signal's swing never triggers, as on a real scope.
 */
export function sweepStart(feed: ScopeFeed): number {
  const span = feed.timeDiv * DIVISIONS.x,
    rolling = Math.max(0, feed.now - span),
    channel = feed.channels[feed.trigger.source],
    ready = (time: number) => time + span - feed.timeDiv <= feed.now,
    level = feed.trigger.level;
  if (channel.edges) {
    // A digital signal swings between 0 and vcc, so any level in between is crossed at its edge.
    if (level <= 0 || level >= feed.vcc) return rolling;
    for (let i = channel.edges.length - 1; i >= 0; i--) {
      const edge = channel.edges[i]!;
      if (edge.level === 1 && ready(edge.time)) return Math.max(0, edge.time - feed.timeDiv);
    }
    return rolling;
  }
  const samples = channel.samples ?? [];
  for (let i = samples.length - 1; i > 0; i--) {
    const before = samples[i - 1]!,
      after = samples[i]!;
    if (before.volts < level && after.volts >= level && ready(after.time))
      return Math.max(0, after.time - feed.timeDiv);
  }
  return rolling;
}
/** Frequency from the last two rising edges inside the window, or null. */
export function measureFrequency(channel: ScopeChannel, from: number, to: number): number | null {
  const rises = (channel.edges ?? []).filter(
    (edge) => edge.level === 1 && edge.time >= from && edge.time <= to,
  );
  if (rises.length < 2) return null;
  const period = rises[rises.length - 1]!.time - rises[rises.length - 2]!.time;
  return period > 0 ? 1 / period : null;
}
export function measurePeakToPeak(points: TracePoint[]): number | null {
  if (!points.length) return null;
  const values = points.map((point) => point.volts);
  return Math.max(...values) - Math.min(...values);
}

// Green phosphor, as on the real tube; the second beam is a little bluer.
const COLORS = ['#b8ff5c', '#4dffd0'];
const volts = (value: number, digits = 2) => `${value.toFixed(digits)} В`;
const frequencyText = (hertz: number) =>
  hertz >= 1000 ? `${(hertz / 1000).toFixed(2)} кГц` : `${hertz.toFixed(hertz >= 100 ? 0 : 1)} Гц`;
const timeText = (seconds: number) =>
  seconds >= 1 ? `${seconds} с` : `${Math.round(seconds * 1000)} мс`;

/** Paints the screen: graticule, both traces and the readouts. */
export function paintScope(g: CanvasRenderingContext2D, feed: ScopeFeed) {
  const { width, height } = g.canvas,
    cell = { x: width / DIVISIONS.x, y: height / DIVISIONS.y };
  g.fillStyle = '#07120d';
  g.fillRect(0, 0, width, height);
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(120, 220, 160, 0.22)';
  for (let i = 1; i < DIVISIONS.x; i++) {
    g.beginPath();
    g.moveTo(i * cell.x, 0);
    g.lineTo(i * cell.x, height);
    g.stroke();
  }
  for (let j = 1; j < DIVISIONS.y; j++) {
    g.beginPath();
    g.moveTo(0, j * cell.y);
    g.lineTo(width, j * cell.y);
    g.stroke();
  }
  // Tick marks every fifth of a division on the zero line.
  g.strokeStyle = 'rgba(120, 220, 160, 0.5)';
  const zeroY = height - ZERO_DIV * cell.y;
  for (let i = 0; i <= DIVISIONS.x * 5; i++) {
    g.beginPath();
    g.moveTo((i * cell.x) / 5, zeroY - (i % 5 ? 3 : 6));
    g.lineTo((i * cell.x) / 5, zeroY + (i % 5 ? 3 : 6));
    g.stroke();
  }
  g.font = `600 ${Math.round(height * 0.052)}px 'Rubik Variable', sans-serif`;
  const anyProbe = feed.channels.some((channel) => channel.connected);
  if (!feed.grounded || !anyProbe) {
    g.fillStyle = 'rgba(200, 255, 220, 0.85)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(
      feed.grounded ? 'Подключите щуп CH1 к схеме' : 'Соедините GND осциллографа с GND платы',
      width / 2,
      height / 2,
    );
  }
  const start = sweepStart(feed),
    span = feed.timeDiv * DIVISIONS.x,
    end = start + span;
  const x = (time: number) => ((time - start) / span) * width,
    y = (value: number) => zeroY - (value / feed.voltDiv) * cell.y;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  feed.channels.forEach((channel, index) => {
    if (!feed.grounded || !channel.connected) return;
    const points = channelTrace(channel, feed.vcc, start, Math.min(end, feed.now));
    if (points.length) {
      // A dim beam is faint, a badly focused one is a fat soft line.
      g.globalAlpha = 0.2 + 0.8 * feed.brightness;
      g.strokeStyle = COLORS[index]!;
      g.shadowColor = COLORS[index]!;
      g.shadowBlur = 3 + (1 - feed.focus) * 14;
      g.lineWidth = 2 + (1 - feed.focus) * 4;
      g.lineJoin = 'round';
      g.beginPath();
      points.forEach((point, i) => {
        const px = x(point.time),
          py = Math.max(2, Math.min(height - 2, y(point.volts)));
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
      g.stroke();
      g.shadowBlur = 0;
      g.globalAlpha = 1;
    }
    const pp = measurePeakToPeak(points),
      hertz = measureFrequency(channel, start, end);
    g.fillStyle = COLORS[index]!;
    g.fillText(
      `CH${index + 1}  ${feed.voltDiv} В/дел` +
        (pp === null ? '' : `   Vpp ${volts(pp)}`) +
        (hertz === null ? '' : `   ${frequencyText(hertz)}`),
      10,
      8 + index * Math.round(height * 0.065),
    );
  });
  g.fillStyle = 'rgba(200, 255, 220, 0.8)';
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.fillText(`${timeText(feed.timeDiv)}/дел`, width - 10, height - 8);
  // The curved glass darkens towards the corners.
  const glass = g.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    width * 0.72,
  );
  glass.addColorStop(0, 'rgba(0, 0, 0, 0)');
  glass.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  g.fillStyle = glass;
  g.fillRect(0, 0, width, height);
}
