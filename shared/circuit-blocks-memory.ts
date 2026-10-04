import type { BlockDef, EvalContext, Params, State } from './circuit-types';
import {
  big,
  clockPin,
  clog2,
  flag,
  guarded,
  input,
  lit,
  mask,
  need,
  num,
  output,
  Unknown,
} from './circuit-util';

const widthSpec = (key = 'width', label = 'Ширина, бит', max = 64) =>
  ({ key, label, type: 'int', min: 1, max, unit: 'бит' }) as const;
const initSpec = {
  key: 'init',
  label: 'Начальное значение при включении платы',
  type: 'bool',
  hint: 'Если выключено, до сброса значение неизвестно (X, в предпросмотре «?»).',
} as const;
const asyncPins = (p: Params) => [
  ...(flag(p, 'aclr') ? [input('ACLR', 1, { hint: 'Асинхронный сброс в 0' })] : []),
  ...(flag(p, 'apre') ? [input('APRE', 1, { hint: 'Асинхронная установка в 1' })] : []),
];
const read = (ctx: EvalContext, pin: string) => need(ctx, pin);
const flagged = (ctx: EvalContext, key: string, pin: string) =>
  flag(ctx.p, key) && read(ctx, pin) === 1n;
const asyncAll = ['ACLR', 'APRE'];

/** Значение при включении: у триггеров Gowin оно обязано совпадать с уровнем асинхронного сброса/установки. */
const powerOn = (p: Params): bigint =>
  flag(p, 'aclr') ? 0n : flag(p, 'apre') ? mask(num(p, 'width')) : big(p, 'resetValue');
const reg: BlockDef = {
  kind: 'reg',
  title: 'Регистр (D-триггер)',
  help: 'Запоминает вход D по положительному фронту такта CLK. Может иметь синхронный сброс, разрешение записи и асинхронные сброс/установку.',
  defaults: {
    width: 1,
    sreset: false,
    resetValue: '0',
    enable: false,
    aclr: false,
    apre: false,
    init: false,
  },
  params: [
    widthSpec(),
    { key: 'sreset', label: 'Синхронный сброс RST', type: 'bool' },
    { key: 'resetValue', label: 'Значение при сбросе', type: 'big', widthKey: 'width' },
    { key: 'enable', label: 'Разрешение записи EN', type: 'bool' },
    { key: 'aclr', label: 'Асинхронный сброс ACLR (в 0)', type: 'bool' },
    {
      key: 'apre',
      label: 'Асинхронная установка APRE (в 1)',
      type: 'bool',
      hint: 'Не включайте одновременно ACLR и APRE и не подавайте на них 1 вместе: результат зависит от порядка.',
    },
    initSpec,
  ],
  pins: (p) => [
    input('D', num(p, 'width')),
    clockPin(),
    ...(flag(p, 'sreset') ? [input('RST', 1, { hint: 'Сброс по такту' })] : []),
    ...(flag(p, 'enable') ? [input('EN', 1, { hint: 'Разрешение записи' })] : []),
    ...asyncPins(p),
    output('Q', num(p, 'width')),
  ],
  comb: () => [],
  check: (p) =>
    big(p, 'resetValue') > mask(num(p, 'width'))
      ? [`значение сброса ${p.resetValue} не помещается в ${p.width} бит`]
      : [],
  regs: (p) => [
    { key: 'Q', width: num(p, 'width'), init: flag(p, 'init') ? powerOn(p) : undefined },
  ],
  symbol: (p) => ({
    shape: 'ff',
    label: 'D',
    detail: num(p, 'width') > 1 ? `${p.width} бит` : undefined,
  }),
  describe: (p) =>
    `Регистр ${p.width} бит: запись по фронту CLK${flag(p, 'sreset') ? ', синхронный сброс' : ''}${flag(p, 'enable') ? ', разрешение EN' : ''}${flag(p, 'aclr') ? ', асинхронный сброс' : ''}${flag(p, 'apre') ? ', асинхронная установка' : ''}`,
  emit: (c) => {
    const w = num(c.p, 'width'),
      q = c.out('Q'),
      asyncs = [
        ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
        ...(flag(c.p, 'apre') ? [`posedge ${c.in('APRE')}`] : []),
      ];
    const chain: string[] = [];
    if (flag(c.p, 'aclr')) chain.push(`if (${c.in('ACLR')}) ${q} <= ${lit(w, 0n)};`);
    if (flag(c.p, 'apre')) chain.push(`if (${c.in('APRE')}) ${q} <= ${lit(w, mask(w))};`);
    if (flag(c.p, 'sreset'))
      chain.push(`if (${c.in('RST')}) ${q} <= ${lit(w, big(c.p, 'resetValue'))};`);
    chain.push(`${flag(c.p, 'enable') ? `if (${c.in('EN')}) ` : ''}${q} <= ${c.in('D')};`);
    return [
      `always @(${['posedge ' + c.in('CLK'), ...asyncs].join(' or ')}) begin`,
      ...chain.map((line, i) => `    ${i ? 'else ' : ''}${line}`),
      'end',
    ];
  },
  init: (p) => ({ q: flag(p, 'init') ? powerOn(p) : null }),
  outputs: (c) => ({ Q: c.state.q ?? null }),
  async: (c) =>
    guarded(['q'], () => {
      if (flagged(c, 'aclr', 'ACLR')) return { q: 0n };
      if (flagged(c, 'apre', 'APRE')) return { q: mask(num(c.p, 'width')) };
      return null as never;
    }) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      const w = num(c.p, 'width');
      if (flagged(c, 'aclr', 'ACLR')) return { q: 0n };
      if (flagged(c, 'apre', 'APRE')) return { q: mask(w) };
      if (flagged(c, 'sreset', 'RST')) return { q: big(c.p, 'resetValue') };
      if (flag(c.p, 'enable') && read(c, 'EN') === 0n) return { q: c.state.q ?? null };
      return { q: read(c, 'D') };
    }),
};

