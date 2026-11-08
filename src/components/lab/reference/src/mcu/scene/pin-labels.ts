// Pin names printed over the 3D view. Silkscreen and short pins are hidden by tall connectors and
// by jumpers from most camera angles, so the names are drawn flat on the screen: never occluded,
// never mirrored, readable at any zoom. Names that would overlap another are left out until the
// view is closer; the part that is selected or hovered always wins the space.
import type { Vec3 } from './layout';

export interface LabelPin extends Vec3 {
  text: string;
  /** Part id or `board`; pins of the same owner are pushed away from its centre. */
  owner: string;
  /** Lower wins when two names want the same space. */
  rank: number;
  /** Stripe colour, for names that are not pins (board components). */
  tone?: string;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const FONT = '600 11px "JetBrains Mono", ui-monospace, Consolas, monospace';
const SUPPLY = /^(5V|3V3|3\.3V|VCC|VDD|VIN|V\+|VBUS|VS|\+|\+5V|\+3V3|VOUT)$/i;
const GROUND = /^(GND\d*|G|-|V-|VSS|COM)$/i;
const hit = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 1 && b.x < a.x + a.w + 1 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1;

export class PinLabels {
  readonly canvas = document.createElement('canvas');
  private context = this.canvas.getContext('2d')!;
  private ratio = 1;
  enabled = true;
  constructor(host: HTMLElement) {
    this.canvas.className = 'bench-pin-labels';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.append(this.canvas);
  }
  resize(width: number, height: number, ratio: number) {
    this.ratio = ratio;
    this.canvas.width = Math.max(1, Math.round(width * ratio));
    this.canvas.height = Math.max(1, Math.round(height * ratio));
  }
  dispose() {
    this.canvas.remove();
  }
  /** `project` maps a world point to CSS pixels inside the view. */
  draw(
    pins: LabelPin[],
    project: (point: Vec3) => { x: number; y: number },
    size: { width: number; height: number },
    dark: boolean,
    focus: ReadonlySet<string>,
  ) {
    const g = this.context;
    g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    g.clearRect(0, 0, size.width, size.height);
    if (!this.enabled || !pins.length) return;
    g.font = FONT;
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    const screen = pins.map((pin) => ({ pin, at: project(pin) })),
      centre = new Map<string, { x: number; y: number; n: number }>();
    for (const { pin, at } of screen) {
      const sum = centre.get(pin.owner) ?? { x: 0, y: 0, n: 0 };
      sum.x += at.x;
      sum.y += at.y;
      sum.n++;
      centre.set(pin.owner, sum);
    }
    const placed: Rect[] = [];
    const ordered = screen
      .filter(
        ({ at }) => at.x > -30 && at.y > -30 && at.x < size.width + 30 && at.y < size.height + 30,
      )
      .sort(
        (a, b) =>
          Number(focus.has(b.pin.owner)) - Number(focus.has(a.pin.owner)) ||
          a.pin.rank - b.pin.rank,
      );
    for (const { pin, at } of ordered) {
      const mid = centre.get(pin.owner)!,
        focused = focus.has(pin.owner);
      let dx = at.x - mid.x / mid.n,
        dy = at.y - mid.y / mid.n;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const w = g.measureText(pin.text).width + 10,
        h = 15;
      // Outwards first, then straight up and down, then sideways, with longer reach each round.
      const tries: [number, number][] = [];
      for (const reach of [13, 26, 40])
        tries.push(
          [dx * reach, dy * reach - 3],
          [0, -reach],
          [0, reach * 0.8],
          [reach, -4],
          [-reach, -4],
        );
      for (const [ox, oy] of tries) {
        const rect = { x: at.x + ox - w / 2, y: at.y + oy - h / 2, w, h };
        if (placed.some((other) => hit(rect, other))) continue;
        placed.push(rect);
        // Leader from the pin to the chip, so a name is never mistaken for its neighbour's.
        g.strokeStyle = dark ? 'rgba(235,240,250,.55)' : 'rgba(20,26,44,.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(at.x, at.y);
        g.lineTo(at.x + ox * 0.78, at.y + oy * 0.78);
        g.stroke();
        const tone =
          pin.tone ??
          (SUPPLY.test(pin.text) ? '#d8453a' : GROUND.test(pin.text) ? '#5b6475' : '#1aa3a1');
        g.fillStyle = dark ? 'rgba(12,16,28,.9)' : 'rgba(255,252,244,.94)';
        g.strokeStyle = focused ? tone : dark ? 'rgba(235,240,250,.4)' : 'rgba(20,26,44,.45)';
        g.lineWidth = focused ? 1.6 : 1;
        g.beginPath();
        g.roundRect(rect.x, rect.y, rect.w, rect.h, 4);
        g.fill();
        g.stroke();
        g.fillStyle = tone;
        g.fillRect(rect.x + 1.5, rect.y + 3, 2.5, rect.h - 6);
        g.fillStyle = dark ? '#eef2fb' : '#161b2c';
        g.fillText(pin.text, rect.x + rect.w / 2 + 1.5, rect.y + rect.h / 2 + 0.5);
        break;
      }
    }
  }
}
