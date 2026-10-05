/** Plain-language decoding of the names printed next to a package pin. */
export interface PinTerm {
  term: string;
  text: string;
}

const sides: Record<string, string> = {
  L: 'левой',
  R: 'правой',
  T: 'верхней',
  B: 'нижней',
};

/** IOL47A → side, position and which half of the pair. Unknown shapes return null. */
export function explainPad(io: string): PinTerm | null {
  const match = /^IO([LRTB])(\d+)([AB])?$/.exec(io);
  if (!match) return null;
  const [, side, index, half] = match;
  const pair =
    half === 'A'
      ? ' Буква A — первый вывод пары (в дифференциальной паре это «плюс»).'
      : half === 'B'
        ? ' Буква B — второй вывод пары (в дифференциальной паре это «минус»).'
        : '';
  return {
    term: io,
    text: `Имя площадки внутри кристалла: IO — вывод ввода-вывода, ${side} — он на ${sides[side]} стороне кристалла, ${index} — номер ячейки вдоль этой стороны.${pair} Это имя встречается в отчётах размещения.`,
  };
}

const exact: Record<string, string> = {
  TMS: 'JTAG, выбор режима. По линиям JTAG отладчик загружает схему в ПЛИС, поэтому занимать этот вывод своей схемой нельзя.',
  TCK: 'JTAG, тактовый сигнал загрузки. Занят отладчиком платы.',
  TDI: 'JTAG, данные от отладчика в ПЛИС. Занят отладчиком платы.',
  TDO: 'JTAG, данные из ПЛИС в отладчик. Занят отладчиком платы.',
  RECONFIG_N:
    'Перезапуск конфигурации: низкий уровень заставляет ПЛИС заново загрузить схему из памяти. Суффикс _N значит «активен при 0».',
  MODE0: 'Выбор способа загрузки схемы при включении питания (младший бит).',
  MODE1: 'Выбор способа загрузки схемы при включении питания (старший бит).',
  SCLK: 'Тактовый сигнал последовательной загрузки конфигурации.',
  DIN: 'Вход данных последовательной загрузки конфигурации.',
  DOUT: 'Выход данных конфигурации для следующей микросхемы в цепочке.',
  CLKHOLD_N: 'Приостановка тактового сигнала загрузки. Суффикс _N значит «активен при 0».',
  WE_N: 'Разрешение записи при параллельной загрузке. Суффикс _N значит «активен при 0».',
  SSPI_CS_N:
    'Выбор микросхемы, когда схему загружает внешнее устройство по SPI. Суффикс _N значит «активен при 0».',
  SO: 'Выход данных при загрузке по SPI от внешнего устройства.',
  FASTRD_N: 'Выбор быстрого чтения флеш-памяти при загрузке. Суффикс _N значит «активен при 0».',
  MCLK: 'Тактовый сигнал флеш-памяти, из которой ПЛИС читает схему при включении.',
  MCS_N:
    'Выбор флеш-памяти, из которой ПЛИС читает схему при включении. Суффикс _N значит «активен при 0».',
  MO: 'Данные от ПЛИС к флеш-памяти конфигурации.',
  MI: 'Данные от флеш-памяти конфигурации к ПЛИС.',
};

/** Special function printed after the pad name, e.g. GCLKT_6 or LPLL2_T_FB. */
export function explainFunction(name: string): PinTerm {
  if (exact[name]) return { term: name, text: exact[name] };
  let match = /^GCLK([TC])_(\d)$/.exec(name);
  if (match)
    return {
      term: name,
      text: `Вход глобальной тактовой сети №${match[2]}. Такт, поданный сюда, доходит до всех регистров почти одновременно. ${match[1] === 'T' ? 'T — прямой вывод пары (на него подают обычный такт).' : 'C — парный инверсный вывод; с обычным тактом не используется.'}`,
    };
  match = /^([LR])PLL(\d)_([TC])_(IN|FB)$/.exec(name);
  if (match)
    return {
      term: name,
      text: `Вывод умножителя частоты PLL №${match[2]} на ${match[1] === 'L' ? 'левой' : 'правой'} стороне: ${match[4] === 'IN' ? 'вход опорного такта' : 'вход обратной связи'}, ${match[3] === 'T' ? 'прямой' : 'инверсный'} вывод пары. Пока PLL не используется, это обычный вывод.`,
    };
  match = /^D(\d)$/.exec(name);
  if (match)
    return {
      term: name,
      text: `Линия данных ${match[1]} при параллельной загрузке схемы. После загрузки — обычный вывод.`,
    };
  return { term: name, text: 'Специальная функция вывода; подробности — в паспорте UG115.' };
}

export interface PinNaming {
  number: number;
  io?: string;
  functions: string[];
  label: string;
  reserved: boolean;
}

/** Everything written next to one pin, each word with its meaning. */
export function explainPin(pin: PinNaming, role?: string, signal?: string): PinTerm[] {
  const terms: PinTerm[] = [];
  if (signal)
    terms.push({
      term: signal,
      text: 'Сигнал вашего проекта, назначенный на этот вывод в файле .cst.',
    });
  if (role) terms.push({ term: role, text: pin.label });
  if (!pin.io) {
    terms.push({
      term: 'питание',
      text: 'Вывод питания, земли или служебный. К нему нельзя подключить сигнал схемы; точное назначение — в паспорте UG115.',
    });
    return terms;
  }
  const pad = explainPad(pin.io);
  if (pad) terms.push(pad);
  for (const name of pin.functions) terms.push(explainFunction(name));
  if (!pin.functions.length && !role)
    terms.push({
      term: 'свободный вывод',
      text: 'У вывода нет особой функции. Прежде чем назначать сигнал, проверьте по схеме платы, куда он выведен.',
    });
  return terms;
}