const tff: BlockDef = {
  kind: 'tff',
  title: 'T-триггер',
  help: 'На каждом положительном фронте такта меняет значение на противоположное, если T = 1. Если T = 0, значение сохраняется.',
  defaults: { aclr: false, init: true },
  params: [{ key: 'aclr', label: 'Асинхронный сброс ACLR (в 0)', type: 'bool' }, initSpec],
  pins: (p) => [
    input('T', 1, { hint: '1 — переключать' }),
    clockPin(),
    ...asyncPins(p),
    output('Q', 1),
  ],
  comb: () => [],
  regs: (p) => [{ key: 'Q', width: 1, init: flag(p, 'init') ? 0n : undefined }],
  symbol: () => ({ shape: 'ff', label: 'T' }),
  describe: () => 'T-триггер: переключается по фронту CLK, если T = 1',
  emit: (c) => {
    const q = c.out('Q');
    const events = [
      'posedge ' + c.in('CLK'),
      ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
    ];
    return [
      `always @(${events.join(' or ')}) begin`,
      ...(flag(c.p, 'aclr')
        ? [`    if (${c.in('ACLR')}) ${q} <= 1'b0;`, `    else if (${c.in('T')}) ${q} <= ~${q};`]
        : [`    if (${c.in('T')}) ${q} <= ~${q};`]),
      'end',
    ];
  },
  init: (p) => ({ q: flag(p, 'init') ? 0n : null }),
  outputs: (c) => ({ Q: c.state.q ?? null }),
  async: (c) =>
    guarded(['q'], () =>
      flagged(c, 'aclr', 'ACLR') ? { q: 0n } : (null as never),
    ) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      if (flagged(c, 'aclr', 'ACLR')) return { q: 0n };
      if (read(c, 'T') === 0n) return { q: c.state.q ?? null };
      return { q: c.state.q === null || c.state.q === undefined ? null : c.state.q ^ 1n };
    }),
};

const counterTop = (p: Params): bigint =>
  num(p, 'modulus') ? BigInt(num(p, 'modulus') - 1) : mask(num(p, 'width'));
