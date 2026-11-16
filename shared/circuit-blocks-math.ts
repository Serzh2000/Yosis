import type { BlockDef, Params } from './circuit-types';
import {
  clog2,
  combine,
  flag,
  fromSigned,
  input,
  lit,
  list,
  mask,
  num,
  output,
  toSigned,
  tn,
} from './circuit-util';
import { t } from './i18n';

const widthSpec = (key = 'width', label = t('Ширина, бит')) =>
  ({ key, label, type: 'int', min: 1, max: 64, unit: t('бит') }) as const;

const addsub: BlockDef = {
  kind: 'addsub',
  title: t('Сумматор / вычитатель'),
  help: t(
    'Складывает или вычитает два числа без знака. Перенос (заём) за пределами ширины можно вывести отдельно.',
  ),
  defaults: { width: 4, mode: 'add', cin: false, cout: false },
  params: [
    widthSpec(),
    {
      key: 'mode',
      label: t('Операция'),
      type: 'select',
      options: [
        ['add', t('Сложение A + B')],
        ['sub', t('Вычитание A − B')],
        ['select', t('Выбирается входом SUB')],
      ],
    },
    { key: 'cin', label: t('Вход переноса CIN'), type: 'bool' },
    { key: 'cout', label: t('Выход переноса COUT'), type: 'bool' },
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    input('B', num(p, 'width')),
    ...(flag(p, 'cin')
      ? [input('CIN', 1, { hint: p.mode === 'sub' ? t('Заём') : t('Перенос') })]
      : []),
    ...(p.mode === 'select' ? [input('SUB', 1, { hint: t('1 — вычитать') })] : []),
    output('Y', num(p, 'width')),
    ...(flag(p, 'cout') ? [output('COUT', 1, { hint: t('Перенос / заём') })] : []),
  ],
  comb: (p) => [
    'A',
    'B',
    ...(flag(p, 'cin') ? ['CIN'] : []),
    ...(p.mode === 'select' ? ['SUB'] : []),
  ],
  wires: (p) => (flag(p, 'cout') ? [{ key: 'full', width: num(p, 'width') + 1 }] : []),
  symbol: (p) => ({
    shape: 'box',
    label: p.mode === 'add' ? '+' : p.mode === 'sub' ? '−' : '±',
    detail: tn(t('{width} бит'), { width: p.width }),
  }),
  describe: (p) =>
    tn(t('{v1}, {width} бит'), {
      v1:
        p.mode === 'add'
          ? t('Сумматор')
          : p.mode === 'sub'
            ? t('Вычитатель')
            : t('Сумматор/вычитатель'),
      width: p.width,
    }),
  emit: (c) => {
    const w = num(c.p, 'width'),
      cin = flag(c.p, 'cin') ? c.in('CIN') : null,
      wide = (op: string) =>
        `{1'b0, ${c.in('A')}} ${op} {1'b0, ${c.in('B')}}${cin ? ` ${op} ${cin}` : ''}`,
      narrow = (op: string) => `${c.in('A')} ${op} ${c.in('B')}${cin ? ` ${op} ${cin}` : ''}`;
    const pick = (make: (op: string) => string) =>
      c.p.mode === 'add'
        ? make('+')
        : c.p.mode === 'sub'
          ? make('-')
          : `${c.in('SUB')} ? (${make('-')}) : (${make('+')})`;
    if (!flag(c.p, 'cout')) return [`assign ${c.out('Y')} = ${pick(narrow)};`];
    return [
      `assign ${c.net('full')} = ${pick(wide)};`,
      `assign ${c.out('Y')} = ${c.net('full')}[${w - 1}:0];`,
      `assign ${c.out('COUT')} = ${c.net('full')}[${w}];`,
    ];
  },
  outputs: (c) => {
    const w = num(c.p, 'width'),
      pins = [
        'A',
        'B',
        ...(flag(c.p, 'cin') ? ['CIN'] : []),
        ...(c.p.mode === 'select' ? ['SUB'] : []),
      ];
    return combine(c, pins, ['Y', 'COUT'], (v) => {
      const carry = v.CIN ?? 0n,
        subtract = c.p.mode === 'sub' || (c.p.mode === 'select' && v.SUB === 1n),
        full = BigInt.asUintN(w + 1, subtract ? v.A - v.B - carry : v.A + v.B + carry);
      return { Y: full & mask(w), COUT: full >> BigInt(w) };
    });
  },
};
const incdec: BlockDef = {
  kind: 'incdec',
  title: t('Инкремент / декремент'),
  help: t(
    'Прибавляет или вычитает единицу. После максимума инкремент даёт 0, после 0 декремент даёт максимум.',
  ),
  defaults: { width: 4, mode: 'inc' },
  params: [
    widthSpec(),
    {
      key: 'mode',
      label: t('Операция'),
      type: 'select',
      options: [
        ['inc', t('Прибавить 1')],
        ['dec', t('Вычесть 1')],
      ],
    },
  ],
  pins: (p) => [input('A', num(p, 'width')), output('Y', num(p, 'width'))],
  comb: () => ['A'],
  symbol: (p) => ({
    shape: 'box',
    label: p.mode === 'inc' ? '+1' : '−1',
    detail: tn(t('{width} бит'), { width: p.width }),
  }),
  describe: (p) => (p.mode === 'inc' ? t('Прибавить 1') : t('Вычесть 1')),
  emit: (c) => [
    `assign ${c.out('Y')} = ${c.in('A')} ${c.p.mode === 'inc' ? '+' : '-'} ${lit(num(c.p, 'width'), 1n)};`,
  ],
  outputs: (c) =>
    combine(c, ['A'], ['Y'], (v) => ({
      Y: BigInt.asUintN(num(c.p, 'width'), c.p.mode === 'inc' ? v.A + 1n : v.A - 1n),
    })),
};
const mult: BlockDef = {
  kind: 'mult',
  title: t('Умножитель'),
  help: t(
    'Умножает два числа. Результат шире: его ширина равна сумме ширин A и B, поэтому ничего не теряется.',
  ),
  defaults: { widthA: 4, widthB: 4, signed: false },
  params: [
    widthSpec('widthA', t('Ширина A, бит')),
    widthSpec('widthB', t('Ширина B, бит')),
    { key: 'signed', label: t('Числа со знаком'), type: 'bool' },
  ],
  pins: (p) => [
    input('A', num(p, 'widthA')),
    input('B', num(p, 'widthB')),
    output('Y', num(p, 'widthA') + num(p, 'widthB')),
  ],
  check: (p) => (num(p, 'widthA') + num(p, 'widthB') > 64 ? [t('произведение шире 64 бит')] : []),
  comb: () => ['A', 'B'],
  symbol: (p) => ({
    shape: 'box',
    label: '×',
    detail: flag(p, 'signed') ? t('со знаком') : t('без знака'),
  }),
  describe: (p) =>
    tn(t('Умножитель {widthA}×{widthB} бит{v3}'), {
      widthA: p.widthA,
      widthB: p.widthB,
      v3: flag(p, 'signed') ? t(' со знаком') : '',
    }),
  emit: (c) => [
    flag(c.p, 'signed')
      ? `assign ${c.out('Y')} = $signed(${c.in('A')}) * $signed(${c.in('B')});`
      : `assign ${c.out('Y')} = ${c.in('A')} * ${c.in('B')};`,
  ],
  outputs: (c) =>
    combine(c, ['A', 'B'], ['Y'], (v) => {
      const wa = num(c.p, 'widthA'),
        wb = num(c.p, 'widthB');
      return {
        Y: flag(c.p, 'signed')
          ? fromSigned(toSigned(v.A, wa) * toSigned(v.B, wb), wa + wb)
          : v.A * v.B,
      };
    }),
};
const cmpOptions: [string, string][] = [
  ['eq', 'A = B'],
  ['ne', 'A ≠ B'],
  ['lt', 'A < B'],
  ['le', 'A ≤ B'],
  ['gt', 'A > B'],
  ['ge', 'A ≥ B'],
];
const cmpOps = { eq: '==', ne: '!=', lt: '<', le: '<=', gt: '>', ge: '>=' } as const;
const outs = (p: Params) =>
  cmpOptions.map(([key]) => key).filter((key) => list(p, 'outs').includes(key));
