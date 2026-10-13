import type { PhysicalResult } from '../../shared/physical';
import type {
  ProgrammingDevice,
  ProgrammingHealth,
  ProgrammingJob,
  ProgrammingRequest,
} from '../../shared/programming';
import { fetchExternal } from './api';

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

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 without Web Crypto. Browsers hide `crypto.subtle` on plain HTTP, and a server
 * opened as http://address:port still has to compare a build with the current sources. */
export function sha256Bytes(bytes: Uint8Array): string {
  const length = bytes.length;
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
  view.setUint32(padded.length - 4, (length << 3) >>> 0);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const t1 = (hh + s1 + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (word) => word.toString(16).padStart(8, '0')).join('');
}

export async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (!globalThis.crypto?.subtle) return sha256Bytes(bytes);
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
  constructor(url: string, token: string, fetcher: Fetcher = fetchExternal) {
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
