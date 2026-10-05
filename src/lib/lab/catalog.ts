import { BUS_PARTS } from './catalog-bus';

/** Parts of the laboratory. Every part is one of a few behaviours (`kind`) with its own
 * look, pins and defaults. Variants of one real thing (colour, polarity, number of
 * digits) are properties of a single part, not separate parts. */
export type PartKind =
  | 'light'
  | 'bicolor'
  | 'scan'
  | 'number'
  | 'counter'
  | 'switch'
  | 'dial'
  | 'keypad'
  | 'encoder'
  | 'buzzer'
  | 'gauge'
  | 'stepper'
  | 'sr595'
  | 'sr165'
  | 'analyzer'
  | 'pulse'
  | 'uart'
  | 'bus';

export type PinDir = 'in' | 'out' | 'io' | 'vcc' | 'gnd';
/** `in` receives a level from the FPGA, `out` drives an FPGA input, `io` is a two-way open-drain line. */
export type PinDef = readonly [id: string, label: string, dir: PinDir];
export type PartOptions = Record<string, unknown>;
export type PropValue = string | number | boolean;

export interface PropOption {
  value: string | number;
  label: string;
}
/** One editable property of a part. Values live in `LabPart.opts` under `key`. */
export interface PartProp {
  key: string;
  label: string;
  type: 'color' | 'select' | 'bool' | 'number';
  /** The choices of a `select`, or the palette of a `color`. */
  options?: readonly PropOption[];
  min?: number;
  max?: number;
  default: PropValue;
  /** A line of explanation under the control. */
  hint?: string;
  /** Takes effect without restarting the design (speeds); colours always do. */
  live?: boolean;
}

/** What a part looks like for one set of property values. */
export interface Derived {
  pins?: readonly PinDef[];
  params?: Readonly<Record<string, unknown>>;
  shape?: string;
}
export interface Resolved {
  pins: readonly PinDef[];
  params: Readonly<Record<string, unknown>>;
  shape: string;
}

export interface PartDef {
  id: string;
  title: string;
  group: PartGroup;
  kind: PartKind;
  /** Pins for the default property values; see `partPins` for a part on the bench. */
  pins: readonly PinDef[];
  /** One sentence for the library: what it is and how it is driven. */
  note: string;
  shape: string;
  /** The part reacts to 0 instead of 1 (or outputs 0 when active). */
  activeLow?: boolean;
  params?: Readonly<Record<string, unknown>>;
  props?: readonly PartProp[];
  /** Pins, behaviour parameters and picture that depend on the property values. */
  derive?: (values: Readonly<Record<string, PropValue>>) => Derived;
}

export const PART_GROUPS = [
  'Светодиоды',
  'Индикаторы',
  'Кнопки и переключатели',
  'Датчики',
  'Звук и движение',
  'Микросхемы',
  'Приборы',
] as const;
export type PartGroup = (typeof PART_GROUPS)[number];

const ins = (...ids: string[]): PinDef[] => ids.map((id) => [id, id, 'in'] as const);
const outs = (...ids: string[]): PinDef[] => ids.map((id) => [id, id, 'out'] as const);
const numbered = (count: number, prefix = ''): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
const range = (from: number, to: number): PropOption[] =>
  Array.from({ length: to - from + 1 }, (_, index) => ({
    value: from + index,
    label: String(from + index),
  }));
const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];

export const LED_COLORS: readonly PropOption[] = [
  { value: '#ff3b30', label: 'Красный' },
  { value: '#34d058', label: 'Зелёный' },
  { value: '#ffd23f', label: 'Жёлтый' },
  { value: '#3d8bff', label: 'Синий' },
  { value: '#f4f7ff', label: 'Белый' },
  { value: '#ff8a1f', label: 'Оранжевый' },
  { value: '#ff5fa2', label: 'Розовый' },
  { value: '#a04060', label: 'Инфракрасный' },
];
export const CAP_COLORS: readonly PropOption[] = [
  { value: '#e5484d', label: 'Красная' },
  { value: '#30a46c', label: 'Зелёная' },
  { value: '#3e63dd', label: 'Синяя' },
  { value: '#f5c518', label: 'Жёлтая' },
  { value: '#f4f7ff', label: 'Белая' },
  { value: '#4a5056', label: 'Чёрная' },
];