const counter: BlockDef = {
  kind: 'counter',
  title: 'Счётчик',
  help: 'Считает такты: вверх, вниз или в обе стороны. Можно ограничить счёт модулем (например, до 9), обнулить, загрузить число и получить сигнал переполнения.',
  defaults: {
    width: 4,
    dir: 'up',
    enable: false,
    sclr: false,
    load: false,
    aclr: false,
    modulus: 0,
    tc: false,
    init: true,
  },
  params: [
    widthSpec('width', 'Ширина, бит', 32),
    {
      key: 'dir',
      label: 'Направление',
      type: 'select',
      options: [
        ['up', 'Вверх'],
        ['down', 'Вниз'],
        ['updown', 'Выбирается входом DIR'],
      ],
    },
    {
      key: 'modulus',
      label: 'Модуль (0 — без ограничения)',
      type: 'int',
      min: 0,
      max: 2 ** 32,
      hint: 'Счёт идёт от 0 до модуль−1 и затем начинается заново.',
    },
    { key: 'enable', label: 'Разрешение счёта EN', type: 'bool' },
    { key: 'sclr', label: 'Синхронное обнуление CLR', type: 'bool' },
    { key: 'load', label: 'Параллельная загрузка LOAD/D', type: 'bool' },
    { key: 'aclr', label: 'Асинхронный сброс ACLR', type: 'bool' },
    { key: 'tc', label: 'Выход TC (последнее значение)', type: 'bool' },
    initSpec,
  ],
  pins: (p) => [
    clockPin(),
    ...(flag(p, 'enable') ? [input('EN', 1, { hint: 'Разрешение счёта' })] : []),
    ...(flag(p, 'sclr') ? [input('CLR', 1, { hint: 'Обнулить по такту' })] : []),
    ...(flag(p, 'load')
      ? [input('LOAD', 1, { hint: 'Загрузить D' }), input('D', num(p, 'width'))]
      : []),
    ...(p.dir === 'updown' ? [input('DIR', 1, { hint: '1 — вверх, 0 — вниз' })] : []),
    ...asyncPins({ aclr: p.aclr }),
    output('Q', num(p, 'width')),
    ...(flag(p, 'tc') ? [output('TC', 1, { hint: 'Конец счёта' })] : []),
  ],
  comb: (p) => (p.dir === 'updown' && flag(p, 'tc') ? ['DIR'] : []),
  check: (p) => {
    const m = num(p, 'modulus'),
      errors: string[] = [];
    if (m === 1 || m > 2 ** num(p, 'width'))
      errors.push(`модуль должен быть 0 или от 2 до ${2 ** num(p, 'width')}`);
    return errors;
  },
  regs: (p) => [{ key: 'Q', width: num(p, 'width'), init: flag(p, 'init') ? 0n : undefined }],
  symbol: (p) => ({
    shape: 'ff',
    label: 'CNT',
    detail: `${p.width} бит${num(p, 'modulus') ? ` · mod ${p.modulus}` : ''}`,
  }),
  describe: (p) =>
    `Счётчик ${p.width} бит, ${p.dir === 'up' ? 'вверх' : p.dir === 'down' ? 'вниз' : 'вверх/вниз'}${num(p, 'modulus') ? `, модуль ${p.modulus}` : ''}`,
  emit: (c) => {
    const w = num(c.p, 'width'),
      q = c.out('Q'),
      m = num(c.p, 'modulus'),
      top = lit(w, counterTop(c.p)),
      up = m
        ? `if (${q} == ${top}) ${q} <= ${lit(w, 0n)}; else ${q} <= ${q} + ${lit(w, 1n)};`
        : `${q} <= ${q} + ${lit(w, 1n)};`,
      down = m
        ? `if (${q} == ${lit(w, 0n)}) ${q} <= ${top}; else ${q} <= ${q} - ${lit(w, 1n)};`
        : `${q} <= ${q} - ${lit(w, 1n)};`,
      count =
        c.p.dir === 'up'
          ? up
          : c.p.dir === 'down'
            ? down
            : `if (${c.in('DIR')}) begin ${up} end else begin ${down} end`;
    const chain: string[] = [];
    if (flag(c.p, 'aclr')) chain.push(`if (${c.in('ACLR')}) ${q} <= ${lit(w, 0n)};`);
    if (flag(c.p, 'sclr')) chain.push(`if (${c.in('CLR')}) ${q} <= ${lit(w, 0n)};`);
    if (flag(c.p, 'load')) chain.push(`if (${c.in('LOAD')}) ${q} <= ${c.in('D')};`);
    chain.push(flag(c.p, 'enable') ? `if (${c.in('EN')}) begin ${count} end` : count);
    const events = [
      'posedge ' + c.in('CLK'),
      ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
    ];
    const lines = [
      `always @(${events.join(' or ')}) begin`,
      ...chain.map((line, i) => `    ${i ? 'else ' : ''}${line}`),
      'end',
    ];
    if (flag(c.p, 'tc')) {
      const tcUp = `${q} == ${top}`,
        tcDown = `${q} == ${lit(w, 0n)}`;
      lines.push(
        `assign ${c.out('TC')} = ${c.p.dir === 'up' ? tcUp : c.p.dir === 'down' ? tcDown : `${c.in('DIR')} ? (${tcUp}) : (${tcDown})`};`,
      );
    }
    return lines;
  },
  init: (p) => ({ q: flag(p, 'init') ? 0n : null }),
  outputs: (c) => {
    const q = c.state.q ?? null;
    const result: Record<string, bigint | null> = { Q: q };
    if (flag(c.p, 'tc')) {
      const top = counterTop(c.p);
      if (q === null) result.TC = null;
      else if (c.p.dir === 'up') result.TC = q === top ? 1n : 0n;
      else if (c.p.dir === 'down') result.TC = q === 0n ? 1n : 0n;
      else {
        const dir = c.in('DIR');
        result.TC = dir === null ? null : (dir === 1n ? q === top : q === 0n) ? 1n : 0n;
      }
    }
    return result;
  },
  async: (c) =>
    guarded(['q'], () =>
      flagged(c, 'aclr', 'ACLR') ? { q: 0n } : (null as never),
    ) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      const w = num(c.p, 'width'),
        q = c.state.q ?? null;
      if (flagged(c, 'aclr', 'ACLR')) return { q: 0n };
      if (flagged(c, 'sclr', 'CLR')) return { q: 0n };
      if (flagged(c, 'load', 'LOAD')) return { q: read(c, 'D') };
      if (flag(c.p, 'enable') && read(c, 'EN') === 0n) return { q };
      if (q === null) return { q: null };
      const m = num(c.p, 'modulus'),
        top = counterTop(c.p),
        up = c.p.dir === 'up' || (c.p.dir === 'updown' && read(c, 'DIR') === 1n);
      if (up) return { q: m && q === top ? 0n : BigInt.asUintN(w, q + 1n) };
      return { q: m && q === 0n ? top : BigInt.asUintN(w, q - 1n) };
    }),
};

