import { BUS_PARTS } from './catalog-bus';
import { language, t } from '../../../shared/i18n';

/** Parts of the laboratory. Every part is one of a few behaviours (`kind`) with its own
 * look, pins and defaults. Variants of one real thing (colour, polarity, number of
 * digits) are properties of a single part, not separate parts. */
export type PartKind =
  | 'breadboard'
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
  'Макетные платы',
  'Светодиоды',
  'Индикаторы',
  'Кнопки и переключатели',
  'Датчики',
  'Звук и движение',
  'Микросхемы',
  'Приборы',
] as const;
export type PartGroup = (typeof PART_GROUPS)[number];

/** A number as text: the Russian decimal comma, or the point in English. */
export const decimal = (text: string): string =>
  language() === 'en' ? text : text.replace('.', ',');
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
  { value: '#ff3b30', label: t('Красный') },
  { value: '#34d058', label: t('Зелёный') },
  { value: '#ffd23f', label: t('Жёлтый') },
  { value: '#3d8bff', label: t('Синий') },
  { value: '#f4f7ff', label: t('Белый') },
  { value: '#ff8a1f', label: t('Оранжевый') },
  { value: '#ff5fa2', label: t('Розовый') },
  { value: '#a04060', label: t('Инфракрасный') },
];
export const CAP_COLORS: readonly PropOption[] = [
  { value: '#e5484d', label: t('Красная') },
  { value: '#30a46c', label: t('Зелёная') },
  { value: '#3e63dd', label: t('Синяя') },
  { value: '#f5c518', label: t('Жёлтая') },
  { value: '#f4f7ff', label: t('Белая') },
  { value: '#4a5056', label: t('Чёрная') },
];

const colorProp = (
  def = '#ff3b30',
  options: readonly PropOption[] = LED_COLORS,
  label = t('Цвет'),
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
  label: t('Общий вывод'),
  type: 'select',
  options: [
    { value: 'cathode', label: t('Общий катод: сегмент горит при 1') },
    { value: 'anode', label: t('Общий анод: сегмент горит при 0') },
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
/** Supply pins every part has on the bench: it works only when both are wired. */
export const POWER_PINS: readonly PinDef[] = [
  ['VCC', 'VCC', 'vcc'],
  ['GND', 'GND', 'gnd'],
];
/**
 * Pins of a part as it stands on the bench. The signal pins come from the part itself and
 * the two supply pins follow them, so signal pin numbers never change. A breadboard has holes,
 * not pins.
 */
export function partPins(def: PartDef, opts: PartOptions): readonly PinDef[] {
  if (def.kind === 'breadboard') return NO_PINS;
  const own = resolvePart(def, opts).pins;
  // The same properties give the very same list, so that lists can be compared cheaply.
  let full = withSupply.get(own);
  if (!full) withSupply.set(own, (full = [...own, ...POWER_PINS]));
  return full;
}
const NO_PINS: readonly PinDef[] = [];
const withSupply = new WeakMap<readonly PinDef[], readonly PinDef[]>();

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
    props: [
      activeLowProp(t('Положение «вкл» даёт 0'), t('Для переключателей, подтянутых к плюсу.')),
    ],
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
    note: t('Цифровой модуль: выход 1, когда «{hit}». Состояние переключается щелчком.', { hit }),
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
  label: value >= 1000 ? t('{n} кГц', { n: value / 1000 }) : t('{n} Гц', { n: value }),
}));
const WINDOW_OPTIONS = [200, 2000, 20_000, 200_000, 2_000_000, 27_000_000].map((value) => ({
  value,
  label:
    value >= 27_000_000
      ? t('1 с')
      : value >= 27_000
        ? t('{n} мс', { n: decimal((value / 27_000).toString()) })
        : t('{n} мкс', { n: decimal((value / 27).toFixed(1)) }),
}));

