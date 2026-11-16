import type { BlockDef } from './circuit-types';
import { clog2, flag, input, lit, mask, num, output, tn } from './circuit-util';
import { t } from './i18n';

/** Шифраторы и преобразователи кодов по образцу микросхем серии 74 из библиотеки Quartus. */
const widthSpec = (key: string, label: string, min: number, max: number) =>
  ({ key, label, type: 'int', min, max, unit: t('бит') }) as const;

const encoder: BlockDef = {
  kind: 'encoder',
  title: t('Приоритетный шифратор с каскадированием'),
  help: t(
    'Выдаёт номер старшего активного входа. Как микросхема 74148: вход разрешения EI, выход EO («здесь пусто, включай следующую микросхему») и GS («есть активный вход»). С активным низким уровнем все сигналы инвертированы, как у настоящей микросхемы.',
  ),
  defaults: { width: 8, cascade: true, activeLow: true },
  params: [
    widthSpec('width', t('Число входов'), 2, 32),
    { key: 'cascade', label: t('Выводы EI, EO, GS для каскадирования'), type: 'bool' },
    { key: 'activeLow', label: t('Активный низкий уровень (как у 74148)'), type: 'bool' },
  ],
  pins: (p) => [
    input('A', num(p, 'width'), { hint: t('Входы') }),
    ...(flag(p, 'cascade') ? [input('EI', 1, { hint: t('Разрешение') })] : []),
    output('Y', clog2(num(p, 'width')), { hint: t('Номер') }),
    ...(flag(p, 'cascade')
      ? [output('EO', 1, { hint: t('Нет входов') }), output('GS', 1, { hint: t('Есть вход') })]
      : []),
  ],
  comb: (p) => ['A', ...(flag(p, 'cascade') ? ['EI'] : [])],
  wires: (p) => [{ key: 'a', width: num(p, 'width') }],
  symbol: (p) => ({
    shape: 'box',
    label: 'ENC',
    detail: tn(t('приоритет {width}'), { width: p.width }),
  }),
  describe: (p) =>
    tn(t('Приоритетный шифратор {width} → {v2}{v3}'), {
      width: p.width,
      v2: clog2(num(p, 'width')),
      v3: flag(p, 'cascade') ? t(' с EI, EO, GS') : '',
    }),
  emit: (c) => {
    const w = num(c.p, 'width'),
      yw = clog2(w),
      low = flag(c.p, 'activeLow'),
      cascade = flag(c.p, 'cascade'),
      a = c.net('a'),
      ei = cascade ? (low ? `(~${c.in('EI')})` : c.in('EI')) : "1'b1",
      chain = Array.from({ length: w - 1 }, (_, k) => {
        const i = w - 1 - k;
        return `${a}[${i}] ? ${lit(yw, BigInt(i))} : `;
      }).join(''),
      y = `(${ei} ? (${chain}${lit(yw, 0n)}) : ${lit(yw, 0n)})`,
      any = `(|${a})`,
      out = (value: string) => (low ? `~${value}` : value);
    return [
      `assign ${a} = ${low ? `~${c.in('A')}` : c.in('A')};`,
      `assign ${c.out('Y')} = ${out(y)};`,
      ...(cascade
        ? [
            `assign ${c.out('GS')} = ${out(`(${ei} & ${any})`)};`,
            `assign ${c.out('EO')} = ${out(`(${ei} & ~${any})`)};`,
          ]
        : []),
    ];
  },
  outputs: (c) => {
    const w = num(c.p, 'width'),
      yw = clog2(w),
      low = flag(c.p, 'activeLow'),
      cascade = flag(c.p, 'cascade'),
      raw = c.in('A'),
      rawEi = cascade ? c.in('EI') : 1n;
    if (raw === null || rawEi === null) return { Y: null, EO: null, GS: null };
    const a = low ? ~raw & mask(w) : raw,
      ei = low && cascade ? ~rawEi & 1n : rawEi,
      any = a !== 0n,
      y = ei === 1n && any ? BigInt(a.toString(2).length - 1) : 0n,
      flip = (value: bigint, width: number) => (low ? ~value & mask(width) : value);
    return {
      Y: flip(y, yw),
      GS: flip(ei === 1n && any ? 1n : 0n, 1),
      EO: flip(ei === 1n && !any ? 1n : 0n, 1),
    };
  },
};

