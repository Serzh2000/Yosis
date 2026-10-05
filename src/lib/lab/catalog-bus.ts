import type { PartDef, PartProp, PinDef, PropOption, Resolved } from './catalog';

/**
 * Parts that talk over a bus or a protocol: displays, memories, sensors, remote controls. Each one
 * names its behaviour in `params.model` (see bus/index.ts); the picture is chosen by `shape`.
 * Pin direction is seen from the part: `in` receives the FPGA's level, `out` drives an FPGA
 * input, `io` is an open-drain line that both sides may pull low (it needs a pull-up, which the
 * laboratory supplies).
 */
const pin = (id: string, dir: PinDef[2], label = id): PinDef => [id, label, dir];
const i2c: PinDef[] = [pin('SDA', 'io'), pin('SCL', 'in')];

const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;
const addresses = (from: number, count: number): PropOption[] =>
  Array.from({ length: count }, (_, index) => ({
    value: from + index,
    label: hex(from + index),
  }));
const addressProp = (from: number, count: number, hint: string): PartProp => ({
  key: 'address',
  label: 'Адрес I²C',
  type: 'select',
  options: addresses(from, count),
  default: from,
  hint,
});

type Source = Omit<PartDef, 'pins' | 'kind'> & { pins?: readonly PinDef[] };
/** Fills the default pins and parameters from the default property values. */
function bus(model: string, source: Source): PartDef {
  const defaults = Object.fromEntries(
    (source.props ?? []).map((prop) => [prop.key, prop.default]),
  ) as Record<string, string | number | boolean>;
  const derived = source.derive?.(defaults);
  return {
    ...source,
    kind: 'bus',
    pins: derived?.pins ?? source.pins ?? [],
    params: { ...source.params, ...derived?.params, model },
    shape: derived?.shape ?? source.shape,
  };
}

const lcdSize: PartProp = {
  key: 'size',
  label: 'Размер',
  type: 'select',
  options: [
    { value: '16x2', label: '16 символов × 2 строки' },
    { value: '20x4', label: '20 символов × 4 строки' },
  ],
  default: '16x2',
};
const lcdGeometry = (values: Readonly<Record<string, string | number | boolean>>) => {
  const wide = values.size === '20x4';
  return { columns: wide ? 20 : 16, rows: wide ? 4 : 2 };
};

