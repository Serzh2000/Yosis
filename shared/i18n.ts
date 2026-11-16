/**
 * Перевод интерфейса. Исходные тексты написаны по-русски, и русская фраза служит ключом:
 * `t('Создать проект')`. Для английского ищется перевод в словаре; если его нет, показывается
 * исходный русский текст, так что неполный перевод ничего не ломает. Язык выбирается при загрузке
 * страницы (переключатель перезагружает её), поэтому тексты, собранные при запуске модуля,
 * тоже верны.
 *
 * Здесь нет обращений к браузеру: модуль работает и на сервере, и в тестах.
 */
export type Language = 'ru' | 'en';

let current: Language = 'ru';
const english = new Map<string, string>();

export const language = (): Language => current;
export const setLanguage = (value: Language): void => {
  current = value;
};

/** Добавляет переводы: `{ 'Русская фраза': 'English phrase' }`. */
export function registerEnglish(entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) english.set(key, value);
}

/** Переведённая фраза; `{имя}` в тексте заменяется значением из `values`. */
export function t(text: string, values?: Record<string, string | number>): string {
  const translated = current === 'en' ? (english.get(text) ?? text) : text;
  return values
    ? translated.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in values ? String(values[key]) : whole,
      )
    : translated;
}

/**
 * Фраза с уточнением смысла: одно русское слово бывает разным по-английски («Вход» — Input и
 * Sign in). Словарь ищет `контекст|фраза`, затем просто `фраза`; по-русски контекст не виден.
 */
export function tx(
  context: string,
  text: string,
  values?: Record<string, string | number>,
): string {
  const specific = current === 'en' ? english.get(`${context}|${text}`) : undefined;
  return specific === undefined ? t(text, values) : t(specific, values);
}

/** Русская фраза без перевода на английский: для проверки полноты словаря. */
export const hasEnglish = (text: string): boolean => english.has(text);

/** Язык по настройкам браузера: русский для русскоязычных, иначе английский. */
export function languageFor(browserLanguages: readonly string[] | undefined): Language {
  const first = browserLanguages?.[0]?.toLowerCase() ?? 'ru';
  return /^(ru|uk|be|kk|ky|tg|uz|hy|az|ka)\b/.test(first) || !first ? 'ru' : 'en';
}
