import {
  blocks,
  circuitPins,
  type CircuitDocument,
  type CircuitNode,
  type CircuitPin,
  type Endpoint,
  type SymbolSpec,
} from '../../shared/schematic';

export const GRID = 10;
export const snap = (value: number) => Math.round(value / GRID) * GRID;

export interface PinGeometry extends CircuitPin {
  /** Положение контакта относительно угла элемента (с учётом поворота и отражения). */
  x: number;
  y: number;
  /** Направление наружу от элемента. */
  dx: number;
  dy: number;
  /** Положение в собственных координатах символа до поворота. */
  lx: number;
  ly: number;
}
export interface NodeGeometry {
  spec: SymbolSpec;
  /** Размер символа до поворота. */
  localWidth: number;
  localHeight: number;
  /** Размер на холсте с учётом поворота. */
  width: number;
  height: number;
  pins: PinGeometry[];
}

const rows = (count: number) => Math.max(1, count);
function wrapNote(text: string, limit = 24): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > limit && line) {
        lines.push(line);
        line = word;
      } else line = `${line} ${word}`.trim();
    }
    lines.push(line);
  }
  return lines.slice(0, 12);
}
export const noteLines = wrapNote;

function localLayout(spec: SymbolSpec, pins: CircuitPin[]) {
  const inputs = pins.filter((pin) => pin.direction === 'input'),
    outputs = pins.filter((pin) => pin.direction === 'output');
  const count = Math.max(rows(inputs.length), rows(outputs.length));
  let width = 100,
    height = count * 20 + 20;
  switch (spec.shape) {
    case 'and':
    case 'or':
    case 'xor':
      width = 70;
      height = Math.max(40, inputs.length * 20 + 20);
      break;
    case 'buf':
      width = 50;
      height = 40;
      break;
    case 'mux':
    case 'demux':
      width = 50;
      height = Math.max(60, count * 20 + 20);
      break;
    case 'port-in':
    case 'port-out':
    case 'board-in':
    case 'board-out':
      width = Math.min(220, Math.max(100, Math.ceil((spec.label.length * 8 + 44) / 10) * 10));
      height = 40;
      break;
    case 'const':
      width = Math.max(50, Math.ceil((spec.label.length * 8 + 24) / 10) * 10);
      height = 40;
      break;
    case 'label':
      width = Math.max(80, Math.ceil((spec.label.length * 8 + 40) / 10) * 10);
      height = 40;
      break;
    case 'note': {
      const lines = wrapNote(spec.label);
      width = 200;
      height = Math.max(40, lines.length * 18 + 20);
      break;
    }
    default: {
      const longest = Math.max(
        ...pins.map((pin) => pin.name.length),
        spec.label.length,
        (spec.detail ?? '').length / 1.4,
      );
      width = Math.max(100, Math.ceil((longest * 9 + 60) / 10) * 10);
      height = Math.max(count * 20 + 20, spec.detail ? 60 : 40);
    }
  }
  const centered = [
    'and',
    'or',
    'xor',
    'buf',
    'port-in',
    'port-out',
    'const',
    'board-in',
    'board-out',
    'label',
  ];
  const place = (pin: CircuitPin, group: CircuitPin[]) => ({
    x: pin.direction === 'input' ? 0 : width,
    y:
      group.length === 1 && centered.includes(spec.shape)
        ? snap(height / 2)
        : 20 + group.indexOf(pin) * 20,
  });
  return { width, height, place, inputs, outputs };
}

