import { languageFor, registerEnglish, setLanguage, type Language } from '../../shared/i18n';
import { english } from '../i18n/en';
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

registerEnglish(english);
setLanguage(readLanguage());
if (typeof document !== 'undefined') document.documentElement.lang = readLanguage();
