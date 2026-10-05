export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
let pendingSession: Promise<unknown> | undefined;

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
  // React's initial effects start health, restoration and syntax checks at once.
  // Establish the HttpOnly guest cookie before any private API request is sent.
  if (pendingSession) await pendingSession.catch(() => {});
  return fetchJson<T>(url, init);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Сервис вернул некорректный ответ.');
  }
  if (!response.ok)
    throw new ApiError(
      (data as { error?: string }).error || `Ошибка сервиса: ${response.status}`,
      response.status,
    );
  return data as T;
}