const shreg: BlockDef = {
  kind: 'shreg',
  title: 'Сдвиговый регистр',
  help: 'На каждом такте сдвигает биты на одну позицию и принимает новый бит SI. Выпавший бит выходит на SO; все биты доступны на Q.',
  defaults: { width: 8, dir: 'left', enable: false, load: false, aclr: false, init: true },
  params: [
    widthSpec('width', 'Ширина, бит', 32),
    {
      key: 'dir',
      label: 'Направление сдвига',
      type: 'select',
      options: [
        ['left', 'Влево (к старшему биту)'],
        ['right', 'Вправо (к младшему биту)'],
      ],
    },
    { key: 'enable', label: 'Разрешение сдвига EN', type: 'bool' },
    { key: 'load', label: 'Параллельная загрузка LOAD/D', type: 'bool' },
    { key: 'aclr', label: 'Асинхронный сброс ACLR', type: 'bool' },
    initSpec,
  ],
  pins: (p) => [
    input('SI', 1, { hint: 'Новый бит' }),
    clockPin(),
    ...(flag(p, 'enable') ? [input('EN', 1, { hint: 'Разрешение сдвига' })] : []),
    ...(flag(p, 'load')
      ? [input('LOAD', 1, { hint: 'Загрузить D' }), input('D', num(p, 'width'))]
      : []),
    ...asyncPins({ aclr: p.aclr }),
    output('Q', num(p, 'width')),
    output('SO', 1, { hint: 'Выпавший бит' }),
  ],
  comb: () => [],
  check: (p) => (num(p, 'width') < 2 ? ['нужно хотя бы 2 бита'] : []),
  regs: (p) => [{ key: 'Q', width: num(p, 'width'), init: flag(p, 'init') ? 0n : undefined }],
  symbol: (p) => ({
    shape: 'ff',
    label: 'SHR',
    detail: `${p.width} бит ${p.dir === 'left' ? '←' : '→'}`,
  }),
  describe: (p) =>
    `Сдвиговый регистр ${p.width} бит, сдвиг ${p.dir === 'left' ? 'влево' : 'вправо'}`,
  emit: (c) => {
    const w = num(c.p, 'width'),
      q = c.out('Q'),
      shiftCode =
        c.p.dir === 'left'
          ? `${q} <= {${q}[${w - 2}:0], ${c.in('SI')}};`
          : `${q} <= {${c.in('SI')}, ${q}[${w - 1}:1]};`;
    const chain: string[] = [];
    if (flag(c.p, 'aclr')) chain.push(`if (${c.in('ACLR')}) ${q} <= ${lit(w, 0n)};`);
    if (flag(c.p, 'load')) chain.push(`if (${c.in('LOAD')}) ${q} <= ${c.in('D')};`);
    chain.push(flag(c.p, 'enable') ? `if (${c.in('EN')}) ${shiftCode}` : shiftCode);
    const events = [
      'posedge ' + c.in('CLK'),
      ...(flag(c.p, 'aclr') ? [`posedge ${c.in('ACLR')}`] : []),
    ];
    return [
      `always @(${events.join(' or ')}) begin`,
      ...chain.map((line, i) => `    ${i ? 'else ' : ''}${line}`),
      'end',
      `assign ${c.out('SO')} = ${c.p.dir === 'left' ? `${q}[${w - 1}]` : `${q}[0]`};`,
    ];
  },
  init: (p) => ({ q: flag(p, 'init') ? 0n : null }),
  outputs: (c) => {
    const q = c.state.q ?? null,
      w = num(c.p, 'width');
    return {
      Q: q,
      SO: q === null ? null : c.p.dir === 'left' ? (q >> BigInt(w - 1)) & 1n : q & 1n,
    };
  },
  async: (c) =>
    guarded(['q'], () =>
      flagged(c, 'aclr', 'ACLR') ? { q: 0n } : (null as never),
    ) as State | null,
  next: (c) =>
    guarded(['q'], () => {
      const w = num(c.p, 'width'),
        q = c.state.q ?? null;
      if (flagged(c, 'aclr', 'ACLR')) return { q: 0n };
      if (flagged(c, 'load', 'LOAD')) return { q: read(c, 'D') };
      if (flag(c.p, 'enable') && read(c, 'EN') === 0n) return { q };
      const si = read(c, 'SI');
      if (q === null) return { q: null };
      return {
        q: c.p.dir === 'left' ? ((q << 1n) | si) & mask(w) : (q >> 1n) | (si << BigInt(w - 1)),
      };
    }),
};

