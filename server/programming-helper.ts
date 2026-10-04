import express, { type ErrorRequestHandler } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ProgrammingBackend,
  ProgrammingDevice,
  ProgrammingJob,
  ProgrammingRequest,
} from '../shared/programming';
import { createProgrammingAdapter, type ProgrammingAdapter } from './programming-adapters';
import { MAX_PROGRAMMING_BYTES, validateProgrammingBitstream } from './programming-bitstream';
import { RequestError } from './validation';

const DEFAULT_ORIGINS = [
  'http://127.0.0.1:3001',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOG_LIMIT = 512 * 1024;
const REQUEST_LIMIT = MAX_PROGRAMMING_BYTES;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// eslint-disable-next-line no-control-regex -- Device IDs cannot contain whitespace or control bytes.
const INVALID_DEVICE_ID = /[\x00-\x20\x7f]/;
// eslint-disable-next-line no-control-regex -- Project names cannot contain control bytes.
const INVALID_PROJECT_NAME = /[\x00-\x1f\x7f]/;
// eslint-disable-next-line no-control-regex -- FS permits printable ASCII and tab/line endings only.
const INVALID_BITSTREAM_TEXT = /[^\x09\x0a\x0d\x20-\x7e]/;

export type ProgrammingBitstreamValidator = typeof validateProgrammingBitstream;

export interface ProgrammingHelperOptions {
  adapter: ProgrammingAdapter;
  root: string;
  token: string;
  allowedOrigins?: readonly string[];
  validateBitstream?: ProgrammingBitstreamValidator;
}

export function validateProgrammingRequest(value: unknown): ProgrammingRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RequestError('Ожидается описание загрузки.');
  const request = value as Record<string, unknown>;
  const keys = Object.keys(request);
  if (
    keys.length !== 5 ||
    keys.some(
      (key) => !['requestId', 'deviceId', 'bitstream', 'sha256', 'projectName'].includes(key),
    )
  )
    throw new RequestError(
      'Допустимы только requestId, deviceId, bitstream, sha256 и projectName.',
    );
  if (typeof request.requestId !== 'string' || !UUID.test(request.requestId))
    throw new RequestError('requestId должен быть UUID, созданным клиентом перед загрузкой.');
  if (
    typeof request.deviceId !== 'string' ||
    request.deviceId.length < 1 ||
    request.deviceId.length > 160 ||
    INVALID_DEVICE_ID.test(request.deviceId)
  )
    throw new RequestError('Некорректный идентификатор платы.');
  if (
    typeof request.projectName !== 'string' ||
    !request.projectName.trim() ||
    request.projectName.length > 120 ||
    INVALID_PROJECT_NAME.test(request.projectName)
  )
    throw new RequestError('Имя проекта должно содержать от 1 до 120 символов.');
  if (typeof request.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(request.sha256))
    throw new RequestError('Нужен SHA256 загружаемого битстрима.');
  if (
    typeof request.bitstream !== 'string' ||
    request.bitstream.length < 1 ||
    request.bitstream.length > REQUEST_LIMIT ||
    INVALID_BITSTREAM_TEXT.test(request.bitstream)
  )
    throw new RequestError('Битстрим должен быть текстовым файлом FS не больше 16 МБ.');
  return {
    requestId: request.requestId.toLowerCase(),
    deviceId: request.deviceId,
    bitstream: request.bitstream,
    sha256: request.sha256.toLowerCase(),
    projectName: request.projectName.trim(),
  };
}

export class ProgrammingManager {
  private busy = false;
  private active: Promise<void> | undefined;
  private readonly jobs = new Map<string, ProgrammingJob>();
  private readonly archived = new Set<string>();
  readonly root: string;

  constructor(
    readonly adapter: ProgrammingAdapter,
    root: string,
    private readonly validator: ProgrammingBitstreamValidator = validateProgrammingBitstream,
  ) {
    this.root = path.resolve(root);
  }

  async devices(): Promise<ProgrammingDevice[]> {
    if (this.busy)
      throw new RequestError('Загрузка уже выполняется. Дождитесь её завершения.', 409);
    this.busy = true;
    try {
      return await this.adapter.devices();
    } finally {
      this.busy = false;
    }
  }

