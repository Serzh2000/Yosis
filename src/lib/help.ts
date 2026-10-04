/** Educational descriptions are independent of netlist names and never execute project code. */
export type HelpSymbol =
  | 'and'
  | 'or'
  | 'xor'
  | 'not'
  | 'buffer'
  | 'mux'
  | 'demux'
  | 'adder'
  | 'register'
  | 'latch'
  | 'lut'
  | 'memory'
  | 'io'
  | 'arithmetic'
  | 'parameter'
  | 'block';
export type ResourceKind = 'LUT' | 'FF' | 'ALU' | 'BRAM' | 'DSP' | 'IO' | 'I/O' | 'other';
export type HelpTopic =
  | { kind: 'primitive'; type: string }
  | { kind: 'parameter'; name: string; value: string | number; cellType?: string }
  | { kind: 'resource'; resource: ResourceKind; view?: 'rtl' | 'technology' };
export interface HelpArticle {
  id: string;
  title: string;
  subtitle: string;
  symbol: HelpSymbol;
  symbolLabel?: string;
  inverted?: boolean;
  paragraphs: string[];
  example?: string;
  notes?: string[];
  sources?: Array<{ title: string; url: string }>;
  rawValue?: string;
  decodedValue?: string;
}
export interface ParameterValue {
  display: string;
  raw: string;
  encoding: 'binary' | 'number' | 'text';
  decimal?: string;
  hex?: string;
}

const docs = 'https://yosyshq.readthedocs.io/projects/yosys/en/stable/cell/';
const gowinModels = 'https://github.com/YosysHQ/yosys/blob/main/techlibs/gowin/cells_sim.v';
const source = (page: string) => [{ title: 'Документация Yosys', url: `${docs}${page}.html` }];
const gowinSource = [{ title: 'Модели примитивов Gowin в Yosys', url: gowinModels }];
const memoryPortFlags = /^(?:RD|WR)_(?:CLK_ENABLE|CLK_POLARITY|CE_OVER_SRST|WIDE_CONTINUATION)$/;
const memoryMasks = /^(?:RD|WR)_(?:TRANSPARENCY_MASK|COLLISION_X_MASK|PRIORITY_MASK)$/;

function bitCount(value: bigint): string {
  const last100 = value % 100n;
  const last = value % 10n;
  const noun =
    last100 >= 11n && last100 <= 14n
      ? 'бит'
      : last === 1n
        ? 'бит'
        : last >= 2n && last <= 4n
          ? 'бита'
          : 'бит';
  return `${value} ${noun}`;
}

/** Yosys JSON stores integer parameters as MSB-first binary strings, even widths. */
export function formatParameterValue(
  name: string,
  value: string | number,
  cellType?: string,
): ParameterValue {
  const raw = String(value);
  let number: bigint | undefined;
  const encoding: ParameterValue['encoding'] =
    typeof value === 'number' ? 'number' : /^[01xz]+$/i.test(raw) ? 'binary' : 'text';
  if (typeof value === 'number' && Number.isSafeInteger(value)) number = BigInt(value);
  else if (/^[01]+$/.test(raw)) number = BigInt(`0b${raw}`);
  else if (/^0x[\da-f]+$/i.test(raw)) number = BigInt(raw);
  if (number === undefined) return { display: raw, raw, encoding };
  const result: ParameterValue = {
    display: number.toString(),
    raw,
    encoding,
    decimal: number.toString(),
    hex: number >= 0n ? `0x${number.toString(16).toUpperCase()}` : undefined,
  };
  if (memoryPortFlags.test(name)) {
    const bits = /^[01]+$/.test(raw) && typeof value === 'string' ? raw : number.toString(2);
    const perPort = [...bits]
      .reverse()
      .slice(0, 8)
      .map(
        (bit, index) =>
          `${index}: ${name.endsWith('CLK_POLARITY') ? (bit === '1' ? '↑' : '↓') : bit}`,
      )
      .join(' · ');
    result.display = `порты ${perPort}${bits.length > 8 ? ' …' : ''}`;
    return result;
  }
  if (memoryMasks.test(name)) {
    result.display = `маска ${result.hex}`;
    return result;
  }
  // Vector flags in macc_v2 describe several operands and are not single booleans.
  const vectorFlags = cellType === '$macc_v2' && /^(?:A|B|C)_SIGNED$/.test(name);
  if (/(?:^|_)SIGNED$/.test(name) && !vectorFlags)
    result.display =
      number === 0n
        ? 'нет · без знака'
        : number === 1n
          ? 'да · со знаком'
          : `${number} · ожидается 0 или 1`;
  else if (name === 'CLK_POLARITY')
    result.display =
      number === 1n ? 'фронт ↑' : number === 0n ? 'спад ↓' : `${number} · ожидается 0 или 1`;
  else if (/_POLARITY$/.test(name))
    result.display =
      number === 1n
        ? 'активен при 1'
        : number === 0n
          ? 'активен при 0'
          : `${number} · ожидается 0 или 1`;
  else if (name === 'WIDTH' || /_WIDTH$/.test(name)) result.display = bitCount(number);
  else if (name === 'LUT' || /^INIT(?:_RAM_\d+)?$/.test(name))
    result.display = result.hex ?? result.display;
  return result;
}

type Definition = Pick<
  HelpArticle,
  'title' | 'symbol' | 'paragraphs' | 'example' | 'notes' | 'symbolLabel'
