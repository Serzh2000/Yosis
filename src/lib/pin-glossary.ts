import { t } from './i18n';
/** Plain-language decoding of the names printed next to a package pin. */
export interface PinTerm {
  term: string;
  text: string;
}

const sides: Record<string, string> = {
  L: t('левой'),
  R: t('правой'),
  T: t('верхней'),
  B: t('нижней'),
};

/** IOL47A → side, position and which half of the pair. Unknown shapes return null. */
export function explainPad(io: string): PinTerm | null {
  const match = /^IO([LRTB])(\d+)([AB])?$/.exec(io);
  if (!match) return null;
  const [, side, index, half] = match;
  const pair =
    half === 'A'
      ? ` ${t('Буква A — первый вывод пары (в дифференциальной паре это «плюс»).')}`
      : half === 'B'
        ? ` ${t('Буква B — второй вывод пары (в дифференциальной паре это «минус»).')}`
        : '';
  return {
    term: io,
    text: `${t('Имя площадки внутри кристалла: IO — вывод ввода-вывода, {side} — он на {sideName} стороне кристалла, {index} — номер ячейки вдоль этой стороны.', { side, sideName: sides[side], index })}${pair} ${t('Это имя встречается в отчётах размещения.')}`,
  };
}

const exact: Record<string, string> = {
  TMS: t(
    'JTAG, выбор режима. По линиям JTAG отладчик загружает схему в ПЛИС, поэтому занимать этот вывод своей схемой нельзя.',
  ),
  TCK: t('JTAG, тактовый сигнал загрузки. Занят отладчиком платы.'),
  TDI: t('JTAG, данные от отладчика в ПЛИС. Занят отладчиком платы.'),
  TDO: t('JTAG, данные из ПЛИС в отладчик. Занят отладчиком платы.'),
  RECONFIG_N: t(
    'Перезапуск конфигурации: низкий уровень заставляет ПЛИС заново загрузить схему из памяти. Суффикс _N значит «активен при 0».',
  ),
  MODE0: t('Выбор способа загрузки схемы при включении питания (младший бит).'),
  MODE1: t('Выбор способа загрузки схемы при включении питания (старший бит).'),
  SCLK: t('Тактовый сигнал последовательной загрузки конфигурации.'),
  DIN: t('Вход данных последовательной загрузки конфигурации.'),
  DOUT: t('Выход данных конфигурации для следующей микросхемы в цепочке.'),
  CLKHOLD_N: t('Приостановка тактового сигнала загрузки. Суффикс _N значит «активен при 0».'),
  WE_N: t('Разрешение записи при параллельной загрузке. Суффикс _N значит «активен при 0».'),
  SSPI_CS_N: t(
    'Выбор микросхемы, когда схему загружает внешнее устройство по SPI. Суффикс _N значит «активен при 0».',
  ),
  SO: t('Выход данных при загрузке по SPI от внешнего устройства.'),
  FASTRD_N: t('Выбор быстрого чтения флеш-памяти при загрузке. Суффикс _N значит «активен при 0».'),
  MCLK: t('Тактовый сигнал флеш-памяти, из которой ПЛИС читает схему при включении.'),
  MCS_N: t(
    'Выбор флеш-памяти, из которой ПЛИС читает схему при включении. Суффикс _N значит «активен при 0».',
  ),
  MO: t('Данные от ПЛИС к флеш-памяти конфигурации.'),
  MI: t('Данные от флеш-памяти конфигурации к ПЛИС.'),
};

/** Special function printed after the pad name, e.g. GCLKT_6 or LPLL2_T_FB. */
export function explainFunction(name: string): PinTerm {
  if (exact[name]) return { term: name, text: exact[name] };
  let match = /^GCLK([TC])_(\d)$/.exec(name);
  if (match)
    return {
      term: name,
      text: `${t('Вход глобальной тактовой сети №{n}. Такт, поданный сюда, доходит до всех регистров почти одновременно.', { n: match[2] })} ${match[1] === 'T' ? t('T — прямой вывод пары (на него подают обычный такт).') : t('C — парный инверсный вывод; с обычным тактом не используется.')}`,
    };
  match = /^([LR])PLL(\d)_([TC])_(IN|FB)$/.exec(name);
  if (match)
    return {
      term: name,
      text: t(
        'Вывод умножителя частоты PLL №{n} на {side} стороне: {role}, {polarity} вывод пары. Пока PLL не используется, это обычный вывод.',
        {
          n: match[2],
          side: match[1] === 'L' ? t('левой') : t('правой'),
          role: match[4] === 'IN' ? t('вход опорного такта') : t('вход обратной связи'),
          polarity: match[3] === 'T' ? t('прямой') : t('инверсный'),
        },
      ),
    };
  match = /^D(\d)$/.exec(name);
  if (match)
    return {
      term: name,
      text: t('Линия данных {n} при параллельной загрузке схемы. После загрузки — обычный вывод.', {
        n: match[1],
      }),
    };
  return { term: name, text: t('Специальная функция вывода; подробности — в паспорте UG115.') };
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
      text: t('Сигнал вашего проекта, назначенный на этот вывод в файле .cst.'),
    });
  if (role) terms.push({ term: role, text: pin.label });
  if (!pin.io) {
    terms.push({
      term: t('питание'),
      text: t(
        'Вывод питания, земли или служебный. К нему нельзя подключить сигнал схемы; точное назначение — в паспорте UG115.',
      ),
    });
    return terms;
  }
  const pad = explainPad(pin.io);
  if (pad) terms.push(pad);
  for (const name of pin.functions) terms.push(explainFunction(name));
  if (!pin.functions.length && !role)
    terms.push({
      term: t('свободный вывод'),
      text: t(
        'У вывода нет особой функции. Прежде чем назначать сигнал, проверьте по схеме платы, куда он выведен.',
      ),
    });
  return terms;
}