const colorProp = (
  def = '#ff3b30',
  options: readonly PropOption[] = LED_COLORS,
  label = 'Цвет',
): PartProp => ({ key: 'color', label, type: 'color', options, default: def, live: true });
const activeLowProp = (label: string, hint?: string): PartProp => ({
  key: 'activeLow',
  label,
  type: 'bool',
  default: false,
  hint,
});
const commonProp: PartProp = {
  key: 'common',
  label: 'Общий вывод',
  type: 'select',
  options: [
    { value: 'cathode', label: 'Общий катод: сегмент горит при 1' },
    { value: 'anode', label: 'Общий анод: сегмент горит при 0' },
  ],
  default: 'cathode',
};

/** The value of a property: the saved one when it is valid, the default otherwise. */
export function sanitize(prop: PartProp, raw: unknown): PropValue {
  if (prop.type === 'bool') return typeof raw === 'boolean' ? raw : (prop.default as boolean);
  if (prop.type === 'number') {
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : (prop.default as number);
    return Math.min(prop.max ?? Infinity, Math.max(prop.min ?? -Infinity, value));
  }
  return prop.options?.some((option) => option.value === raw) ? (raw as PropValue) : prop.default;
}
export function propValue(def: PartDef, opts: PartOptions, key: string): PropValue | undefined {
  const prop = def.props?.find((item) => item.key === key);
  return prop ? sanitize(prop, opts[key]) : undefined;
}
const valuesOf = (def: PartDef, opts: PartOptions): Record<string, PropValue> =>
  Object.fromEntries((def.props ?? []).map((prop) => [prop.key, sanitize(prop, opts[prop.key])]));

const resolved = new Map<PartDef, Map<string, Resolved>>();
/** Pins, parameters and picture of a part with the given property values. */
export function resolvePart(def: PartDef, opts: PartOptions): Resolved {
  let byValues = resolved.get(def);
  if (!byValues) resolved.set(def, (byValues = new Map()));
  const values = valuesOf(def, opts);
  // Only the schema's own keys count: devices keep their running state in `opts` too.
  const key = JSON.stringify(values);
  let result = byValues.get(key);
  if (!result) {
    const derived = def.derive?.(values);
    result = {
      pins: derived?.pins ?? def.pins,
      params: { ...def.params, ...derived?.params },
      shape: derived?.shape ?? def.shape,
    };
    byValues.set(key, result);
  }
  return result;
}
/** Supply pins a part gets on the bench when the pupil wires the power by hand. */
export const POWER_PINS: readonly PinDef[] = [
  ['VCC', 'VCC', 'vcc'],
  ['GND', 'GND', 'gnd'],
];
/**
 * Pins of a part as it stands on the bench. The signal pins come from the part itself;
 * `opts.power` adds the two supply pins after them, so signal pin numbers never change.
 */
export const partPins = (def: PartDef, opts: PartOptions): readonly PinDef[] =>
  opts.power === true
    ? [...resolvePart(def, opts).pins, ...POWER_PINS]
    : resolvePart(def, opts).pins;

/** Properties that need the design to be rebuilt when they change (not looks or speeds). */
export function behaviourKey(def: PartDef, opts: PartOptions): string {
  return JSON.stringify(
    (def.props ?? [])
      .filter((prop) => !prop.live && prop.type !== 'color')
      .map((prop) => sanitize(prop, opts[prop.key])),
  );
}

type Source = Omit<PartDef, 'pins'> & { pins?: readonly PinDef[] };
/** Fills the default pins and parameters from the default property values. */
function part(source: Source): PartDef {
  const defaults = Object.fromEntries(
    (source.props ?? []).map((prop) => [prop.key, prop.default]),
  ) as Record<string, PropValue>;
  const derived = source.derive?.(defaults);
  return {
    ...source,
    pins: derived?.pins ?? source.pins ?? [],
    params: { ...source.params, ...derived?.params },
    shape: derived?.shape ?? source.shape,
  };
}

