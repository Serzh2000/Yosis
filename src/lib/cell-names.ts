import type { Bit } from '../../shared/types';

/**
 * Yosys calls its cells `$add`, `$dff`, `$_AND_`… A beginner reads that as an error, so the
 * inspector leads with a plain name and keeps the Yosys one as a small technical note.
 */
const titles: Record<string, string> = {
  $add: 'Сумматор',
  $sub: 'Вычитатель',
  $mul: 'Умножитель',
  $div: 'Деление',
  $mod: 'Остаток от деления',
  $neg: 'Смена знака',
  $pos: 'Повторитель',
  $and: 'Побитовое И',
  $or: 'Побитовое ИЛИ',
  $xor: 'Побитовое исключающее ИЛИ',
  $xnor: 'Побитовое равенство (XNOR)',
  $not: 'Побитовое НЕ',
  $logic_and: 'Логическое И',
  $logic_or: 'Логическое ИЛИ',
  $logic_not: 'Логическое НЕ',
  $reduce_and: 'Все биты равны 1',
  $reduce_or: 'Хотя бы один бит равен 1',
  $reduce_bool: 'Хотя бы один бит равен 1',
  $reduce_xor: 'Число единиц нечётно',
  $reduce_xnor: 'Число единиц чётно',
  $eq: 'Сравнение «равно»',
  $ne: 'Сравнение «не равно»',
  $lt: 'Сравнение «меньше»',
  $le: 'Сравнение «меньше или равно»',
  $gt: 'Сравнение «больше»',
  $ge: 'Сравнение «больше или равно»',
  $shl: 'Сдвиг влево',
  $shr: 'Сдвиг вправо',
  $sshl: 'Арифметический сдвиг влево',
  $sshr: 'Арифметический сдвиг вправо',
  $mux: 'Мультиплексор (выбор из двух)',
  $pmux: 'Мультиплексор (выбор из нескольких)',
  $dff: 'Триггер (запоминает бит по такту)',
  $dffe: 'Триггер с разрешением записи',
  $adff: 'Триггер с асинхронным сбросом',
  $adffe: 'Триггер с асинхронным сбросом и разрешением',
  $sdff: 'Триггер с синхронным сбросом',
  $sdffe: 'Триггер с синхронным сбросом и разрешением',
  $dlatch: 'Защёлка (запоминает, пока EN = 1)',
  $mem: 'Память',
  $mem_v2: 'Память',
  $memrd: 'Чтение из памяти',
  $memrd_v2: 'Чтение из памяти',
  $memwr: 'Запись в память',
  $memwr_v2: 'Запись в память',
  $meminit: 'Начальное содержимое памяти',
  $meminit_v2: 'Начальное содержимое памяти',
  $lut: 'Таблица LUT',
  $_NOT_: 'Вентиль НЕ',
  $_AND_: 'Вентиль И',
  $_NAND_: 'Вентиль И-НЕ',
  $_OR_: 'Вентиль ИЛИ',
  $_NOR_: 'Вентиль ИЛИ-НЕ',
  $_XOR_: 'Вентиль исключающее ИЛИ',
  $_XNOR_: 'Вентиль равенства (XNOR)',
  $_MUX_: 'Мультиплексор на 1 бит',
  $_BUF_: 'Повторитель',
  ALU: 'Арифметический блок ALU',
  GND: 'Постоянный 0',
  VCC: 'Постоянная 1',
  IBUF: 'Входной буфер вывода',
  OBUF: 'Выходной буфер вывода',
  IOBUF: 'Двунаправленный буфер вывода',
  TBUF: 'Буфер с третьим состоянием',
  BUFG: 'Буфер глобального такта',
  rPLL: 'Умножитель частоты (PLL)',
};

export function cellTitle(type: string): string {
  const known = titles[type];
  if (known) return known;
  const lut = /^LUT([1-8])$/.exec(type);
  if (lut) {
    const count = Number(lut[1]);
    return `Таблица LUT на ${count} ${count === 1 ? 'вход' : count < 5 ? 'входа' : 'входов'}`;
  }
  if (/^MUX2_LUT[5-8]$/.test(type)) return `Мультиплексор ${type.slice(5)}`;
  if (/^DFF/.test(type)) return `Триггер ${type}`;
  if (/^(?:SP|SPX9|SDP|SDPX9|DP|DPX9|DPB|DPX9B|SDPB|SDPX9B|pROM|pROMX9|ROM|ROMX9)$/.test(type))
    return `Блочная память ${type}`;
  if (/^MULT/.test(type)) return `Умножитель ${type}`;
  return type;
}