/** Расчёт делителя частоты: сколько тактов в периоде и какая частота получится на самом деле. */
export function dividerPlan(p: Params) {
  const clockHz = num(p, 'clockHz'),
    hz = num(p, 'hz'),
    square = p.mode === 'square';
  // Меандр: полупериод в тактах; импульс: период в тактах.
  const cycles = Math.round(square ? clockHz / (2 * hz) : clockHz / hz);
  const actualHz = square ? clockHz / (2 * cycles) : clockHz / cycles;
  const limit = square ? 1 : 2;
  const error =
    cycles < limit
      ? `частота ${hz} Гц слишком высока для такта ${clockHz} Гц`
      : cycles > 4294967296
        ? 'частота слишком низкая: нужен счётчик шире 32 бит'
        : '';
  return {
    cycles,
    width: clog2(Math.max(cycles, 2)),
    actualHz,
    periodSeconds: 1 / actualHz,
    error,
  };
}
export function formatHz(hz: number): string {
  const text =
    hz >= 1e6
      ? `${+(hz / 1e6).toPrecision(6)} МГц`
      : hz >= 1e3
        ? `${+(hz / 1e3).toPrecision(6)} кГц`
        : `${+hz.toPrecision(6)} Гц`;
  return text.replace('.', ',');
}
export function formatSeconds(seconds: number): string {
  const text =
    seconds >= 1
      ? `${+seconds.toPrecision(6)} с`
      : seconds >= 1e-3
        ? `${+(seconds * 1e3).toPrecision(6)} мс`
        : `${+(seconds * 1e6).toPrecision(6)} мкс`;
  return text.replace('.', ',');
}
const clockHzSpec = {
  key: 'clockHz',
  label: 'Частота входного такта, Гц',
  type: 'int',
  min: 1,
  max: 200_000_000,
  unit: 'Гц',
  hint: 'На плате Tang Nano 20K такт равен 27 000 000 Гц. Меняйте только для учебных экспериментов.',
} as const;
const divider: BlockDef = {
  kind: 'divider',
  title: 'Делитель частоты',
  help: 'Превращает быстрый такт 27 МГц в медленный сигнал, заметный глазу: либо короткий импульс «раз в период» (разрешение для счётчиков), либо ровный меандр.',
  defaults: { mode: 'square', hz: 1, clockHz: 27_000_000 },
  params: [
    {
      key: 'mode',
      label: 'Что выдавать',
      type: 'select',
      options: [
        ['square', 'Меандр (0 и 1 по очереди)'],
        ['pulse', 'Короткий импульс раз в период'],
      ],
    },
    { key: 'hz', label: 'Частота, Гц', type: 'float', min: 0.01, max: 13_500_000, unit: 'Гц' },
    clockHzSpec,
  ],
  pins: () => [clockPin(), output('Y', 1)],
  comb: () => [],
  check: (p) => {
    const plan = dividerPlan(p);
    return plan.error ? [plan.error] : [];
  },
  regs: (p) => {
    const plan = dividerPlan(p);
    return [
      { key: 'cnt', width: plan.width, init: 0n, internal: true },
      ...(p.mode === 'square' ? [{ key: 'Y', width: 1, init: 0n }] : []),
    ];
  },
  symbol: (p) => ({
    shape: 'box',
    label: '÷',
    detail: `${formatHz(dividerPlan(p).actualHz)}`,
  }),
  describe: (p) => {
    const plan = dividerPlan(p);
    return `Делитель частоты: ${p.mode === 'square' ? 'меандр' : 'импульс'} ${formatHz(plan.actualHz)} (счёт до ${plan.cycles})`;
  },
  emit: (c) => {
    const plan = dividerPlan(c.p),
      cnt = c.net('cnt'),
      last = lit(plan.width, BigInt(plan.cycles - 1)),
      clk = c.in('CLK');
    return c.p.mode === 'square'
      ? [
          `// Полупериод ${plan.cycles} тактов при ${num(c.p, 'clockHz')} Гц: меандр ${formatHz(plan.actualHz)}.`,
          `always @(posedge ${clk}) begin`,
          `    if (${cnt} == ${last}) begin`,
          `        ${cnt} <= ${lit(plan.width, 0n)};`,
          `        ${c.out('Y')} <= ~${c.out('Y')};`,
          '    end else',
          `        ${cnt} <= ${cnt} + ${lit(plan.width, 1n)};`,
          'end',
        ]
      : [
          `// Период ${plan.cycles} тактов при ${num(c.p, 'clockHz')} Гц: один импульс ${formatHz(plan.actualHz)}.`,
          `always @(posedge ${clk}) begin`,
          `    if (${cnt} == ${last}) ${cnt} <= ${lit(plan.width, 0n)};`,
          `    else ${cnt} <= ${cnt} + ${lit(plan.width, 1n)};`,
          'end',
          `assign ${c.out('Y')} = (${cnt} == ${last});`,
        ];
  },
  init: () => ({ cnt: 0n, y: 0n }),
  outputs: (c) => {
    const plan = dividerPlan(c.p);
    return {
      Y:
        c.p.mode === 'square'
          ? (c.state.y ?? 0n)
          : (c.state.cnt ?? 0n) === BigInt(plan.cycles - 1)
            ? 1n
            : 0n,
    };
  },
  next: (c) => {
    const plan = dividerPlan(c.p),
      cnt = c.state.cnt ?? 0n,
      wrap = cnt === BigInt(plan.cycles - 1);
    return {
      cnt: wrap ? 0n : cnt + 1n,
      y: c.p.mode === 'square' && wrap ? (c.state.y ?? 0n) ^ 1n : (c.state.y ?? 0n),
    };
  },
};

