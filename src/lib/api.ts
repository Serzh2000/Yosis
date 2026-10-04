export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
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