const toggle = (id: string, title: string, shape: string, note: string): PartDef =>
  part({
    id,
    title,
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape,
    pins: outs('OUT'),
    params: { keys: [''], momentary: false },
    props: [activeLowProp('Положение «вкл» даёт 0', 'Для переключателей, подтянутых к плюсу.')],
    note,
  });
const sensor = (id: string, title: string, icon: string, idle: string, hit: string): PartDef =>
  part({
    id: `sensor-${id}`,
    title,
    group: 'Датчики',
    kind: 'switch',
    shape: 'sensor',
    pins: outs('OUT'),
    params: { keys: [''], momentary: false, icon, idle, hit },
    note: `Цифровой модуль: выход 1, когда «${hit}». Состояние переключается щелчком.`,
  });
const gauge = (
  id: string,
  title: string,
  group: PartGroup,
  mode: string,
  pin: string,
  note: string,
): PartDef =>
  part({ id, title, group, kind: 'gauge', shape: mode, pins: ins(pin), params: { mode }, note });

const KEYPADS: Record<string, string[]> = {
  '4x4': ['123A', '456B', '789C', '*0#D'],
  '3x4': ['123', '456', '789', '*0#'],
  '1x4': ['ABCD'],
};
const MATRICES: Record<string, [columns: number, rows: number]> = { '8x8': [8, 8], '5x7': [5, 7] };
const HZ_OPTIONS = [1, 2, 10, 100, 1000, 10_000, 100_000, 1_000_000].map((value) => ({
  value,
  label: value >= 1000 ? `${value / 1000} кГц` : `${value} Гц`,
}));
const WINDOW_OPTIONS = [200, 2000, 20_000, 200_000, 2_000_000, 27_000_000].map((value) => ({
  value,
  label:
    value >= 27_000_000
      ? '1 с'
      : value >= 27_000
        ? `${(value / 27_000).toString().replace('.', ',')} мс`
        : `${(value / 27).toFixed(1).replace('.', ',')} мкс`,
}));

