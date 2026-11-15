/**
 * Заменяет пробелами комментарии `//…` и блочные (и по желанию строки в кавычках), сохраняя длину
 * текста и переводы строк: смещения и номера строк остаются верными.
 *
 * Делается одним проходом. Регулярное выражение `/\*[\s\S]*?\*\/` на незакрытом комментарии
 * перечитывает файл до конца с каждого `/*`: 512 КБ таких вхождений занимали бы секунды в главном
 * потоке сервера.
 */
export function blankComments(source: string, withStrings = false): string {
  const parts: string[] = [];
  const length = source.length;
  let at = 0;
  while (at < length) {
    const char = source[at];
    const next = source[at + 1];
    if (char === '/' && next === '/') {
      let end = source.indexOf('\n', at);
      if (end < 0) end = length;
      parts.push(' '.repeat(end - at));
      at = end;
    } else if (char === '/' && next === '*') {
      const close = source.indexOf('*/', at + 2);
      const end = close < 0 ? length : close + 2;
      parts.push(source.slice(at, end).replace(/[^\n]/g, ' '));
      at = end;
    } else if (withStrings && char === '"') {
      // Строка без закрывающей кавычки на той же строке строкой не считается.
      let end = at + 1;
      while (end < length && source[end] !== '"' && source[end] !== '\n') end += source[end] === '\\' ? 2 : 1;
      if (end < length && source[end] === '"') {
        parts.push(' '.repeat(end + 1 - at));
        at = end + 1;
      } else {
        parts.push('"');
        at += 1;
      }
    } else {
      let end = at + 1;
      while (end < length && source[end] !== '/' && !(withStrings && source[end] === '"')) end++;
      parts.push(source.slice(at, end));
      at = end;
    }
  }
  return parts.join('');
}
