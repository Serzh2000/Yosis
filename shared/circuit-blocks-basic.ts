import type { BlockDef, Params } from './circuit-types';
import {
  big,
  clog2,
  combine,
  flag,
  input,
  letters,
  lit,
  list,
  mask,
  num,
  output,
  text,
  tn,
} from './circuit-util';
import { t } from './i18n';

const widthSpec = (key = 'width', label = t('Ширина, бит')) =>
  ({ key, label, type: 'int', min: 1, max: 64, unit: t('бит') }) as const;
const nameOf = (index: number) => letters[index];

const portInput: BlockDef = {
  kind: 'input',
  title: t('Вход'),
  help: t('Сигнал, который приходит в устройство снаружи: кнопка, переключатель, такт.'),
  defaults: { width: 1 },
  params: [widthSpec()],
  pins: (p) => [output('Y', num(p, 'width'))],
  symbol: (p, name) => ({
    shape: 'port-in',
    label: name,
    detail: num(p, 'width') > 1 ? `[${num(p, 'width') - 1}..0]` : undefined,
  }),
  describe: (p) => tn(t('Вход устройства, {width} бит'), { width: num(p, 'width') }),
  emit: () => [],
  init: () => ({ v: 0n }),
  outputs: (c) => ({ Y: c.state.v ?? 0n }),
  port: { direction: 'input' },
};
const portOutput: BlockDef = {
  kind: 'output',
  title: t('Выход'),
  help: t('Сигнал, который устройство отдаёт наружу, например на светодиод.'),
  defaults: { width: 1 },
  params: [widthSpec()],
  pins: (p) => [input('A', num(p, 'width'))],
  symbol: (p, name) => ({
    shape: 'port-out',
    label: name,
    detail: num(p, 'width') > 1 ? `[${num(p, 'width') - 1}..0]` : undefined,
  }),
  describe: (p) => tn(t('Выход устройства, {width} бит'), { width: num(p, 'width') }),
  emit: () => [],
  outputs: () => ({}),
  port: { direction: 'output' },
};
const constant: BlockDef = {
  kind: 'const',
  title: t('Константа'),
  help: t('Постоянное число. Логическая 1 и логический 0 — это однобитные константы.'),
  defaults: { width: 1, value: '0' },
  params: [widthSpec(), { key: 'value', label: t('Значение'), type: 'big', widthKey: 'width' }],
  pins: (p) => [output('Y', num(p, 'width'))],
  check: (p) =>
    big(p, 'value') > mask(num(p, 'width'))
      ? [tn(t('число {value} не помещается в {width} бит'), { value: p.value, width: p.width })]
      : [],
  symbol: (p) => ({ shape: 'const', label: String(p.value) }),
  describe: (p) =>
    tn(t('Константа {value}, {width} бит'), { value: p.value, width: num(p, 'width') }),
  emit: (c) => [`assign ${c.out('Y')} = ${lit(num(c.p, 'width'), big(c.p, 'value'))};`],
  outputs: (c) => ({ Y: big(c.p, 'value') }),
};
const buffer: BlockDef = {
  kind: 'buf',
  title: t('Буфер / NOT'),
  help: t('NOT меняет каждый бит на противоположный. Буфер просто передаёт сигнал дальше.'),
  defaults: { width: 1, invert: true },
  params: [widthSpec(), { key: 'invert', label: t('Инвертировать (NOT)'), type: 'bool' }],
  pins: (p) => [input('A', num(p, 'width')), output('Y', num(p, 'width'))],
  symbol: (p) => ({ shape: 'buf', label: '', invertOut: flag(p, 'invert') }),
  describe: (p) => (flag(p, 'invert') ? t('NOT: инверсия') : t('Буфер: передача сигнала')),
  emit: (c) => [`assign ${c.out('Y')} = ${flag(c.p, 'invert') ? '~' : ''}${c.in('A')};`],
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => ({
      Y: flag(c.p, 'invert') ? v.A ^ mask(num(c.p, 'width')) : v.A,
    })),
};
const gate: BlockDef = {
  kind: 'gate',
  title: t('Логический элемент'),
  help: t('И, ИЛИ, исключающее ИЛИ с 2–8 входами. Кружок на выходе или входе означает инверсию.'),
  defaults: { op: 'and', invert: false, inputs: 2, width: 1, inverted: 0 },
  params: [
    {
      key: 'op',
      label: t('Функция'),
      type: 'select',
      options: [
        ['and', t('И (AND)')],
        ['or', t('ИЛИ (OR)')],
        ['xor', t('Исключающее ИЛИ (XOR)')],
      ],
    },
    { key: 'invert', label: t('Инвертировать результат (NAND, NOR, XNOR)'), type: 'bool' },
    { key: 'inputs', label: t('Число входов'), type: 'int', min: 2, max: 8 },
    widthSpec('width', t('Ширина шины, бит')),
    {
      key: 'inverted',
      label: t('Инверсия входов'),
      type: 'mask',
      countKey: 'inputs',
      names: letters,
    },
  ],
  pins: (p) => [
    ...Array.from({ length: num(p, 'inputs') }, (_, i) => input(nameOf(i), num(p, 'width'))),
    output('Y', num(p, 'width')),
  ],
  comb: (p) => Array.from({ length: num(p, 'inputs') }, (_, i) => nameOf(i)),
  symbol: (p) => ({
    shape: p.op as 'and' | 'or' | 'xor',
    label: '',
    invertOut: flag(p, 'invert'),
    invertIn: Array.from(
      { length: num(p, 'inputs') },
      (_, i) => ((num(p, 'inverted') >> i) & 1) === 1,
    ),
  }),
  describe: (p) =>
    tn(t('{op}{inverted}, {inputs} входа(ов)'), {
      op: { and: t('И'), or: t('ИЛИ'), xor: t('Исключающее ИЛИ') }[p.op as string],
      inverted: flag(p, 'invert') ? t(' с инверсией') : '',
      inputs: String(p.inputs),
    }),
  emit: (c) => {
    const count = num(c.p, 'inputs'),
      operator = { and: '&', or: '|', xor: '^' }[c.p.op as string]!;
    const terms = Array.from(
      { length: count },
      (_, i) => `${((num(c.p, 'inverted') >> i) & 1) === 1 ? '~' : ''}${c.in(nameOf(i))}`,
    ).join(` ${operator} `);
    return [`assign ${c.out('Y')} = ${flag(c.p, 'invert') ? `~(${terms})` : terms};`];
  },
  outputs: (c) => {
    const count = num(c.p, 'inputs'),
      m = mask(num(c.p, 'width'));
    return combine(
      c,
      Array.from({ length: count }, (_, i) => nameOf(i)),
      ['Y'],
      (v) => {
        const terms = Array.from(
          { length: count },
          (_, i) => v[nameOf(i)] ^ (((num(c.p, 'inverted') >> i) & 1) === 1 ? m : 0n),
        );
        let result = terms.reduce((a, b) =>
          c.p.op === 'and' ? a & b : c.p.op === 'or' ? a | b : a ^ b,
        );
        if (flag(c.p, 'invert')) result ^= m;
        return { Y: result };
      },
    );
  },
};
const reduce: BlockDef = {
  kind: 'reduce',
  title: t('Свёртка шины в бит'),
  help: t(
    'Объединяет все биты шины в один: И — все единицы, ИЛИ — есть хотя бы одна единица, XOR — нечётное число единиц.',
  ),
  defaults: { op: 'or', invert: false, width: 8 },
  params: [
    {
      key: 'op',
      label: t('Функция'),
      type: 'select',
      options: [
        ['and', t('И — все биты равны 1')],
        ['or', t('ИЛИ — хотя бы один бит равен 1')],
        ['xor', t('XOR — нечётное число единиц')],
      ],
    },
    { key: 'invert', label: t('Инвертировать результат'), type: 'bool' },
    widthSpec('width', t('Ширина входной шины, бит')),
  ],
  pins: (p) => [input('A', num(p, 'width')), output('Y', 1)],
  symbol: (p) => ({
    shape: p.op as 'and' | 'or' | 'xor',
    label: '',
    detail: tn(t('свёртка {width} бит'), { width: num(p, 'width') }),
    invertOut: flag(p, 'invert'),
  }),
  describe: (p) =>
    tn(t('Свёртка {op} шины {width} бит в один бит'), {
      op: p.op === 'and' ? t('И') : p.op === 'or' ? t('ИЛИ') : 'XOR',
      width: String(p.width),
    }),
  emit: (c) => {
    const op = { and: '&', or: '|', xor: '^' }[c.p.op as string];
    const body = `${op}${c.in('A')}`;
    return [`assign ${c.out('Y')} = ${flag(c.p, 'invert') ? `~(${body})` : body};`];
  },
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => {
      const w = num(c.p, 'width');
      let r: bigint;
      if (c.p.op === 'and') r = v.A === mask(w) ? 1n : 0n;
      else if (c.p.op === 'or') r = v.A !== 0n ? 1n : 0n;
      else r = BigInt(v.A.toString(2).split('1').length - 1) % 2n;
      return { Y: flag(c.p, 'invert') ? r ^ 1n : r };
    }),
};

