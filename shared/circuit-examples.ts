import {
  emptyCircuit,
  newLibraryNode,
  type CircuitDocument,
  type CircuitNode,
  type Params,
} from './schematic';

export interface CircuitExample {
  id: string;
  title: string;
  description: string;
  /** Что увидит ученик на плате. */
  behavior: string;
  build(): CircuitDocument;
}

/** Небольшой помощник: расставляет элементы по именам и соединяет контакты текстом «имя.КОНТАКТ». */
function sketch(
  items: [entry: string, name: string, x: number, y: number, params?: Params][],
  links: [from: string, to: string][],
): CircuitDocument {
  const doc = emptyCircuit(),
    byName = new Map<string, CircuitNode>();
  for (const [entry, name, x, y, params] of items) {
    const node = newLibraryNode(doc, entry);
    node.name = name;
    node.x = x;
    node.y = y;
    node.params = { ...node.params, ...params };
    doc.nodes.push(node);
    byName.set(name, node);
  }
  links.forEach(([from, to], index) => {
    const [fromName, fromPin] = from.split('.'),
      [toName, toPin] = to.split('.');
    doc.wires.push({
      id: `w${index + 1}`,
      from: { node: byName.get(fromName)!.id, pin: fromPin },
      to: { node: byName.get(toName)!.id, pin: toPin },
    });
  });
  return doc;
}

export const circuitExamples: CircuitExample[] = [
  {
    id: 'button-led',
    title: 'Кнопка → светодиод',
    description: 'Самая простая схема: пока нажата S1, светится LED0.',
    behavior: 'Нажмите S1 — загорается LED0. Отпустите — гаснет.',
    build: () =>
      sketch(
        [
          ['s1', 's1', 80, 120],
          ['led', 'led0', 360, 120, { index: 0 }],
        ],
        [['s1.Y', 'led0.A']],
      ),
  },
  {
    id: 'two-buttons-gates',
    title: 'И, ИЛИ, исключающее ИЛИ на двух кнопках',
    description: 'Две кнопки и три элемента: каждый показывает результат на своём светодиоде.',
    behavior: 'LED0 — обе кнопки нажаты (И); LED1 — хотя бы одна (ИЛИ); LED2 — ровно одна (XOR).',
    build: () =>
      sketch(
        [
          ['s1', 's1', 60, 60],
          ['s2', 's2', 60, 220],
          ['and', 'both', 280, 40],
          ['or', 'either', 280, 140],
          ['xor', 'different', 280, 240],
          ['led', 'led0', 520, 40, { index: 0 }],
          ['led', 'led1', 520, 140, { index: 1 }],
          ['led', 'led2', 520, 240, { index: 2 }],
        ],
        [
          ['s1.Y', 'both.A'],
          ['s2.Y', 'both.B'],
          ['s1.Y', 'either.A'],
          ['s2.Y', 'either.B'],
          ['s1.Y', 'different.A'],
          ['s2.Y', 'different.B'],
          ['both.Y', 'led0.A'],
          ['either.Y', 'led1.A'],
          ['different.Y', 'led2.A'],
        ],
      ),
  },
  {
    id: 'blinker',
    title: 'Мигалка 1 Гц',
    description: 'Делитель частоты превращает 27 МГц в ровное мигание раз в секунду.',
    behavior: 'LED0 сам мигает: полсекунды горит, полсекунды не горит. Кнопки не нужны.',
    build: () =>
      sketch(
        [
          ['clock27', 'clk', 60, 100],
          ['divider', 'blink', 260, 90, { mode: 'square', hz: 1 }],
          ['led', 'led0', 520, 100, { index: 0 }],
        ],
        [
          ['clk.Y', 'blink.CLK'],
          ['blink.Y', 'led0.A'],
        ],
      ),
  },
  {
    id: 'led-counter',
    title: 'Счётчик на светодиодах',
    description:
      'Раз в четверть секунды счётчик увеличивается на 1; число показано на шести светодиодах двоичным кодом.',
    behavior:
      'Светодиоды считают от 0 до 63 в двоичном коде и начинают заново. Кнопка S1 обнуляет счёт.',
    build: () =>
      sketch(
        [
          ['clock27', 'clk', 40, 100],
          ['pulse', 'tick', 220, 60, { mode: 'pulse', hz: 4 }],
          ['s1', 's1', 40, 260],
          ['counter', 'count', 420, 100, { width: 6, enable: true, sclr: true }],
          ['ledbank', 'leds', 680, 140],
        ],
        [
          ['clk.Y', 'tick.CLK'],
          ['clk.Y', 'count.CLK'],
          ['tick.Y', 'count.EN'],
          ['s1.Y', 'count.CLR'],
          ['count.Q', 'leds.A'],
        ],
      ),
  },
  {
    id: 'running-light',
    title: 'Бегущий огонь на сдвиговом регистре',
    description: 'Единица «бежит» по шести светодиодам и возвращается в начало.',
    behavior: 'Один светящийся светодиод перемещается от LED0 к LED5 примерно три раза в секунду.',
    build: () =>
      sketch(
        [
          ['clock27', 'clk', 40, 80],
          ['pulse', 'tick', 200, 60, { mode: 'pulse', hz: 3 }],
          ['shreg', 'ring', 420, 80, { width: 6, dir: 'left', enable: true, init: true }],
          ['slice', 'low_bits', 600, 280, { inWidth: 6, lo: 0, hi: 4 }],
          ['reduce-or', 'all_zero', 820, 280, { invert: true, width: 5 }],
          ['ledbank', 'leds', 680, 100],
        ],
        [
          ['clk.Y', 'tick.CLK'],
          ['clk.Y', 'ring.CLK'],
          ['tick.Y', 'ring.EN'],
          ['ring.Q', 'leds.A'],
          ['ring.Q', 'low_bits.A'],
          ['low_bits.Y', 'all_zero.A'],
          ['all_zero.Y', 'ring.SI'],
        ],
      ),
  },
  {
    id: 'debounced-toggle',
    title: 'Кнопка с антидребезгом переключает светодиод',
    description:
      'Кнопку «чистят» синхронизатором и антидребезгом; каждое нажатие меняет состояние LED0 на противоположное.',
    behavior: 'Каждое нажатие S1 включает или выключает LED0, без случайных двойных срабатываний.',
    build: () =>
      sketch(
        [
          ['clock27', 'clk', 40, 40],
          ['s1', 's1', 40, 200],
          ['sync2', 'sync', 220, 180],
          ['debounce', 'clean', 400, 180, { ms: 10 }],
          ['edge', 'press', 580, 180],
          ['tff', 'toggle', 760, 180, { init: true }],
          ['led', 'led0', 960, 190, { index: 0 }],
        ],
        [
          ['clk.Y', 'sync.CLK'],
          ['clk.Y', 'clean.CLK'],
          ['clk.Y', 'press.CLK'],
          ['clk.Y', 'toggle.CLK'],
          ['s1.Y', 'sync.D'],
          ['sync.Q', 'clean.D'],
          ['clean.Q', 'press.D'],
          ['press.P', 'toggle.T'],
          ['toggle.Q', 'led0.A'],
        ],
      ),
  },
];