> & { page?: string };
const definitions: Record<string, Definition> = {
  mux: {
    title: 'Мультиплексор',
    symbol: 'mux',
    page: 'word_mux',
    paragraphs: [
      'Выбирает один из двух входов. При S = 0 выход Y повторяет A; при S = 1 — B. Работает сразу, без тактового сигнала.',
    ],
    example: 'assign y = select ? b : a;',
    notes: ['WIDTH задаёт число бит в каждом входе данных и в выходе.'],
  },
  pmux: {
    title: 'Параллельный мультиплексор',
    symbol: 'mux',
    symbolLabel: 'PMUX',
    page: 'word_mux',
    paragraphs: [
      'Выбирает A по умолчанию или один из блоков входа B. Каждый бит S разрешает свой блок B. Это выбор one-hot: одновременно может быть включён только один вариант.',
    ],
    example:
      "// A — значение по умолчанию; B = {b1, b0}.\nalways @* begin\n  case (select)\n    2'b00: y = a;\n    2'b01: y = b0;\n    2'b10: y = b1;\n    default: y = 'bx;\n  endcase\nend",
    notes: [
      'Если в S несколько единиц, выход $pmux неопределён. Не полагайтесь на приоритет входов.',
      'WIDTH — ширина одного варианта; S_WIDTH — число вариантов в B.',
    ],
  },
  bmux: {
    title: 'Мультиплексор с двоичным выбором',
    symbol: 'mux',
    page: 'word_mux',
    paragraphs: [
      'S содержит номер блока. Выход Y получает соответствующий фрагмент упакованного входа A.',
    ],
    example: 'assign y = data[select * WIDTH +: WIDTH];',
  },
  bwmux: {
    title: 'Побитовый мультиплексор',
    symbol: 'mux',
    page: 'word_mux',
    paragraphs: [
      'У каждого бита Y свой бит выбора S. Можно взять часть битов из A, а остальные из B.',
    ],
    example: 'assign y = (a & ~select) | (b & select);',
  },
  demux: {
    title: 'Демультиплексор',
    symbol: 'demux',
    page: 'word_mux',
    paragraphs: ['Отправляет A в блок выхода Y с номером S. Остальные блоки выхода получают нули.'],
    example: "assign y = {{(OUTPUT_WIDTH-WIDTH){1'b0}}, a}\n           << (select * WIDTH);",
  },
  tribuf: {
    title: 'Буфер с третьим состоянием',
    symbol: 'buffer',
    page: 'word_mux',
    paragraphs: [
      'При EN = 1 передаёт A на Y. При EN = 0 освобождает линию: состояние Z означает высокое сопротивление.',
    ],
    example: "assign bus = enable ? data : 'bz;",
    notes: [
      'Внутренние линии FPGA обычно реализуются мультиплексорами. Z полезно прежде всего на внешних двунаправленных выводах.',
    ],
  },
  add: {
    title: 'Сумматор',
    symbol: 'adder',
    symbolLabel: '+',
    page: 'word_binary',
    paragraphs: [
      'Складывает A и B. Число бит Y ограничивает размер результата; лишние старшие биты отбрасываются.',
    ],
    example: '// 4 бита: 15 + 1 превращается в 0.\nassign y = a + b;',
  },
  sub: {
    title: 'Вычитатель',
    symbol: 'adder',
    symbolLabel: '−',
    page: 'word_binary',
    paragraphs: [
      'Вычитает B из A. Ширина выхода и знаковость входов определяют представление результата.',
    ],
    example: 'assign y = a - b;',
  },
  mul: {
    title: 'Умножитель',
    symbol: 'arithmetic',
    symbolLabel: '×',
    page: 'word_binary',
    paragraphs: [
      'Вычисляет произведение A и B. После синтеза может использовать DSP или обычную логику — это зависит от ширины и настроек.',
    ],
    example: 'assign product = a * b;',
  },
  div: {
    title: 'Делитель',
    symbol: 'arithmetic',
    symbolLabel: '÷',
    page: 'word_binary',
    paragraphs: [
      'Делит A на B и оставляет целую часть. Для знаковых входов $div округляет к нулю.',
    ],
    example: '// 7 / 3 = 2.\nassign quotient = a / b;',
    notes: [
      'Деление на переменное значение может потребовать много логики. Деление на ноль не даёт корректного численного результата.',
    ],
  },
  mod: {
    title: 'Остаток от деления',
    symbol: 'arithmetic',
    symbolLabel: '%',
    page: 'word_binary',
    paragraphs: [
      'Вычисляет остаток A % B. Для $mod со знаковыми входами знак ненулевого остатка совпадает со знаком A.',
    ],
    example: '// 7 % 3 = 1.\nassign remainder = a % b;',
  },
  divfloor: {
    title: 'Деление с округлением вниз',
    symbol: 'arithmetic',
    symbolLabel: '÷',
    page: 'word_binary',
    paragraphs: [
      'Как целочисленное деление, но со знаковыми входами округляет к минус бесконечности.',
    ],
    example: '// -7 / 3 с округлением вниз даёт -3.',
    notes: ['Обычный оператор / в Verilog округляет к нулю.'],
  },
  modfloor: {
    title: 'Остаток при округлении вниз',
    symbol: 'arithmetic',
    symbolLabel: '%',
    page: 'word_binary',
    paragraphs: [
      'Дополняет $divfloor: A = B × частное + остаток. Знак ненулевого остатка совпадает со знаком B.',
    ],
    example: '// -7 = 3 * (-3) + 2.',
  },
  pow: {
    title: 'Возведение в степень',
    symbol: 'arithmetic',
    symbolLabel: 'Aᴮ',
    page: 'word_binary',
    paragraphs: [
      'Вычисляет A в степени B. Постоянные значения синтезатор часто упрощает; общий случай может создать большую схему.',
    ],
    example: 'assign y = a ** b;',
  },
  neg: {
    title: 'Смена знака',
    symbol: 'arithmetic',
    symbolLabel: '−A',
    page: 'word_unary',
    paragraphs: [
      'Вычисляет отрицание числа A. Для отрицательных значений используется дополнительный код.',
    ],
    example: 'assign y = -a;',
  },
  pos: {
    title: 'Унарный плюс',
    symbol: 'buffer',
    page: 'word_unary',
    paragraphs: [
      'Передаёт значение A, учитывая ширину и знаковость. Появляется и при приведении размеров сигналов.',
    ],
    example: 'assign y = +a;',
  },
  alu: {
    title: 'Арифметическая ячейка Yosys',
    symbol: 'adder',
    symbolLabel: 'ALU',
    page: 'word_arith',
    paragraphs: [
      'Объединяет сложение, перенос и управляемую инверсию B. Из таких ячеек Yosys строит сумматоры, вычитатели и сравнения.',
    ],
    example:
      '// Идея главного выхода: BI инвертирует B.\nassign y = a + (invert_b ? ~b : b) + carry_in;',
    notes: ['Y — сумма, CO — переносы, X — результат XOR после подготовки входов.'],
  },
  fa: {
    title: 'Полный сумматор',
    symbol: 'adder',
    symbolLabel: '+',
    page: 'word_arith',
    paragraphs: ['Складывает три однобитовых входа для каждой позиции. Y — сумма, X — перенос.'],
    example:
      'assign sum = a ^ b ^ carry_in;\nassign carry_out = (a & b) | (a & carry_in) | (b & carry_in);',
  },
  lcu: {
    title: 'Блок вычисления переносов',
    symbol: 'arithmetic',
    symbolLabel: 'CO',
    page: 'word_arith',
    paragraphs: [
      'Вычисляет переносы сумматора из сигналов распространения P и генерации G. Позволяет строить более быстрые арифметические цепочки.',
    ],
    example: 'assign carry_out = generate_carry | (propagate & carry_in);',
  },
  macc: {
    title: 'Сумма произведений',
    symbol: 'arithmetic',
    symbolLabel: 'Σ ×',
    page: 'word_arith',
    paragraphs: [
      'Объединяет несколько умножений и сложений в одну операцию. Параметры задают состав слагаемых и разбиение входных шин.',
    ],
    example: 'assign y = a * b + c * d + e;',
  },
  lut: {
    title: 'Таблица поиска — LUT',
    symbol: 'lut',
    page: 'word_logic',
    paragraphs: [
      'Входы образуют адрес строки, а в строке хранится выходной бит. Так можно реализовать любую логическую функцию заданного числа входов.',
    ],
    example: '// Таблица для AND: 00→0, 01→0, 10→0, 11→1.\nassign y = a & b;',
    notes: ['У N входов 2ᴺ строк. A[0] в $lut — младший бит адреса; параметр LUT хранит таблицу.'],
  },
  fsm: {
    title: 'Конечный автомат',
    symbol: 'block',
    symbolLabel: 'FSM',
    page: 'word_fsm',
    paragraphs: [
      'Хранит текущее состояние и выбирает следующее по входным сигналам. Выходы определяются состоянием и таблицей переходов.',
    ],
    example:
      'always @(posedge clk)\n  if (reset) state <= RED;\n  else if (timer_done) state <= next_state;',
    notes: [
      'Yosys может выделить автомат из Verilog, а затем снова превратить его в регистры и логику.',
    ],
  },
  slice: {
    title: 'Фрагмент шины',
    symbol: 'buffer',
    page: 'word_wire',
    paragraphs: [
      'Берёт непрерывную группу битов из A. OFFSET задаёт первый бит, Y_WIDTH — число битов.',
    ],
    example: 'assign y = a[OFFSET +: Y_WIDTH];',
  },
  concat: {
    title: 'Объединение шин',
    symbol: 'buffer',
    page: 'word_wire',
    paragraphs: ['Склеивает A и B в одну шину: A занимает младшие биты, B — старшие.'],
    example: 'assign y = {b, a};',
  },
  shiftx: {
    title: 'Выбор фрагмента со сдвигом',
    symbol: 'mux',
    page: 'word_binary',
    paragraphs: [
      'Сдвигает вход A для выбора фрагмента. Биты за границами A становятся X, а не нулём.',
    ],
    example: 'assign y = a[index +: WIDTH];',
  },
  shift: {
    title: 'Сдвиг в обе стороны',
    symbol: 'arithmetic',
    symbolLabel: '↔',
    page: 'word_binary',
    paragraphs: [
      'Положительное B сдвигает A вправо, отрицательное знаковое B — влево. Освободившиеся позиции заполняются нулями.',
    ],
    example:
      '// Концепция для знакового amount:\nassign y = amount < 0 ? (a << -amount) : (a >> amount);',
  },
};