const cmp: BlockDef = {
  kind: 'cmp',
  title: t('Компаратор'),
  help: t(
    'Сравнивает A и B. Выберите, какие результаты нужны: равно, не равно, меньше, больше… Каждый — отдельный выход в 1 бит.',
  ),
  defaults: { width: 4, signed: false, outs: ['eq'] },
  params: [
    widthSpec(),
    { key: 'signed', label: t('Числа со знаком'), type: 'bool' },
    { key: 'outs', label: t('Выходы'), type: 'multi', options: cmpOptions },
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    input('B', num(p, 'width')),
    ...outs(p).map((key) => output(key.toUpperCase(), 1)),
  ],
  check: (p) => (outs(p).length ? [] : [t('выберите хотя бы один результат сравнения')]),
  comb: () => ['A', 'B'],
  symbol: (p) => ({
    shape: 'box',
    label: 'CMP',
    detail: flag(p, 'signed') ? t('со знаком') : t('без знака'),
  }),
  describe: (p) =>
    tn(t('Компаратор {width} бит ({v2}){v3}'), {
      width: p.width,
      v2: outs(p).join(', '),
      v3: flag(p, 'signed') ? t(', со знаком') : '',
    }),
  emit: (c) =>
    outs(c.p).map((key) => {
      const a = flag(c.p, 'signed') ? `$signed(${c.in('A')})` : c.in('A'),
        b = flag(c.p, 'signed') ? `$signed(${c.in('B')})` : c.in('B');
      return `assign ${c.out(key.toUpperCase())} = ${a} ${cmpOps[key as keyof typeof cmpOps]} ${b};`;
    }),
  outputs: (c) =>
    combine(
      c,
      ['A', 'B'],
      outs(c.p).map((key) => key.toUpperCase()),
      (v) => {
        const w = num(c.p, 'width'),
          a = flag(c.p, 'signed') ? toSigned(v.A, w) : v.A,
          b = flag(c.p, 'signed') ? toSigned(v.B, w) : v.B;
        const table = { eq: a === b, ne: a !== b, lt: a < b, le: a <= b, gt: a > b, ge: a >= b };
        return Object.fromEntries(
          outs(c.p).map((key) => [key.toUpperCase(), table[key as keyof typeof table] ? 1n : 0n]),
        );
      },
    ),
};
const shift: BlockDef = {
  kind: 'shift',
  title: t('Сдвиг'),
  help: t(
    'Сдвигает биты числа влево или вправо. Количество шагов задано числом или приходит на вход N (бочечный сдвигатель).',
  ),
  defaults: { width: 8, op: 'shl', source: 'const', amount: 1 },
  params: [
    widthSpec(),
    {
      key: 'op',
      label: t('Направление'),
      type: 'select',
      options: [
        ['shl', t('Влево (умножение на 2)')],
        ['shr', t('Вправо, сверху нули')],
        ['sar', t('Вправо с сохранением знака')],
      ],
    },
    {
      key: 'source',
      label: t('Откуда величина сдвига'),
      type: 'select',
      options: [
        ['const', t('Задана числом')],
        ['input', t('Приходит на вход N')],
      ],
    },
    {
      key: 'amount',
      label: t('Сдвиг на, бит'),
      type: 'int',
      min: 0,
      max: (p) => num(p, 'width') - 1,
      when: (p) => p.source === 'const',
    },
  ],
  pins: (p) => [
    input('A', num(p, 'width')),
    ...(p.source === 'input'
      ? [input('N', clog2(num(p, 'width')), { hint: t('Сколько шагов') })]
      : []),
    output('Y', num(p, 'width')),
  ],
  comb: (p) => ['A', ...(p.source === 'input' ? ['N'] : [])],
  check: (p) =>
    p.source === 'const' && num(p, 'amount') >= num(p, 'width')
      ? [t('сдвиг не меньше ширины шины')]
      : [],
  symbol: (p) => ({
    shape: 'box',
    label: p.op === 'shl' ? '<<' : p.op === 'shr' ? '>>' : '>>>',
    detail: p.source === 'const' ? tn(t('на {amount}'), { amount: p.amount }) : t('по входу N'),
  }),
  describe: (p) =>
    tn(t('Сдвиг {dir} {amount}'), {
      dir: p.op === 'shl' ? t('влево') : p.op === 'shr' ? t('вправо') : t('вправо со знаком'),
      amount: p.source === 'const' ? tn(t('на {amount}'), { amount: String(p.amount) }) : t('на N'),
    }),
  emit: (c) => {
    const amount = c.p.source === 'const' ? String(c.p.amount) : c.in('N'),
      a = c.in('A');
    const expr =
      c.p.op === 'shl'
        ? `${a} << ${amount}`
        : c.p.op === 'shr'
          ? `${a} >> ${amount}`
          : `$signed(${a}) >>> ${amount}`;
    return [`assign ${c.out('Y')} = ${expr};`];
  },
  outputs: (c) =>
    combine(c, ['A', ...(c.p.source === 'input' ? ['N'] : [])], ['Y'], (v) => {
      const w = num(c.p, 'width'),
        n = c.p.source === 'input' ? v.N : BigInt(num(c.p, 'amount'));
      if (c.p.op === 'shl') return { Y: (v.A << n) & mask(w) };
      if (c.p.op === 'shr') return { Y: v.A >> n };
      return { Y: fromSigned(toSigned(v.A, w) >> n, w) };
    }),
};

export const mathBlocks: BlockDef[] = [addsub, incdec, mult, cmp, shift];
