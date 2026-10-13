import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BuildStatus, SourceFile } from '../shared/types';
import { atomicWrite } from './atomic-write';
import { JOB_ID, MAX_LOG_BYTES, MAX_MEMORY_RECORDS, TERMINAL } from './job-constants';
import { JobQueue, executorCount } from './job-queue';
import { JobRetention, markJob } from './job-retention';
import { toolCommand } from './process-limits';
import { incrementalStatus, storedStatus } from './job-status';
import { RequestError } from './validation';

/** Поля результата, общие для сборки, симуляции и размещения. */
export interface JobResult {
  id: string;
  status: BuildStatus;
  stage: string;
  startedAt: string;
  finishedAt?: string;
  elapsedMs?: number;
  logs: string;
  error?: string;
}
/** Запись задания в памяти менеджера. Наследники добавляют свои поля. */
export interface JobRecord<R extends JobResult> {
  result: R;
  directory: string;
  /** Цепочка записей на диск: порядок записей сохраняется. */
  persistence: Promise<void>;
  child?: ChildProcess;
  timer?: NodeJS.Timeout;
}

export interface JobManagerOptions {
  /** Сколько заданий может ждать в очереди. */
  capacity: number;
  /** Имя исполнителя для `YOSIS_<ИМЯ>_CONCURRENCY`. */
  executor: 'build' | 'simulation' | 'physical';
  timeoutMs: number;
}

/**
 * Жизненный цикл задания, одинаковый для синтеза, симуляции и размещения: запись в памяти и в
 * папке `<корень>/<uuid>/`, очередь с ёмкостью и таймаутом, журнал с лимитом, отмена, остановка
 * процессов, хранение по политике `JobRetention`. Наследники описывают только то, что запускать.
 *
 * Остановка записи бывает разной (`child` с таймером или `AbortController`), поэтому она
 * абстрактна: `stop(record)`.
 */
export abstract class JobManager<R extends JobResult, Rec extends JobRecord<R>> {
  protected records = new Map<string, Rec>();
  protected scheduler: JobQueue<Rec>;
  protected retention: JobRetention;
  /** «Сборка не найдена.» и подобное: текст ошибки 404 для неизвестного идентификатора. */
  protected abstract readonly notFound: string;
  /** Как сообщается о переполнении журнала: стадия и текст ошибки. */
  protected abstract readonly logOverflow: { stage: string; error: string };
  /** Стадия задания, которое не удалось сохранить на диск. */
  protected abstract readonly persistenceStage: string;
  /** Стадия записи, завершённой остановкой сервиса. */
  protected abstract readonly shutdownStage: string;
  /** Поля результата, которые не попадают в `metadata.json` (журнал и тяжёлые артефакты). */
  protected abstract readonly transientFields: readonly string[];
  /** Журнал дописывается в `logs.txt` по мере появления (иначе его пишет наследник). */
  protected readonly appendsLogFile: boolean = true;

  protected readonly timeoutMs: number;

  constructor(
    public root: string,
    options: JobManagerOptions,
  ) {
    this.root = path.resolve(root);
    this.timeoutMs = options.timeoutMs;
    this.scheduler = new JobQueue<Rec>({
      capacity: options.capacity,
      concurrency: executorCount(options.executor),
      timeoutMs: options.timeoutMs,
      start: (record) => this.start(record),
      timeout: (record) => this.onTimeout(record),
    });
    this.retention = new JobRetention(
      this.root,
      () =>
        new Set(
          [...this.records]
            .filter(([, record]) => this.scheduler.isActive(record))
            .map(([id]) => id),
        ),
      (id) => this.records.delete(id),
    );
  }

  /** Запустить выполнение записи, вышедшей из очереди. */
  protected abstract start(record: Rec): void;
  /** Остановить процессы и ожидания записи (ошибка, отмена, остановка сервиса). */
  protected abstract stop(record: Rec): Promise<void>;
  /** Очередь сочла задание слишком долгим. */
  protected abstract onTimeout(record: Rec): void;
  /** Считать с диска результат, прерванный перезапуском сервиса, и пометить его ошибкой. */
  protected abstract interrupt(result: R): void;
  /** Подгрузить тяжёлые артефакты (нетлисты, VCD, размещение) к результату с диска. */
  protected abstract attachStored(result: R, directory: string): Promise<void>;
  /** Отмена пользователем: наследник выбирает стадию и, если нужно, пишет в журнал. */
  protected abstract cancelRecord(record: Rec): Promise<void>;