const bitwise: Record<string, [string, HelpSymbol, string]> = {
  and: ['И', 'and', '&'],
  or: ['ИЛИ', 'or', '|'],
  xor: ['Исключающее ИЛИ', 'xor', '^'],
  xnor: ['Исключающее ИЛИ с инверсией', 'xor', '~^'],
  not: ['НЕ — инвертор', 'not', '~'],
};
const comparisons: Record<string, [string, string]> = {
  lt: ['Меньше', '<'],
  le: ['Меньше или равно', '<='],
  gt: ['Больше', '>'],
  ge: ['Больше или равно', '>='],
  eq: ['Равенство', '=='],
  ne: ['Неравенство', '!='],
  eqx: ['Точное равенство с X и Z', '==='],
  nex: ['Точное неравенство с X и Z', '!=='],
};

function registerDefinition(type: string): Definition | null {
  const word = type.match(
    /^\$(dff|dffe|adff|adffe|aldff|aldffe|sdff|sdffe|sdffce|dffsr|dffsre|dlatch|adlatch|dlatchsr|sr|ff)$/,
  )?.[1];
  const gate = type.match(
    /^\$_(DFF|DFFE|SDFF|SDFFE|SDFFCE|DFFSR|DFFSRE|DLATCH|DLATCHSR|SR)_([PN01]+)_$/,
  );
  if (!word && !gate) return null;
  const family = word ?? gate![1].toLowerCase();
  if (family === 'ff')
    return {
      title: 'Регистр с неявным тактом',
      symbol: 'register',
      page: 'word_reg',
      paragraphs: [
        'Специальная ячейка Yosys: обновляет состояние при глобальном такте моделирования. Обычно применяется во внутреннем представлении и формальной проверке.',
      ],
      notes: ['У $ff нет обычного порта CLK. Это не описание конкретного физического триггера.'],
    };
  const latch = family.includes('latch') || family === 'sr';
  const reset = family.startsWith('ad') || family.startsWith('sd');
  const async = family.startsWith('ad');
  const load = family.startsWith('ald');
  const enabled = family.endsWith('e') || family.endsWith('ce');
  const sr = family.includes('sr') || family === 'sr';
  const details: string[] = [
    latch
      ? 'Защёлка пропускает D на Q, пока разрешение активно; когда оно выключается, хранит последнее значение.'
      : 'Запоминает значение D на выбранном фронте CLK и хранит его на Q до следующего обновления.',
  ];
  if (family === 'sr')
    details[0] = 'Хранит один бит с отдельными входами установки SET и сброса CLR.';
  if (reset)
    details.push(
      async
        ? 'Асинхронный сброс меняет Q сразу, без ожидания такта.'
        : 'Синхронный сброс меняет Q только на активном фронте CLK.',
    );
  if (load)
    details.push('ALOAD загружает данные AD асинхронно; обычное обновление D происходит по такту.');
  if (enabled) details.push('При неактивном EN сохраняет состояние.');
  if (sr) details.push('SET устанавливает Q, CLR сбрасывает его.');
  const notes: string[] = [];
  if (family === 'sdffe') notes.push('Синхронный сброс имеет приоритет перед EN.');
  if (family === 'sdffce')
    notes.push('EN имеет приоритет: при выключенном EN даже синхронный сброс не меняет Q.');
  if (gate)
    notes.push(
      'В имени P означает положительную полярность, N — отрицательную; 0/1 кодирует значение сброса. Точное расположение кодов зависит от семейства ячейки.',
    );
  if (family === 'sr' || family === 'dlatchsr')
    notes.push('При одновременной установке и сбросе CLR имеет приоритет.');
  else if (sr) notes.push('Одновременные SET и CLR у DFFSR/DFFSRE дают неопределённое состояние.');
  let example: string | undefined = latch
    ? 'always @* if (enable) q = d;'
    : 'always @(posedge clk) q <= d;';
  if (family === 'sr') example = "always @*\n  if (clear) q = 1'b0;\n  else if (set) q = 1'b1;";
  else if (family === 'adlatch')
    example = "always @*\n  if (reset) q = '0;\n  else if (enable) q = d;";
  else if (family.startsWith('ad'))
    example =
      "always @(posedge clk or posedge reset)\n  if (reset) q <= '0;\n  else " +
      (enabled ? 'if (enable) ' : '') +
      'q <= d;';
  else if (family.startsWith('sd'))
    example =
      family === 'sdffce'
        ? "always @(posedge clk)\n  if (enable) begin\n    if (reset) q <= '0;\n    else q <= d;\n  end"
        : "always @(posedge clk)\n  if (reset) q <= '0;\n  else " +
          (enabled ? 'if (enable) ' : '') +
          'q <= d;';
  else if (enabled) example = 'always @(posedge clk)\n  if (enable) q <= d;';
  else if (load || sr) example = undefined;
  if (gate && !latch && gate[2].startsWith('N'))
    example = example?.replace('posedge clk', 'negedge clk');
  if (gate) {
    const code = gate[2];
    const clockEdge = code[0] === 'P' ? 'posedge' : 'negedge';
    const condition = (signal: string, positive: string | undefined) =>
      positive === 'N' ? `!${signal}` : signal;
    const dffCode =
      family === 'dff'
        ? code.match(/^([PN])(?:([PN])([01]))?$/)
        : family === 'dffe'
          ? code.match(/^([PN])(?:([PN])([01]))?([PN])$/)
          : null;
    const syncCode = family.startsWith('sdff') ? code.match(/^([PN])([PN])([01])([PN])?$/) : null;
    const latchCode = family === 'dlatch' ? code.match(/^([PN])(?:([PN])([01]))?$/) : null;
    if (dffCode) {
      const resetPolarity = dffCode[2];
      const resetBit = dffCode[3];
      const enablePolarity = dffCode[4];
      if (resetPolarity)
        details.push(
          `Асинхронный сброс ${resetPolarity === 'P' ? 'при 1' : 'при 0'} устанавливает Q в ${resetBit}.`,
        );
      example = `always @(${clockEdge} clk${resetPolarity ? ` or ${resetPolarity === 'P' ? 'posedge' : 'negedge'} reset` : ''})\n  ${resetPolarity ? `if (${condition('reset', resetPolarity)}) q <= 1'b${resetBit};\n  else ` : ''}${family === 'dffe' ? `if (${condition('enable', enablePolarity)}) ` : ''}q <= d;`;
    } else if (syncCode) {
      const reset = `if (${condition('reset', syncCode[2])}) q <= 1'b${syncCode[3]};`;
      const write = 'q <= d;';
      const enable = `if (${condition('enable', syncCode[4])})`;
      example = `always @(${clockEdge} clk)\n  ${family === 'sdffce' ? `${enable} begin\n    ${reset}\n    else ${write}\n  end` : `${reset}\n  else ${family === 'sdffe' ? `${enable} ` : ''}${write}`}`;
    } else if (latchCode) {
      if (latchCode[2])
        details.push(
          `Асинхронный сброс ${latchCode[2] === 'P' ? 'при 1' : 'при 0'} устанавливает Q в ${latchCode[3]}.`,
        );
      example = `always @*\n  ${latchCode[2] ? `if (${condition('reset', latchCode[2])}) q = 1'b${latchCode[3]};\n  else ` : ''}if (${condition('enable', latchCode[1])}) q = d;`;
    }
  }
  return {
    title: latch ? (family === 'sr' ? 'RS-защёлка' : 'Защёлка — latch') : 'D-триггер — регистр',
    symbol: latch ? 'latch' : 'register',
    page: gate ? (latch ? 'gate_reg_latch' : 'gate_reg_ff') : 'word_reg',
    paragraphs: details,
    example,
    notes,
  };
}