const digitsOf = (bits: number) => String(2 ** bits - 1).length;
const bcdconv: BlockDef = {
  kind: 'bcdconv',
  title: t('Двоичный ↔ BCD'),
  help: t(
    'Переводит двоичное число в двоично-десятичный код (каждая десятичная цифра в своих четырёх битах) или обратно. Как микросхемы 74184 и 74185.',
  ),
  defaults: { bits: 8, mode: 'bin2bcd' },
  params: [
    widthSpec('bits', t('Ширина двоичного числа, бит'), 1, 16),
    {
      key: 'mode',
      label: t('Направление'),
      type: 'select',
      options: [
        ['bin2bcd', t('Двоичный → BCD')],
        ['bcd2bin', t('BCD → двоичный')],
      ],
    },
  ],
  pins: (p) => {
    const bin = num(p, 'bits'),
      bcd = 4 * digitsOf(bin);
    return p.mode === 'bin2bcd'
      ? [input('A', bin), output('Y', bcd, { hint: t('Цифры BCD') })]
      : [input('A', bcd, { hint: t('Цифры BCD') }), output('Y', bin)];
  },
  comb: () => ['A'],
  wires: (p) =>
    p.mode === 'bin2bcd'
      ? Array.from({ length: digitsOf(num(p, 'bits')) }, (_, i) => ({ key: `d${i}`, width: 4 }))
      : [],
  symbol: (p) => ({
    shape: 'box',
    label: p.mode === 'bin2bcd' ? 'BIN→BCD' : 'BCD→BIN',
    detail: tn(t('{bits} бит'), { bits: p.bits }),
  }),
  describe: (p) => (p.mode === 'bin2bcd' ? t('Двоичный код → BCD') : t('BCD → двоичный код')),
  emit: (c) => {
    const bin = num(c.p, 'bits'),
      digits = digitsOf(bin),
      a = c.in('A');
    if (c.p.mode === 'bin2bcd')
      return [
        ...Array.from(
          { length: digits },
          (_, i) => `assign ${c.net(`d${i}`)} = (${a} / ${10 ** i}) % 10;`,
        ),
        `assign ${c.out('Y')} = {${Array.from({ length: digits }, (_, k) => c.net(`d${digits - 1 - k}`)).join(', ')}};`,
      ];
    const terms = Array.from(
      { length: digits },
      (_, i) => `${a}[${4 * i + 3}:${4 * i}] * ${10 ** i}`,
    );
    return [`assign ${c.out('Y')} = ${terms.join(' + ')};`];
  },
  outputs: (c) => {
    const a = c.in('A');
    if (a === null) return { Y: null };
    const bin = num(c.p, 'bits'),
      digits = digitsOf(bin);
    if (c.p.mode === 'bin2bcd') {
      let result = 0n;
      for (let i = 0; i < digits; i++) result |= ((a / 10n ** BigInt(i)) % 10n) << BigInt(4 * i);
      return { Y: result };
    }
    let total = 0n;
    for (let i = 0; i < digits; i++) total += ((a >> BigInt(4 * i)) & 15n) * 10n ** BigInt(i);
    return { Y: total & mask(bin) };
  },
};

const bcddec: BlockDef = {
  kind: 'bcddec',
  title: t('Дешифратор BCD → «один из десяти»'),
  help: t(
    'Цифра 0…9 в BCD превращается в «один из десяти». Для кодов 10…15 все выходы неактивны. Как микросхема 7442.',
  ),
  defaults: { activeLow: false },
  params: [{ key: 'activeLow', label: t('Активный низкий уровень (как у 7442)'), type: 'bool' }],
  pins: () => [
    input('A', 4, { hint: t('Цифра') }),
    output('Y', 10, { hint: t('Одна из десяти линий') }),
  ],
  comb: () => ['A'],
  symbol: () => ({ shape: 'box', label: 'DEC', detail: 'BCD → 10' }),
  describe: () => t('Дешифратор BCD → десять линий'),
  emit: (c) => {
    const one = `(${c.in('A')} < 4'd10 ? (${lit(10, 1n)} << ${c.in('A')}) : ${lit(10, 0n)})`;
    return [`assign ${c.out('Y')} = ${flag(c.p, 'activeLow') ? `~${one}` : one};`];
  },
  outputs: (c) => {
    const a = c.in('A');
    if (a === null) return { Y: null };
    const one = a < 10n ? 1n << a : 0n;
    return { Y: flag(c.p, 'activeLow') ? ~one & mask(10) : one };
  },
};

export const codeBlocks: BlockDef[] = [encoder, bcdconv, bcddec];
