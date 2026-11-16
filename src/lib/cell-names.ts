import { t } from './i18n';
import type { Bit } from '../../shared/types';

/**
 * Yosys calls its cells `$add`, `$dff`, `$_AND_`… A beginner reads that as an error, so the
 * inspector leads with a plain name and keeps the Yosys one as a small technical note.
 */
const titles: Record<string, string> = {
  $add: t('Сумматор'),
  $sub: t('Вычитатель'),
  $mul: t('Умножитель'),
  $div: t('Деление'),
  $mod: t('Остаток от деления'),
  $neg: t('Смена знака'),
  $pos: t('Повторитель'),
  $and: t('Побитовое И'),
  $or: t('Побитовое ИЛИ'),
  $xor: t('Побитовое исключающее ИЛИ'),
  $xnor: t('Побитовое равенство (XNOR)'),
  $not: t('Побитовое НЕ'),
  $logic_and: t('Логическое И'),
  $logic_or: t('Логическое ИЛИ'),
  $logic_not: t('Логическое НЕ'),
  $reduce_and: t('Все биты равны 1'),
  $reduce_or: t('Хотя бы один бит равен 1'),
  $reduce_bool: t('Хотя бы один бит равен 1'),
  $reduce_xor: t('Число единиц нечётно'),
  $reduce_xnor: t('Число единиц чётно'),
  $eq: t('Сравнение «равно»'),
  $ne: t('Сравнение «не равно»'),
  $lt: t('Сравнение «меньше»'),
  $le: t('Сравнение «меньше или равно»'),
  $gt: t('Сравнение «больше»'),
  $ge: t('Сравнение «больше или равно»'),
  $shl: t('Сдвиг влево'),
  $shr: t('Сдвиг вправо'),
  $sshl: t('Арифметический сдвиг влево'),
  $sshr: t('Арифметический сдвиг вправо'),
  $mux: t('Мультиплексор (выбор из двух)'),
  $pmux: t('Мультиплексор (выбор из нескольких)'),
  $dff: t('Триггер (запоминает бит по такту)'),
  $dffe: t('Триггер с разрешением записи'),
  $adff: t('Триггер с асинхронным сбросом'),
  $adffe: t('Триггер с асинхронным сбросом и разрешением'),
  $sdff: t('Триггер с синхронным сбросом'),
  $sdffe: t('Триггер с синхронным сбросом и разрешением'),
  $dlatch: t('Защёлка (запоминает, пока EN = 1)'),
  $mem: t('Память'),
  $mem_v2: t('Память'),
  $memrd: t('Чтение из памяти'),
  $memrd_v2: t('Чтение из памяти'),
  $memwr: t('Запись в память'),
  $memwr_v2: t('Запись в память'),
  $meminit: t('Начальное содержимое памяти'),
  $meminit_v2: t('Начальное содержимое памяти'),
  $lut: t('Таблица LUT'),
  $_NOT_: t('Вентиль НЕ'),
  $_AND_: t('Вентиль И'),
  $_NAND_: t('Вентиль И-НЕ'),
  $_OR_: t('Вентиль ИЛИ'),
  $_NOR_: t('Вентиль ИЛИ-НЕ'),
  $_XOR_: t('Вентиль исключающее ИЛИ'),
  $_XNOR_: t('Вентиль равенства (XNOR)'),
  $_MUX_: t('Мультиплексор на 1 бит'),
  $_BUF_: t('Повторитель'),
  ALU: t('Арифметический блок ALU'),
  GND: t('Постоянный 0'),
  VCC: t('Постоянная 1'),
  IBUF: t('Входной буфер вывода'),
  OBUF: t('Выходной буфер вывода'),
  IOBUF: t('Двунаправленный буфер вывода'),
  TBUF: t('Буфер с третьим состоянием'),
  BUFG: t('Буфер глобального такта'),
  rPLL: t('Умножитель частоты (PLL)'),
};

export function cellTitle(type: string): string {
  const known = titles[type];
  if (known) return known;
  const lut = /^LUT([1-8])$/.exec(type);
  if (lut) {
    const count = Number(lut[1]);
    return t('Таблица LUT на {count} {unit}', {
      count,
      unit: count === 1 ? t('вход') : count < 5 ? t('входа') : t('входов'),
    });
  }
  if (/^MUX2_LUT[5-8]$/.test(type)) return t('Мультиплексор {type}', { type: type.slice(5) });
  if (/^DFF/.test(type)) return t('Триггер {type}', { type });
  if (/^(?:SP|SPX9|SDP|SDPX9|DP|DPX9|DPB|DPX9B|SDPB|SDPX9B|pROM|pROMX9|ROM|ROMX9)$/.test(type))
    return t('Блочная память {type}', { type });
  if (/^MULT/.test(type)) return t('Умножитель {type}', { type });
  return type;
}

const parameterLabels: Record<string, string> = {
  A_SIGNED: t('Вход A со знаком'),
  B_SIGNED: t('Вход B со знаком'),
  A_WIDTH: t('Ширина входа A'),
  B_WIDTH: t('Ширина входа B'),
  Y_WIDTH: t('Ширина выхода'),
  S_WIDTH: t('Число вариантов выбора'),
  WIDTH: t('Ширина'),
  CLK_POLARITY: t('Рабочий фронт такта'),
  EN_POLARITY: t('Уровень разрешения'),
  ARST_POLARITY: t('Уровень асинхронного сброса'),
  SRST_POLARITY: t('Уровень синхронного сброса'),
  ARST_VALUE: t('Значение после сброса'),
  SRST_VALUE: t('Значение после сброса'),
  INIT: t('Таблица истинности (INIT)'),
  ABITS: t('Число адресных бит'),
  SIZE: t('Число слов'),
  OFFSET: t('Смещение'),
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
  if (!bits.length) return t('не подключено');
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
            ? `${t('константа')} ${run[0]}${run.length > 1 ? ` (×${run.length})` : ''}`
            : `${run[0].toUpperCase()}${run.length > 1 ? ` (×${run.length})` : ''}`
          : `${t('константа')} ${run.slice().reverse().join('')}`,
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
      parts.push(
        `${t('внутренний сигнал')}${end > index ? ` (${t('{count} бит', { count: end - index + 1 })})` : ''}`,
      );
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