function gowinDefinition(type: string): Definition | null {
  const lut = type.match(/^(?:LUT([1-6])|__APICULA_LUT([5-8]))$/);
  if (lut)
    return {
      title: 'Таблица поиска Gowin — LUT',
      symbol: 'lut',
      paragraphs: [
        `${Number(lut[1] ?? lut[2])} входа задают логическую функцию. У физических LUT4 таблица содержит 16 выходных битов; более широкие функции могут объединять несколько LUT и мультиплексоров.`,
      ],
      example: 'assign y = (a & b) | c;',
      notes: [
        'INIT хранит таблицу: I0 — младший бит адреса. Для составных __APICULA_LUTn изучайте также подключённые ресурсы.',
      ],
    };
  if (/^MUX2(?:_LUT[5-8])?$/.test(type))
    return {
      ...definitions.mux,
      title: 'Мультиплексор Gowin',
      paragraphs: [
        'При S0 = 0 выход O повторяет I0, при S0 = 1 — I1. MUX2_LUTn помогает объединять LUT в функции с большим числом входов.',
      ],
      notes: ['I0 и I1 — однобитовые входы данных, S0 — выбор, O — выход.'],
    };
  const ff = type.match(/^DFF(N?)(E|R|RE|S|SE|P|PE|C|CE)?$/);
  if (ff) {
    const falling = ff[1] === 'N';
    const suffix = ff[2] ?? '';
    const enabled = suffix.includes('E');
    const controls: Record<string, [string, string, boolean]> = {
      R: ['RESET', '0', false],
      S: ['SET', '1', false],
      P: ['PRESET', '1', true],
      C: ['CLEAR', '0', true],
    };
    const control = controls[suffix[0]];
    const paragraphs = [
      `Физический однобитовый триггер. Запоминает D на ${falling ? 'спаде ↓' : 'фронте ↑'} CLK; Q хранит этот бит.`,
    ];
    if (control)
      paragraphs.push(
        `${control[0]} устанавливает Q в ${control[1]} ${control[2] ? 'сразу, без такта' : 'на активном фронте такта'}.`,
      );
    if (enabled) paragraphs.push('CE разрешает запись; при CE = 0 старое значение сохраняется.');
    const edge = falling ? 'negedge' : 'posedge';
    const body = control
      ? `  if (${control[0].toLowerCase()}) q <= 1'b${control[1]};\n  else ${enabled ? 'if (ce) ' : ''}q <= d;`
      : `  ${enabled ? 'if (ce) ' : ''}q <= d;`;
    return {
      title: 'D-триггер Gowin',
      symbol: 'register',
      paragraphs,
      example: `always @(${edge} clk${control?.[2] ? ` or posedge ${control[0].toLowerCase()}` : ''})\n${body}`,
      notes: ['INIT задаёт начальное состояние модели.'],
    };
  }
  if (type === 'ALU')
    return {
      title: 'Арифметическая ячейка Gowin',
      symbol: 'adder',
      symbolLabel: 'ALU',
      paragraphs: [
        'Небольшая аппаратная ячейка арифметической цепочки. Передаёт перенос следующей ячейке; несколько ячеек работают вместе для многобитового сложения или вычитания.',
      ],
      example:
        '// Идея цепочки полного сумматора:\nassign sum = a ^ b ^ carry_in;\nassign carry_out = (a & b) | (a & carry_in) | (b & carry_in);',
      notes: [
        'ALU_MODE выбирает аппаратный режим. ALU в отчёте — ячейка, а не целый процессорный блок.',
      ],
    };
  if (/^(?:I|O|IO|T)BUF$/.test(type))
    return {
      title: 'Буфер вывода Gowin',
      symbol: 'io',
      paragraphs: [
        type === 'IBUF'
          ? 'Передаёт уровень внешнего вывода I во внутреннюю логику через O.'
          : type === 'OBUF'
            ? 'Передаёт внутренний сигнал I на внешний вывод O.'
            : 'Управляет внешним выходом или двунаправленным выводом. Вход OEN = 1 освобождает вывод; OEN = 0 разрешает передачу.',
      ],
      example:
        type === 'IOBUF' || type === 'TBUF'
          ? "assign pin = output_enable ? data : 1'bz;"
          : 'assign y = a;',
      notes: [
        'Файл .cst назначает физический вывод и стандарт напряжения. Полярность Verilog output_enable в примере обратна аппаратному OEN.',
      ],
    };
  if (/^(?:SPB?|DPB|SDPB|ROM|BSRAM)(?:$|_)/.test(type))
    return {
      title: 'Блочная память Gowin',
      symbol: 'memory',
      paragraphs: [
        'Использует встроенный аппаратный блок памяти. Адрес выбирает слово; режимы и порты определяют чтение, запись и работу по такту.',
      ],
      example:
        'reg [7:0] memory [0:255];\nalways @(posedge clk) begin\n  if (write_enable) memory[address] <= data;\n  q <= memory[address];\nend',
      notes: [
        'Пример показывает описание памяти в Verilog. Число портов, ширины и режимы конкретной ячейки проверяйте в параметрах и документации.',
      ],
    };
  if (/^RAM(?:16|32|64)/.test(type))
    return {
      title: 'Распределённая память Gowin',
      symbol: 'memory',
      paragraphs: [
        'Хранит небольшую таблицу в ресурсах логических ячеек. Адрес выбирает данные; входы записи позволяют их менять.',
      ],
      example:
        'reg [3:0] memory [0:15];\nalways @(posedge clk)\n  if (write_enable) memory[address] <= data;',
      notes: ['Распределённая память и отдельные блоки BRAM используют разные физические ресурсы.'],
    };
  if (/^(?:MULT|PADD|ALU54D|DSP)/.test(type))
    return {
      title: 'Арифметический блок DSP Gowin',
      symbol: 'arithmetic',
      symbolLabel: 'DSP',
      paragraphs: [
        'Использует выделенный аппаратный блок для арифметики. Конкретный примитив может включать умножение, сложение, накопление и регистры.',
      ],
      example: '// Типичная задача DSP:\nassign product = a * b;',
      notes: ['Набор операций и тактовые задержки зависят от примитива и его настроек.'],
    };
  if (/^(?:rPLL|PLLVR|PLL|CLKDIV|BUFG|DHCEN|DCS)/.test(type))
    return {
      title: 'Блок тактовой сети Gowin',
      symbol: 'block',
      symbolLabel: 'CLK',
      paragraphs: [
        'Формирует или распределяет тактовые сигналы. PLL, делитель и буфер выполняют разные задачи; конкретный режим определяется параметрами.',
      ],
      notes: [
        'Настройки частоты, фазы и переключения такта требуют документации именно этого примитива.',
      ],
    };
  if (/^(?:IDDR|ODDR|IDES|OSER|IVIDEO|OVIDEO)/.test(type))
    return {
      title: 'Регистры и преобразователи I/O Gowin',
      symbol: 'io',
      paragraphs: [
        'Работают рядом с внешними выводами: захватывают или выдают данные по такту, иногда на обоих фронтах или с преобразованием последовательного потока.',
      ],
      notes: ['Число битов, последовательность выдачи и задержки зависят от типа примитива.'],
    };
  if (/^OSC/.test(type))
    return {
      title: 'Внутренний генератор Gowin',
      symbol: 'block',
      symbolLabel: 'OSC',
      paragraphs: [
        'Создаёт тактовый сигнал внутри FPGA. Частота и доступные делители зависят от семейства устройства и параметров.',
      ],
      notes: [
        'Для точных внешних интерфейсов обычно требуется проверить точность и ограничения генератора по документации чипа.',
      ],
    };
  return null;
}