const dataPins = (count: number) => Array.from({ length: count }, (_, i) => `D${i}`);
const mux: BlockDef = {
  kind: 'mux',
  title: t('Мультиплексор'),
  help: t('Переключатель: код на входе S выбирает, какой из входов D0, D1… попадёт на выход Y.'),
  defaults: { inputs: 2, width: 1 },
  params: [
    {
      key: 'inputs',
      label: t('Число входов'),
      type: 'select',
      options: [
        ['2', '2:1'],
        ['4', '4:1'],
        ['8', '8:1'],
      ],
    },
    widthSpec('width', t('Ширина данных, бит')),
  ],
  pins: (p) => [
    ...dataPins(num(p, 'inputs')).map((name) => input(name, num(p, 'width'))),
    input('S', clog2(num(p, 'inputs')), { hint: t('Выбор') }),
    output('Y', num(p, 'width')),
  ],
  comb: (p) => [...dataPins(num(p, 'inputs')), 'S'],
  symbol: (p) => ({ shape: 'mux', label: `${p.inputs}:1` }),
  describe: (p) => tn(t('Мультиплексор {inputs}:1'), { inputs: p.inputs }),
  emit: (c) => {
    const count = num(c.p, 'inputs'),
      selectWidth = clog2(count),
      s = c.in('S');
    if (count === 2) return [`assign ${c.out('Y')} = ${s} ? ${c.in('D1')} : ${c.in('D0')};`];
    const chain = Array.from(
      { length: count - 1 },
      (_, i) => `(${s} == ${lit(selectWidth, BigInt(i))}) ? ${c.in(`D${i}`)} : `,
    );
    return [`assign ${c.out('Y')} = ${chain.join('')}${c.in(`D${count - 1}`)};`];
  },
  outputs: (c) => {
    const count = num(c.p, 'inputs');
    const s = c.in('S');
    if (s === null) return { Y: null };
    const chosen = c.in(`D${Math.min(Number(s), count - 1)}`);
    return { Y: chosen };
  },
};
const demux: BlockDef = {
  kind: 'demux',
  title: t('Демультиплексор'),
  help: t('Направляет вход A на один из выходов Y0, Y1… по коду S. Остальные выходы равны 0.'),
  defaults: { outputs: 4, width: 1 },
  params: [
    {
      key: 'outputs',
      label: t('Число выходов'),
      type: 'select',
      options: [
        ['2', '1:2'],
        ['4', '1:4'],
        ['8', '1:8'],
      ],
    },
    widthSpec('width', t('Ширина данных, бит')),
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    input('S', clog2(num(p, 'outputs')), { hint: t('Выбор') }),
    ...Array.from({ length: num(p, 'outputs') }, (_, i) => output(`Y${i}`, num(p, 'width'))),
  ],
  comb: () => ['A', 'S'],
  symbol: (p) => ({ shape: 'demux', label: `1:${p.outputs}` }),
  describe: (p) => tn(t('Демультиплексор 1:{outputs}'), { outputs: p.outputs }),
  emit: (c) =>
    Array.from(
      { length: num(c.p, 'outputs') },
      (_, i) =>
        `assign ${c.out(`Y${i}`)} = (${c.in('S')} == ${lit(clog2(num(c.p, 'outputs')), BigInt(i))}) ? ${c.in('A')} : ${lit(num(c.p, 'width'), 0n)};`,
    ),
  outputs: (c) =>
    combine(
      c,
      ['A', 'S'],
      Array.from({ length: num(c.p, 'outputs') }, (_, i) => `Y${i}`),
      (v) =>
        Object.fromEntries(
          Array.from({ length: num(c.p, 'outputs') }, (_, i) => [
            `Y${i}`,
            v.S === BigInt(i) ? v.A : 0n,
          ]),
        ),
    ),
};
const decoder: BlockDef = {
  kind: 'decoder',
  title: t('Дешифратор'),
  help: t(
    'Из двоичного числа на входе делает «один из N»: на выходе единица стоит в разряде с номером этого числа.',
  ),
  defaults: { bits: 2, enable: false },
  params: [
    { key: 'bits', label: t('Разрядов на входе'), type: 'int', min: 1, max: 6, unit: t('бит') },
    { key: 'enable', label: t('Вход разрешения EN'), type: 'bool' },
  ],
  pins: (p) => [
    input('A', num(p, 'bits')),
    ...(flag(p, 'enable') ? [input('EN', 1, { hint: t('Разрешение') })] : []),
    output('Y', 2 ** num(p, 'bits')),
  ],
  comb: (p) => ['A', ...(flag(p, 'enable') ? ['EN'] : [])],
  symbol: (p) => ({ shape: 'box', label: 'DEC', detail: `${p.bits} → ${2 ** num(p, 'bits')}` }),
  describe: (p) => tn(t('Дешифратор {bits} → {v2}'), { bits: p.bits, v2: 2 ** num(p, 'bits') }),
  emit: (c) => {
    const size = 2 ** num(c.p, 'bits'),
      shifted = `${lit(size, 1n)} << ${c.in('A')}`;
    return [
      `assign ${c.out('Y')} = ${flag(c.p, 'enable') ? `${c.in('EN')} ? (${shifted}) : ${lit(size, 0n)}` : shifted};`,
    ];
  },
  outputs: (c) =>
    combine(c, ['A', ...(flag(c.p, 'enable') ? ['EN'] : [])], ['Y'], (v) => ({
      Y: flag(c.p, 'enable') && v.EN === 0n ? 0n : 1n << v.A,
    })),
};
const priority: BlockDef = {
  kind: 'priority',
  title: t('Приоритетный шифратор'),
  help: t(
    'Находит номер самой старшей единицы на входе. Выход V = 1, если на входе есть хотя бы одна единица.',
  ),
  defaults: { width: 4 },
  params: [
    { key: 'width', label: t('Число входных бит'), type: 'int', min: 2, max: 32, unit: t('бит') },
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    output('Y', clog2(num(p, 'width')), { hint: t('Номер') }),
    output('V', 1, { hint: t('Есть единица') }),
  ],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: 'ENC',
    detail: tn(t('приоритет {width}'), { width: p.width }),
  }),
  describe: (p) =>
    tn(t('Приоритетный шифратор {width} → {v2}'), { width: p.width, v2: clog2(num(p, 'width')) }),
  emit: (c) => {
    const w = num(c.p, 'width'),
      yw = clog2(w),
      chain = Array.from({ length: w - 1 }, (_, k) => {
        const i = w - 1 - k;
        return `${c.in('A')}[${i}] ? ${lit(yw, BigInt(i))} : `;
      }).join('');
    return [
      `assign ${c.out('Y')} = ${chain}${lit(yw, 0n)};`,
      `assign ${c.out('V')} = |${c.in('A')};`,
    ];
  },
  outputs: (c) =>
    combine(c, ['A'], ['Y', 'V'], (v) => ({
      Y: v.A === 0n ? 0n : BigInt(v.A.toString(2).length - 1),
      V: v.A === 0n ? 0n : 1n,
    })),
};
const rom: BlockDef = {
  kind: 'rom',
  title: t('Таблица (ПЗУ)'),
  help: t(
    'Небольшая таблица: по адресу на входе выдаёт записанное число. Таблицу редактируют в свойствах.',
  ),
  defaults: { addrBits: 2, width: 4, words: ['0', '1', '2', '3'] },
  params: [
    { key: 'addrBits', label: t('Разрядов адреса'), type: 'int', min: 1, max: 6, unit: t('бит') },
    widthSpec('width', t('Ширина слова, бит')),
    {
      key: 'words',
      label: t('Содержимое'),
      type: 'table',
      widthKey: 'width',
      lengthKey: 'addrBits',
    },
  ],
  pins: (p) => [input('A', num(p, 'addrBits'), { hint: t('Адрес') }), output('Y', num(p, 'width'))],
  comb: () => ['A'],
  check: (p) => {
    const words = list(p, 'words'),
      errors: string[] = [];
    if (words.length !== 2 ** num(p, 'addrBits'))
      errors.push(
        tn(t('в таблице должно быть {v1} слов, сейчас {length}'), {
          v1: 2 ** num(p, 'addrBits'),
          length: words.length,
        }),
      );
    words.forEach((word, i) => {
      if (!/^[0-9]{1,20}$/.test(word))
        errors.push(tn(t('слово {i}: нужно целое неотрицательное число'), { i }));
      else if (BigInt(word) > mask(num(p, 'width')))
        errors.push(
          tn(t('слово {i}: число {word} не помещается в {width} бит'), { i, word, width: p.width }),
        );
    });
    return errors;
  },
  symbol: (p) => ({
    shape: 'box',
    label: 'ROM',
    detail: `${2 ** num(p, 'addrBits')}×${p.width}`,
  }),
  describe: (p) =>
    tn(t('Таблица из {v1} слов по {width} бит'), { v1: 2 ** num(p, 'addrBits'), width: p.width }),
  regs: (p) => [{ key: 'Y', width: num(p, 'width') }],
  emit: (c) => {
    const words = list(c.p, 'words'),
      aw = num(c.p, 'addrBits'),
      w = num(c.p, 'width');
    return [
      'always @* begin',
      `    case (${c.in('A')})`,
      ...words.map(
        (word, i) => `        ${lit(aw, BigInt(i))}: ${c.out('Y')} = ${lit(w, BigInt(word))};`,
      ),
      `        default: ${c.out('Y')} = ${lit(w, 0n)};`,
      '    endcase',
      'end',
    ];
  },
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => ({
      Y: BigInt(list(c.p, 'words')[Number(v.A)] ?? '0'),
    })),
};