export const PARTS: readonly PartDef[] = [
  part({
    id: 'breadboard',
    title: t('Макетная плата'),
    group: 'Макетные платы',
    kind: 'breadboard',
    shape: 'breadboard',
    props: [
      {
        key: 'columns',
        label: t('Размер'),
        type: 'select',
        options: [
          { value: 30, label: t('Половинка · 30 столбцов') },
          { value: 63, label: t('Полноразмерная · 63 столбца') },
        ],
        default: 30,
      },
    ],
    derive: (values) => ({ params: { columns: values.columns } }),
    note: t(
      'Беспаечная плата: деталь ставят ножками в отверстия, а отверстия соединяют проводами с контактами платы. Пять отверстий столбца a–e (и f–j) соединены, длинные полосы по краям — шины питания.',
    ),
  }),
  part({
    id: 'led',
    title: t('Светодиод'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'led',
    props: [
      colorProp(),
      activeLowProp(
        t('Горит при 0'),
        t('Светодиод включён между плюсом и выводом. Резистор уже стоит.'),
      ),
    ],
    pins: ins('A'),
    note: t('Горит, когда на выводе 1. Цвет и полярность меняются в свойствах.'),
  }),
  part({
    id: 'rgb',
    title: t('RGB-светодиод'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'rgb',
    props: [
      {
        ...commonProp,
        options: [
          { value: 'cathode', label: t('Общий катод: цвет горит при 1') },
          { value: 'anode', label: t('Общий анод: цвет горит при 0') },
        ],
      },
    ],
    derive: (v) => ({ params: { activeLow: v.common === 'anode' } }),
    pins: ins('R', 'G', 'B'),
    note: t('Три кристалла в одном корпусе: цвета смешиваются, яркость задаёт ШИМ.'),
  }),
  part({
    id: 'bicolor',
    title: t('Двухцветный светодиод'),
    group: 'Светодиоды',
    kind: 'bicolor',
    shape: 'bicolor',
    pins: ins('P', 'N'),
    note: t(
      'Два вывода: при P=1, N=0 горит красный, при P=0, N=1 зелёный, при равных уровнях тёмный.',
    ),
  }),
  part({
    id: 'bar',
    title: t('Линейка светодиодов'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'bar',
    props: [
      {
        key: 'count',
        label: t('Число светодиодов'),
        type: 'select',
        options: range(4, 10),
        default: 8,
      },
      colorProp('#34d058'),
    ],
    derive: (v) => ({ pins: ins(...numbered(v.count as number)) }),
    note: t('Независимые светодиоды в ряд: удобно смотреть байт, уровень, бегущий огонь.'),
  }),
  part({
    id: 'ring',
    title: t('Кольцо из 12 светодиодов'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'ring',
    props: [colorProp('#34d058')],
    pins: ins(...numbered(12)),
    note: t('Двенадцать светодиодов по кругу, как на циферблате: бегущий огонь, часы.'),
  }),
  part({
    id: 'traffic',
    title: t('Светофор'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'traffic',
    pins: ins('R', 'Y', 'G'),
    note: t('Красный, жёлтый, зелёный — для конечных автоматов.'),
  }),
  part({
    id: 'laser',
    title: t('Лазерный модуль'),
    group: 'Светодиоды',
    kind: 'light',
    shape: 'laser',
    props: [colorProp('#ff2a2a', LED_COLORS.slice(0, 4))],
    pins: ins('S'),
    note: t('Луч включён, пока на входе 1.'),
  }),
  part({
    id: 'seg1',
    title: t('Индикатор, 1 разряд'),
    group: 'Индикаторы',
    kind: 'light',
    shape: 'seg',
    props: [colorProp(), commonProp],
    derive: (v) => ({ params: { activeLow: v.common === 'anode' } }),
    pins: ins(...SEGMENTS),
    note: t('Семь сегментов и точка: каждый сегмент — отдельный вход.'),
  }),
  part({
    id: 'segn',
    title: t('Индикатор, несколько разрядов'),
    group: 'Индикаторы',
    kind: 'scan',
    shape: 'seg',
    props: [
      {
        key: 'digits',
        label: t('Число разрядов'),
        type: 'select',
        options: range(2, 4),
        default: 4,
      },
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
    note: t('Динамическая индикация: сегменты общие, разряды D1… включаются по очереди.'),
  }),
  part({
    id: 'matrix',
    title: t('Светодиодная матрица'),
    group: 'Индикаторы',
    kind: 'scan',
    shape: 'matrix',
    props: [
      {
        key: 'size',
        label: t('Размер'),
        type: 'select',
        options: [
          { value: '8x8', label: t('8×8 точек') },
          { value: '5x7', label: t('5×7 точек (знакоместо)') },
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
    note: t('Точка горит, когда её строка R = 1, а столбец C = 0. Строки перебирают по очереди.'),
  }),
  part({
    id: 'hex-display',
    title: t('Шестнадцатеричный индикатор'),
    group: 'Индикаторы',
    kind: 'number',
    shape: 'hex',
    pins: ins('D0', 'D1', 'D2', 'D3'),
    params: { base: 16 },
    note: t('Сам расшифровывает 4 бита в цифру 0–F: не нужен дешифратор.'),
  }),
  part({
    id: 'bcd7',
    title: t('Индикатор с дешифратором'),
    group: 'Индикаторы',
    kind: 'number',
    shape: 'bcd7',
    props: [colorProp()],
    pins: ins('D0', 'D1', 'D2', 'D3'),
    params: { base: 10 },
    note: t('Семисегментная цифра со встроенным дешифратором BCD: цифры 0–9, остальное гаснет.'),
  }),
  part({
    id: 'byte-display',
    title: t('Индикатор байта'),
    group: 'Индикаторы',
    kind: 'number',
    shape: 'byte',
    pins: ins(...numbered(8).map((_, index) => `D${index}`)),
    params: { base: 10 },
    note: t('Показывает 8 бит как число: десятичное, шестнадцатеричное и двоичное.'),
  }),
  part({
    id: 'counter',
    title: t('Счётчик импульсов'),
    group: 'Индикаторы',
    kind: 'counter',
    shape: 'counter',
    props: [
      {
        key: 'digits',
        label: t('Число разрядов'),
        type: 'select',
        options: range(2, 6),
        default: 4,
      },
    ],
    derive: (v) => ({ params: { digits: v.digits } }),
    pins: ins('CLK', 'RST'),
    note: t('Считает фронты на CLK: от 0 до заданного числа разрядов; 1 на RST обнуляет счёт.'),
  }),
  part({
    id: 'button',
    title: t('Кнопка'),
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'button',
    props: [
      colorProp('#e5484d', CAP_COLORS, t('Цвет колпачка')),
      {
        key: 'size',
        label: t('Размер'),
        type: 'select',
        options: [
          { value: 'normal', label: t('Обычная') },
          { value: 'large', label: t('Большая (аркадная)') },
        ],
        default: 'normal',
      },
      {
        key: 'latching',
        label: t('С фиксацией'),
        type: 'bool',
        default: false,
        hint: t('Нажатие включает, следующее выключает — как кнопка с защёлкой.'),
      },
      activeLowProp(t('Нажата = 0'), t('Кнопка соединяет вывод с землёй.')),
    ],
    derive: (v) => ({
      shape: v.size === 'large' ? 'arcade' : 'button',
      params: { keys: [''], momentary: !v.latching },
    }),
    pins: outs('OUT'),
    note: t('Пока нажата — на выходе 1. Цвет, фиксация и уровень меняются в свойствах.'),
  }),
  toggle('sw-slide', t('Ползунковый переключатель'), 'slide', t('Остаётся в положении: 1 или 0.')),
  toggle('sw-toggle', t('Тумблер'), 'toggle', t('Рычажок: вверх 1, вниз 0.')),
  toggle('sw-rocker', t('Клавишный выключатель'), 'rocker', t('Клавиша: включён 1, выключен 0.')),
  part({
    id: 'dip',
    title: t('DIP-переключатель'),
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'dip',
    props: [
      { key: 'count', label: t('Число движков'), type: 'select', options: range(2, 8), default: 4 },
      activeLowProp(t('Вниз = 1, вверх = 0')),
    ],
    derive: (v) => ({
      pins: outs(...numbered(v.count as number)),
      params: { keys: numbered(v.count as number), momentary: false },
    }),
    note: t('Каждый движок — отдельный выход: вверх 1, вниз 0.'),
  }),
  part({
    id: 'keypad',
    title: t('Матричная клавиатура'),
    group: 'Кнопки и переключатели',
    kind: 'keypad',
    shape: 'keypad',
    props: [
      {
        key: 'layout',
        label: t('Раскладка'),
        type: 'select',
        options: [
          { value: '4x4', label: t('4×4, цифры и буквы A–D') },
          { value: '3x4', label: t('3×4, телефонная') },
          { value: '1x4', label: t('1×4, плёночная') },
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
    note: t('Подайте 0 на одну строку R и читайте столбцы C: 0 там, где нажата клавиша.'),
  }),
  part({
    id: 'encoder',
    title: t('Энкодер с кнопкой'),
    group: 'Кнопки и переключатели',
    kind: 'encoder',
    shape: 'encoder',
    props: [
      {
        key: 'gap',
        label: t('Пауза между фазами, тактов'),
        type: 'number',
        min: 2,
        max: 1_000_000,
        default: 20_000,
        live: true,
        hint: t('Чем меньше, тем быстрее «вращают» ручку.'),
      },
    ],
    pins: outs('A', 'B', 'SW'),
    note: t('Поворот даёт два сдвинутых импульса A и B: по порядку фронтов видно направление.'),
  }),
  part({
    id: 'joystick',
    title: t('Джойстик на 5 направлений'),
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'joystick',
    pins: outs('UP', 'DN', 'LT', 'RT', 'OK'),
    params: { keys: ['↑', '↓', '←', '→', '●'], momentary: true },
    note: t('Пять кнопок под одним рычажком.'),
  }),
  part({
    id: 'rotary',
    title: t('Кодовый переключатель'),
    group: 'Кнопки и переключатели',
    kind: 'dial',
    shape: 'thumbwheel',
    props: [
      {
        key: 'range',
        label: t('Положения'),
        type: 'select',
        options: [
          { value: 9, label: t('0–9, двоично-десятичный код') },
          { value: 15, label: t('0–F, шестнадцатеричный код') },
        ],
        default: 9,
      },
    ],
    derive: (v) => ({ params: { max: v.range } }),
    pins: outs('1', '2', '4', '8'),
    note: t('Цифра выдаётся четырьмя битами: кнопки «−» и «+» меняют положение.'),
  }),
  part({
    id: 'const',
    title: t('Постоянный уровень'),
    group: 'Кнопки и переключатели',
    kind: 'switch',
    shape: 'const',
    props: [
      {
        key: 'level',
        label: t('Уровень'),
        type: 'select',
        options: [
          { value: '1', label: t('Логическая 1 (3,3 В)') },
          { value: '0', label: t('Логический 0 (земля)') },
        ],
        default: '1',
      },
    ],
    derive: (v) => ({
      pins: [['OUT', v.level as string, 'out']],
      params: { keys: [''], fixed: Number(v.level) },
    }),
    note: t('Подаёт на вход схемы постоянную единицу или ноль.'),
  }),
  sensor('pir', t('Датчик движения'), '🚶', t('пусто'), t('движение')),
  sensor('reed', t('Геркон'), '🧲', t('магнита нет'), t('магнит рядом')),
  sensor('tilt', t('Датчик наклона'), '↗', t('ровно'), t('наклон')),
  sensor('touch', t('Сенсорная кнопка'), '☝', t('не тронут'), t('касание')),
  sensor('gate', t('Оптический щелевой датчик'), '▯', t('щель свободна'), t('щель закрыта')),
  sensor('hall', t('Датчик Холла'), 'Ⓗ', t('поля нет'), t('поле есть')),
  sensor('limit', t('Концевой выключатель'), '⏹', t('отпущен'), t('упор')),
  sensor('obstacle', t('ИК-датчик препятствия'), '▮', t('свободно'), t('препятствие')),
  sensor('flame', t('Датчик пламени'), '🔥', t('огня нет'), t('огонь')),
  sensor('sound', t('Датчик звука'), '🔊', t('тихо'), t('хлопок')),
  sensor('water', t('Датчик уровня воды'), '💧', t('сухо'), t('вода')),
  sensor('vibration', t('Датчик вибрации'), '〰', t('покой'), t('удар')),
  sensor('light', t('Датчик освещённости'), '☀', t('темно'), t('светло')),
  sensor('line', t('Датчик линии'), '▬', t('белое'), t('линия')),
  sensor('collision', t('Датчик столкновения'), '⬤', t('свободно'), t('касание')),
  sensor('knock', t('Датчик удара KY-031'), '✊', t('тихо'), t('удар')),
  sensor('shock', t('Датчик встряски KY-002'), '≋', t('покой'), t('встряска')),
  sensor('mercury', t('Ртутный датчик наклона KY-017'), '◐', t('ровно'), t('наклон')),
  sensor('metal', t('Касание металла KY-036'), '⌁', t('нет касания'), t('касание')),
  sensor('radar', t('Радар движения RCWL-0516'), '◎', t('пусто'), t('движение')),
  sensor('door', t('Магнитный датчик двери MC-38'), '▥', t('дверь закрыта'), t('дверь открыта')),
  sensor('rain', t('Датчик дождя YL-83'), '☔', t('сухо'), t('дождь')),
  sensor('mq2', t('Датчик газа MQ-2'), '☁', t('воздух чистый'), t('газ')),
  sensor('mq3', t('Датчик алкоголя MQ-3'), '🍷', t('воздух чистый'), t('пары')),
  sensor('mq7', t('Датчик угарного газа MQ-7'), '☠', t('воздух чистый'), t('угарный газ')),
  sensor('mq135', t('Качество воздуха MQ-135'), '🌫', t('воздух чистый'), t('загрязнение')),
  sensor('heat', t('Датчик температуры KY-028'), '🌡', t('прохладно'), t('жарко')),
  sensor('hall49', t('Датчик Холла 49E'), 'Ⓗ', t('поля нет'), t('поле есть')),
  sensor('soil', t('Датчик влажности почвы'), '🌱', t('сухо'), t('влажно')),
  sensor('uv', t('УФ-датчик GUVA-S12SD'), '☼', t('нет УФ'), t('есть УФ')),
  part({
    id: 'buzzer',
    title: t('Зуммер'),
    group: 'Звук и движение',
    kind: 'buzzer',
    shape: 'buzzer',
    props: [
      {
        key: 'type',
        label: t('Тип'),
        type: 'select',
        options: [
          { value: 'active', label: t('Активный: пищит сам при 1') },
          { value: 'passive', label: t('Пассивный: звучит с частотой сигнала') },
        ],
        default: 'active',
      },
    ],
    derive: (v) => ({ params: { active: v.type === 'active' } }),
    pins: ins('S'),
    note: t('Активный пищит сам, пока на входе 1; пассивный воспроизводит поданный меандр.'),
  }),
  gauge(
    'relay',
    t('Реле'),
    'Звук и движение',
    'relay',
    'IN',
    t('Контакты замыкаются при 1 на входе.'),
  ),
  gauge(
    'motor',
    t('Мотор с драйвером'),
    'Звук и движение',
    'motor',
    'PWM',
    t('Скорость задаёт заполнение ШИМ.'),
  ),
  gauge(
    'fan',
    t('Вентилятор'),
    'Звук и движение',
    'fan',
    'PWM',
    t('Обороты растут с заполнением ШИМ.'),
  ),
  gauge(
    'vibro',
    t('Вибромотор'),
    'Звук и движение',
    'vibro',
    'IN',
    t('Вибрирует, пока на входе 1; сила — по ШИМ.'),
  ),
  gauge(
    'servo',
    t('Сервопривод'),
    'Звук и движение',
    'servo',
    'PWM',
    t('Угол задаёт длина импульса: 1 мс — 0°, 2 мс — 180°, период 20 мс.'),
  ),
  part({
    id: 'stepper',
    title: t('Шаговый мотор с драйвером'),
    group: 'Звук и движение',
    kind: 'stepper',
    shape: 'stepper',
    pins: ins('IN1', 'IN2', 'IN3', 'IN4'),
    note: t('Вал делает шаг, когда единица переходит на соседнюю обмотку.'),
  }),
  part({
    id: 'sr595',
    title: t('74HC595 со светодиодами'),
    group: 'Микросхемы',
    kind: 'sr595',
    shape: 'sr595',
    pins: [...ins('DS', 'SHCP', 'STCP'), ...outs('Q7S')],
    note: t(
      'Сдвиговый регистр: бит с DS вдвигается по фронту SHCP, фронт STCP выводит 8 бит на светодиоды.',
    ),
  }),
  part({
    id: 'sr165',
    title: t('74HC165 с переключателями'),
    group: 'Микросхемы',
    kind: 'sr165',
    shape: 'sr165',
    pins: [...ins('PL', 'CP'), ...outs('Q7')],
    note: t(
      'Читает 8 переключателей по одному проводу: 0 на PL запоминает их, фронты CP выдвигают биты на Q7.',
    ),
  }),
  gauge(
    'probe',
    t('Логический пробник'),
    'Приборы',
    'probe',
    'IN',
    t('Показывает уровень, заполнение и частоту сигнала.'),
  ),
  gauge(
    'freq-counter',
    t('Частотомер'),
    'Приборы',
    'freq',
    'IN',
    t('Частота сигнала в герцах по времени платы.'),
  ),
  gauge(
    'voltmeter',
    t('Вольтметр'),
    'Приборы',
    'volt',
    'IN',
    t('Среднее напряжение на выводе: ШИМ 50% даёт 1,65 В.'),
  ),
  part({
    id: 'analyzer',
    title: t('Логический анализатор'),
    group: 'Приборы',
    kind: 'analyzer',
    shape: 'analyzer',
    props: [
      {
        key: 'channels',
        label: t('Число каналов'),
        type: 'select',
        options: range(2, 8),
        default: 4,
      },
      {
        key: 'window',
        label: t('Окно просмотра'),
        type: 'select',
        options: WINDOW_OPTIONS,
        default: 2000,
        live: true,
      },
    ],
    derive: (v) => ({ pins: ins(...numbered(v.channels as number)) }),
    note: t('Рисует временную диаграмму сигналов на выводах прямо во время работы.'),
  }),
  part({
    id: 'pulse',
    title: t('Генератор импульсов'),
    group: 'Приборы',
    kind: 'pulse',
    shape: 'pulse',
    props: [
      {
        key: 'hz',
        label: t('Частота'),
        type: 'select',
        options: HZ_OPTIONS,
        default: 2,
        live: true,
      },
    ],
    pins: outs('OUT'),
    note: t('Меандр заданной частоты на вход схемы.'),
  }),
  part({
    id: 'uart',
    title: t('UART-терминал'),
    group: 'Приборы',
    kind: 'uart',
    shape: 'uart',
    props: [
      {
        key: 'baud',
        label: t('Скорость, бод'),
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
    note: t('Показывает байты, пришедшие на RX, и отправляет набранный текст с TX. 8N1.'),
  }),
  ...BUS_PARTS,
];

export const partById = new Map(PARTS.map((item) => [item.id, item]));
