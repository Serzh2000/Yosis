import type { BlockDef, EvalContext, Params, State } from './circuit-types';
import {
  clockPin,
  flag,
  fromSigned,
  guarded,
  input,
  lit,
  need,
  num,
  output,
  toSigned,
  tn,
} from './circuit-util';
import { t } from './i18n';

/**
 * Блоки, которых не хватало по сравнению с библиотеками Quartus (примитивы, LPM, серия 74):
 * JK- и RS-триггеры, защёлка, ОЗУ, делитель, модуль и смена знака, код Грея, семисегментный дешифратор.
 */
const widthSpec = (key = 'width', label = t('Ширина, бит'), min = 1, max = 64) =>
  ({ key, label, type: 'int', min, max, unit: t('бит') }) as const;
const initSpec = {
  key: 'init',
  label: t('Начальное значение при включении платы'),
  type: 'bool',
  hint: t('Если выключено, до первого действия значение неизвестно (X, в предпросмотре «?»).'),
} as const;
const aclrSpec = { key: 'aclr', label: t('Асинхронный сброс ACLR (в 0)'), type: 'bool' } as const;
const asyncPins = (p: Params) =>
  flag(p, 'aclr') ? [input('ACLR', 1, { hint: t('Асинхронный сброс в 0') })] : [];
const aclrActive = (ctx: EvalContext) => flag(ctx.p, 'aclr') && need(ctx, 'ACLR') === 1n;

/** Переписывает всё состояние в «неизвестно». */
const unknownState = (keys: string[]): State => Object.fromEntries(keys.map((key) => [key, null]));

const jkff: BlockDef = {
  kind: 'jkff',
  title: t('JK-триггер'),
  help: t(
    'По фронту такта: J = 1, K = 0 — установить 1; J = 0, K = 1 — сбросить в 0; J = K = 1 — переключить; J = K = 0 — хранить.',
  ),
  defaults: { aclr: false, init: true },
  params: [aclrSpec, initSpec],
  pins: (p) => [
    input('J', 1, { hint: t('Установить') }),
    input('K', 1, { hint: t('Сбросить') }),
    clockPin(),
    ...asyncPins(p),
    output('Q', 1),
  ],
  comb: () => [],
  regs: (p) => [{ key: 'Q', width: 1, init: flag(p, 'init') ? 0n : undefined }],
  symbol: () => ({ shape: 'ff', label: 'JK' }),
  describe: () => t('JK-триггер: J — установить, K — сбросить, J = K = 1 — переключить'),
  emit: (c) => {
    const q = c.out('Q'),
      events = [
        'posedge ' + c.in('CLK'),
        ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
      ],
      body = [
        `    case ({${c.in('J')}, ${c.in('K')}})`,
        `        2'b01: ${q} <= 1'b0;`,
        `        2'b10: ${q} <= 1'b1;`,
        `        2'b11: ${q} <= ~${q};`,
        '        default: ;',
        '    endcase',
      ];
    return [
      `always @(${events.join(' or ')}) begin`,
      ...(flag(c.p, 'aclr')
        ? [
            `    if (${c.in('ACLR')}) ${q} <= 1'b0;`,
            '    else begin',
            ...body.map((x) => '    ' + x),
            '    end',
          ]
        : body),
      'end',
    ];
  },
  init: (p) => ({ q: flag(p, 'init') ? 0n : null }),
  outputs: (c) => ({ Q: c.state.q ?? null }),
  async: (c) => guarded(['q'], () => (aclrActive(c) ? { q: 0n } : (null as never))) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      if (aclrActive(c)) return { q: 0n };
      const j = need(c, 'J'),
        k = need(c, 'K');
      if (j === 0n && k === 0n) return { q: c.state.q ?? null };
      if (j === 0n) return { q: 0n };
      if (k === 0n) return { q: 1n };
      return { q: c.state.q === null || c.state.q === undefined ? null : c.state.q ^ 1n };
    }),
};