  async create(value: unknown): Promise<ProgrammingJob> {
    const request = validateProgrammingRequest(value);
    const existing = this.jobs.get(request.requestId);
    if (existing) {
      if (
        existing.sha256 !== request.sha256 ||
        existing.deviceId !== request.deviceId ||
        existing.projectName !== request.projectName
      )
        throw new RequestError(
          'requestId уже принадлежит другой загрузке. Создайте новый идентификатор.',
          409,
        );
      // Do not return a receipt for modified data that merely claims the previous hash.
      try {
        this.validator(request.bitstream, request.sha256);
      } catch (error) {
        throw new RequestError(errorMessage(error));
      }
      return { ...existing };
    }
    if (this.busy)
      throw new RequestError('Загрузка уже выполняется. Дождитесь её завершения.', 409);
    // Keep idempotency records for this helper session; bound their memory separately from FS retention.
    if (this.jobs.size >= 1000)
      throw new RequestError(
        'Достигнут лимит 1000 загрузок. Перезапустите помощник для новой сессии.',
        503,
      );
    this.busy = true;
    const job: ProgrammingJob = {
      id: request.requestId,
      status: 'running',
      stage: 'Проверка битстрима и платы',
      logs: '',
      sha256: request.sha256,
      projectName: request.projectName,
      deviceId: request.deviceId,
      startedAt: new Date().toISOString(),
    };
    // Register before any asynchronous preparation. GET can recover this ID while POST is pending.
    this.jobs.set(job.id, job);
    let finish!: () => void;
    this.active = new Promise<void>((resolve) => {
      finish = resolve;
    });
    try {
      let bitstream: ReturnType<ProgrammingBitstreamValidator>;
      try {
        bitstream = this.validator(request.bitstream, request.sha256);
      } catch (error) {
        throw new RequestError(errorMessage(error));
      }
      job.stage = 'Поиск выбранной платы';
      const devices = await this.adapter.devices();
      const selected = devices.filter((device) => device.id === request.deviceId);
      if (selected.length !== 1)
        throw new RequestError(
          'Выбранная плата не найдена или её адрес неоднозначен. Обновите список плат.',
          404,
        );
      job.stage = 'Битстрим проверен';
      const directory = this.jobDirectory(job.id);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const filename = path.join(directory, 'design.fs');
      await writeFile(filename, bitstream.programmerText, { encoding: 'ascii', mode: 0o600 });
      await this.persist(job);
      // The accepted snapshot always starts as running, even for a fast test adapter.
      const accepted = { ...job };
      void this.run(job, selected[0], filename, bitstream.userCode).finally(finish);
      return accepted;
    } catch (error) {
      job.status = 'error';
      job.stage = 'Загрузка не начата';
      job.error = errorMessage(error).slice(0, 4000);
      job.finishedAt = new Date().toISOString();
      try {
        await mkdir(this.jobDirectory(job.id), { recursive: true, mode: 0o700 });
        await this.persist(job);
      } catch (receiptError) {
        job.logs = `Не удалось сохранить квитанцию: ${errorMessage(receiptError)}\n`;
      } finally {
        this.busy = false;
        finish();
      }
      await this.prune();
      throw error;
    }
  }

  get(id: string): ProgrammingJob {
    const normalized = id.toLowerCase();
    if (!UUID.test(normalized) || !this.jobs.has(normalized))
      throw new RequestError('Загрузка не найдена.', 404);
    return { ...this.jobs.get(normalized)! };
  }

  /** A helper shutdown waits for SRAM writing to finish; there is no HTTP cancellation route. */
  async close(): Promise<void> {
    await this.active;
  }

  private jobDirectory(id: string): string {
    if (!UUID.test(id)) throw new Error('Некорректный идентификатор загрузки.');
    const directory = path.resolve(this.root, id);
    if (path.dirname(directory) !== this.root)
      throw new Error('Путь загрузки выходит за каталог помощника.');
    return directory;
  }

  private async persist(job: ProgrammingJob): Promise<void> {
    await writeFile(
      path.join(this.jobDirectory(job.id), 'receipt.json'),
      JSON.stringify(job, null, 2),
      { mode: 0o600 },
    );
  }