export function getPrimitiveHelp(type: string): HelpArticle {
  const operation = type.startsWith('$') && !type.startsWith('$_') ? type.slice(1) : '';
  let definition =
    definitions[operation === 'macc_v2' ? 'macc' : operation] ??
    registerDefinition(type) ??
    undefined;
  if (!definition && bitwise[operation]) {
    const [title, symbol, operator] = bitwise[operation];
    definition = {
      title,
      symbol,
      page: operation === 'not' ? 'word_unary' : 'word_binary',
      paragraphs: [
        operation === 'not'
          ? 'Меняет каждый бит: 0 становится 1, 1 становится 0.'
          : `Применяет ${title.toLowerCase()} отдельно к каждой паре битов A и B.`,
      ],
      example: `assign y = ${operation === 'not' ? `${operator}a` : `a ${operator} b`};`,
    };
  }
  if (!definition && /^logic_(and|or|not)$/.test(operation)) {
    const kind = operation.slice(6);
    const operators = { and: '&&', or: '||', not: '!' };
    definition = {
      title: 'Логическое ' + (kind === 'not' ? 'НЕ' : kind === 'and' ? 'И' : 'ИЛИ'),
      symbol: kind as HelpSymbol,
      page: kind === 'not' ? 'word_unary' : 'word_binary',
      paragraphs: [
        'Проверяет, равно ли всё входное число нулю. Результат — один логический бит, даже если входы многобитовые.',
      ],
      example: `assign y = ${kind === 'not' ? '!a' : `a ${operators[kind as keyof typeof operators]} b`};`,
      notes: [
        'Побитовые &, |, ~ работают с каждым битом отдельно; логические &&, ||, ! проверяют вход целиком.',
      ],
    };
  }
  if (!definition && /^reduce_(and|or|xor|xnor|bool)$/.test(operation)) {
    const kind = operation.slice(7);
    const operator = { and: '&', or: '|', xor: '^', xnor: '~^', bool: '|' }[kind]!;
    definition = {
      title:
        'Свёртка битов — ' + (kind === 'bool' ? 'проверка ненулевого числа' : bitwise[kind]?.[0]),
      symbol: kind === 'bool' ? 'or' : (bitwise[kind]?.[1] ?? 'block'),
      page: 'word_unary',
      paragraphs: [
        'Объединяет все биты одной шины в один выходной бит. Например, &a даёт 1, только если все биты a равны 1.',
      ],
      example: `assign y = ${operator}a;`,
    };
  }
  if (!definition && comparisons[operation]) {
    const [title, operator] = comparisons[operation];
    definition = {
      title: 'Сравнение — ' + title.toLowerCase(),
      symbol: 'arithmetic',
      symbolLabel: operator,
      page: 'word_binary',
      paragraphs: [
        'Сравнивает A и B. Если условие выполнено, Y = 1, иначе Y = 0. Знаковость влияет на числовые сравнения.',
      ],
      example: `assign y = a ${operator} b;`,
      notes: /x$/.test(operation)
        ? [
            '=== и !== сравнивают X/Z как отдельные значения. Они полезны в симуляции; возможности физической реализации ограничены.',
          ]
        : ['X или Z на входах могут сделать результат симуляции неопределённым.'],
    };
  }
  if (!definition && /^(?:s?shl|s?shr)$/.test(operation)) {
    const right = operation.endsWith('shr');
    const arithmetic = operation.startsWith('ss');
    definition = {
      title: `${arithmetic ? 'Арифметический' : 'Логический'} сдвиг ${right ? 'вправо' : 'влево'}`,
      symbol: 'arithmetic',
      symbolLabel: right ? '≫' : '≪',
      page: 'word_binary',
      paragraphs: [
        right && arithmetic
          ? 'Сдвигает A вправо. При знаковом A копирует старший знаковый бит в освободившиеся позиции; при беззнаковом A добавляет нули.'
          : 'Сдвигает биты A; освободившиеся позиции получают нули. Величина сдвига задаётся B.',
      ],
      example: `assign y = a ${arithmetic ? (right ? '>>>' : '<<<') : right ? '>>' : '<<'} b;`,
    };
  }
  if (
    !definition &&
    /^(?:mem|mem_v2|memory|memory_v2|memrd|memrd_v2|memwr|memwr_v2|meminit|meminit_v2)$/.test(
      operation,
    )
  ) {
    const port = operation.startsWith('memrd')
      ? 'Порт чтения памяти'
      : operation.startsWith('memwr')
        ? 'Порт записи памяти'
        : operation.startsWith('meminit')
          ? 'Начальные данные памяти'
          : 'Память';
    definition = {
      title: port,
      symbol: 'memory',
      page: 'word_mem',
      paragraphs: [
        'Внутреннее описание памяти Yosys. Адрес выбирает слово; ширины и параметры определяют порты, тактирование и обработку конфликтов чтения/записи.',
      ],
      example:
        'reg [7:0] memory [0:255];\nalways @(posedge clk)\n  if (write_enable) memory[address] <= data;',
      notes: [
        'На этапе RTL это ещё не гарантия BRAM. После отображения память может использовать BRAM, LUT или триггеры.',
      ],
    };
  }
  if (!definition && /^\$_(AND|NAND|OR|NOR|XOR|XNOR|NOT|BUF|ANDNOT|ORNOT)_$/.test(type)) {
    const kind = type.slice(3, -1);
    const base =
      kind === 'NAND'
        ? 'and'
        : kind === 'NOR'
          ? 'or'
          : kind === 'XNOR'
            ? 'xor'
            : kind === 'ANDNOT'
              ? 'and'
              : kind === 'ORNOT'
                ? 'or'
                : kind.toLowerCase();
    const operator = { and: '&', or: '|', xor: '^', not: '~', buf: '' }[base] ?? '';
    const expr =
      kind === 'NOT'
        ? '~a'
        : kind === 'BUF'
          ? 'a'
          : /NOT$/.test(kind)
            ? `a ${operator} ~b`
            : ['NAND', 'NOR', 'XNOR'].includes(kind)
              ? `~(a ${operator} b)`
              : `a ${operator} b`;
    definition = {
      title: `Однобитовый вентиль ${kind}`,
      symbol: base === 'buf' ? 'buffer' : (base as HelpSymbol),
      page: 'gate_comb_simple',
      paragraphs: [
        'Простая логическая операция над отдельными битами. Подчёркивания в имени обозначают внутренний формат вентилей Yosys.',
      ],
      example: `assign y = ${expr};`,
    };
  }
  if (!definition && /^\$_N?MUX_$/i.test(type))
    definition = {
      ...definitions.mux,
      notes: ['A и B — однобитовые входы данных, S — выбор, Y — выход.'],
      ...(type === '$_NMUX_'
        ? { title: 'Мультиплексор с инверсией', example: 'assign y = ~(select ? b : a);' }
        : {}),
    };
  if (!definition && /^\$_(?:AOI|OAI)[34]_$/i.test(type))
    definition = {
      title: 'Комбинированный вентиль',
      symbol: 'block',
      page: 'gate_comb_combined',
      paragraphs: [
        'Объединяет несколько И/ИЛИ с инверсией результата. AOI — AND-OR-Invert, OAI — OR-AND-Invert.',
      ],
      example: type.includes('AOI')
        ? `assign y = ~((a & b) | ${type.includes('4') ? '(c & d)' : 'c'});`
        : `assign y = ~((a | b) & ${type.includes('4') ? '(c | d)' : 'c'});`,
    };
  if (
    !definition &&
    /^(?:assert|assume|cover|live|fair|check|equiv|anyconst|anyseq|allconst|allseq|initstate|anyinit|scopeinfo|print)$/.test(
      operation,
    )
  )
    definition = {
      title: 'Служебная ячейка Yosys',
      symbol: 'block',
      page: 'word_formal',
      paragraphs: [
        'Применяется для проверок, формальной модели или диагностических сообщений. Обычно не превращается в обычную логику на плате.',
      ],
      notes: ['Точная роль зависит от имени ячейки. Откройте описание в документации Yosys.'],
    };
  const gowin = !type.startsWith('$') ? gowinDefinition(type) : null;
  if (gowin) definition = gowin;
  if (!definition)
    return {
      id: `primitive:${type}`,
      title: 'Элемент схемы',
      subtitle: type,
      symbol: 'block',
      paragraphs: [
        'Это тип ячейки или имя вложенного модуля из нетлиста. Для него пока нет отдельного учебного описания.',
      ],
      notes: [
        'Назначение определяют подключённые порты, параметры и исходный модуль. Откройте исходный код или официальную модель; по одному имени поведение не определяется.',
      ],
      sources: type.startsWith('$') ? source('index') : gowinSource,
    };
  return {
    id: `primitive:${type}`,
    subtitle: type,
    ...definition,
    inverted: /^\$(?:xnor|reduce_xnor)$|^\$_(?:NAND|NOR|XNOR|NMUX)_$/.test(type),
    sources: gowin ? gowinSource : source(definition.page ?? 'index'),
  };
}

