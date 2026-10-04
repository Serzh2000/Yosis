import { atomicWrite } from './atomic-write';
import { incrementalStatus, storedStatus } from './job-status';
import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuildResult, Project, ToolchainStatus, YosysNetlist } from '../shared/types';
import { parseDiagnostics, projectHash, RequestError } from './validation';
import { JobQueue, executorCount } from './job-queue';
import { JobRetention, markJob } from './job-retention';
import { materializeCircuitProject } from '../shared/schematic';

const RUNNER = fileURLToPath(new URL('./yosys-runner.mjs', import.meta.url));
const BUILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TERMINAL = new Set(['success', 'error', 'cancelled']);
const ARTIFACTS = new Set(['rtl.json', 'technology.json', 'logs.txt']);
const MAX_LOG_BYTES = 4 * 1024 * 1024;

interface WorkerMessage {
  type: 'log' | 'stage' | 'netlist' | 'success' | 'failure' | 'probe-success';
  text?: string;
  stage?: string;
  name?: 'rtl' | 'technology';
  netlist?: YosysNetlist;
  error?: string;
}
interface Record {
  result: BuildResult;
  project: Project;
  directory: string;
  persistence: Promise<void>;
  child?: ChildProcess;
  timer?: NodeJS.Timeout;
  elapsedStart?: number;
}

export function toolchainStatus(available: boolean, version?: string): ToolchainStatus {
  return {
    yosys: { available, engine: 'YoWASP · WebAssembly', version },
    board: { name: 'Tang Nano 20K', device: 'GW2AR-LV18QN88C8/I7', family: 'GW2A-18C' },
    capabilities: {
      synthesis: available,
      simulation: false,
      placeAndRoute: false,
      bitstream: false,
      programming: false,
    },
  };
}

export class BuildManager {
  private records = new Map<string, Record>();
  private scheduler: JobQueue<Record>;
  private retention: JobRetention;
  private probeChild?: ChildProcess;
  private probePromise: Promise<ToolchainStatus> | undefined;

  constructor(
    public root: string,
    private timeoutMs = 120_000,
  ) {
    this.root = path.resolve(root);
    this.scheduler = new JobQueue({
      capacity: 8,
      concurrency: executorCount('build'),
      timeoutMs,
      start: (record) => this.start(record),
      timeout: (record) => {
        this.appendLog(
          record,
          `\nERROR: Время сборки превысило ${this.timeoutMs / 1000} секунд.\n`,
        );
        void this.finish(
          record,
          'error',
          'Истекло время сборки',
          'Время сборки превышено. Уменьшите размер проекта.',
        );
      },
    });
    this.retention = new JobRetention(
      this.root,
      () =>
        new Set([...this.records].filter(([, r]) => this.scheduler.isActive(r)).map(([id]) => id)),
      (id) => this.records.delete(id),
    );
  }
  prune() {
    return this.retention.sweep();
  }

