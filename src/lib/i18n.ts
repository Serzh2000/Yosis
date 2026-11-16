import {
  language as currentLanguage,
  languageFor,
  registerEnglish,
  setLanguage,
  type Language,
} from '../../shared/i18n';
import { english } from '../i18n/en';
import { server as serverDictionary } from '../i18n/en-server';
import { serverPatterns } from '../i18n/server-patterns';
import { localStore, STORAGE_KEYS } from './storage';

export { t, language } from '../../shared/i18n';

/** Выбранный язык: сохранённый выбор, иначе язык браузера. */
export function readLanguage(): Language {
  const saved = localStore.getItem(STORAGE_KEYS.language);
  return saved === 'en' || saved === 'ru'
    ? saved
    : languageFor(typeof window === 'undefined' ? undefined : navigator.languages);
}

/** Запоминает язык и перезагружает страницу: тексты собираются при загрузке. */
export function switchLanguage(next: Language): void {
  localStore.setItem(STORAGE_KEYS.language, next);
  window.location.reload();
}

let serverTexts: Map<string, string> | undefined;

/** Перевод одной строки серверного сообщения; пробелы по краям сохраняются. */
function translateServerLine(line: string): string {
  if (!/[А-Яа-яЁё]/.test(line)) return line;
  const body = line.trim();
  if (!body) return line;
  serverTexts ??= new Map(
    Object.entries(serverDictionary).map(([ru, en]) => [ru.trim(), en.trim()] as const),
  );
  const exact = serverTexts.get(body);
  if (exact !== undefined) return line.replace(body, () => exact);
  for (const { pattern, en } of serverPatterns) {
    const match = pattern.exec(body);
    if (match) return line.replace(body, () => en(match));
  }
  return line;
}

/**
 * Серверное сообщение (ошибка, этап, журнал) на выбранном языке. Для русского текст не меняется;
 * для английского переводятся известные строки и шаблоны, остальное остаётся как есть.
 */
export function translateServerMessage(text: string): string {
  if (currentLanguage() !== 'en' || !text) return text;
  return text
    .split(/(\r?\n)/)
    .map((part, index) => (index % 2 ? part : translateServerLine(part)))
    .join('');
}

registerEnglish(english);
setLanguage(readLanguage());
if (typeof document !== 'undefined') document.documentElement.lang = readLanguage();