const resourceDefinitions: Record<Exclude<ResourceKind, 'I/O'>, Definition> = {
  LUT: {
    title: 'LUT — логическая таблица',
    symbol: 'lut',
    paragraphs: [
      'Программируемая таблица истинности. Входы выбирают строку, а сохранённый бит становится выходом. LUT4 имеет 4 входа и 16 строк.',
    ],
    example: 'assign y = (a & b) | c;',
  },
  FF: {
    title: 'FF — триггеры и регистры',
    symbol: 'register',
    paragraphs: [
      'Хранят состояние между тактами. Один физический D-триггер хранит один бит; 8-битовый регистр обычно использует 8 триггеров.',
    ],
    example: 'always @(posedge clk)\n  count <= count + 1;',
    notes: [
      'На RTL-этапе эта группа также включает защёлки: они открыты по уровню разрешения, а не по фронту такта.',
    ],
  },
  ALU: {
    title: 'ALU — арифметика',
    symbol: 'adder',
    symbolLabel: '+',
    paragraphs: [
      'Ресурсы для сложения, вычитания и переносов. В Gowin большая арифметическая операция собирается из нескольких небольших ALU-ячеек.',
    ],
    example: 'assign sum = a + b;',
  },
  BRAM: {
    title: 'BRAM — блочная память',
    symbol: 'memory',
    paragraphs: [
      'Выделенные блоки памяти внутри FPGA. Подходят для буферов, таблиц, видеоданных и памяти программ. Ширина и глубина задают организацию слов.',
    ],
    example: 'reg [7:0] memory [0:255];\nalways @(posedge clk) q <= memory[address];',
    notes: [
      'RTL-память после синтеза может оказаться в BRAM, LUT или триггерах. RAM16S/RAM32S — распределённая память и в BRAM здесь не включаются.',
    ],
  },
  DSP: {
    title: 'DSP — аппаратная арифметика',
    symbol: 'arithmetic',
    symbolLabel: '×',
    paragraphs: [
      'Выделенные блоки для умножения и других арифметических операций. Часто быстрее и экономнее логики для обработки сигналов.',
    ],
    example: 'assign product = sample * coefficient;',
  },
  IO: {
    title: 'I/O — входы и выходы',
    symbol: 'io',
    paragraphs: [
      'Буферы, через которые логика FPGA общается с физическими выводами. Направление, напряжение и расположение задаются портами и файлом .cst.',
    ],
    example:
      '// top.v: выход LED.\nassign led_n = ~button_pressed;\n// board.cst: LED0 на выводе микросхемы 15.\n// IO_LOC "led_n" 15;\n// IO_PORT "led_n" IO_TYPE=LVCMOS33;',
    notes: ['Номер вывода FPGA отличается от номера контакта разъёма платы.'],
  },
  other: {
    title: 'Другие элементы',
    symbol: 'block',
    paragraphs: [
      'Ячейки, которые не входят в показанные группы ресурсов: например, мультиплексоры, тактовые блоки и служебные элементы.',
    ],
    notes: [
      'Категории описывают нетлист. Для точной загрузки физических ресурсов смотрите результат размещения во вкладке «Кристалл».',
    ],
  },
};

