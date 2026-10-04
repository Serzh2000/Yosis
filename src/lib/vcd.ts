export interface VcdChange {
  time: number;
  value: string;
}
export interface VcdSignal {
  id: string;
  name: string;
  width: number;
  scope: string[];
  changes: VcdChange[];
}
export interface VcdTrace {
  timescaleFs: number;
  startTime: number;
  endTime: number;
  signals: VcdSignal[];
  warnings: string[];
}

export const VCD_LIMITS = {
  textChars: 32 * 1024 * 1024,
  signals: 4096,
  changes: 1_000_000,
  width: 4096,
  valueChars: 64 * 1024 * 1024,
  scopeDepth: 128,
} as const;

const unitsFs: Record<string, number> = { s: 1e15, ms: 1e12, us: 1e9, ns: 1e6, ps: 1e3, fs: 1 };
const digitalTypes = new Set([
  'wire',
  'reg',
  'integer',
  'parameter',
  'time',
  'event',
  'supply0',
  'supply1',
  'tri',
  'tri0',
  'tri1',
  'triand',
  'trior',
  'trireg',
  'wand',
  'wor',
  'logic',
  'bit',
]);

class Tokens {
  private offset = 0;
  constructor(private readonly text: string) {
    if (text.charCodeAt(0) === 0xfeff) this.offset = 1;
  }
  next(): string | null {
    while (this.offset < this.text.length && this.text.charCodeAt(this.offset) <= 32) this.offset++;
    if (this.offset >= this.text.length) return null;
    const start = this.offset;
    while (this.offset < this.text.length && this.text.charCodeAt(this.offset) > 32) this.offset++;
    return this.text.slice(start, this.offset);
  }
  directive(name: string, keep = true): string[] {
    const values: string[] = [];
    let token: string | null;
    while ((token = this.next()) !== null) {
      if (token === '$end') return values;
      if (keep) {
        if (values.length >= 64) throw new Error(`Слишком длинное объявление ${name} в VCD.`);
        values.push(token);
      }
    }
    throw new Error(`В VCD не завершено объявление ${name}: отсутствует $end.`);
  }
}

function normalizedValue(value: string, width: number): string {
  if (value.length >= width) return value.slice(-width).toLowerCase();
  const bits = value.toLowerCase();
  const padding = bits[0] === 'x' || bits[0] === 'z' ? bits[0] : '0';
  return bits.padStart(width, padding);
}