const sync2: BlockDef = {
  kind: 'sync2',
  title: 'Синхронизатор (2 триггера)',
  help: 'Пропускает асинхронный сигнал, например кнопку, через два триггера. Так сигнал надёжно привязывается к такту. Задерживает его на 2 такта.',
  defaults: {},
  params: [],
  pins: () => [input('D', 1), clockPin(), output('Q', 1)],
  comb: () => [],
  regs: () => [
    { key: 'meta', width: 1, init: 0n, internal: true },
    { key: 'Q', width: 1, init: 0n },
  ],
  symbol: () => ({ shape: 'ff', label: 'SYNC', detail: '2 триггера' }),
  describe: () => 'Синхронизатор: два триггера подряд',
  emit: (c) => [
    `always @(posedge ${c.in('CLK')}) begin`,
    `    ${c.net('meta')} <= ${c.in('D')};`,
    `    ${c.out('Q')} <= ${c.net('meta')};`,
    'end',
  ],
  init: () => ({ meta: 0n, q: 0n }),
  outputs: (c) => ({ Q: c.state.q ?? 0n }),
  next: (c) => ({ meta: c.in('D'), q: c.state.meta ?? 0n }),
};
const edge: BlockDef = {
  kind: 'edge',
  title: 'Детектор фронта («нажатие»)',
  help: 'Выдаёт ровно один такт единицы в момент, когда сигнал меняется с 0 на 1 (нажатие) или с 1 на 0 (отпускание).',
  defaults: { mode: 'rising' },
  params: [
    {
      key: 'mode',
      label: 'Какой фронт',
      type: 'select',
      options: [
        ['rising', 'Нажатие (0 → 1)'],
        ['falling', 'Отпускание (1 → 0)'],
      ],
    },
  ],
  pins: () => [input('D', 1), clockPin(), output('P', 1, { hint: 'Импульс на 1 такт' })],
  comb: () => ['D'],
  regs: () => [{ key: 'prev', width: 1, init: 0n, internal: true }],
  symbol: (p) => ({ shape: 'ff', label: p.mode === 'rising' ? '↑' : '↓', detail: 'фронт' }),
  describe: (p) =>
    `Детектор ${p.mode === 'rising' ? 'нажатия (фронт 0 → 1)' : 'отпускания (фронт 1 → 0)'}`,
  emit: (c) => [
    `always @(posedge ${c.in('CLK')}) ${c.net('prev')} <= ${c.in('D')};`,
    c.p.mode === 'rising'
      ? `assign ${c.out('P')} = ${c.in('D')} & ~${c.net('prev')};`
      : `assign ${c.out('P')} = ~${c.in('D')} & ${c.net('prev')};`,
  ],
  init: () => ({ prev: 0n }),
  outputs: (c) => {
    const d = c.in('D');
    if (d === null) return { P: null };
    const prev = c.state.prev ?? 0n;
    return { P: c.p.mode === 'rising' ? d & (prev ^ 1n) : (d ^ 1n) & prev };
  },
  next: (c) => ({ prev: need(c, 'D') }),
};
const debounceCycles = (p: Params) =>
  Math.max(1, Math.round((num(p, 'ms') / 1000) * num(p, 'clockHz')));