const extend: BlockDef = {
  kind: 'extend',
  title: t('Расширение шины'),
  help: t(
    'Делает шину шире. Нулевое расширение добавляет нули, знаковое — копию старшего бита (для чисел со знаком).',
  ),
  defaults: { inWidth: 4, outWidth: 8, signed: false },
  params: [
    widthSpec('inWidth', t('Ширина входа, бит')),
    widthSpec('outWidth', t('Ширина выхода, бит')),
    { key: 'signed', label: t('Знаковое расширение'), type: 'bool' },
  ],
  pins: (p) => [input('A', num(p, 'inWidth')), output('Y', num(p, 'outWidth'))],
  check: (p) =>
    num(p, 'outWidth') <= num(p, 'inWidth') ? [t('выход должен быть шире входа')] : [],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: flag(p, 'signed') ? 'sext' : 'zext',
    detail: `${p.inWidth} → ${p.outWidth}`,
  }),
  describe: (p) =>
    tn(t('{kind} расширение {inWidth} → {outWidth} бит'), {
      kind: flag(p, 'signed') ? t('Знаковое') : t('Нулевое'),
      inWidth: String(p.inWidth),
      outWidth: String(p.outWidth),
    }),
  emit: (c) => {
    const k = num(c.p, 'outWidth') - num(c.p, 'inWidth'),
      a = c.in('A');
    const fill = flag(c.p, 'signed')
      ? num(c.p, 'inWidth') === 1
        ? a
        : `${a}[${num(c.p, 'inWidth') - 1}]`
      : "1'b0";
    return [`assign ${c.out('Y')} = {{${k}{${fill}}}, ${a}};`];
  },
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => {
      const iw = num(c.p, 'inWidth'),
        ow = num(c.p, 'outWidth');
      if (!flag(c.p, 'signed')) return { Y: v.A };
      const negative = ((v.A >> BigInt(iw - 1)) & 1n) === 1n;
      return { Y: negative ? v.A | (mask(ow) ^ mask(iw)) : v.A };
    }),
};
const slice: BlockDef = {
  kind: 'slice',
  title: t('Срез шины'),
  help: t('Выделяет часть шины: биты от младшего до старшего включительно.'),
  defaults: { inWidth: 8, lo: 0, hi: 3 },
  params: [
    widthSpec('inWidth', t('Ширина входа, бит')),
    { key: 'lo', label: t('Младший бит'), type: 'int', min: 0, max: 63 },
    { key: 'hi', label: t('Старший бит'), type: 'int', min: 0, max: 63 },
  ],
  pins: (p) => [
    input('A', num(p, 'inWidth')),
    output('Y', Math.max(1, num(p, 'hi') - num(p, 'lo') + 1)),
  ],
  check: (p) =>
    num(p, 'lo') > num(p, 'hi') || num(p, 'hi') >= num(p, 'inWidth')
      ? [t('срез выходит за входную шину')]
      : [],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: t('срез'),
    detail: p.hi === p.lo ? `[${p.lo}]` : `[${p.hi}..${p.lo}]`,
  }),
  describe: (p) => tn(t('Срез: биты {hi}..{lo}'), { hi: p.hi, lo: p.lo }),
  emit: (c) => [
    `assign ${c.out('Y')} = ${num(c.p, 'inWidth') === 1 ? c.in('A') : `${c.in('A')}[${c.p.hi}:${c.p.lo}]`};`,
  ],
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => ({
      Y: (v.A >> BigInt(num(c.p, 'lo'))) & mask(num(c.p, 'hi') - num(c.p, 'lo') + 1),
    })),
};
const concatWidths = (p: Params) =>
  Array.from({ length: num(p, 'parts') }, (_, i) => num(p, `w${i}`));
