/**
 * Единый локальный адрес Yosis. `localhost` и `127.0.0.1` — разные источники браузера,
 * поэтому у них разные IndexedDB с библиотеками проектов. Каноническим выбран адрес,
 * который печатают Vite, сервер и README.
 */
export const CANONICAL_LOCAL_HOST = '127.0.0.1';

export const KEEP_ORIGIN_PARAMETER = 'keep-origin';

const ALIAS_HOSTS = new Set(['localhost', '[::1]', '::1']);

export interface LocationParts {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

/** Возвращает адрес для перехода или `null`, если текущий адрес уже канонический или не локальный. */
export function canonicalLocalUrl(location: LocationParts): string | null {
  if (location.protocol !== 'http:') return null;
  // Аварийный выход: открыть библиотеку проектов, сохранённую под localhost, чтобы экспортировать её.
  if (new URLSearchParams(location.search).has(KEEP_ORIGIN_PARAMETER)) return null;
  if (!ALIAS_HOSTS.has(location.hostname.toLowerCase())) return null;
  const port = location.port ? `:${location.port}` : '';
  return `http://${CANONICAL_LOCAL_HOST}${port}${location.pathname}${location.search}${location.hash}`;
}
