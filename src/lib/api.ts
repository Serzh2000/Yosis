import { t, translateServerMessage } from './i18n';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
let pendingSession: Promise<unknown> | undefined;

/** Текст ошибки для ответа с неуспешным статусом: строка или функция от кода ответа. */
export type Failure = string | ((status: number) => string);

/**
 * Единственная точка, где приложение вызывает `fetch` для собственного сервера. Перед любым
 * закрытым запросом она ждёт установления гостевой cookie, поэтому гонки с `/api/session` нет.
 */
async function send(url: string, init?: RequestInit): Promise<Response> {
  const sessionRequest = url === '/api/session' && (!init?.method || init.method === 'GET');
  // React's initial effects start health, restoration and syntax checks at once.
  // Establish the HttpOnly guest cookie before any private API request is sent.
  if (!sessionRequest && pendingSession) await pendingSession.catch(() => {});
  return fetch(url, init);
}

/** JSON-запрос: ошибка `{error}` сервера становится `ApiError` с кодом ответа. */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const sessionRequest = url === '/api/session' && (!init?.method || init.method === 'GET');
  if (sessionRequest) {
    if (pendingSession) return pendingSession as Promise<T>;
    const operation = fetchJson<T>(url, init);
    pendingSession = operation;
    try {
      return await operation;
    } finally {
      if (pendingSession === operation) pendingSession = undefined;
    }
  }
  return fetchJson<T>(url, init);
}

/** Ответ как есть, после ожидания сессии: статус и тело проверяет вызывающий. */
export function requestRaw(url: string, init?: RequestInit): Promise<Response> {
  return send(url, init);
}

/** Запрос, от которого нужен только успех: тело ответа (если оно есть) не разбирается. */
export async function requestVoid(
  url: string,
  init?: RequestInit,
  failure?: Failure,
): Promise<void> {
  await expectOk(await send(url, init), failure);
}

/** Текстовый артефакт сервера. */
export async function requestText(
  url: string,
  init?: RequestInit,
  failure?: Failure,
): Promise<string> {
  return (await expectOk(await send(url, init), failure)).text();
}

/** Двоичный артефакт сервера (резервные копии, образы прошивки). */
export async function download(
  url: string,
  init?: RequestInit,
  failure?: Failure,
): Promise<Uint8Array> {
  return new Uint8Array(await (await expectOk(await send(url, init), failure)).arrayBuffer());
}

/**
 * Запрос к стороннему адресу (локальный помощник программирования): сессия студии ему не нужна,
 * поэтому гейт не применяется. Правило ESLint запрещает `fetch` везде, кроме этого файла.
 */
export const fetchExternal: typeof fetch = (input, init) => fetch(input, init);

async function expectOk(response: Response, failure?: Failure): Promise<Response> {
  if (response.ok) return response;
  if (failure !== undefined)
    throw new ApiError(
      typeof failure === 'function' ? failure(response.status) : failure,
      response.status,
    );
  let message = '';
  try {
    message = ((await response.json()) as { error?: string }).error ?? '';
  } catch {
    /* Тело ответа не JSON: остаётся общее сообщение. */
  }
  throw new ApiError(
    translateServerMessage(message) || t('Ошибка сервиса: {status}', { status: response.status }),
    response.status,
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await send(url, init);
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(t('Сервис вернул некорректный ответ.'));
  }
  if (!response.ok)
    throw new ApiError(
      translateServerMessage((data as { error?: string }).error ?? '') ||
        t('Ошибка сервиса: {status}', { status: response.status }),
      response.status,
    );
  return translateFields(data) as T;
}

const TRANSLATED_FIELDS = new Set(['error', 'stage', 'detail', 'reason']);

/** Тексты сервера в ответе (`error`, `stage`…) на выбранном языке; логи переводит `pollJob`. */
function translateFields(data: unknown, depth = 0): unknown {
  if (depth > 2 || !data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    if (data.length <= 500) data.forEach((item) => translateFields(item, depth + 1));
    return data;
  }
  const record = data as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (typeof value === 'string') {
      if (TRANSLATED_FIELDS.has(key)) record[key] = translateServerMessage(value);
    } else translateFields(value, depth + 1);
  }
  return data;
}