  prune() {
    return this.retention.sweep();
  }

  async status(id: string, logOffset = 0) {
    const record = this.records.get(id);
    return record
      ? incrementalStatus(record.result, logOffset)
      : storedStatus(this.root, id, logOffset);
  }

  protected validateId(id: string) {
    if (!JOB_ID.test(id)) throw new RequestError(this.notFound, 404);
  }

  async get(id: string): Promise<R> {
    this.validateId(id);
    const record = this.records.get(id);
    if (record) return record.result;
    const directory = path.join(this.root, id);
    try {
      const result = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8')) as R;
      result.logs = await readFile(path.join(directory, 'logs.txt'), 'utf8');
      if (!TERMINAL.has(result.status)) this.interrupt(result);
      await this.attachStored(result, directory);
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError(this.notFound, 404);
      throw error;
    }
  }

  async cancel(id: string): Promise<R> {
    this.validateId(id);
    const record = this.records.get(id);
    if (!record) return this.get(id);
    if (!TERMINAL.has(record.result.status)) await this.cancelRecord(record);
    return record.result;
  }

  async close(): Promise<void> {
    this.scheduler.stop();
    await this.releaseTools();
    await Promise.allSettled(
      [...this.records.values()]
        .filter((record) => !TERMINAL.has(record.result.status))
        .map((record) => this.shutdown(record)),
    );
    await Promise.allSettled([...this.records.values()].map((record) => record.persistence));
  }
  /** Освободить общие процессы менеджера (проба, прогретый воркер) до остановки заданий. */
  protected async releaseTools(): Promise<void> {}
  protected shutdown(record: Rec): Promise<void> {
    return this.finish(record, 'cancelled', this.shutdownStage);
  }