export const BUS_PARTS: PartDef[] = [
  bus('ssd1306', {
    id: 'oled-ssd1306',
    title: 'OLED-экран 128×64 (SSD1306)',
    group: 'Индикаторы',
    shape: 'bus-oled',
    pins: i2c,
    props: [addressProp(0x3c, 2, 'Обычно 0x3C; перемычка на плате меняет на 0x3D.')],
    note: 'Графический экран по I²C, адрес 0x3C: байт 0x00 — команды, 0x40 — пиксели. После включения он погашен.',
  }),
  bus('lcd-i2c', {
    id: 'lcd-i2c',
    title: 'ЖК-экран с переходником I²C',
    group: 'Индикаторы',
    shape: 'bus-lcd',
    pins: i2c,
    props: [
      lcdSize,
      {
        ...addressProp(0x27, 1, 'У переходников PCF8574 это 0x27, у PCF8574A — 0x3F.'),
        options: [
          { value: 0x27, label: '0x27' },
          { value: 0x3f, label: '0x3F' },
        ],
      },
    ],
    derive: (values) => ({ params: lcdGeometry(values) }),
    note: 'Символьный экран HD44780 за микросхемой PCF8574, адрес 0x27: каждый байт — это состояние ножек RS, E, подсветки и D4–D7.',
  }),
  bus('lcd-parallel', {
    id: 'lcd-parallel',
    title: 'ЖК-экран напрямую (HD44780)',
    group: 'Индикаторы',
    shape: 'bus-lcd',
    props: [
      lcdSize,
      {
        key: 'bus',
        label: 'Шина данных',
        type: 'select',
        options: [
          { value: 4, label: '4 бита: D4–D7' },
          { value: 8, label: '8 бит: D0–D7' },
        ],
        default: 4,
        hint: 'RW у этой детали подключён к земле: экран только принимает данные.',
      },
    ],
    derive: (values) => ({
      params: { ...lcdGeometry(values), bits: values.bus },
      pins: [
        pin('RS', 'in'),
        pin('E', 'in'),
        ...(values.bus === 8 ? [0, 1, 2, 3] : []).map((n) => pin(`D${n}`, 'in')),
        ...[4, 5, 6, 7].map((n) => pin(`D${n}`, 'in')),
      ],
    }),
    note: 'Символьный экран HD44780 на прямых проводах: RS, E и четыре (или восемь) линии данных; данные принимаются по спаду E.',
  }),
  bus('lm75', {
    id: 'lm75',
    title: 'Термометр LM75',
    group: 'Датчики',
    shape: 'bus-lm75',
    pins: i2c,
    props: [addressProp(0x48, 8, 'Три ножки A0–A2 меняют адрес от 0x48 до 0x4F.')],
    note: 'Датчик температуры по I²C, адрес 0x48: регистр 0 отдаёт два байта, шаг 0,5 °C. Температуру задаёт ползунок.',
  }),
  bus('eeprom', {
    id: 'eeprom-24c02',
    title: 'Память EEPROM 24C02',
    group: 'Микросхемы',
    shape: 'bus-eeprom',
    pins: i2c,
    props: [addressProp(0x50, 8, 'Три ножки A0–A2 меняют адрес от 0x50 до 0x57.')],
    note: 'Энергонезависимая память 256 байт по I²C, адрес 0x50. Запись занимает 5 мс, и пока она идёт, микросхема не отвечает.',
  }),
  bus('ds1307', {
    id: 'rtc-ds1307',
    title: 'Часы реального времени DS1307',
    group: 'Микросхемы',
    shape: 'bus-rtc',
    pins: i2c,
    props: [
      {
        key: 'warp',
        label: 'Скорость хода',
        type: 'select',
        options: [
          { value: 1, label: 'Как в жизни (×1)' },
          { value: 60, label: 'В 60 раз быстрее' },
          { value: 1000, label: 'В 1000 раз быстрее' },
        ],
        default: 1,
        live: true,
        hint: 'Лаборатория считает медленнее реального времени, поэтому для показа можно ускорить часы.',
      },
    ],
    note: 'Часы по I²C, адрес 0x68: секунды, минуты, часы и дата в двоично-десятичном виде. После включения остановлены, пока не сбросить бит CH.',
  }),
  bus('pcf8574', {
    id: 'pcf8574',
    title: 'Расширитель портов PCF8574',
    group: 'Микросхемы',
    shape: 'bus-pcf8574',
    pins: i2c,
    props: [addressProp(0x20, 8, 'Три ножки A0–A2 меняют адрес от 0x20 до 0x27.')],
    note: 'Восемь выводов по I²C, адрес 0x20: запись 0 зажигает светодиод, замкнутый переключатель читается нулём.',
  }),
  bus('max7219', {
    id: 'max7219',
    title: 'Драйвер MAX7219',
    group: 'Индикаторы',
    shape: 'bus-matrix',
    pins: [pin('DIN', 'in'), pin('CLK', 'in'), pin('CS', 'in', 'CS (LOAD)')],
    props: [
      {
        key: 'mode',
        label: 'Что подключено',
        type: 'select',
        options: [
          { value: 'matrix', label: 'Матрица 8×8' },
          { value: 'digits', label: '8 цифр с семью сегментами' },
        ],
        default: 'matrix',
      },
    ],
    derive: (values) => ({ shape: values.mode === 'digits' ? 'bus-digits' : 'bus-matrix' }),
    note: 'Выводит картинку на матрицу или цифры по трём проводам: кадр из 16 бит (адрес и данные) защёлкивается передним фронтом CS. После включения погашен.',
  }),
  bus('tm1637', {
    id: 'tm1637',
    title: 'Индикатор TM1637, 4 цифры',
    group: 'Индикаторы',
    shape: 'bus-tm1637',
    pins: [pin('CLK', 'in'), pin('DIO', 'io')],
    params: { digits: 4 },
    note: 'Четыре цифры с двоеточием на двух проводах: свой протокол со START, STOP и подтверждением; байты идут младшим битом вперёд.',
  }),
  bus('ws2812', {
    id: 'ws2812',
    title: 'Лента WS2812B',
    group: 'Светодиоды',
    shape: 'bus-strip',
    pins: [pin('DIN', 'in')],
    props: [
      {
        key: 'pixels',
        label: 'Светодиодов в ленте',
        type: 'select',
        options: [
          { value: 8, label: '8' },
          { value: 16, label: '16' },
        ],
        default: 8,
      },
    ],
    derive: (values) => ({ params: { pixels: values.pixels } }),
    note: 'Адресуемые цветные светодиоды на одном проводе: бит — это длина импульса (0,4 мкс — ноль, 0,8 мкс — единица), цвет идёт в порядке G, R, B.',
  }),
  bus('mcp3008', {
    id: 'adc-mcp3008',
    title: 'АЦП MCP3008 с потенциометром',
    group: 'Микросхемы',
    shape: 'bus-adc',
    pins: [pin('CS', 'in'), pin('CLK', 'in'), pin('DIN', 'in'), pin('DOUT', 'out')],
    note: 'Десятибитный АЦП по SPI; на канале 0 стоит потенциометр, его положение задаёт ползунок. Ответ идёт со второго такта после номера канала.',
  }),
  bus('hcsr04', {
    id: 'hc-sr04',
    title: 'Дальномер HC-SR04',
    group: 'Датчики',
    shape: 'bus-hcsr04',
    pins: [pin('TRIG', 'in'), pin('ECHO', 'out')],
    note: 'Ультразвуковой дальномер: импульс на TRIG запускает измерение, на ECHO приходит импульс длиной 58 мкс на каждый сантиметр.',
  }),
  bus('dht11', {
    id: 'dht11',
    title: 'Датчик DHT11',
    group: 'Датчики',
    shape: 'bus-dht11',
    pins: [pin('DATA', 'io')],
    note: 'Температура и влажность по одному проводу: ПЛИС тянет линию к нулю на 18 мс и отпускает, датчик отвечает 40 битами по длине импульса.',
  }),
  bus('ir', {
    id: 'ir-receiver',
    title: 'ИК-приёмник с пультом',
    group: 'Датчики',
    shape: 'bus-ir',
    pins: [pin('OUT', 'out')],
    note: 'Приёмник отдаёт кадр протокола NEC без несущей, активный уровень низкий: 9 мс нуля, 4,5 мс единицы, затем 32 бита адреса и команды.',
  }),
  bus('ps2', {
    id: 'ps2-keyboard',
    title: 'Клавиатура PS/2',
    group: 'Кнопки и переключатели',
    shape: 'bus-ps2',
    pins: [pin('CLK', 'io'), pin('DATA', 'io')],
    note: 'Клавиатура сама подаёт такты (около 12,5 кГц) и шлёт скан-коды набора 2: старт, 8 бит, нечётность, стоп. Отпускание клавиши — код F0.',
  }),
];

/** Width and height of the picture of a bus part on the bench. */
export function busBodySize(resolved: Resolved): [number, number] {
  switch (resolved.shape) {
    case 'bus-oled':
      return [276, 168];
    case 'bus-lcd':
      return [
        (resolved.params.columns as number) * 18 + 28,
        (resolved.params.rows as number) * 27 + 50,
      ];
    case 'bus-lm75':
      return [210, 84];
    case 'bus-eeprom':
      return [336, 124];
    case 'bus-rtc':
      return [190, 96];
    case 'bus-pcf8574':
      return [236, 92];
    case 'bus-matrix':
      return [160, 168];
    case 'bus-digits':
      return [340, 104];
    case 'bus-tm1637':
      return [220, 100];
    case 'bus-strip':
      return [(resolved.params.pixels as number) * 28 + 20, 58];
    case 'bus-adc':
      return [250, 66];
    case 'bus-hcsr04':
      return [250, 84];
    case 'bus-dht11':
      return [250, 110];
    case 'bus-ir':
      return [208, 196];
    case 'bus-ps2':
      return [372, 216];
    default:
      return [96, 70];
  }
}