const srff: BlockDef = {
  kind: 'srff',
  title: t('RS-триггер (по такту)'),
  help: t(
    'По фронту такта: S = 1 — установить 1, R = 1 — сбросить в 0, S = R = 0 — хранить. Если S = R = 1, побеждает сброс R.',
  ),
  defaults: { aclr: false, init: true },
  params: [aclrSpec, initSpec],
  pins: (p) => [
    input('S', 1, { hint: t('Установить') }),
    input('R', 1, { hint: t('Сбросить') }),
    clockPin(),
    ...asyncPins(p),
    output('Q', 1),
  ],
  comb: () => [],
  regs: (p) => [{ key: 'Q', width: 1, init: flag(p, 'init') ? 0n : undefined }],
  symbol: () => ({ shape: 'ff', label: 'RS' }),
  describe: () => t('RS-триггер: S — установить, R — сбросить (R сильнее)'),
  emit: (c) => {
    const q = c.out('Q'),
      events = [
        'posedge ' + c.in('CLK'),
        ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
      ],
      chain = [
        ...(flag(c.p, 'aclr') ? [`if (${c.in('ACLR')}) ${q} <= 1'b0;`] : []),
        `if (${c.in('R')}) ${q} <= 1'b0;`,
        `if (${c.in('S')}) ${q} <= 1'b1;`,
      ];
    return [
      `always @(${events.join(' or ')}) begin`,
      ...chain.map((line, i) => `    ${i ? 'else ' : ''}${line}`),
      'end',
    ];
  },
  init: (p) => ({ q: flag(p, 'init') ? 0n : null }),
  outputs: (c) => ({ Q: c.state.q ?? null }),
  async: (c) => guarded(['q'], () => (aclrActive(c) ? { q: 0n } : (null as never))) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      if (aclrActive(c)) return { q: 0n };
      if (need(c, 'R') === 1n) return { q: 0n };
      if (need(c, 'S') === 1n) return { q: 1n };
      return { q: c.state.q ?? null };
    }),
};

const latch: BlockDef = {
  kind: 'latch',
  title: t('D-защёлка'),
  help: t(
    'Пока G = 1, выход Q повторяет вход D (защёлка «прозрачна»). Когда G = 0, Q хранит последнее значение. Работает по уровню, а не по фронту.',
  ),
  defaults: { width: 1 },
  params: [widthSpec()],
  pins: (p) => [
    input('D', num(p, 'width')),
    input('G', 1, { hint: t('1 — прозрачна, 0 — хранит') }),
    output('Q', num(p, 'width')),
  ],
  comb: () => ['D', 'G'],
  regs: (p) => [{ key: 'Q', width: num(p, 'width') }],
  symbol: (p) => ({
    shape: 'ff',
    label: 'LAT',
    detail: num(p, 'width') > 1 ? tn(t('{width} бит'), { width: p.width }) : undefined,
  }),
  describe: (p) => tn(t('D-защёлка, {width} бит, прозрачна при G = 1'), { width: p.width }),
  emit: (c) => ['always @* begin', `    if (${c.in('G')}) ${c.out('Q')} = ${c.in('D')};`, 'end'],
  init: () => ({ q: null }),
  outputs: (c) => ({ Q: c.state.q ?? null }),
  async: (c) =>
    guarded(['q'], () =>
      need(c, 'G') === 1n ? { q: need(c, 'D') } : (null as never),
    ) as State | null,
};

const memKeys = (words: number) => Array.from({ length: words }, (_, i) => `m${i}`);
const ram: BlockDef = {
  kind: 'ram',
  title: t('ОЗУ (RAM)'),
  help: t(
    'Память для чтения и записи. Запись в слово по адресу A — по фронту CLK, когда WE = 1. Чтение по адресу A выдаётся на Q сразу. После включения все слова равны 0.',
  ),
  defaults: { addrBits: 3, width: 8 },
  params: [
    { key: 'addrBits', label: t('Разрядов адреса'), type: 'int', min: 1, max: 6, unit: t('бит') },
    widthSpec('width', t('Ширина слова, бит')),
  ],
  pins: (p) => [
    input('A', num(p, 'addrBits'), { hint: t('Адрес') }),
    input('D', num(p, 'width'), { hint: t('Данные для записи') }),
    input('WE', 1, { hint: t('Разрешение записи') }),
    clockPin(),
    output('Q', num(p, 'width'), { hint: t('Слово по адресу A') }),
  ],
  comb: () => ['A'],
  wires: () => [],
  symbol: (p) => ({
    shape: 'box',
    label: 'RAM',
    detail: `${2 ** num(p, 'addrBits')}×${p.width}`,
  }),
  describe: (p) =>
    tn(t('ОЗУ из {v1} слов по {width} бит'), { v1: 2 ** num(p, 'addrBits'), width: p.width }),
  emit: (c) => {
    const w = num(c.p, 'width'),
      words = 2 ** num(c.p, 'addrBits'),
      mem = c.net('mem'),
      i = c.net('i');
    return [
      `reg [${w - 1}:0] ${mem} [0:${words - 1}];`,
      `integer ${i};`,
      `initial for (${i} = 0; ${i} < ${words}; ${i} = ${i} + 1) ${mem}[${i}] = ${lit(w, 0n)};`,
      `always @(posedge ${c.in('CLK')}) if (${c.in('WE')}) ${mem}[${c.in('A')}] <= ${c.in('D')};`,
      `assign ${c.out('Q')} = ${mem}[${c.in('A')}];`,
    ];
  },
  init: (p) => Object.fromEntries(memKeys(2 ** num(p, 'addrBits')).map((key) => [key, 0n])),
  outputs: (c) => {
    const a = c.in('A');
    return { Q: a === null ? null : (c.state[`m${a}`] ?? null) };
  },
  next: (c) => {
    const keys = memKeys(2 ** num(c.p, 'addrBits'));
    const we = c.in('WE');
    if (we === null) return unknownState(keys);
    if (we === 0n) return {};
    const a = c.in('A');
    if (a === null) return unknownState(keys);
    return { [`m${a}`]: c.in('D') };
  },
};