  private async run(
    job: ProgrammingJob,
    device: ProgrammingDevice,
    filename: string,
    userCode: string,
  ): Promise<void> {
    try {
      await this.adapter.program(device, filename, userCode, {
        stage: (stage) => {
          job.stage = stage.slice(0, 200);
        },
        log: (message) => {
          // Keep the most recent output available for diagnosis without unbounded memory growth.
          job.logs = (job.logs + message).slice(-LOG_LIMIT);
        },
      });
      job.status = 'success';
      job.stage = 'Загрузка в SRAM завершена';
    } catch (error) {
      job.status = 'error';
      job.stage = 'Загрузка не завершена';
      job.error = errorMessage(error).slice(0, 4000);
    } finally {
      job.finishedAt = new Date().toISOString();
      try {
        await this.persist(job);
      } catch (error) {
        job.logs = (job.logs + `\nНе удалось сохранить квитанцию: ${errorMessage(error)}\n`).slice(
          -LOG_LIMIT,
        );
      }
      this.busy = false;
      await this.prune();
    }
  }

  private async prune(): Promise<void> {
    // Retain twenty full logs and artifacts. Smaller receipts stay in memory for idempotent retries.
    const terminal = [...this.jobs.values()].filter((job) => job.status !== 'running');
    for (const job of terminal.slice(0, Math.max(0, terminal.length - 20))) {
      if (this.archived.has(job.id)) continue;
      this.archived.add(job.id);
      job.logs =
        'Полный журнал предыдущей загрузки удалён при очистке истории. Результат сохранён до завершения сессии помощника.\n';
      try {
        await rm(this.jobDirectory(job.id), { recursive: true, force: true });
      } catch {
        /* A cleanup error must not change the programming result. */
      }
    }
  }
}

function normalizeOrigins(origins: readonly string[]): Set<string> {
  if (origins.length === 0) throw new Error('Укажите хотя бы один разрешённый origin.');
  return new Set(
    origins.map((origin) => {
      const url = new URL(origin);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin ||
        url.username ||
        url.password
      )
        throw new Error(`Нужен точный origin без пути: ${origin}`);
      return origin;
    }),
  );
}

export function createProgrammingHelperApp(options: ProgrammingHelperOptions) {
  if (!/^[0-9a-f]{64}$/i.test(options.token))
    throw new Error('Токен помощника должен содержать 32 случайных байта в hex.');
  const origins = normalizeOrigins(options.allowedOrigins ?? DEFAULT_ORIGINS);
  const expectedToken = Buffer.from(options.token, 'utf8');
  const manager = new ProgrammingManager(options.adapter, options.root, options.validateBitstream);
  const app = express();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const host = request.get('host');
    let hostname: string;
    try {
      const url = new URL(`http://${host}`);
      if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
        throw new Error('Invalid host');
      hostname = url.hostname;
    } catch {
      response.status(403).json({ error: 'Помощник доступен только через локальный адрес.' });
      return;
    }
    if (
      !LOOPBACK_HOSTS.has(hostname) ||
      !LOOPBACK_ADDRESSES.has(request.socket.remoteAddress ?? '')
    ) {
      response.status(403).json({ error: 'Помощник доступен только на этом компьютере.' });
      return;
    }
    const origin = request.get('origin');
    if (origin && !origins.has(origin)) {
      response.status(403).json({ error: 'Этот origin не разрешён в настройках помощника.' });
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      // CORS preflight contains no token/body. Actual requests always require the bearer token.
      if (
        !origin ||
        !request.path.startsWith('/api/') ||
        !['GET', 'POST'].includes(request.get('access-control-request-method') ?? '')
      ) {
        response.status(403).json({ error: 'Некорректный предварительный запрос.' });
        return;
      }
      const headers = (request.get('access-control-request-headers') ?? '')
        .toLowerCase()
        .split(',')
        .map((header) => header.trim())
        .filter(Boolean);
      if (headers.some((header) => !['authorization', 'content-type'].includes(header))) {
        response.status(403).json({ error: 'Недопустимые заголовки запроса.' });
        return;
      }
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      // Older Chromium PNA uses this header; current LNA permission is still controlled by the browser.
      if (request.get('access-control-request-private-network') === 'true')
        response.setHeader('Access-Control-Allow-Private-Network', 'true');
      response.status(204).end();
      return;
    }
    if (request.path === '/api' || request.path.startsWith('/api/')) {
      const authorization = request.get('authorization');
      const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
      const supplied = Buffer.from(token, 'utf8');
      if (supplied.length !== expectedToken.length || !timingSafeEqual(supplied, expectedToken)) {
        response
          .status(401)
          .json({ error: 'Нужен токен подключения из терминала локального помощника.' });
        return;
      }
    }
    next();
  });
  app.use(express.json({ limit: '20mb', strict: true }));
  app.get('/api/health', async (_request, response) =>
    response.json(await options.adapter.health()),
  );
  app.get('/api/devices', async (_request, response) =>
    response.json({ devices: await manager.devices() }),
  );
  app.post('/api/programs', async (request, response) => {
    if (!request.is('application/json'))
      throw new RequestError('Ожидается Content-Type: application/json.', 415);
    response.status(202).json(await manager.create(request.body));
  });
  app.get('/api/programs/:id', (request, response) =>
    response.json(manager.get(request.params.id)),
  );
  app.use((_request, response) =>
    response.status(404).json({ error: 'Маршрут помощника не найден.' }),
  );
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    const status =
      error instanceof RequestError
        ? error.status
        : error.status === 413
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : 500;
    const message =
      status === 413
        ? 'Размер запроса превышает допустимый.'
        : error.type === 'entity.parse.failed'
          ? 'Не удалось прочитать JSON запроса.'
          : errorMessage(error);
    response.status(status).json({ error: message.slice(0, 4000) });
  };
  app.use(errors);
  return { app, manager };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ошибка локального помощника.';
}