  health(): Promise<ToolchainStatus> {
    return (this.probePromise ??= new Promise((resolve) => {
      let logs = '';
      let resolved = false;
      let succeeded = false;
      let child: ChildProcess;
      try {
        child = fork(RUNNER, [], {
          execArgv: ['--max-old-space-size=2048'],
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          windowsHide: true,
        });
      } catch {
        resolve(toolchainStatus(false));
        return;
      }
      this.probeChild = child;
      const done = (available: boolean) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (!child.killed && !available) child.kill();
        const version = logs.match(/Yosys[^\r\n]*/)?.[0];
        resolve(toolchainStatus(available, version));
        if (this.probeChild === child) this.probeChild = undefined;
        if (!available)
          setTimeout(() => {
            this.probePromise = undefined;
          }, 10_000).unref();
      };
      const timer = setTimeout(() => done(false), 45_000);
      child.on('message', (value) => {
        const message = value as WorkerMessage;
        if (message.type === 'log') logs += message.text ?? '';
        else if (message.type === 'probe-success') succeeded = true;
        else if (message.type === 'failure') done(false);
      });
      child.on('error', () => done(false));
      child.on('close', (code) => done(code === 0 && succeeded));
      child.stderr?.on('data', (chunk) => {
        logs += String(chunk);
      });
      child.send({ probe: true }, (error) => {
        if (error) done(false);
      });
    }));
  }

  async create(project: Project): Promise<BuildResult> {
    const sourceHash = projectHash(project);
    project = materializeCircuitProject(project);
    const release = this.scheduler.reserve();
    try {
      const id = randomUUID();
      const directory = path.join(this.root, id);
      await mkdir(path.join(directory, 'sources'), { recursive: true });
      await markJob(directory, id);
      for (const file of project.files) {
        const filename = path.join(directory, 'sources', ...file.name.split('/'));
        await mkdir(path.dirname(filename), { recursive: true });
        await writeFile(filename, file.content, 'utf8');
      }
      await writeFile(
        path.join(directory, 'project.json'),
        JSON.stringify(project, null, 2),
        'utf8',
      );
      await writeFile(path.join(directory, 'logs.txt'), '', 'utf8');
      if (this.scheduler.stopping) throw new RequestError('Сервис завершает работу.', 503);
      const result: BuildResult = {
        id,
        status: 'queued',
        stage: 'В очереди',
        startedAt: new Date().toISOString(),
        logs: '',
        diagnostics: [],
        top: project.top,
        projectHash: sourceHash,
      };
      const record: Record = { project, result, directory, persistence: Promise.resolve() };
      this.records.set(id, record);
      await this.save(record);
      this.scheduler.enqueue(record);
      const queued = structuredClone(result);
      this.trimMemory();
      return queued;
    } finally {
      release();
    }
  }

  async status(id: string, logOffset = 0) {
    const record = this.records.get(id);
    return record
      ? incrementalStatus(record.result, logOffset)
      : storedStatus(this.root, id, logOffset);
  }

  async get(id: string): Promise<BuildResult> {
    if (!BUILD_ID.test(id)) throw new RequestError('Сборка не найдена.', 404);
    const record = this.records.get(id);
    if (record) return record.result;
    try {
      const directory = path.join(this.root, id);
      const result = JSON.parse(
        await readFile(path.join(directory, 'metadata.json'), 'utf8'),
      ) as BuildResult;
      result.logs = await readFile(path.join(directory, 'logs.txt'), 'utf8');
      if (!TERMINAL.has(result.status)) {
        result.status = 'error';
        result.stage = 'Сборка прервана перезапуском сервиса';
        result.error = result.stage;
        result.finishedAt = new Date().toISOString();
        result.diagnostics.push({ severity: 'error', message: result.stage });
      }
      for (const name of ['rtl', 'technology'] as const) {
        try {
          result[name] = JSON.parse(await readFile(path.join(directory, `${name}.json`), 'utf8'));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError('Сборка не найдена.', 404);
      throw error;
    }
  }

  async cancel(id: string): Promise<BuildResult> {
    if (!BUILD_ID.test(id)) throw new RequestError('Сборка не найдена.', 404);
    const record = this.records.get(id);
    if (!record) return this.get(id);
    if (!TERMINAL.has(record.result.status)) {
      this.appendLog(record, '\nСборка отменена пользователем.\n');
      await this.finish(record, 'cancelled', 'Сборка отменена');
    }
    return record.result;
  }

  async artifact(id: string, name: string): Promise<string> {
    if (!BUILD_ID.test(id) || !ARTIFACTS.has(name))
      throw new RequestError('Артефакт не найден.', 404);
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

  async close(): Promise<void> {
    this.scheduler.stop();
    this.probeChild?.kill();
    await Promise.all(
      [...this.records.values()]
        .filter((record) => !TERMINAL.has(record.result.status))
        .map(async (record) => {
          this.appendLog(record, '\nСервис сборки завершает работу.\n');
          await this.finish(record, 'cancelled', 'Сервис завершён');
        }),
    );
    await Promise.all([...this.records.values()].map((record) => record.persistence));
  }

  private start(record: Record) {
    if (TERMINAL.has(record.result.status)) {
      this.scheduler.complete(record);
      return;
    }
    record.elapsedStart = Date.now();
    record.result.status = 'running';
    record.result.stage = 'Запуск Yosys';
    record.result.startedAt = new Date().toISOString();
    void this.save(record);
    let child: ChildProcess;
    try {
      child = fork(RUNNER, [], {
        execArgv: ['--max-old-space-size=2048'],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
      });
    } catch (error) {
      void this.finish(
        record,
        'error',
        'Ошибка запуска Yosys',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
    record.child = child;
    let succeeded = false;
    child.on('message', (value) => {
      if (TERMINAL.has(record.result.status)) return;
      const message = value as WorkerMessage;
      if (message.type === 'log') this.appendLog(record, message.text ?? '');
      else if (message.type === 'stage') {
        record.result.stage = message.stage ?? record.result.stage;
        void this.save(record);
      } else if (message.type === 'netlist' && message.name && message.netlist) {
        record.result[message.name] = message.netlist;
        const json = JSON.stringify(message.netlist, null, 2);
        this.persist(record, () =>
          writeFile(path.join(record.directory, `${message.name}.json`), json, 'utf8'),
        );
      } else if (message.type === 'success') succeeded = true;
      else if (message.type === 'failure')
        void this.finish(record, 'error', 'Ошибка синтеза', message.error ?? 'Ошибка Yosys.');
    });
    child.stdout?.on('data', (chunk) => this.appendLog(record, String(chunk)));
    child.stderr?.on('data', (chunk) => this.appendLog(record, String(chunk)));
    child.on(
      'error',
      (error) => void this.finish(record, 'error', 'Ошибка запуска', error.message),
    );
    // exit can precede delivery of pending IPC/stdout data. close is emitted
    // after those channels drain; only then can a complete result be accepted.
    child.on('close', (code, signal) => {
      if (record.child === child) record.child = undefined;
      if (TERMINAL.has(record.result.status)) return;
      if (code === 0 && succeeded && record.result.rtl && record.result.technology)
        void this.finish(record, 'success', 'Синтез завершён');
      else
        void this.finish(
          record,
          'error',
          'Процесс Yosys завершился',
          `Yosys завершился без полного результата (код ${code ?? signal}).`,
        );
    });
    child.send({ project: record.project }, (error) => {
      if (error) void this.finish(record, 'error', 'Ошибка связи с Yosys', error.message);
    });
  }

  private appendLog(record: Record, text: string) {
    if (
      Buffer.byteLength(record.result.logs, 'utf8') + Buffer.byteLength(text, 'utf8') >
      MAX_LOG_BYTES
    ) {
      void this.finish(record, 'error', 'Журнал слишком велик', 'Журнал синтеза превышает 4 МБ.');
      return;
    }
    record.result.logs += text;
    const version = record.result.logs.match(/Yosys[^\r\n]*/)?.[0];
    if (version) record.result.toolVersion = version;
    this.persist(record, () => appendFile(path.join(record.directory, 'logs.txt'), text, 'utf8'));
  }

  private async finish(
    record: Record,
    status: 'success' | 'error' | 'cancelled',
    stage: string,
    error?: string,
  ) {
    if (TERMINAL.has(record.result.status)) return;
    clearTimeout(record.timer);
    record.result.status = status;
    record.result.stage = stage;
    record.result.error = error;
    record.result.finishedAt = new Date().toISOString();
    record.result.elapsedMs =
      Date.now() - (record.elapsedStart ?? Date.parse(record.result.startedAt));
    record.result.diagnostics = parseDiagnostics(record.result.logs);
    if (status === 'error' && !record.result.diagnostics.some((item) => item.severity === 'error'))
      record.result.diagnostics.push({ severity: 'error', message: error ?? stage });
    if (record.child && !record.child.killed) record.child.kill();
    await this.save(record);
    this.scheduler.complete(record);
    void this.retention.sweep();
  }

  private save(record: Record): Promise<void> {
    const { rtl: _rtl, technology: _technology, logs: _logs, ...metadata } = record.result;
    const json = JSON.stringify(metadata, null, 2);
    return this.persist(record, async () => {
      await atomicWrite(path.join(record.directory, 'metadata.json'), json);
    });
  }

  private persist(record: Record, action: () => Promise<void>): Promise<void> {
    record.persistence = record.persistence.then(action).catch((error: unknown) => {
      record.child?.kill();
      clearTimeout(record.timer);
      record.result.status = 'error';
      record.result.stage = 'Ошибка сохранения сборки';
      record.result.error = error instanceof Error ? error.message : String(error);
      record.result.finishedAt = new Date().toISOString();
      record.result.diagnostics.push({ severity: 'error', message: record.result.error });
      this.scheduler.complete(record);
      console.error('Build persistence failed:', record.result.error);
    });
    return record.persistence;
  }

  private trimMemory() {
    if (this.records.size <= 24) return;
    for (const [id, record] of this.records) {
      if (TERMINAL.has(record.result.status) && !this.scheduler.isActive(record))
        this.records.delete(id);
      if (this.records.size <= 24) break;
    }
  }
}