const div: BlockDef = {
  kind: 'div',
  title: t('Делитель'),
  help: t(
    'Делит A на B нацело: на выходе частное Q и, если нужно, остаток R. Деление на ноль даёт неизвестный результат.',
  ),
  defaults: { width: 8, signed: false, rem: true },
  params: [
    widthSpec('width', t('Ширина, бит'), 1, 32),
    { key: 'signed', label: t('Числа со знаком'), type: 'bool' },
    { key: 'rem', label: t('Выход остатка R'), type: 'bool' },
  ],
  pins: (p) => [
    input('A', num(p, 'width'), { hint: t('Делимое') }),
    input('B', num(p, 'width'), { hint: t('Делитель') }),
    output('Q', num(p, 'width'), { hint: t('Частное') }),
    ...(flag(p, 'rem') ? [output('R', num(p, 'width'), { hint: t('Остаток') })] : []),
  ],
  comb: () => ['A', 'B'],
  symbol: (p) => ({
    shape: 'box',
    label: '÷',
    detail: flag(p, 'signed') ? t('со знаком') : t('без знака'),
  }),
  describe: (p) =>
    tn(t('Делитель {width} бит{v2}'), {
      width: p.width,
      v2: flag(p, 'signed') ? t(' со знаком') : '',
    }),
  emit: (c) => {
    const a = flag(c.p, 'signed') ? `$signed(${c.in('A')})` : c.in('A'),
      b = flag(c.p, 'signed') ? `$signed(${c.in('B')})` : c.in('B');
    return [
      `assign ${c.out('Q')} = ${a} / ${b};`,
      ...(flag(c.p, 'rem') ? [`assign ${c.out('R')} = ${a} % ${b};`] : []),
    ];
  },
  outputs: (c) => {
    const a = c.in('A'),
      b = c.in('B');
    if (a === null || b === null || b === 0n) return { Q: null, R: null };
    const w = num(c.p, 'width');
    if (flag(c.p, 'signed')) {
      const x = toSigned(a, w),
        y = toSigned(b, w);
      return { Q: fromSigned(x / y, w), R: fromSigned(x % y, w) };
    }
    return { Q: a / b, R: a % b };
  },
};

const negabs: BlockDef = {
  kind: 'negabs',
  title: t('Модуль / смена знака'),
  help: t(
    'Модуль числа со знаком (отбрасывает минус) или число с противоположным знаком. У самого маленького числа (например, −8 для 4 бит) результат совпадает с исходным: положительного −(−8) не существует.',
  ),
  defaults: { width: 8, mode: 'abs' },
  params: [
    widthSpec('width', t('Ширина, бит'), 2, 64),
    {
      key: 'mode',
      label: t('Операция'),
      type: 'select',
      options: [
        ['abs', t('Модуль |A|')],
        ['neg', t('Смена знака −A')],
      ],
    },
  ],
  pins: (p) => [input('A', num(p, 'width')), output('Y', num(p, 'width'))],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: p.mode === 'abs' ? '|A|' : '−A',
    detail: tn(t('{width} бит'), { width: p.width }),
  }),
  describe: (p) => (p.mode === 'abs' ? t('Модуль числа со знаком') : t('Смена знака числа')),
  emit: (c) => {
    const w = num(c.p, 'width'),
      a = c.in('A'),
      negated = `(${lit(w, 0n)} - ${a})`;
    return [
      c.p.mode === 'abs'
        ? `assign ${c.out('Y')} = ${a}[${w - 1}] ? ${negated} : ${a};`
        : `assign ${c.out('Y')} = ${negated};`,
    ];
  },
  outputs: (c) => {
    const a = c.in('A');
    if (a === null) return { Y: null };
    const w = num(c.p, 'width'),
      s = toSigned(a, w);
    return { Y: c.p.mode === 'abs' ? (s < 0n ? fromSigned(-s, w) : a) : fromSigned(-s, w) };
  },
};