/** Parse native VCD ticks. Aliases intentionally share the same change array. */
export function parseVcd(text: string): VcdTrace {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Файл VCD пуст.');
  if (text.length > VCD_LIMITS.textChars)
    throw new Error('Файл VCD слишком большой: лимит 32 млн символов.');
  const tokens = new Tokens(text);
  const warnings: string[] = [];
  const warningKeys = new Set<string>();
  let omittedWarnings = false;
  const warn = (key: string, message: string) => {
    if (warningKeys.has(key)) return;
    if (warnings.length < 50) {
      warningKeys.add(key);
      warnings.push(message);
    } else if (!omittedWarnings) {
      omittedWarnings = true;
      warnings.push('Остальные предупреждения VCD опущены.');
    }
  };
  const signals: VcdSignal[] = [];
  const series = new Map<string, { width: number; changes: VcdChange[] }>();
  const ignoredIds = new Set<string>();
  const fullNames = new Set<string>();
  const scope: string[] = [];
  let timescaleFs = 1e6;
  let timescaleDeclared = false;
  let definitionsEnded = false;
  let declaredCount = 0;

  let token: string | null;
  while ((token = tokens.next()) !== null) {
    if (token === '$enddefinitions') {
      const args = tokens.directive(token);
      if (args.length) throw new Error('Некорректное $enddefinitions в VCD.');
      definitionsEnded = true;
      break;
    }
    if (token === '$comment' || token === '$version' || token === '$date') {
      tokens.directive(token, false);
      continue;
    }
    if (token === '$timescale') {
      const args = tokens.directive(token);
      const match = args
        .join('')
        .toLowerCase()
        .match(/^(\d+(?:\.\d+)?)(s|ms|us|ns|ps|fs)$/);
      if (!match)
        throw new Error('Некорректный масштаб времени VCD. Пример: $timescale 1 ns $end.');
      const value = Number(match[1]) * unitsFs[match[2]];
      if (!Number.isSafeInteger(value) || value <= 0)
        throw new Error('Масштаб времени VCD нельзя точно представить в фемтосекундах.');
      if (timescaleDeclared && value !== timescaleFs)
        warn('timescale', 'В VCD несколько масштабов времени; используется последний.');
      timescaleDeclared = true;
      timescaleFs = value;
      continue;
    }
    if (token === '$scope') {
      const args = tokens.directive(token);
      if (args.length !== 2) throw new Error('Некорректное объявление области $scope в VCD.');
      if (scope.length >= VCD_LIMITS.scopeDepth)
        throw new Error('Слишком глубокая иерархия VCD: лимит 128 уровней.');
      if (
        args[1].length > 1024 ||
        scope.reduce((count, part) => count + part.length, args[1].length) > 4096
      )
        throw new Error('Имена областей VCD слишком длинные для просмотра.');
      scope.push(args[1]);
      continue;
    }
    if (token === '$upscope') {
      const args = tokens.directive(token);
      if (args.length || !scope.length)
        throw new Error('Некорректное закрытие области $upscope в VCD.');
      scope.pop();
      continue;
    }
    if (token === '$var') {
      const args = tokens.directive(token);
      if (args.length < 4) throw new Error('Неполное объявление сигнала $var в VCD.');
      declaredCount++;
      if (declaredCount > VCD_LIMITS.signals)
        throw new Error('Слишком много сигналов VCD: лимит 4096 объявлений.');
      const [type, widthText, id, reference, ...range] = args;
      const name = reference + range.join('');
      if (name.length > 4096 || id.length > 4096)
        throw new Error('Слишком длинное имя или идентификатор сигнала VCD.');
      if (!digitalTypes.has(type.toLowerCase())) {
        if (series.has(id))
          throw new Error(`Идентификатор ${id} в VCD используется для разных типов сигналов.`);
        ignoredIds.add(id);
        warn(
          `type:${type}`,
          `Сигналы типа ${type} пропущены: просмотр поддерживает цифровые значения 0, 1, X и Z.`,
        );
        continue;
      }
      if (!/^\d+$/.test(widthText))
        throw new Error(`Некорректная разрядность сигнала ${name} в VCD.`);
      const width = Number(widthText);
      if (!Number.isSafeInteger(width) || width < 1 || width > VCD_LIMITS.width)
        throw new Error(`Разрядность сигнала ${name} должна быть от 1 до 4096 бит.`);
      if (ignoredIds.has(id))
        throw new Error(`Идентификатор ${id} в VCD используется для разных типов сигналов.`);
      const existing = series.get(id);
      if (existing && existing.width !== width)
        throw new Error(`Псевдонимы сигнала ${id} в VCD имеют разную разрядность.`);
      const path = JSON.stringify([...scope, name]);
      if (fullNames.has(path)) {
        warn(
          `duplicate:${path}`,
          `Повторное объявление сигнала ${[...scope, name].join('.')} пропущено.`,
        );
        continue;
      }
      fullNames.add(path);
      const data = existing ?? { width, changes: [] };
      series.set(id, data);
      signals.push({ id, name, width, scope: [...scope], changes: data.changes });
      continue;
    }
    if (token.startsWith('$')) {
      tokens.directive(token, false);
      warn(`header:${token}`, `Неизвестное объявление VCD ${token} пропущено.`);
      continue;
    }
    throw new Error(`Некорректный заголовок VCD возле «${token.slice(0, 60)}».`);
  }
  if (!definitionsEnded)
    throw new Error('В VCD отсутствует $enddefinitions: заголовок не завершён.');
  if (!declaredCount) throw new Error('В VCD нет объявлений сигналов $var.');
  if (scope.length) warn('unclosed-scope', 'Области $scope в заголовке VCD закрыты не полностью.');
  if (!timescaleDeclared)
    warn('no-timescale', 'В VCD нет $timescale; для отображения принят шаг 1 нс.');

  let currentTime = 0;
  let startTime: number | null = null;
  let endTime = 0;
  let dumpDirective: string | null = null;
  let records = 0;
  let valueChars = 0;
  const observeTime = (time: number) => {
    startTime = startTime === null ? time : Math.min(startTime, time);
    endTime = Math.max(endTime, time);
  };
  const change = (id: string, value: string, digital: boolean) => {
    records++;
    if (records > VCD_LIMITS.changes)
      throw new Error('Слишком много изменений в VCD: лимит 1 млн записей.');
    observeTime(currentTime);
    if (ignoredIds.has(id)) return;
    const data = series.get(id);
    if (!data) {
      warn(`id:${id}`, `Изменения необъявленного сигнала «${id.slice(0, 40)}» пропущены.`);
      return;
    }
    if (!digital) {
      warn(
        `value-type:${id}`,
        `Вещественное или строковое значение цифрового сигнала «${id.slice(0, 40)}» пропущено.`,
      );
      return;
    }
    if (value.length > data.width)
      warn(
        `truncate:${id}`,
        `Значения сигнала «${id.slice(0, 40)}» шире объявления; сохранены младшие ${data.width} бит.`,
      );
    const normalized = normalizedValue(value, data.width);
    const last = data.changes[data.changes.length - 1];
    if (last?.time === currentTime) {
      const before = data.changes[data.changes.length - 2];
      if (before?.value === normalized) {
        data.changes.pop();
        valueChars -= data.width;
      } else last.value = normalized;
    } else if (last?.value !== normalized) {
      valueChars += data.width;
      if (valueChars > VCD_LIMITS.valueChars)
        throw new Error(
          'VCD содержит слишком много данных: лимит 64 млн сохранённых двоичных разрядов.',
        );
      data.changes.push({ time: currentTime, value: normalized });
    }
  };
  while ((token = tokens.next()) !== null) {
    if (token.startsWith('#')) {
      if (!/^#\d+$/.test(token))
        throw new Error(`Некорректная отметка времени VCD «${token.slice(0, 60)}».`);
      const time = Number(token.slice(1));
      if (!Number.isSafeInteger(time))
        throw new Error('Отметка времени VCD превышает предел точных целых чисел.');
      if (time < currentTime) throw new Error('Отметки времени VCD должны идти по возрастанию.');
      currentTime = time;
      observeTime(time);
      continue;
    }
    if (token === '$end') {
      if (!dumpDirective)
        throw new Error('В VCD встретился $end без открытой команды изменения значений.');
      dumpDirective = null;
      continue;
    }
    if (
      token === '$dumpvars' ||
      token === '$dumpall' ||
      token === '$dumpon' ||
      token === '$dumpoff'
    ) {
      if (dumpDirective)
        throw new Error(`В VCD не завершена команда ${dumpDirective}: отсутствует $end.`);
      dumpDirective = token;
      continue;
    }
    if (token === '$comment' || token === '$date' || token === '$version') {
      tokens.directive(token, false);
      continue;
    }
    if (token.startsWith('$')) {
      tokens.directive(token, false);
      warn(`data:${token}`, `Неизвестная команда VCD ${token} пропущена.`);
      continue;
    }
    if (/^[01xXzZ].+/.test(token)) {
      change(token.slice(1), token[0], true);
      continue;
    }
    if (/^[bB]/.test(token)) {
      const value = token.slice(1);
      if (!/^[01xXzZ]+$/.test(value))
        throw new Error(`Некорректное двоичное значение VCD «${token.slice(0, 60)}».`);
      const id = tokens.next();
      if (id === null) throw new Error('В VCD отсутствует идентификатор после двоичного значения.');
      change(id, value, true);
      continue;
    }
    if (/^[rRsS]/.test(token)) {
      const id = tokens.next();
      if (id === null)
        throw new Error('В VCD отсутствует идентификатор после real/string значения.');
      change(id, token.slice(1), false);
      continue;
    }
    throw new Error(`Некорректная запись изменения VCD «${token.slice(0, 60)}».`);
  }
  if (dumpDirective)
    throw new Error(`В VCD не завершена команда ${dumpDirective}: отсутствует $end.`);
  return { timescaleFs, startTime: startTime ?? 0, endTime, signals, warnings };
}