const concat: BlockDef = {
  kind: 'concat',
  title: t('Объединение шин'),
  help: t('Склеивает несколько шин в одну. A — самые старшие биты, последний вход — младшие.'),
  defaults: { parts: 2, w0: 1, w1: 1, w2: 1, w3: 1, w4: 1, w5: 1, w6: 1, w7: 1 },
  params: [
    { key: 'parts', label: t('Число частей'), type: 'int', min: 2, max: 8 },
    ...Array.from({ length: 8 }, (_, i) => ({
      key: `w${i}`,
      label: tn(t('Ширина {v1}, бит'), { v1: letters[i] }),
      type: 'int' as const,
      min: 1,
      max: 64,
      when: (p: Params) => i < num(p, 'parts'),
    })),
  ],
  pins: (p) => [
    ...concatWidths(p).map((w, i) => input(nameOf(i), w)),
    output(
      'Y',
      concatWidths(p).reduce((a, b) => a + b, 0),
    ),
  ],
  check: (p) =>
    concatWidths(p).reduce((a, b) => a + b, 0) > 64 ? [t('объединённая шина шире 64 бит')] : [],
  comb: (p) => concatWidths(p).map((_, i) => nameOf(i)),
  symbol: (p) => ({ shape: 'box', label: t('склейка'), detail: concatWidths(p).join(' + ') }),
  describe: (p) => tn(t('Склейка шин: {v1} бит'), { v1: concatWidths(p).join(' + ') }),
  emit: (c) => [
    `assign ${c.out('Y')} = {${concatWidths(c.p)
      .map((_, i) => c.in(nameOf(i)))
      .join(', ')}};`,
  ],
  outputs: (c) =>
    combine(
      c,
      concatWidths(c.p).map((_, i) => nameOf(i)),
      ['Y'],
      (v) => {
        let r = 0n;
        concatWidths(c.p).forEach((w, i) => {
          r = (r << BigInt(w)) | v[nameOf(i)];
        });
        return { Y: r };
      },
    ),
};
const bitName = (i: number) => `B${i}`;
const split: BlockDef = {
  kind: 'split',
  title: t('Разделитель шины на биты'),
  help: t('Выдаёт каждый бит шины на отдельный контакт B0 (младший), B1…'),
  defaults: { width: 4 },
  params: [
    { key: 'width', label: t('Ширина шины, бит'), type: 'int', min: 2, max: 16, unit: t('бит') },
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    ...Array.from({ length: num(p, 'width') }, (_, i) => output(bitName(i), 1)),
  ],
  comb: () => ['A'],
  symbol: (p) => ({ shape: 'box', label: t('биты'), detail: `${p.width} → ${p.width}×1` }),
  describe: (p) => tn(t('Разделение шины {width} бит на отдельные биты'), { width: p.width }),
  emit: (c) =>
    Array.from(
      { length: num(c.p, 'width') },
      (_, i) => `assign ${c.out(bitName(i))} = ${c.in('A')}[${i}];`,
    ),
  outputs: (c) =>
    combine(
      c,
      ['A'],
      Array.from({ length: num(c.p, 'width') }, (_, i) => bitName(i)),
      (v) =>
        Object.fromEntries(
          Array.from({ length: num(c.p, 'width') }, (_, i) => [
            bitName(i),
            (v.A >> BigInt(i)) & 1n,
          ]),
        ),
    ),
};
const merge: BlockDef = {
  kind: 'merge',
  title: t('Сборка шины из битов'),
  help: t('Собирает шину из отдельных битов: B0 — младший.'),
  defaults: { width: 4 },
  params: [
    { key: 'width', label: t('Ширина шины, бит'), type: 'int', min: 2, max: 16, unit: t('бит') },
  ],
  pins: (p) => [
    ...Array.from({ length: num(p, 'width') }, (_, i) => input(bitName(i), 1)),
    output('Y', num(p, 'width')),
  ],
  comb: (p) => Array.from({ length: num(p, 'width') }, (_, i) => bitName(i)),
  symbol: (p) => ({ shape: 'box', label: t('шина'), detail: `${p.width}×1 → ${p.width}` }),
  describe: (p) => tn(t('Сборка шины {width} бит из отдельных битов'), { width: p.width }),
  emit: (c) => [
    `assign ${c.out('Y')} = {${Array.from({ length: num(c.p, 'width') }, (_, i) => c.in(bitName(num(c.p, 'width') - 1 - i))).join(', ')}};`,
  ],
  outputs: (c) =>
    combine(
      c,
      Array.from({ length: num(c.p, 'width') }, (_, i) => bitName(i)),
      ['Y'],
      (v) => ({
        Y: Array.from({ length: num(c.p, 'width') }, (_, i) => v[bitName(i)] << BigInt(i)).reduce(
          (a, b) => a | b,
          0n,
        ),
      }),
    ),
};

