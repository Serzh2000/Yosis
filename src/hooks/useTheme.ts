import { useCallback, useEffect, useState } from 'react';
import { localStore, STORAGE_KEYS } from '../lib/storage';

export type Theme = 'light' | 'dark';

/** Сохранённая тема, а без неё — тема системы. */
export function resolveTheme(saved: string | null, prefersDark: () => boolean): Theme {
  if (saved === 'light' || saved === 'dark') return saved;
  return prefersDark() ? 'dark' : 'light';
}

/** Тема интерфейса: хранится в браузере и применяется к `<html>`. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(
      localStore.getItem(STORAGE_KEYS.theme),
      () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    // Без хранилища тема продолжает работать в памяти.
    localStore.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);
  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );
  return { theme, toggleTheme };
}