  /** Папка нового задания: `sources/` с файлами проекта, метка владельца и дополнительные файлы. */
  protected async prepareDirectory(
    files: readonly SourceFile[],
    extra: Record<string, string> = {},
  ): Promise<{ id: string; directory: string }> {
    const id = randomUUID();
    const directory = path.join(this.root, id);
    await mkdir(path.join(directory, 'sources'), { recursive: true });
    await markJob(directory, id);
    for (const file of files) {
      const filename = path.join(directory, 'sources', ...file.name.split('/'));
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, file.content, 'utf8');
    }
    for (const [name, content] of Object.entries(extra))
      await writeFile(path.join(directory, name), content, 'utf8');
    return { id, directory };
  }

  /** Регистрирует запись, сохраняет её и ставит в очередь; возвращает копию результата. */
  protected async enqueue(record: Rec): Promise<R> {
    this.records.set(record.result.id, record);
    await this.save(record);
    const snapshot = structuredClone(record.result);
    this.scheduler.enqueue(record);
    this.trimMemory();
    return snapshot;
  }

  /**
   * Запускает внешний инструмент в папке задания: вывод идёт в журнал, лимиты процессора и
   * памяти задаются на Linux, успех — код 0. `failure` описывает неудачный код возврата.
   */
  protected runTool(
    record: Rec,
    executable: string,
    args: string[],
    options: {
      env: NodeJS.ProcessEnv;
      addressSpaceMb?: number;
      failure: (tool: string, code: number | null) => string;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = toolCommand(executable, args, this.timeoutMs / 1000, options.addressSpaceMb);
      const child = spawn(command.executable, command.args, {
        cwd: record.directory,
        env: options.env,
        detached: process.platform === 'linux',
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      record.child = child;
      child.stdout?.on('data', (chunk) => this.appendLog(record, String(chunk)));
      child.stderr?.on('data', (chunk) => this.appendLog(record, String(chunk)));
      child.once('error', reject);
      child.once('close', (code) => {
        if (record.child === child) record.child = undefined;
        if (code === 0) resolve();
        else reject(new Error(options.failure(path.basename(executable), code)));
      });
    });
  }

  /** Путь к артефакту после завершения записи на диск; `allowed` — белый список имён. */
  protected async artifactPath(
    id: string,
    name: string,
    allowed: ReadonlySet<string>,
  ): Promise<string> {
    if (!JOB_ID.test(id) || !allowed.has(name)) throw new RequestError('Артефакт не найден.', 404);
    const record = this.records.get(id);
    if (record) await record.persistence;
    const filename = path.join(this.root, id, name);
    try {
      await stat(filename);
      return filename;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError('Артефакт пока не создан.', 404);
      throw error;
    }
  }

  /** Принимать ли строку журнала: по умолчанию не после завершения записи. */
  protected acceptsLog(record: Rec): boolean {
    return !TERMINAL.has(record.result.status);
  }
  protected appendLog(record: Rec, text: string) {
    if (!this.acceptsLog(record)) return;
    if (
      Buffer.byteLength(record.result.logs, 'utf8') + Buffer.byteLength(text, 'utf8') >
      MAX_LOG_BYTES
    ) {
      const { stage, error } = this.logOverflow;
      void this.finish(record, 'error', stage, error);
      return;
    }
    record.result.logs += text;
    this.onLog(record, text);
    if (this.appendsLogFile)
      this.persist(record, () => appendFile(path.join(record.directory, 'logs.txt'), text, 'utf8'));
  }
  /** Реакция на новую строку журнала (например, определение версии инструмента). */
  protected onLog(_record: Rec, _text: string) {}

  /** Дополнительные действия при завершении: диагностика, флаги отмены. */
  protected finalize(_record: Rec) {}
  /** Время начала для подсчёта `elapsedMs`. */
  protected startedAt(record: Rec) {
    return Date.parse(record.result.startedAt);
  }
  protected async finish(
    record: Rec,
    status: 'success' | 'error' | 'cancelled',
    stage: string,
    error?: string,
  ): Promise<void> {
    if (TERMINAL.has(record.result.status)) return;
    clearTimeout(record.timer);
    record.result.status = status;
    record.result.stage = stage;
    record.result.error = error;
    record.result.finishedAt = new Date().toISOString();
    record.result.elapsedMs = Date.now() - this.startedAt(record);
    this.finalize(record);
    await this.stop(record);
    await this.save(record);
    this.scheduler.complete(record);
    void this.retention.sweep();
    this.afterFinish(record);
  }
  protected afterFinish(_record: Rec) {}

  /** Содержимое `metadata.json`, снятое сразу: запись на диск выполняется позже, по очереди. */
  protected metadataJson(record: Rec): string {
    const metadata = Object.fromEntries(
      Object.entries(record.result).filter(([key]) => !this.transientFields.includes(key)),
    );
    return JSON.stringify(metadata, null, 2);
  }
  /** Снимок состояния записи и действие, которое запишет его на диск. */
  protected snapshotWriter(record: Rec): () => Promise<void> {
    const json = this.metadataJson(record);
    return () => atomicWrite(path.join(record.directory, 'metadata.json'), json);
  }
  protected save(record: Rec): Promise<void> {
    return this.persist(record, this.snapshotWriter(record));
  }
  protected persist(record: Rec, action: () => Promise<void>): Promise<void> {
    record.persistence = record.persistence
      .then(action)
      .catch((error: unknown) => this.persistenceFailed(record, error));
    return record.persistence;
  }
  /** Диск отказал: задание завершается ошибкой, процессы останавливаются. */
  protected persistenceFailed(record: Rec, error: unknown): void {
    console.error(`${this.persistenceStage}:`, error);
    if (!TERMINAL.has(record.result.status))
      void this.finish(
        record,
        'error',
        this.persistenceStage,
        error instanceof Error ? error.message : String(error),
      );
  }

  /** Держит в памяти не больше `MAX_MEMORY_RECORDS` записей: завершённые читаются с диска. */
  protected trimMemory(keep?: Rec) {
    if (this.records.size <= MAX_MEMORY_RECORDS) return;
    for (const [id, record] of this.records) {
      if (record !== keep && TERMINAL.has(record.result.status) && !this.scheduler.isActive(record))
        this.records.delete(id);
      if (this.records.size <= MAX_MEMORY_RECORDS) break;
    }
  }
}