export function parseProgrammingHelperArguments(args: readonly string[]) {
  let port = 3211;
  let backend: ProgrammingBackend | undefined;
  let executable: string | undefined;
  let root = fileURLToPath(new URL('../.programming-helper', import.meta.url));
  const allowedOrigins: string[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Укажите значение ${flag}.`);
    if (flag === '--port') {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)
        throw new Error('Порт должен быть числом от 1 до 65535.');
      port = Number(value);
    } else if (flag === '--backend') {
      if (!['gowin', 'openfpgaloader'].includes(value))
        throw new Error('Backend: gowin или openfpgaloader.');
      backend = value as ProgrammingBackend;
    } else if (flag === '--executable') executable = value;
    else if (flag === '--data-dir') root = path.resolve(value);
    else if (flag === '--allow-origin') allowedOrigins.push(value);
    else throw new Error(`Неизвестный параметр ${flag}.`);
  }
  normalizeOrigins(allowedOrigins.length ? allowedOrigins : DEFAULT_ORIGINS);
  return {
    port,
    backend,
    executable,
    root,
    allowedOrigins: allowedOrigins.length ? allowedOrigins : DEFAULT_ORIGINS,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Yosis USB helper · загрузка Tang Nano 20K в SRAM

Запуск: node yosis-helper.mjs [параметры]
  --port 3211                  Локальный порт (127.0.0.1)
  --allow-origin https://...    Точный origin интерфейса; можно указать несколько
  --backend gowin              Gowin Programmer (Windows по умолчанию)
  --backend openfpgaloader     openFPGALoader (Linux/macOS по умолчанию)
  --executable <path>           Путь к установленному программатору
  --data-dir <path>             Каталог локальных квитанций и битстримов

Также поддерживаются YOSIS_GOWIN_PROGRAMMER и YOSIS_OPENFPGALOADER.
Без --allow-origin разрешены localhost и 127.0.0.1 на портах 3001 и 5173.
Токен создаётся при запуске и показывается только в терминале.
Запись flash и отмена текущей загрузки не поддерживаются.`);
    process.exit(0);
  }
  const config = parseProgrammingHelperArguments(process.argv.slice(2));
  const adapter = await createProgrammingAdapter(config);
  const token = randomBytes(32).toString('hex');
  const { app, manager } = createProgrammingHelperApp({ ...config, adapter, token });
  const server = app.listen(config.port, '127.0.0.1', () => {
    console.log(`Yosis USB helper: http://127.0.0.1:${config.port}`);
    console.log(`Токен подключения: ${token}`);
    console.log(`Разрешённые origin: ${config.allowedOrigins.join(', ')}`);
    console.log('Режим: SRAM. После отключения питания восстанавливается программа из flash.');
  });
  server.on('error', (error) => {
    console.error(`Не удалось запустить помощник: ${error.message}`);
    process.exitCode = 1;
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log('Помощник завершится после текущей загрузки.');
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    await manager.close();
    await closed;
  };
  process.once('SIGINT', () => {
    void stop();
  });
  process.once('SIGTERM', () => {
    void stop();
  });
}
