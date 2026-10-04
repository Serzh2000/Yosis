import type { PhysicalResult } from '../../shared/physical';
import type {
  ProgrammingDevice,
  ProgrammingHealth,
  ProgrammingJob,
  ProgrammingRequest,
} from '../../shared/programming';

export const DEFAULT_HELPER_URL = 'http://127.0.0.1:3211';
export const MAX_BITSTREAM_BYTES = 16 * 1024 * 1024;
type Fetcher = typeof fetch;

class ProgrammingHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class ProgrammingSubmissionError extends Error {
  constructor(
    message: string,
    readonly requestId: string,
    readonly unknownAcceptance: boolean,
  ) {
    super(message);
  }
}

export function helperOrigin(input: string): string {
  // Check the spelling before URL normalisation can turn decimal/hex IPs into loopback.
  const match = /^http:\/\/(127\.0\.0\.1|localhost)(?::([0-9]{1,5}))?\/?$/i.exec(input.trim());
  const port = match?.[2] ? Number(match[2]) : 3211;
  if (!match || port < 1 || port > 65535)
    throw new Error(
      'Помощник должен работать на http://127.0.0.1:3211 или http://localhost с локальным портом.',
    );
  return `http://${match[1].toLowerCase()}:${port}`;
}

export async function sha256Text(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      'Браузер не предоставляет SHA-256. Откройте приложение через HTTPS или localhost.',
    );
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function physicalIsFresh(
  result: PhysicalResult | null | undefined,
  sourceSnapshot: string,
  currentSnapshot: string,
  sourceHash: string,
): boolean {
  return (
    !!result &&
    result.status === 'success' &&
    result.bitstreamAvailable &&
    !!sourceSnapshot &&
    sourceSnapshot === currentSnapshot &&
    /^[a-f0-9]{64}$/.test(sourceHash) &&
    sourceHash === result.projectHash
  );
}

export function validateBitstreamText(text: string): void {
  // Only printable ASCII, tab and line endings are allowed in the text bitstream.
  // eslint-disable-next-line no-control-regex
  if (!text.length || text.length > MAX_BITSTREAM_BYTES || /[^\x09\x0a\x0d\x20-\x7e]/.test(text)) {
    throw new Error('Нужен текстовый битстрим Gowin .fs размером до 16 МБ.');
  }
}

function isJob(value: unknown): value is ProgrammingJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as ProgrammingJob;
  return (
    typeof job.id === 'string' &&
    typeof job.stage === 'string' &&
    typeof job.logs === 'string' &&
    ['running', 'success', 'error'].includes(job.status) &&
    /^[a-f0-9]{64}$/i.test(job.sha256) &&
    typeof job.deviceId === 'string' &&
    typeof job.projectName === 'string' &&
    typeof job.startedAt === 'string'
  );
}

/** Credentials live only in this object. Never put them in a URL or browser storage. */
export class ProgrammingClient {
  readonly origin: string;
  #token: string;
  #fetch: Fetcher;
  constructor(url: string, token: string, fetcher: Fetcher = fetch) {
    this.origin = helperOrigin(url);
    if (!token.trim() || token.length > 512 || /[\r\n]/.test(token))
      throw new Error('Введите код подключения из окна локального помощника.');
    this.#token = token.trim();
    this.#fetch = fetcher;
  }
  redact(value: string): string {
    return value.split(this.#token).join('[код скрыт]');
  }
  async #request(path: string, signal?: AbortSignal, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.origin}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        signal,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        headers: {
          Authorization: `Bearer ${this.#token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      if (signal?.aborted) throw new DOMException('Запрос отменён.', 'AbortError');
      throw new Error(
        'Локальный помощник недоступен. Проверьте его запуск, разрешённый адрес приложения и доступ браузера к локальной сети.',
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (!response.ok)
        throw new ProgrammingHttpError(`Ошибка помощника: ${response.status}`, response.status);
      throw new Error('Помощник вернул некорректный ответ.');
    }
    if (!response.ok) {
      if (response.status === 401)
        throw new ProgrammingHttpError(
          'Код подключения не подходит. Возьмите актуальный код из окна помощника.',
          response.status,
        );
      const message =
        data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `Ошибка помощника: ${response.status}`;
      throw new ProgrammingHttpError(this.redact(message), response.status);
    }
    return data;
  }
  async health(signal?: AbortSignal): Promise<ProgrammingHealth> {
    const data = (await this.#request('/api/health', signal)) as ProgrammingHealth;
    if (
      data?.version !== 1 ||
      !['gowin', 'openfpgaloader'].includes(data.backend) ||
      typeof data.available !== 'boolean' ||
      typeof data.detail !== 'string'
    )
      throw new Error('Версия локального помощника несовместима с Yosis.');
    return { ...data, detail: this.redact(data.detail) };
  }
  async devices(signal?: AbortSignal): Promise<ProgrammingDevice[]> {
    const data = (await this.#request('/api/devices', signal)) as { devices?: ProgrammingDevice[] };
    if (
      !Array.isArray(data?.devices) ||
      data.devices.some(
        (device) =>
          !device ||
          typeof device !== 'object' ||
          typeof device.id !== 'string' ||
          typeof device.label !== 'string' ||
          device.model !== 'GW2AR-18C' ||
          typeof device.deviceID !== 'string' ||
          device.deviceID.toLowerCase() !== '0x0000081b' ||
          !['gowin', 'openfpgaloader'].includes(device.backend),
      )
    )
      throw new Error('Помощник вернул некорректный список плат.');
    return data.devices.map((device) => ({ ...device, label: this.redact(device.label) }));
  }
  async start(input: ProgrammingRequest, signal?: AbortSignal): Promise<ProgrammingJob> {
    validateBitstreamText(input.bitstream);
    if (!input.deviceId || !input.projectName.trim()) throw new Error('Выберите плату и битстрим.');
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.requestId,
      )
    )
      throw new Error('Не удалось создать идентификатор загрузки.');
    if (
      !/^[a-f0-9]{64}$/i.test(input.sha256) ||
      (await sha256Text(input.bitstream)) !== input.sha256.toLowerCase()
    )
      throw new Error('SHA-256 битстрима не совпадает. Выберите файл ещё раз.');
    if (signal?.aborted) throw new DOMException('Запрос отменён.', 'AbortError');
    try {
      const data = await this.#request('/api/programs', signal, input);
      const job = this.#job(data);
      if (
        job.id !== input.requestId ||
        job.sha256.toLowerCase() !== input.sha256.toLowerCase() ||
        job.deviceId !== input.deviceId ||
        job.projectName !== input.projectName
      )
        throw new Error('Ответ помощника относится к другой загрузке.');
      return job;
    } catch (cause) {
      const definiteRejection =
        cause instanceof ProgrammingHttpError && cause.status >= 400 && cause.status < 500;
      throw new ProgrammingSubmissionError(
        cause instanceof Error ? cause.message : 'Ответ на запрос загрузки недоступен.',
        input.requestId,
        !definiteRejection,
      );
    }
  }
  async job(id: string, signal?: AbortSignal): Promise<ProgrammingJob> {
    return this.#job(await this.#request(`/api/programs/${encodeURIComponent(id)}`, signal));
  }
  #job(data: unknown): ProgrammingJob {
    if (!isJob(data)) throw new Error('Помощник вернул некорректный статус загрузки.');
    return {
      ...data,
      stage: this.redact(data.stage),
      logs: this.redact(data.logs),
      error: data.error ? this.redact(data.error) : undefined,
    };
  }
}