const gray: BlockDef = {
  kind: 'gray',
  title: t('Код Грея'),
  help: t(
    'Переводит двоичное число в код Грея (соседние числа отличаются одним битом) или обратно.',
  ),
  defaults: { width: 4, mode: 'enc' },
  params: [
    widthSpec('width', t('Ширина, бит'), 2, 64),
    {
      key: 'mode',
      label: t('Направление'),
      type: 'select',
      options: [
        ['enc', t('Двоичный → Грея')],
        ['dec', t('Грея → двоичный')],
      ],
    },
  ],
  pins: (p) => [input('A', num(p, 'width')), output('Y', num(p, 'width'))],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: p.mode === 'enc' ? 'BIN→G' : 'G→BIN',
    detail: tn(t('{width} бит'), { width: p.width }),
  }),
  describe: (p) => (p.mode === 'enc' ? t('Двоичный код → код Грея') : t('Код Грея → двоичный код')),
  emit: (c) => {
    const w = num(c.p, 'width'),
      a = c.in('A');
    if (c.p.mode === 'enc') return [`assign ${c.out('Y')} = ${a} ^ (${a} >> 1);`];
    const bits = Array.from({ length: w }, (_, k) => `^(${a} >> ${w - 1 - k})`);
    return [`assign ${c.out('Y')} = {${bits.join(', ')}};`];
  },
  outputs: (c) => {
    const a = c.in('A');
    if (a === null) return { Y: null };
    if (c.p.mode === 'enc') return { Y: a ^ (a >> 1n) };
    let result = 0n;
    for (let shift = 0n; shift < BigInt(num(c.p, 'width')); shift++) result ^= a >> shift;
    return { Y: result };
  },
};

/** Сегменты a…g: бит 0 — сегмент a, бит 6 — сегмент g. */
const segments = [
  0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71,
];
const segmentValue = (p: Params, digit: number): bigint => {
  const shown = digit < 10 || flag(p, 'hex') ? segments[digit] : 0;
  return BigInt(flag(p, 'activeLow') ? ~shown & 0x7f : shown);
};
const sevenseg: BlockDef = {
  kind: 'sevenseg',
  title: t('Дешифратор для семисегментного индикатора'),
  help: t(
    'Превращает цифру 0…9 (4 бита) в семь сегментов a…g (бит 0 — сегмент a). Как микросхема 7447. Можно показывать и буквы A…F, и инвертировать выходы для индикатора с общим анодом.',
  ),
  defaults: { hex: false, activeLow: false },
  params: [
    { key: 'hex', label: t('Показывать A…F для кодов 10…15'), type: 'bool' },
    { key: 'activeLow', label: t('Сегмент горит при 0 (общий анод)'), type: 'bool' },
  ],
  pins: () => [
    input('A', 4, { hint: t('Цифра') }),
    output('Y', 7, { hint: t('Сегменты g f e d c b a') }),
  ],
  comb: () => ['A'],
  symbol: () => ({ shape: 'box', label: '7SEG', detail: 'BCD → a…g' }),
  describe: (p) =>
    tn(t('Дешифратор для семисегментного индикатора{v1}'), {
      v1: flag(p, 'hex') ? ' (0…F)' : ' (0…9)',
    }),
  regs: () => [{ key: 'Y', width: 7 }],
  emit: (c) => [
    'always @* begin',
    `    case (${c.in('A')})`,
    ...Array.from(
      { length: 16 },
      (_, digit) =>
        `        ${lit(4, BigInt(digit))}: ${c.out('Y')} = ${lit(7, segmentValue(c.p, digit))};`,
    ),
    '    endcase',
    'end',
  ],
  outputs: (c) => {
    const a = c.in('A');
    return { Y: a === null ? null : segmentValue(c.p, Number(a)) };
  },
};

export const extraBlocks: BlockDef[] = [jkff, srff, latch, ram, div, negabs, gray, sevenseg];