const geometryCache = new WeakMap<object, NodeGeometry>();
const cacheKey = (node: CircuitNode) => node;
export function circuitGeometry(node: CircuitNode): NodeGeometry {
  const cached = geometryCache.get(cacheKey(node));
  if (cached) return cached;
  const spec = blocks[node.kind].symbol(node.params, node.name),
    pins = circuitPins(node);
  const layout = localLayout(spec, pins);
  const rotated = node.rot === 90 || node.rot === 270;
  const width = rotated ? layout.height : layout.width,
    height = rotated ? layout.width : layout.height;
  const transform = (x: number, y: number) => {
    let px = node.flip ? layout.width - x : x,
      py = y;
    for (let turn = 0; turn < node.rot / 90; turn++) {
      // поворот на 90° по часовой стрелке в системе координат SVG
      const h = turn % 2 === 0 ? layout.height : layout.width;
      [px, py] = [h - py, px];
    }
    return { x: px, y: py };
  };
  const vector = (dx: number, dy: number) => {
    let vx = node.flip ? -dx : dx,
      vy = dy;
    for (let turn = 0; turn < node.rot / 90; turn++) [vx, vy] = [-vy, vx];
    return { dx: vx + 0, dy: vy + 0 };
  };
  const result: NodeGeometry = {
    spec,
    localWidth: layout.width,
    localHeight: layout.height,
    width,
    height,
    pins: pins.map((pin) => {
      const group = pin.direction === 'input' ? layout.inputs : layout.outputs,
        local = layout.place(pin, group),
        at = transform(local.x, local.y),
        out = vector(pin.direction === 'input' ? -1 : 1, 0);
      return { ...pin, ...at, ...out, lx: local.x, ly: local.y };
    }),
  };
  geometryCache.set(cacheKey(node), result);
  return result;
}
/** Матрица SVG для рисования символа в собственных координатах. */
export function symbolTransform(node: CircuitNode, geo: NodeGeometry): string {
  return matrixString(composeMatrix(node, geo));
}
interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
const matrixString = (m: Matrix) => `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
function composeMatrix(node: CircuitNode, geo: NodeGeometry): Matrix {
  // Применяем преобразование к базисным точкам: (0,0), (1,0), (0,1).
  const apply = (x: number, y: number) => {
    let px = node.flip ? geo.localWidth - x : x,
      py = y;
    for (let turn = 0; turn < node.rot / 90; turn++) {
      const h = turn % 2 === 0 ? geo.localHeight : geo.localWidth;
      [px, py] = [h - py, px];
    }
    return { x: px, y: py };
  };
  const o = apply(0, 0),
    ex = apply(1, 0),
    ey = apply(0, 1);
  return { a: ex.x - o.x, b: ex.y - o.y, c: ey.x - o.x, d: ey.y - o.y, e: o.x, f: o.y };
}

export interface Point {
  x: number;
  y: number;
}
export function pinPoint(
  node: CircuitNode,
  pin: string,
): (Point & { dx: number; dy: number }) | null {
  const found = circuitGeometry(node).pins.find((value) => value.name === pin);
  return found ? { x: node.x + found.x, y: node.y + found.y, dx: found.dx, dy: found.dy } : null;
}
export function endpointPoint(
  nodes: Map<string, CircuitNode>,
  endpoint: Endpoint,
  override?: Map<string, Point>,
): (Point & { dx: number; dy: number }) | null {
  const node = nodes.get(endpoint.node);
  if (!node) return null;
  const moved = override?.get(node.id),
    at = pinPoint(moved ? { ...node, x: moved.x, y: moved.y } : node, endpoint.pin);
  return at;
}

/** Ортогональная трасса между двумя контактами: короткие выносы, затем «Z»- или обходной путь. */
export function routeWire(
  a: Point & { dx: number; dy: number },
  b: Point & { dx: number; dy: number },
  lane = 0,
): Point[] {
  const stub = 20;
  const p0 = { x: a.x, y: a.y },
    s0 = { x: a.x + a.dx * stub, y: a.y + a.dy * stub },
    s1 = { x: b.x + b.dx * stub, y: b.y + b.dy * stub },
    p1 = { x: b.x, y: b.y };
  const points: Point[] = [p0, s0];
  const horizontal0 = a.dy === 0,
    horizontal1 = b.dy === 0;
  if (horizontal0 && horizontal1) {
    if (a.dx > 0 && b.dx < 0 && s1.x >= s0.x) {
      const mid = snap((s0.x + s1.x) / 2) + lane;
      points.push({ x: mid, y: s0.y }, { x: mid, y: s1.y });
    } else {
      // Обход: вверх или вниз между элементами.
      const mid = snap((s0.y + s1.y) / 2) + (Math.abs(s0.y - s1.y) < 20 ? 60 : 0) + lane;
      points.push({ x: s0.x, y: mid }, { x: s1.x, y: mid });
    }
  } else if (!horizontal0 && !horizontal1) {
    const mid = snap((s0.x + s1.x) / 2) + lane;
    points.push({ x: s0.x, y: (s0.y + s1.y) / 2 }, { x: mid, y: (s0.y + s1.y) / 2 });
    points.push({ x: s1.x, y: (s0.y + s1.y) / 2 });
  } else if (horizontal0) points.push({ x: s1.x, y: s0.y });
  else points.push({ x: s0.x, y: s1.y });
  points.push(s1, p1);
  // убираем повторы и лишние промежуточные точки на прямой
  const clean: Point[] = [];
  for (const point of points) {
    const last = clean.at(-1);
    if (last && last.x === point.x && last.y === point.y) continue;
    clean.push(point);
    while (clean.length >= 3) {
      const [p, q, r] = clean.slice(-3);
      if ((p.x === q.x && q.x === r.x) || (p.y === q.y && q.y === r.y)) clean.splice(-2, 1);
      else break;
    }
  }
  return clean;
}
export const pathOf = (points: Point[]) =>
  points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
export function midpoint(points: Point[]): Point {
  let total = 0;
  const lengths = points.slice(1).map((point, index) => {
    const length = Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y);
    total += length;
    return length;
  });
  let walk = total / 2;
  for (let index = 0; index < lengths.length; index++) {
    if (walk <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] ? walk / lengths[index] : 0;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * t,
        y: points[index].y + (points[index + 1].y - points[index].y) * t,
      };
    }
    walk -= lengths[index];
  }
  return points[0];
}

export function docBounds(doc: CircuitDocument, ids?: Set<string>) {
  const nodes = doc.nodes.filter((node) => !ids || ids.has(node.id));
  if (!nodes.length) return undefined;
  const boxes = nodes.map((node) => ({ node, geo: circuitGeometry(node) }));
  const left = Math.min(...boxes.map(({ node }) => node.x)),
    top = Math.min(...boxes.map(({ node }) => node.y - 22)),
    right = Math.max(...boxes.map(({ node, geo }) => node.x + geo.width)),
    bottom = Math.max(...boxes.map(({ node, geo }) => node.y + geo.height + 20));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