const debounce: BlockDef = {
  kind: 'debounce',
  title: 'Антидребезг',
  help: 'Кнопка при нажатии «дребезжит»: несколько раз быстро меняет значение. Блок меняет выход, только когда вход держится одинаково заданное время.',
  defaults: { ms: 10, clockHz: 27_000_000 },
  params: [
    {
      key: 'ms',
      label: 'Время устойчивости, мс',
      type: 'float',
      min: 0.001,
      max: 1000,
      unit: 'мс',
    },
    clockHzSpec,
  ],
  pins: () => [input('D', 1), clockPin(), output('Q', 1)],
  comb: () => [],
  check: (p) =>
    debounceCycles(p) > 4294967296
      ? ['время устойчивости слишком велико для 32-битного счётчика']
      : [],
  regs: (p) => [
    { key: 'cnt', width: clog2(Math.max(2, debounceCycles(p))), init: 0n, internal: true },
    { key: 'Q', width: 1, init: 0n },
  ],
  symbol: (p) => ({ shape: 'ff', label: 'DEB', detail: `${p.ms} мс` }),
  describe: (p) =>
    `Антидребезг: выход меняется после ${debounceCycles(p)} тактов устойчивого входа`,
  emit: (c) => {
    const n = debounceCycles(c.p),
      width = clog2(Math.max(2, n)),
      cnt = c.net('cnt'),
      q = c.out('Q');
    return [
      `// Вход должен держаться ${n} тактов (${c.p.ms} мс при ${num(c.p, 'clockHz')} Гц).`,
      `always @(posedge ${c.in('CLK')}) begin`,
      `    if (${c.in('D')} == ${q}) ${cnt} <= ${lit(width, 0n)};`,
      '    else begin',
      `        ${cnt} <= ${cnt} + ${lit(width, 1n)};`,
      `        if (${cnt} == ${lit(width, BigInt(n - 1))}) begin`,
      `            ${q} <= ${c.in('D')};`,
      `            ${cnt} <= ${lit(width, 0n)};`,
      '        end',
      '    end',
      'end',
    ];
  },
  init: () => ({ cnt: 0n, q: 0n }),
  outputs: (c) => ({ Q: c.state.q ?? 0n }),
  next: (c) => {
    const d = need(c, 'D'),
      q = c.state.q ?? 0n,
      cnt = c.state.cnt ?? 0n;
    if (d === q) return { cnt: 0n, q };
    if (cnt === BigInt(debounceCycles(c.p) - 1)) return { cnt: 0n, q: d };
    return { cnt: cnt + 1n, q };
  },
};

