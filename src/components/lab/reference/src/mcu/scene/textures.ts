// Flat detail is painted on canvases: silkscreen, sockets and screens stay sharp at any zoom
// without adding geometry.
import { t } from '../../../../../../../shared/i18n';
import * as THREE from 'three';
import type { DeviceState } from '../../../shared/mcu';

export const SANS = "'Rubik Variable', 'Segoe UI', system-ui, sans-serif";
export const MONO = "'JetBrains Mono Variable', ui-monospace, monospace";
let maxAnisotropy = 8;
export const setMaxAnisotropy = (value: number) => (maxAnisotropy = value);

export function canvasTexture(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(2, Math.round(height));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return { canvas, context: canvas.getContext('2d')!, texture };
}

/** Pseudo-random but stable, so silkscreen traces do not jump between renders. */
export function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export interface PaintArea {
  x: number;
  z: number;
  width: number;
  depth: number;
}
/** PCB top: traces, vias, painted contact shadows under components and silkscreen labels. */
export function paintPcb(
  width: number,
  depth: number,
  options: {
    base: string;
    trace: string;
    seed: number;
    shadows?: PaintArea[];
    pads?: { x: number; z: number; label?: string; labelSide?: -1 | 1 }[];
    labels?: {
      text: string;
      x: number;
      z: number;
      size: number;
      angle?: number;
      weight?: number;
    }[];
    ink?: string;
  },
) {
  const scale = 24,
    { canvas, context: g, texture } = canvasTexture(width * scale, depth * scale);
  const px = (mm: number) => mm * scale;
  g.fillStyle = options.base;
  g.fillRect(0, 0, canvas.width, canvas.height);
  // Fixed routing from connector pads towards the package: never random decorative scribbles.
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = options.trace;
  g.lineWidth = px(0.22);
  const pads = options.pads ?? [];
  pads.forEach((pad, i) => {
    const x = width * 0.32 + i * Math.min(1.2, (width * 0.3) / Math.max(1, pads.length));
    const z = depth * 0.4;
    g.beginPath();
    g.moveTo(px(pad.x), px(pad.z));
    g.lineTo(px(pad.x), px(z + 2));
    g.lineTo(px(x), px(z));
    g.lineTo(px(x), px(z - 2));
    g.stroke();
  });
  // Baked ambient occlusion: a blurred dark footprint under every component.
  g.save();
  g.filter = `blur(${px(0.9)}px)`;
  g.fillStyle = 'rgba(10, 14, 30, 0.42)';
  for (const area of options.shadows ?? [])
    g.fillRect(px(area.x - 0.4), px(area.z - 0.2), px(area.width + 0.8), px(area.depth + 1.1));
  g.restore();
  g.fillStyle = '#cdb07a';
  for (const pad of options.pads ?? []) {
    g.beginPath();
    g.arc(px(pad.x), px(pad.z), px(0.95), 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = options.ink ?? '#eef0f3';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const pad of options.pads ?? []) {
    if (!pad.label) continue;
    g.font = `700 ${px(1.3)}px ${SANS}`;
    g.save();
    g.translate(px(pad.x), px(pad.z + (pad.labelSide ?? 1) * (1.8 + pad.label.length * 0.5)));
    g.rotate(-Math.PI / 2);
    // A dark halo keeps the white print readable on pale and busy boards alike.
    g.lineJoin = 'round';
    g.lineWidth = px(0.4);
    g.strokeStyle = 'rgba(8, 12, 24, 0.75)';
    g.strokeText(pad.label, 0, 0);
    g.fillText(pad.label, 0, 0);
    g.restore();
  }
  for (const label of options.labels ?? []) {
    g.font = `${label.weight ?? 600} ${px(label.size)}px ${SANS}`;
    g.save();
    g.translate(px(label.x), px(label.z));
    g.rotate(label.angle ?? 0);
    g.fillText(label.text, 0, 0);
    g.restore();
  }
  texture.needsUpdate = true;
  return texture;
}

/** Millimetres a character of the printing takes along the line, for the fonts used on modules. */
const CHAR_WIDTH = 0.62;
interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
/**
 * Where the name printed on a module can go so that it covers nothing: not the pin names, not
 * a component, not a mounting hole, and stays on the board. The place nearest to the wanted
 * one wins; if nothing is free the wanted one stays.
 */
export function clearMarkingSpot(options: {
  text: string;
  size: number;
  want: { x: number; z: number };
  width: number;
  depth: number;
  pads: { x: number; z: number; label?: string; labelSide?: -1 | 1 }[];
  shadows?: PaintArea[];
  holes?: [number, number][];
}) {
  const { text, size, want, width, depth } = options;
  const half = { x: (text.length * CHAR_WIDTH * size) / 2 + 0.4, z: size * 0.75 };
  const obstacles: Box[] = [];
  for (const pad of options.pads) {
    obstacles.push({ x0: pad.x - 1.1, x1: pad.x + 1.1, z0: pad.z - 1.1, z1: pad.z + 1.1 });
    if (!pad.label) continue;
    // The pin name stands upright (turned a quarter) beyond the pad, as paintPcb prints it.
    const centre = pad.z + (pad.labelSide ?? 1) * (1.8 + pad.label.length * 0.5),
      reach = pad.label.length * 0.45 + 0.4;
    obstacles.push({ x0: pad.x - 1, x1: pad.x + 1, z0: centre - reach, z1: centre + reach });
  }
  for (const area of options.shadows ?? [])
    obstacles.push({
      x0: area.x - 0.6,
      x1: area.x + area.width + 0.6,
      z0: area.z - 0.6,
      z1: area.z + area.depth + 0.6,
    });
  for (const [x, z] of options.holes ?? [])
    obstacles.push({ x0: x - 2.2, x1: x + 2.2, z0: z - 2.2, z1: z + 2.2 });
  const free = (x: number, z: number) => {
    const box = { x0: x - half.x, x1: x + half.x, z0: z - half.z, z1: z + half.z };
    return (
      box.x0 >= 0.6 &&
      box.x1 <= width - 0.6 &&
      box.z0 >= 0.6 &&
      box.z1 <= depth - 0.6 &&
      !obstacles.some((item) => hits(box, item))
    );
  };
  if (free(want.x, want.z)) return want;
  let best: { x: number; z: number } | null = null,
    nearest = Infinity;
  for (let z = half.z + 0.6; z <= depth - half.z - 0.6; z += 0.5)
    for (let x = half.x + 0.6; x <= width - half.x - 0.6; x += 0.5) {
      const distance = Math.hypot(x - want.x, (z - want.z) * 1.5);
      if (distance < nearest && free(x, z)) {
        nearest = distance;
        best = { x, z };
      }
    }
  return best ?? want;
}

export interface SilkLabel {
  text: string;
  x: number;
  z: number;
  size: number;
  angle?: number;
  weight?: number;
}
/** A separate unlit ink layer keeps white printing legible in the connector shadows. */
export function paintSilkscreen(width: number, depth: number, labels: SilkLabel[]) {
  const scale = 32,
    { context: g, texture } = canvasTexture(width * scale, depth * scale);
  g.fillStyle = '#fffdf1';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const label of labels) {
    g.save();
    g.translate(label.x * scale, label.z * scale);
    g.rotate(label.angle ?? 0);
    g.font = `${label.weight ?? 600} ${label.size * scale}px ui-monospace, monospace`;
    g.fillText(label.text, 0, 0);
    g.restore();
  }
  texture.needsUpdate = true;
  return texture;
}