const tagOut: BlockDef = {
  kind: 'tag_out',
  title: t('Метка цепи: передать'),
  help: t(
    'Даёт имя сигналу. Метка «принять» с таким же именем получит этот сигнал без проведённого провода.',
  ),
  defaults: { width: 1 },
  params: [widthSpec()],
  pins: (p) => [input('A', num(p, 'width'))],
  symbol: (_, name) => ({ shape: 'label', label: name, detail: '→' }),
  describe: (p) => tn(t('Метка цепи ({width} бит)'), { width: p.width }),
  wires: (p) => [{ key: '', width: num(p, 'width') }],
  emit: (c) => [`assign ${c.net('')} = ${c.in('A')};`],
  outputs: () => ({}),
};
const tagIn: BlockDef = {
  kind: 'tag_in',
  title: t('Метка цепи: принять'),
  help: t('Берёт сигнал с одноимённой метки «передать». Имя должно совпадать.'),
  defaults: { width: 1 },
  params: [widthSpec()],
  pins: (p) => [output('Y', num(p, 'width'))],
  symbol: (_, name) => ({ shape: 'label', label: name, detail: '←' }),
  describe: (p) => tn(t('Метка цепи ({width} бит)'), { width: p.width }),
  emit: () => [],
  outputs: () => ({}),
  virtual: true,
};
const note: BlockDef = {
  kind: 'note',
  title: t('Текстовая заметка'),
  help: t('Подпись на схеме для себя и других. В устройство не попадает.'),
  defaults: { text: t('Заметка') },
  params: [{ key: 'text', label: t('Текст'), type: 'text', maxLength: 300 }],
  pins: () => [],
  symbol: (p) => ({ shape: 'note', label: text(p, 'text') }),
  describe: () => t('Заметка'),
  emit: () => [],
  outputs: () => ({}),
  virtual: true,
};

export const basicBlocks: BlockDef[] = [
  portInput,
  portOutput,
  constant,
  buffer,
  gate,
  reduce,
  mux,
  demux,
  decoder,
  priority,
  rom,
  extend,
  slice,
  concat,
  split,
  merge,
  tagOut,
  tagIn,
  note,
];