export function getResourceHelp(resource: ResourceKind, view?: 'rtl' | 'technology'): HelpArticle {
  const normalized = resource === 'I/O' ? 'IO' : resource;
  const definition = resourceDefinitions[normalized];
  const countNote =
    view === 'rtl'
      ? 'Во вкладке RTL число показывает количество ячеек или операций этой группы. Один многобитовый RTL-регистр считается одной ячейкой; это ещё не число занятых физических триггеров.'
      : view === 'technology'
        ? 'Во вкладке Gowin число показывает ячейки после synth_gowin. После упаковки и размещения состав и занятые физические места могут измениться.'
        : 'Смысл количества зависит от этапа: RTL-операции и физические примитивы имеют разный размер.';
  return {
    id: `resource:${normalized}`,
    subtitle: resource === 'IO' ? 'I/O' : resource,
    ...definition,
    notes: [...(definition.notes ?? []), countNote],
    sources: normalized === 'other' ? source('index') : gowinSource,
  };
}

export function getParameterHelp(
  name: string,
  value: string | number,
  cellType?: string,
): HelpArticle {
  const decoded = formatParameterValue(name, value, cellType);
  let title = 'Параметр элемента';
  let paragraphs = [
    'Постоянная настройка ячейки в нетлисте. Это не изменяющийся во времени сигнал. Значение задаёт синтезатор по исходному Verilog и настройкам.',
  ];
  let example: string | undefined;
  const notes: string[] = [];
  if (/^(?:A|B|C)_SIGNED$/.test(name) && cellType !== '$macc_v2') {
    const port = name[0];
    title = `Знаковость входа ${port}`;
    paragraphs = [
      `0 означает беззнаковое число; 1 — число со знаком в дополнительном коде. Например, 3 бита без знака дают 0…7, со знаком — −4…3.`,
    ];
    example = 'wire [2:0] a_unsigned;        // 111 = 7\nwire signed [2:0] a_signed;  // 111 = -1';
    notes.push(
      'Для обычных двоичных арифметических операций и сравнений Yosys использует знаковую обработку, когда оба операнда знаковые.',
    );
  } else if (
    name === 'WIDTH' ||
    /^(?:A|B|C|D|Y|Q|ADDR|ABITS|DATA|S|CONFIG|STATE_BITS|CTRL_IN|CTRL_OUT)_WIDTH$/.test(name) ||
    /_WIDTH$/.test(name)
  ) {
    const port = name === 'WIDTH' ? '' : name.replace(/_WIDTH$/, '');
    title = port ? `Ширина ${port}` : 'Ширина элемента';
    paragraphs = [
      `Количество битов ${port ? `шины ${port}` : 'данных элемента'}. Например, 3 означает три параллельных провода, а не число 3 на входе.`,
    ];
    example = 'wire [2:0] a; // 3 бита: a[2], a[1], a[0]';
    if (name === 'S_WIDTH')
      notes.push(
        cellType === '$pmux'
          ? 'Для $pmux это число битов one-hot выбора и число блоков в B. Ширина B = WIDTH × S_WIDTH.'
          : 'У двоичного мультиплексора S_WIDTH битов выбора позволяют адресовать 2^S_WIDTH вариантов. У $pmux каждый бит выбирает свой вариант.',
      );
    if (name === 'Y_WIDTH')
      notes.push(
        'Если результат шире Y, старшие биты отбрасываются. Например, 7 + 1 в трёх битах даёт 0.',
      );
  } else if (memoryPortFlags.test(name) || memoryMasks.test(name)) {
    title = name.endsWith('CLK_POLARITY')
      ? 'Фронты такта портов памяти'
      : name.endsWith('CLK_ENABLE')
        ? 'Тактирование портов памяти'
        : 'Маска режимов памяти';
    paragraphs = name.endsWith('CLK_POLARITY')
      ? [
          'Это набор флагов по портам: бит 1 означает фронт ↑, бит 0 — спад ↓. Младший бит относится к порту 0. Полярность учитывается для портов с включённым тактированием.',
        ]
      : name.endsWith('CLK_ENABLE')
        ? [
            'Каждый бит относится к своему порту: 1 включает работу по такту, 0 — работу без тактового захвата. Младший бит соответствует порту 0.',
          ]
        : [
            'Несколько настроек памяти упакованы в битовую маску. Некоторые маски описывают пары портов — например, чтение при одновременной записи. Их разбиение зависит от числа портов и типа ячейки.',
          ];
    example = name.endsWith('CLK_POLARITY')
      ? "// Маска 2'b10: порт 0 — спад, порт 1 — фронт."
      : undefined;
  } else if (name === 'CLK_POLARITY') {
    title = 'Активный фронт такта';
    paragraphs = [
      '1 — запись на фронте CLK (0 → 1); 0 — запись на спаде CLK (1 → 0). Между фронтами триггер хранит состояние.',
    ];
    example =
      'always @(posedge clk) q <= d; // CLK_POLARITY = 1\nalways @(negedge clk) q <= d; // CLK_POLARITY = 0';
  } else if (/_POLARITY$/.test(name)) {
    const signal = name.replace(/_POLARITY$/, '');
    title = `Активный уровень ${signal}`;
    paragraphs = [
      '1 означает, что управляющий вход активен при высоком уровне; 0 — при низком. Так описывают, например, сброс от схемы, где активным считается низкий уровень.',
    ];
    example = "if (!reset_n) q <= '0; // сброс активен при 0";
  } else if (/^(?:ARST|SRST|Q0|Q1|RESET)_VALUE$/.test(name) || /^(?:ARST|SRST)_VALUE$/.test(name)) {
    title = 'Значение после сброса';
    paragraphs = [
      'Значение, которое получает регистр при активном сбросе. Двоичные биты задают всё слово; это не длительность сброса.',
    ];
    example = "if (reset) q <= 3'b101; // значение сброса — 5";
  } else if (name === 'LUT' || (name === 'INIT' && /^(?:LUT[1-6]|\$lut)$/.test(cellType ?? ''))) {
    title = 'Таблица истинности LUT';
    paragraphs = [
      'Каждый бит хранит результат для одной комбинации входов. Младший бит таблицы соответствует нулевому адресу. Значение удобно читать в шестнадцатеричном виде.',
    ];
    example = "// LUT2 с INIT = 4'b1000 (0x8):\n// 00→0, 01→0, 10→0, 11→1: это AND.";
  } else if (/^INIT/.test(name) || /_INIT$/.test(name)) {
    title = 'Начальное значение';
    paragraphs = [
      'Задаёт начальное состояние регистра или памяти в модели. Для LUT INIT хранит таблицу истинности; значение зависит от типа ячейки.',
    ];
    notes.push(
      'Поддержка начальных значений в аппаратуре зависит от целевого примитива и инструмента.',
    );
  } else if (name === 'ABITS') {
    title = 'Ширина адреса';
    paragraphs = [
      'Количество битов адреса памяти. N адресных битов могут выбрать до 2^N слов; фактический размер задают другие параметры.',
    ];
  } else if (name === 'SIZE') {
    title = 'Число слов памяти';
    paragraphs = [
      'Количество адресуемых слов. WIDTH задаёт число битов в каждом слове; общий объём равен SIZE × WIDTH битов.',
    ];
  } else if (name === 'OFFSET') {
    title = 'Начальная позиция';
    paragraphs = [
      'Для $slice — номер младшего выбранного бита; для памяти — начальный адрес. Единица измерения зависит от типа ячейки.',
    ];
  } else if (name === 'ALU_MODE') {
    title = 'Аппаратный режим ALU';
    paragraphs = [
      'Выбирает операцию арифметической ячейки Gowin: это код режима, а не входные данные. Соответствие кодов операциям зависит от модели примитива.',
    ];
  } else if (name === 'MEMID') {
    title = 'Идентификатор памяти';
    paragraphs = [
      'Связывает отдельные порты чтения, записи и начальные данные с одной памятью во внутреннем представлении Yosys.',
    ];
  } else if (name === 'CLK_ENABLE') {
    title = 'Тактирование порта памяти';
    paragraphs = [
      '1 означает, что порт работает по такту; 0 — без тактового захвата. Для порта чтения это различает синхронное и асинхронное чтение.',
    ];
  } else if (/^(?:TRANSPARENT|TRANSPARENCY_MASK|COLLISION_X_MASK|EN|PRIORITY_MASK)$/.test(name)) {
    title = 'Настройка портов памяти';
    paragraphs = [
      'Флаг или битовая маска режимов памяти. Несколько битов могут относиться к разным портам; читайте их вместе с типом ячейки и количеством портов.',
    ];
  } else if (name === 'CONFIG' || /(?:_WIDTHS|_SIGNED|_NEGATED)$/.test(name)) {
    title = 'Упакованная конфигурация';
    paragraphs = [
      'Несколько настроек упакованы в одну последовательность битов. Это значение нельзя читать как единственный флаг; разбиение зависит от типа ячейки.',
    ];
  }
  if (decoded.encoding === 'binary')
    notes.push(
      'Yosys записывает параметры двоичными строками, старший бит слева. Начальные нули — часть записи, а не дополнительные провода входа.',
    );
  if (/^[01xz]+$/i.test(decoded.raw) && /[xz]/i.test(decoded.raw))
    notes.push(
      'X — неизвестное значение, Z — высокое сопротивление. Такой набор битов нельзя перевести в одно определённое число.',
    );
  return {
    id: `parameter:${cellType ?? ''}:${name}`,
    subtitle: `${cellType ? `${cellType} · ` : ''}${name}`,
    title,
    symbol: 'parameter',
    paragraphs,
    example,
    notes,
    rawValue: decoded.raw,
    decodedValue: decoded.display,
    sources: cellType && !cellType.startsWith('$') ? gowinSource : source('index'),
  };
}

export function getHelpArticle(topic: HelpTopic): HelpArticle {
  return topic.kind === 'primitive'
    ? getPrimitiveHelp(topic.type)
    : topic.kind === 'resource'
      ? getResourceHelp(topic.resource, topic.view)
      : getParameterHelp(topic.name, topic.value, topic.cellType);
}