/** A label strip for chips and modules, e.g. ATMEGA328P. */
export function paintMarking(
  text: string,
  width: number,
  depth: number,
  color = '#9aa0ad',
  background = '#2a2d38',
) {
  const scale = 40,
    { canvas, context: g, texture } = canvasTexture(width * scale, depth * scale);
  g.fillStyle = background;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = depth * scale * 0.34;
  g.font = `600 ${size}px ${SANS}`;
  while (g.measureText(text).width > canvas.width * 0.86 && size > 6) {
    size *= 0.9;
    g.font = `600 ${size}px ${SANS}`;
  }
  g.fillText(text, canvas.width / 2, canvas.height / 2);
  texture.needsUpdate = true;
  return texture;
}

/** Breadboard top: sockets, rail stripes and row/column labels. */
export function paintBreadboard(
  width: number,
  depth: number,
  holes: { x: number; z: number; rail?: 'P' | 'N' }[],
  labels: { text: string; x: number; z: number }[],
) {
  const scale = 22,
    { canvas, context: g, texture } = canvasTexture(width * scale, depth * scale);
  const px = (mm: number) => mm * scale;
  g.fillStyle = '#f5efe3';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#e4dccb';
  g.fillRect(0, px(depth / 2 + 1.27 - 0.9), canvas.width, px(1.8));
  for (const [z, color] of [
    [1.2, '#d64a3a'],
    [7.6, '#3d6fc4'],
  ] as const) {
    g.fillStyle = color;
    g.globalAlpha = 0.65;
    g.fillRect(px(2), px(z), canvas.width - px(4), px(0.35));
  }
  g.globalAlpha = 1;
  for (const hole of holes) {
    g.fillStyle = '#e1d7c4';
    g.fillRect(px(hole.x - 0.95), px(hole.z - 0.95), px(1.9), px(1.9));
    g.fillStyle = '#3b3d47';
    g.fillRect(px(hole.x - 0.5), px(hole.z - 0.5), px(1), px(1));
  }
  g.fillStyle = '#a69c8b';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${px(1.15)}px ${SANS}`;
  for (const label of labels) g.fillText(label.text, px(label.x), px(label.z));
  texture.needsUpdate = true;
  return texture;
}

type Painter = (
  g: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: DeviceState | undefined,
  leds: number[],
) => void;
export interface Screen {
  texture: THREE.CanvasTexture;
  /** Repaints only when the device state changed; returns whether it did. */
  paint: (state: DeviceState | undefined, leds: number[]) => boolean;
}
function screen(width: number, height: number, draw: Painter): Screen {
  const { canvas, context, texture } = canvasTexture(width, height);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  let last = '';
  return {
    texture,
    paint: (state: DeviceState | undefined, leds: number[]) => {
      const key = JSON.stringify([state, leds]);
      if (key === last) return false;
      last = key;
      draw(context, canvas, state, leds);
      texture.needsUpdate = true;
      return true;
    },
  };
}
export function oledScreen(rows = 64) {
  return screen(256, rows * 2, (g, c, state) => {
    g.fillStyle = '#05090c';
    g.fillRect(0, 0, c.width, c.height);
    if (!state?.powered || !state.displayOn) return;
    g.fillStyle = '#9ffbf0';
    state.pixels?.slice(0, rows * 16).forEach((byte, index) => {
      for (let bit = 0; bit < 8; bit++)
        if (byte & (1 << bit))
          g.fillRect((index % 128) * 2, (Math.floor(index / 128) * 8 + bit) * 2, 2, 2);
    });
  });
}
/** Phone chat for the Bluetooth module: lines sent by the phone on the right, received on the left. */
export function chatScreen() {
  return screen(240, 400, (g, c, state) => {
    g.fillStyle = '#10141c';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#1f2633';
    g.fillRect(0, 0, c.width, 46);
    g.fillStyle = state?.active ? '#4cc38a' : '#8a93a6';
    g.font = '600 20px system-ui, sans-serif';
    g.fillText(state?.active ? t('HC-05 · подключено') : t('HC-05 · нет связи'), 14, 30);
    g.font = '20px system-ui, sans-serif';
    (state?.text ?? []).forEach((line, i) => {
      const mine = line.startsWith('→'),
        text = line.slice(2).slice(0, 18),
        width = Math.min(200, g.measureText(text).width + 22),
        y = 62 + i * 54;
      g.fillStyle = mine ? '#2f6fd6' : '#2c3442';
      g.fillRect(mine ? c.width - width - 10 : 10, y, width, 40);
      g.fillStyle = '#f2f4f8';
      g.fillText(text, (mine ? c.width - width - 10 : 10) + 11, y + 27);
    });
  });
}
export function lcdScreen(columns: number, rows: number) {
  const cell = { w: 6 * 4, h: 9 * 4 };
  return screen(columns * cell.w + 16, rows * cell.h + 16, (g, c, state) => {
    const lit = state?.powered === true && state.backlight === true;
    g.fillStyle = lit ? '#58b86f' : '#1d3a2a';
    g.fillRect(0, 0, c.width, c.height);
    for (let r = 0; r < rows; r++)
      for (let col = 0; col < columns; col++) {
        g.fillStyle = lit ? 'rgba(20, 70, 40, 0.22)' : 'rgba(0, 0, 0, 0.18)';
        g.fillRect(8 + col * cell.w + 1, 8 + r * cell.h + 1, cell.w - 3, cell.h - 3);
      }
    if (!state?.powered || !state.displayOn) return;
    g.fillStyle = lit ? '#0b2a16' : '#08180f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 ${cell.h * 0.78}px ${MONO}`;
    (state.text ?? []).forEach((line, r) =>
      [...line].forEach((ch, col) => {
        const code = ch.charCodeAt(0),
          x = 8 + col * cell.w,
          y = 8 + r * cell.h;
        if (code >= 0xe000 && code < 0xe008) {
          const bits = state.glyphs?.slice((code - 0xe000) * 8, (code - 0xe000) * 8 + 8) ?? [];
          bits.forEach((row, line) => {
            for (let column = 0; column < 5; column++)
              if (row & (16 >> column)) g.fillRect(x + 1 + column * 4, y + 1 + line * 4, 3.4, 3.4);
          });
        } else if (ch !== ' ') g.fillText(ch, x + cell.w / 2, y + cell.h / 2);
      }),
    );
  });
}
export function matrixScreen() {
  return screen(160, 160, (g, c, state) => {
    g.fillStyle = '#151214';
    g.fillRect(0, 0, c.width, c.height);
    const on = state?.powered === true && state.displayOn === true,
      alpha = 0.35 + (0.65 * (state?.intensity ?? 0)) / 15;
    (state?.matrix ?? Array<number>(8).fill(0)).forEach((row, r) => {
      for (let col = 0; col < 8; col++) {
        const lit = on && (row >> (7 - col)) & 1;
        g.fillStyle = lit ? `rgba(255, 77, 61, ${alpha})` : '#2b1a1a';
        g.beginPath();
        g.arc(10 + col * 20, 10 + r * 20, 7.5, 0, Math.PI * 2);
        g.fill();
      }
    });
  });
}
const segments: [number, number, number, number][] = [
  [14, 8, 32, 6],
  [44, 14, 6, 30],
  [44, 50, 6, 30],
  [14, 80, 32, 6],
  [8, 50, 6, 30],
  [8, 14, 6, 30],
  [14, 44, 32, 6],
];
export function sevenSegmentScreen(color: string) {
  return screen(72, 96, (g, c, _state, leds) => {
    g.fillStyle = '#1b1d22';
    g.fillRect(0, 0, c.width, c.height);
    segments.forEach(([x, y, w, h], i) => {
      g.globalAlpha = 0.1 + 0.9 * Math.min(1, leds[i] ?? 0);
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    });
    g.globalAlpha = 0.1 + 0.9 * Math.min(1, leds[7] ?? 0);
    g.beginPath();
    g.arc(60, 84, 4, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
}

/**
 * Row of 7-segment digits driven by grid bytes (bit 0 = A … bit 7 = DP). With `colon`, bit 7 of
 * the second digit lights the colon of the common 4-digit TM1637 modules instead of its point.
 */
/** Traces of a logic analyzer: one row per input, high at the top of the row, low at the bottom. */
export function waveScreen(channels = 4) {
  const rowHeight = 28;
  return screen(256, channels * rowHeight + 8, (g, c, state) => {
    g.fillStyle = '#0a1214';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(120, 190, 180, 0.12)';
    g.lineWidth = 1;
    for (let x = 0; x <= c.width; x += c.width / 8) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, c.height);
      g.stroke();
    }
    const colours = ['#f0a53a', '#3fd0c4', '#8fb5ff', '#e86a8a'];
    for (let i = 0; i < channels; i++) {
      const trace = state?.powered ? state.waves?.[i] : undefined,
        top = 6 + i * rowHeight,
        y = (level: number) => top + (level ? 2 : rowHeight - 12);
      g.strokeStyle = trace?.wired ? colours[i % colours.length]! : 'rgba(160, 190, 185, 0.25)';
      g.fillStyle = g.strokeStyle;
      g.lineWidth = 2;
      if (!trace?.wired) {
        g.beginPath();
        g.moveTo(0, top + rowHeight / 2 - 5);
        g.lineTo(c.width, top + rowHeight / 2 - 5);
        g.stroke();
        continue;
      }
      if (!trace.edges) {
        g.globalAlpha = 0.55;
        g.fillRect(0, top + 2, c.width, rowHeight - 14);
        g.globalAlpha = 1;
        continue;
      }
      g.beginPath();
      g.moveTo(0, y(trace.start));
      for (const [at, level] of trace.edges) {
        g.lineTo(at * c.width, y(level ? 0 : 1));
        g.lineTo(at * c.width, y(level));
      }
      g.lineTo(
        c.width,
        y(trace.edges.length ? trace.edges[trace.edges.length - 1]![1] : trace.start),
      );
      g.stroke();
    }
  });
}

export function segmentScreen(color: string, digits = 4, colon = true) {
  const pitch = 66,
    width = digits * pitch + (colon ? 24 : 12);
  return screen(width, 112, (g, c, state) => {
    g.fillStyle = '#16171c';
    g.fillRect(0, 0, c.width, c.height);
    const on = state?.powered === true && state.displayOn === true,
      level = 0.45 + (0.55 * (state?.intensity ?? 7)) / 7,
      grids = state?.matrix ?? [];
    g.fillStyle = color;
    for (let digit = 0; digit < digits; digit++) {
      const x0 = 10 + digit * pitch + (colon && digit > 1 ? 14 : 0),
        bits = on ? (grids[digit] ?? 0) : 0;
      segments.forEach(([x, y, w, h], i) => {
        g.globalAlpha = (bits >> i) & 1 ? level : 0.08;
        g.fillRect(x0 + x * 0.9, 8 + y * 1.05, w * 0.9, h * 1.05);
      });
      if (!colon) {
        g.globalAlpha = (bits >> 7) & 1 ? level : 0.08;
        g.beginPath();
        g.arc(x0 + 54, 96, 4, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (colon) {
      g.globalAlpha = on && (grids[1] ?? 0) & 0x80 ? level : 0.08;
      for (const y of [38, 74]) {
        g.beginPath();
        g.arc(10 + 2 * pitch + 2, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  });
}
export const tm1637Screen = (color: string) => segmentScreen(color, 4, true);
/** 128×160 colour TFT from an RGB565 frame; repaints when new bytes arrived. */
export function tftScreen(width = 128, height = 160): Screen {
  const { canvas, context, texture } = canvasTexture(width, height);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const image = context.createImageData(canvas.width, canvas.height);
  let last = '';
  return {
    texture,
    paint: (state) => {
      const on = state?.powered === true && state.displayOn === true,
        key = `${on}:${state?.backlight}:${state?.inverse}:${state?.transfers}`;
      if (key === last) return false;
      last = key;
      // Without the backlight the picture is barely visible, as on the real module.
      const light = state?.backlight ? 1 : 0.18,
        invert = state?.inverse === true;
      const frame = state?.frame565 ?? [];
      for (let i = 0; i < width * height; i++) {
        let c = on ? (frame[i] ?? 0) : 0;
        if (on && invert) c = ~c & 0xffff;
        image.data[i * 4] = ((c >> 11) & 31) * 8.23 * light;
        image.data[i * 4 + 1] = ((c >> 5) & 63) * 4.05 * light;
        image.data[i * 4 + 2] = (c & 31) * 8.23 * light;
        image.data[i * 4 + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      texture.needsUpdate = true;
      return true;
    },
  };
}
/** Nokia 5110 reflective LCD: dark pixels on grey-green glass, green when the backlight is on. */
export function nokiaScreen() {
  return screen(168, 96, (g, c, state) => {
    const lit = state?.powered === true && state.backlight === true;
    g.fillStyle = lit ? '#9fd8a4' : '#a9b59b';
    g.fillRect(0, 0, c.width, c.height);
    if (!state?.powered || !state.displayOn) return;
    // Contrast (Vop) sets how dark the pixels are.
    g.fillStyle = `rgba(20, 32, 24, ${Math.min(1, 0.35 + (state.intensity ?? 0) / 90)})`;
    state.pixels?.forEach((byte, index) => {
      for (let bit = 0; bit < 8; bit++)
        if (byte & (1 << bit))
          g.fillRect((index % 84) * 2, (Math.floor(index / 84) * 8 + bit) * 2, 2, 2);
    });
  });
}

const badges = new Map<string, THREE.CanvasTexture>();
/** Round badge with a short label, e.g. "+" on an LED anode. */
export function badgeTexture(text: string, color: string) {
  const key = text + color;
  const cached = badges.get(key);
  if (cached) return cached;
  const { context: g, texture } = canvasTexture(64, 64);
  g.fillStyle = color;
  g.beginPath();
  g.arc(32, 32, 29, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#18213d';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `800 ${text.length > 1 ? 24 : 40}px ${SANS}`;
  g.fillText(text, 32, 34);
  texture.needsUpdate = true;
  badges.set(key, texture);
  return texture;
}

let glow: THREE.CanvasTexture | null = null;
/** Radial halo used instead of bloom: cheap and keeps the illustrated look. */
export function glowTexture() {
  if (glow) return glow;
  const { canvas, context: g, texture } = canvasTexture(128, 128);
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
  glow = texture;
  return texture;
}