export const PARTS: readonly PartDef[] = [
  part({
    id: 'led',
    title: 'Светодиод',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'led',
    props: [
      colorProp(),
      activeLowProp('Горит при 0', 'Светодиод включён между плюсом и выводом. Резистор уже стоит.'),
    ],
    pins: ins('A'),
    note: 'Горит, когда на выводе 1. Цвет и полярность меняются в свойствах.',
  }),
  part({
    id: 'rgb',
    title: 'RGB-светодиод',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'rgb',
    props: [
      {
        ...commonProp,
        options: [
          { value: 'cathode', label: 'Общий катод: цвет горит при 1' },
          { value: 'anode', label: 'Общий анод: цвет горит при 0' },
        ],
      },
    ],
    derive: (v) => ({ params: { activeLow: v.common === 'anode' } }),
    pins: ins('R', 'G', 'B'),
    note: 'Три кристалла в одном корпусе: цвета смешиваются, яркость задаёт ШИМ.',
  }),
  part({
    id: 'bicolor',
    title: 'Двухцветный светодиод',
    group: 'Светодиоды',
    kind: 'bicolor',
    shape: 'bicolor',
    pins: ins('P', 'N'),
    note: 'Два вывода: при P=1, N=0 горит красный, при P=0, N=1 зелёный, при равных уровнях тёмный.',
  }),
  part({
    id: 'bar',
    title: 'Линейка светодиодов',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'bar',
    props: [
      {
        key: 'count',
        label: 'Число светодиодов',
        type: 'select',
        options: range(4, 10),
        default: 8,
      },
      colorProp('#34d058'),
    ],
    derive: (v) => ({ pins: ins(...numbered(v.count as number)) }),
    note: 'Независимые светодиоды в ряд: удобно смотреть байт, уровень, бегущий огонь.',
  }),
  part({
    id: 'ring',
    title: 'Кольцо из 12 светодиодов',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'ring',
    props: [colorProp('#34d058')],
    pins: ins(...numbered(12)),
    note: 'Двенадцать светодиодов по кругу, как на циферблате: бегущий огонь, часы.',
  }),
  part({
    id: 'traffic',
    title: 'Светофор',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'traffic',
    pins: ins('R', 'Y', 'G'),
    note: 'Красный, жёлтый, зелёный — для конечных автоматов.',
  }),
  part({
    id: 'laser',
    title: 'Лазерный модуль',
    group: 'Светодиоды',
    kind: 'light',
    shape: 'laser',
    props: [colorProp('#ff2a2a', LED_COLORS.slice(0, 4))],
    pins: ins('S'),
    note: 'Луч включён, пока на входе 1.',
  }),
  part({
    id: 'seg1',
    title: 'Индикатор, 1 разряд',
    group: 'Индикаторы',
    kind: 'light',
    shape: 'seg',
    props: [colorProp(), commonProp],
    derive: (v) => ({ params: { activeLow: v.common === 'anode' } }),
    pins: ins(...SEGMENTS),
    note: 'Семь сегментов и точка: каждый сегмент — отдельный вход.',
  }),
  part({
    id: 'segn',
    title: 'Индикатор, несколько разрядов',
    group: 'Индикаторы',
    kind: 'scan',
    shape: 'seg',
    props: [
      { key: 'digits', label: 'Число разрядов', type: 'select', options: range(2, 4), default: 4 },
      colorProp(),
      commonProp,
    ],
    derive: (v) => ({
      pins: [...ins(...SEGMENTS), ...ins(...numbered(v.digits as number, 'D'))],
      params: {
        lines: SEGMENTS.length,
        lineActive: v.common === 'anode' ? 0 : 1,
        selectActive: v.common === 'anode' ? 1 : 0,
      },
    }),
    note: 'Динамическая индикация: сегменты общие, разряды D1… включаются по очереди.',
  }),
  part({
    id: 'matrix',
    title: 'Светодиодная матрица',
    group: 'Индикаторы',
    kind: 'scan',
    shape: 'matrix',
    props: [
      {
        key: 'size',
        label: 'Размер',
        type: 'select',
        options: [
          { value: '8x8', label: '8×8 точек' },
          { value: '5x7', label: '5×7 точек (знакоместо)' },
        ],
        default: '8x8',
      },
      colorProp(),
    ],
    derive: (v) => {
      const [columns, rows] = MATRICES[v.size as string];
      return {
        pins: [...ins(...numbered(columns, 'C')), ...ins(...numbered(rows, 'R'))],
        params: { lines: columns, lineActive: 0, selectActive: 1 },
      };
    },
    note: 'Точка горит, когда её строка R = 1, а столбец C = 0. Строки перебирают по очереди.',
  }),
  part({
    id: 'hex-display',
    title: 'Шестнадцатеричный индикатор',
    group: 'Индикаторы',
    kind: 'number',
    shape: 'hex',
    pins: ins('D0', 'D1', 'D2', 'D3'),
    params: { base: 16 },
    note: 'Сам расшифровывает 4 бита в цифру 0–F: не нужен дешифратор.',
  }),
  part({
    id: 'bcd7',
    title: 'Индикатор с дешифратором',
    group: 'Индикаторы',
    kind: 'number',
    shape: 'bcd7',
    props: [colorProp()],
    pins: ins('D0', 'D1', 'D2', 'D3'),
    params: { base: 10 },
    note: 'Семисегментная цифра со встроенным дешифратором BCD: цифры 0–9, остальное гаснет.',
  }),
  part({
    id: 'byte-display',
    title: 'Индикатор байта',
    group: 'Индикаторы',
    kind: 'number',
    shape: 'byte',
    pins: ins(...numbered(8).map((_, index) => `D${index}`)),
    params: { base: 10 },
    note: 'Показывает 8 бит как число: десятичное, шестнадцатеричное и двоичное.',
  }),
  part({
    id: 'counter',
    title: 'Счётчик импульсов',
    group: 'Индикаторы',
    kind: 'counter',
    shape: 'counter',
    props: [
      { key: 'digits', label: 'Число разрядов', type: 'select', options: range(2, 6), default: 4 },
    ],
    derive: (v) => ({ params: { digits: v.digits } }),
    pins: ins('CLK', 'RST'),
    note: 'Считает фронты на CLK: от 0 до заданного числа разрядов; 1 на RST обнуляет счёт.',
  }),
  part({
    id: 'button',
    title: 'Кнопка',
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'button',
    props: [
      colorProp('#e5484d', CAP_COLORS, 'Цвет колпачка'),
      {
        key: 'size',
        label: 'Размер',
        type: 'select',
        options: [
          { value: 'normal', label: 'Обычная' },
          { value: 'large', label: 'Большая (аркадная)' },
        ],
        default: 'normal',
      },
      {
        key: 'latching',
        label: 'С фиксацией',
        type: 'bool',
        default: false,
        hint: 'Нажатие включает, следующее выключает — как кнопка с защёлкой.',
      },
      activeLowProp('Нажата = 0', 'Кнопка соединяет вывод с землёй.'),
    ],
    derive: (v) => ({
      shape: v.size === 'large' ? 'arcade' : 'button',
      params: { keys: [''], momentary: !v.latching },
    }),
    pins: outs('OUT'),
    note: 'Пока нажата — на выходе 1. Цвет, фиксация и уровень меняются в свойствах.',
  }),
  toggle('sw-slide', 'Ползунковый переключатель', 'slide', 'Остаётся в положении: 1 или 0.'),
  toggle('sw-toggle', 'Тумблер', 'toggle', 'Рычажок: вверх 1, вниз 0.'),
  toggle('sw-rocker', 'Клавишный выключатель', 'rocker', 'Клавиша: включён 1, выключен 0.'),
  part({
    id: 'dip',
    title: 'DIP-переключатель',
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'dip',
    props: [
      { key: 'count', label: 'Число движков', type: 'select', options: range(2, 8), default: 4 },
      activeLowProp('Вниз = 1, вверх = 0'),
    ],
    derive: (v) => ({
      pins: outs(...numbered(v.count as number)),
      params: { keys: numbered(v.count as number), momentary: false },
    }),
    note: 'Каждый движок — отдельный выход: вверх 1, вниз 0.',
  }),
  part({
    id: 'keypad',
    title: 'Матричная клавиатура',
    group: 'Кнопки и переключатели',
    kind: 'keypad',
    shape: 'keypad',
    props: [
      {
        key: 'layout',
        label: 'Раскладка',
        type: 'select',
        options: [
          { value: '4x4', label: '4×4, цифры и буквы A–D' },
          { value: '3x4', label: '3×4, телефонная' },
          { value: '1x4', label: '1×4, плёночная' },
        ],
        default: '4x4',
      },
    ],
    derive: (v) => {
      const keys = KEYPADS[v.layout as string];
      return {
        pins: [...ins(...numbered(keys.length, 'R')), ...outs(...numbered(keys[0].length, 'C'))],
        params: { keys },
      };
    },
    note: 'Подайте 0 на одну строку R и читайте столбцы C: 0 там, где нажата клавиша.',
  }),
  part({
    id: 'encoder',
    title: 'Энкодер с кнопкой',
    group: 'Кнопки и переключатели',
    kind: 'encoder',
    shape: 'encoder',
    props: [
      {
        key: 'gap',
        label: 'Пауза между фазами, тактов',
        type: 'number',
        min: 2,
        max: 1_000_000,
        default: 20_000,
        live: true,
        hint: 'Чем меньше, тем быстрее «вращают» ручку.',
      },
    ],
    pins: outs('A', 'B', 'SW'),
    note: 'Поворот даёт два сдвинутых импульса A и B: по порядку фронтов видно направление.',
  }),
  part({
    id: 'joystick',
    title: 'Джойстик на 5 направлений',
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'joystick',
    pins: outs('UP', 'DN', 'LT', 'RT', 'OK'),
    params: { keys: ['↑', '↓', '←', '→', '●'], momentary: true },
    note: 'Пять кнопок под одним рычажком.',
  }),
  part({
    id: 'rotary',
    title: 'Кодовый переключатель',
    group: 'Кнопки и переключатели',
    kind: 'dial',
    shape: 'thumbwheel',
    props: [
      {
        key: 'range',
        label: 'Положения',
        type: 'select',
        options: [
          { value: 9, label: '0–9, двоично-десятичный код' },
          { value: 15, label: '0–F, шестнадцатеричный код' },
        ],
        default: 9,
      },
    ],
    derive: (v) => ({ params: { max: v.range } }),
    pins: outs('1', '2', '4', '8'),
    note: 'Цифра выдаётся четырьмя битами: кнопки «−» и «+» меняют положение.',
  }),
  part({
    id: 'const',
    title: 'Постоянный уровень',
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'const',
    props: [
      {
        key: 'level',
        label: 'Уровень',
        type: 'select',
        options: [
          { value: '1', label: 'Логическая 1 (3,3 В)' },
          { value: '0', label: 'Логический 0 (земля)' },
        ],
        default: '1',
      },
    ],
    derive: (v) => ({
      pins: [['OUT', v.level as string, 'out']],
      params: { keys: [''], fixed: Number(v.level) },
    }),
    note: 'Подаёт на вход схемы постоянную единицу или ноль.',
  }),
  sensor('pir', 'Датчик движения', '🚶', 'пусто', 'движение'),
  sensor('reed', 'Геркон', '🧲', 'магнита нет', 'магнит рядом'),
  sensor('tilt', 'Датчик наклона', '↗', 'ровно', 'наклон'),
  sensor('touch', 'Сенсорная кнопка', '☝', 'не тронут', 'касание'),
  sensor('gate', 'Оптический щелевой датчик', '▯', 'щель свободна', 'щель закрыта'),
  sensor('hall', 'Датчик Холла', 'Ⓗ', 'поля нет', 'поле есть'),
  sensor('limit', 'Концевой выключатель', '⏹', 'отпущен', 'упор'),
  sensor('obstacle', 'ИК-датчик препятствия', '▮', 'свободно', 'препятствие'),
  sensor('flame', 'Датчик пламени', '🔥', 'огня нет', 'огонь'),
  sensor('sound', 'Датчик звука', '🔊', 'тихо', 'хлопок'),
  sensor('water', 'Датчик уровня воды', '💧', 'сухо', 'вода'),
  sensor('vibration', 'Датчик вибрации', '〰', 'покой', 'удар'),
  sensor('light', 'Датчик освещённости', '☀', 'темно', 'светло'),
  sensor('line', 'Датчик линии', '▬', 'белое', 'линия'),
  part({
    id: 'buzzer',
    title: 'Зуммер',
    group: 'Звук и движение',
    kind: 'buzzer',
    shape: 'buzzer',
    props: [
      {
        key: 'type',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'active', label: 'Активный: пищит сам при 1' },
          { value: 'passive', label: 'Пассивный: звучит с частотой сигнала' },
        ],
        default: 'active',
      },
    ],
    derive: (v) => ({ params: { active: v.type === 'active' } }),
    pins: ins('S'),
    note: 'Активный пищит сам, пока на входе 1; пассивный воспроизводит поданный меандр.',
  }),
  gauge('relay', 'Реле', 'Звук и движение', 'relay', 'IN', 'Контакты замыкаются при 1 на входе.'),
  gauge(
    'motor',
    'Мотор с драйвером',
    'Звук и движение',
    'motor',
    'PWM',
    'Скорость задаёт заполнение ШИМ.',
  ),
  gauge('fan', 'Вентилятор', 'Звук и движение', 'fan', 'PWM', 'Обороты растут с заполнением ШИМ.'),
  gauge(
    'vibro',
    'Вибромотор',
    'Звук и движение',
    'vibro',
    'IN',
    'Вибрирует, пока на входе 1; сила — по ШИМ.',
  ),
  gauge(
    'servo',
    'Сервопривод',
    'Звук и движение',
    'servo',
    'PWM',
    'Угол задаёт длина импульса: 1 мс — 0°, 2 мс — 180°, период 20 мс.',
  ),
  part({
    id: 'stepper',
    title: 'Шаговый мотор с драйвером',
    group: 'Звук и движение',
    kind: 'stepper',
    shape: 'stepper',
    pins: ins('IN1', 'IN2', 'IN3', 'IN4'),
    note: 'Вал делает шаг, когда единица переходит на соседнюю обмотку.',
  }),
  part({
    id: 'sr595',
    title: '74HC595 со светодиодами',
    group: 'Микросхемы',
    kind: 'sr595',
    shape: 'sr595',
    pins: [...ins('DS', 'SHCP', 'STCP'), ...outs('Q7S')],
    note: 'Сдвиговый регистр: бит с DS вдвигается по фронту SHCP, фронт STCP выводит 8 бит на светодиоды.',
  }),
  part({
    id: 'sr165',
    title: '74HC165 с переключателями',
    group: 'Микросхемы',
    kind: 'sr165',
    shape: 'sr165',
    pins: [...ins('PL', 'CP'), ...outs('Q7')],
    note: 'Читает 8 переключателей по одному проводу: 0 на PL запоминает их, фронты CP выдвигают биты на Q7.',
  }),
  gauge(
    'probe',
    'Логический пробник',
    'Приборы',
    'probe',
    'IN',
    'Показывает уровень, заполнение и частоту сигнала.',
  ),
  gauge(
    'freq-counter',
    'Частотомер',
    'Приборы',
    'freq',
    'IN',
    'Частота сигнала в герцах по времени платы.',
  ),
  gauge(
    'voltmeter',
    'Вольтметр',
    'Приборы',
    'volt',
    'IN',
    'Среднее напряжение на выводе: ШИМ 50% даёт 1,65 В.',
  ),
  part({
    id: 'analyzer',
    title: 'Логический анализатор',
    group: 'Приборы',
    kind: 'analyzer',
    shape: 'analyzer',
    props: [
      { key: 'channels', label: 'Число каналов', type: 'select', options: range(2, 8), default: 4 },
      {
        key: 'window',
        label: 'Окно просмотра',
        type: 'select',
        options: WINDOW_OPTIONS,
        default: 2000,
        live: true,
      },
    ],
    derive: (v) => ({ pins: ins(...numbered(v.channels as number)) }),
    note: 'Рисует временную диаграмму сигналов на выводах прямо во время работы.',
  }),
  part({
    id: 'pulse',
    title: 'Генератор импульсов',
    group: 'Приборы',
    kind: 'pulse',
    shape: 'pulse',
    props: [
      { key: 'hz', label: 'Частота', type: 'select', options: HZ_OPTIONS, default: 2, live: true },
    ],
    pins: outs('OUT'),
    note: 'Меандр заданной частоты на вход схемы.',
  }),
  part({
    id: 'uart',
    title: 'UART-терминал',
    group: 'Приборы',
    kind: 'uart',
    shape: 'uart',
    props: [
      {
        key: 'baud',
        label: 'Скорость, бод',
        type: 'select',
        options: [9600, 19200, 57600, 115200, 230400, 1_000_000].map((value) => ({
          value,
          label: String(value),
        })),
        default: 115200,
        live: true,
      },
    ],
    pins: [...ins('RX'), ...outs('TX')],
    note: 'Показывает байты, пришедшие на RX, и отправляет набранный текст с TX. 8N1.',
  }),
  ...BUS_PARTS,
];

export const partById = new Map(PARTS.map((item) => [item.id, item]));