const parameterLabels: Record<string, string> = {
  A_SIGNED: 'Вход A со знаком',
  B_SIGNED: 'Вход B со знаком',
  A_WIDTH: 'Ширина входа A',
  B_WIDTH: 'Ширина входа B',
  Y_WIDTH: 'Ширина выхода',
  S_WIDTH: 'Число вариантов выбора',
  WIDTH: 'Ширина',
  CLK_POLARITY: 'Рабочий фронт такта',
  EN_POLARITY: 'Уровень разрешения',
  ARST_POLARITY: 'Уровень асинхронного сброса',
  SRST_POLARITY: 'Уровень синхронного сброса',
  ARST_VALUE: 'Значение после сброса',
  SRST_VALUE: 'Значение после сброса',
  INIT: 'Таблица истинности (INIT)',
  ABITS: 'Число адресных бит',
  SIZE: 'Число слов',
  OFFSET: 'Смещение',
};

/** Plain-language parameter name; the Yosys name stays available as a tooltip. */
export function parameterLabel(name: string): string {
  return parameterLabels[name] ?? name;
}

interface NamedNet {
  bits: Bit[];
  hide_name?: number;
  /** Index of the least significant bit of a vector declared `[hi:lo]` with lo ≠ 0. */
  offset?: number;
  /** The vector is declared `[lo:hi]`: bit 0 has the highest index. */
  upto?: number;
}

/**
 * Describes the wires of one cell port the way the pupil wrote them: `count[3:0]`, `Кнопка…`,
 * or a constant, instead of Yosys' internal numbers (`#80, #81 …`).
 */
export function describeBits(bits: Bit[], netnames: Record<string, NamedNet> = {}): string {
  if (!bits.length) return 'не подключено';
  const named = Object.entries(netnames).filter(([, net]) => !net.hide_name && net.bits.length);
  const parts: string[] = [];
  let index = 0;
  while (index < bits.length) {
    const bit = bits[index];
    if (typeof bit === 'string') {
      let end = index;
      while (end + 1 < bits.length && typeof bits[end + 1] === 'string') end++;
      const run = bits.slice(index, end + 1) as string[];
      parts.push(
        run.every((value) => value === run[0])
          ? run[0] === '0' || run[0] === '1'
            ? `константа ${run[0]}${run.length > 1 ? ` (×${run.length})` : ''}`
            : `${run[0].toUpperCase()}${run.length > 1 ? ` (×${run.length})` : ''}`
          : `константа ${run.slice().reverse().join('')}`,
      );
      index = end + 1;
      continue;
    }
    let best: { name: string; from: number; length: number } | null = null;
    for (const [name, net] of named) {
      const from = net.bits.indexOf(bit);
      if (from < 0) continue;
      let length = 1;
      while (
        index + length < bits.length &&
        from + length < net.bits.length &&
        net.bits[from + length] === bits[index + length]
      )
        length++;
      if (!best || length > best.length) best = { name, from, length };
    }
    if (!best) {
      let end = index;
      while (end + 1 < bits.length && typeof bits[end + 1] === 'number') {
        const next = bits[end + 1];
        if (named.some(([, net]) => net.bits.includes(next))) break;
        end++;
      }
      parts.push(`внутренний сигнал${end > index ? ` (${end - index + 1} бит)` : ''}`);
      index = end + 1;
      continue;
    }
    const net = named.find(([name]) => name === best!.name)![1];
    const total = net.bits.length;
    const position = (from: number) => (net.offset ?? 0) + (net.upto ? total - 1 - from : from);
    const high = Math.max(position(best.from), position(best.from + best.length - 1));
    const low = Math.min(position(best.from), position(best.from + best.length - 1));
    parts.push(
      total === 1 || (best.from === 0 && best.length === total)
        ? best.name
        : best.length === 1
          ? `${best.name}[${low}]`
          : `${best.name}[${high}:${low}]`,
    );
    index += best.length;
  }
  // Yosys lists the least significant bit first; a reader expects the most significant first.
  return parts.reverse().join(', ');
}