const buttonPins: Record<string, number> = { s1: 88, s2: 87 };
const button: BlockDef = {
  kind: 'button',
  title: 'Кнопка платы',
  help: 'Кнопка S1 или S2 на Tang Nano 20K. Пока кнопка нажата, на выходе 1; когда отпущена — 0.',
  defaults: { which: 's1' },
  params: [
    {
      key: 'which',
      label: 'Кнопка',
      type: 'select',
      options: [
        ['s1', 'S1'],
        ['s2', 'S2'],
      ],
    },
  ],
  pins: () => [output('Y', 1, { hint: '1 — нажата' })],
  symbol: (p) => ({ shape: 'board-in', label: String(p.which).toUpperCase(), detail: 'кнопка' }),
  describe: (p) => `Кнопка ${String(p.which).toUpperCase()} на плате (нажата = 1)`,
  emit: () => [],
  init: () => ({ v: 0n }),
  outputs: (c) => ({ Y: c.state.v ?? 0n }),
  port: {
    direction: 'input',
    board: (p, name) => [{ signal: name, pin: buttonPins[p.which as string], direction: 'input' }],
  },
};
const clock27: BlockDef = {
  kind: 'clock27',
  title: 'Такт 27 МГц',
  help: 'Главный такт платы: 27 миллионов импульсов в секунду. От него работают все триггеры и счётчики.',
  defaults: {},
  params: [],
  pins: () => [output('Y', 1, { hint: 'Такт 27 МГц' })],
  symbol: () => ({ shape: 'board-in', label: '27 МГц', detail: 'такт' }),
  describe: () => 'Такт платы 27 МГц',
  emit: () => [],
  init: () => ({ v: 0n }),
  outputs: (c) => ({ Y: c.state.v ?? 0n }),
  port: {
    direction: 'input',
    board: (_, name) => [{ signal: name, pin: 4, direction: 'input' }],
  },
};
const led: BlockDef = {
  kind: 'led',
  title: 'Светодиод платы',
  help: 'Один из шести светодиодов платы. Светится, когда на входе 1. Особенность платы (светодиод включается нулём) учтена автоматически.',
  defaults: { index: 0 },
  params: [{ key: 'index', label: 'Номер светодиода (LED0…LED5)', type: 'int', min: 0, max: 5 }],
  pins: () => [input('A', 1, { hint: '1 — светится' })],
  symbol: (p) => ({ shape: 'board-out', label: `LED${p.index}`, detail: 'светодиод' }),
  describe: (p) => `Светодиод LED${p.index}: светится при 1 (инверсия для платы добавлена)`,
  emit: () => [],
  outputs: () => ({}),
  port: {
    direction: 'output',
    activeLow: true,
    board: (p, name) => [{ signal: name, pin: 15 + num(p, 'index'), direction: 'output' }],
  },
};
const ledbank: BlockDef = {
  kind: 'ledbank',
  title: 'Шесть светодиодов',
  help: 'Все шесть светодиодов платы как одна 6-битная шина: бит 0 — LED0, бит 5 — LED5. Светится бит, равный 1.',
  defaults: {},
  params: [],
  pins: () => [input('A', 6, { hint: 'Бит = 1 — светится' })],
  symbol: () => ({ shape: 'board-out', label: 'LED[5..0]', detail: '6 светодиодов' }),
  describe: () => 'Шесть светодиодов платы: бит = 1 — светится (инверсия добавлена)',
  emit: () => [],
  outputs: () => ({}),
  port: {
    direction: 'output',
    activeLow: true,
    board: (_, name) =>
      Array.from({ length: 6 }, (_, i) => ({
        signal: `${name}[${i}]`,
        pin: 15 + i,
        direction: 'output' as const,
      })),
  },
};

export const memoryBlocks: BlockDef[] = [
  reg,
  tff,
  counter,
  shreg,
  divider,
  sync2,
  edge,
  debounce,
  button,
  clock27,
  led,
  ledbank,
];
export const asyncPinNames = asyncAll;
export { Unknown };
