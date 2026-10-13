import { fork, type ChildProcess } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuildResult, Project, ToolchainStatus } from '../shared/types';
import type { YosysRequest, YosysWorkerMessage } from '../shared/worker-protocol';
import { materializeCircuitProject } from '../shared/schematic';
import { JobManager, type JobRecord } from './job-manager';
import { TERMINAL } from './job-constants';
import { parseDiagnostics, projectHash, RequestError } from './validation';

const RUNNER = fileURLToPath(new URL('./yosys-runner.mjs', import.meta.url));
const ARTIFACTS = new Set(['rtl.json', 'technology.json', 'logs.txt']);

interface BuildRecord extends JobRecord<BuildResult> {
  project: Project;
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

/** Воркер Yosys в дочернем процессе: общий вид запуска для проб, прогрева и сборок. */
function forkRunner(): ChildProcess {
  return fork(RUNNER, [], {
    execArgv: ['--max-old-space-size=2048'],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });
}

export class BuildManager extends JobManager<BuildResult, BuildRecord> {
  protected readonly notFound = 'Сборка не найдена.';
  protected readonly logOverflow = {
    stage: 'Журнал слишком велик',
    error: 'Журнал синтеза превышает 4 МБ.',
  };
  protected readonly shutdownStage = 'Сервис завершён';
  protected readonly persistenceStage = 'Ошибка сохранения сборки';
  protected readonly transientFields = ['rtl', 'technology', 'logs'];
  private probeChild?: ChildProcess;
  private probePromise: Promise<ToolchainStatus> | undefined;
  /** A worker that has already loaded and exercised Yosys; the next job takes it. */
  private spare?: ChildProcess;
  private spareReady = false;
  private prewarmEnabled = false;

  constructor(root: string, timeoutMs = 120_000) {
    super(root, { capacity: 8, executor: 'build', timeoutMs });
  }

  health(): Promise<ToolchainStatus> {
    return (this.probePromise ??= new Promise((resolve) => {
      let logs = '';
      let resolved = false;
      let succeeded = false;
      let child: ChildProcess;
      try {
        child = forkRunner();
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
        const message = value as YosysWorkerMessage;
        if (message.type === 'log') logs += message.text ?? '';
        else if (message.type === 'probe-success') succeeded = true;
        else if (message.type === 'failure') done(false);
      });
      child.on('error', () => done(false));
      child.on('close', (code) => done(code === 0 && succeeded));
      child.stderr?.on('data', (chunk) => {
        logs += String(chunk);
      });
      child.send({ probe: true } satisfies YosysRequest, (error) => {
        if (error) done(false);
      });
    }));
  }

  async create(project: Project): Promise<BuildResult> {
    const sourceHash = projectHash(project);
    project = materializeCircuitProject(project);
    const release = this.scheduler.reserve();
    try {
      const { id, directory } = await this.prepareDirectory(project.files, {
        'project.json': JSON.stringify(project, null, 2),
        'logs.txt': '',
      });
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
      return await this.enqueue({ project, result, directory, persistence: Promise.resolve() });
    } finally {
      release();
    }
  }

  async artifact(id: string, name: string): Promise<string> {
    return this.artifactPath(id, name, ARTIFACTS);
  }

  protected interrupt(result: BuildResult) {
    result.status = 'error';
    result.stage = 'Сборка прервана перезапуском сервиса';
    result.error = result.stage;
    result.finishedAt = new Date().toISOString();
    result.diagnostics.push({ severity: 'error', message: result.stage });
  }
  protected async attachStored(result: BuildResult, directory: string) {
    for (const name of ['rtl', 'technology'] as const) {
      try {
        result[name] = JSON.parse(await readFile(path.join(directory, `${name}.json`), 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  protected async cancelRecord(record: BuildRecord) {
    this.appendLog(record, '\nСборка отменена пользователем.\n');
    await this.finish(record, 'cancelled', 'Сборка отменена');
  }
  protected shutdown(record: BuildRecord) {
    this.appendLog(record, '\nСервис сборки завершает работу.\n');
    return super.shutdown(record);
  }
  protected onTimeout(record: BuildRecord) {
    this.appendLog(record, `\nERROR: Время сборки превысило ${this.timeoutMs / 1000} секунд.\n`);
    void this.finish(
      record,
      'error',
      'Истекло время сборки',
      'Время сборки превышено. Уменьшите размер проекта.',
    );
  }
  protected async stop(record: BuildRecord) {
    if (record.child && !record.child.killed) record.child.kill();
  }
  protected finalize(record: BuildRecord) {
    const { result } = record;
    result.diagnostics = parseDiagnostics(result.logs);
    if (result.status === 'error' && !result.diagnostics.some((item) => item.severity === 'error'))
      result.diagnostics.push({ severity: 'error', message: result.error ?? result.stage });
  }
  protected startedAt(record: BuildRecord) {
    return record.elapsedStart ?? super.startedAt(record);
  }
  /** Вывод воркера принимается и после завершения: оно может прийти вместе с закрытием потоков. */
  protected acceptsLog() {
    return true;
  }
  protected onLog(record: BuildRecord) {
    const version = record.result.logs.match(/Yosys[^\r\n]*/)?.[0];
    if (version) record.result.toolVersion = version;
  }

  /** Keep a warm Yosys worker ready. The server calls this once; tests and tools do not. */
  prewarm() {
    this.prewarmEnabled = true;
    this.prepareSpare();
  }

  private prepareSpare() {
    if (!this.prewarmEnabled || this.spare) return;
    let child: ChildProcess;
    try {
      child = forkRunner();
    } catch {
      return;
    }
    this.spare = child;
    this.spareReady = false;
    const drop = () => {
      if (this.spare === child) this.spare = undefined;
    };
    child.once('error', drop);
    child.once('exit', drop);
    child.once('message', (value) => {
      if (this.spare === child && (value as YosysWorkerMessage).type === 'warm')
        this.spareReady = true;
    });
    child.send({ warm: true } satisfies YosysRequest, (error) => {
      if (error) {
        drop();
        child.kill();
      }
    });
  }

  private takeSpare(): ChildProcess | undefined {
    const child = this.spare;
    // A worker that is still warming up would make the job wait for it: start a fresh one
    // instead and keep the spare for the next job.
    if (!child || !this.spareReady) return undefined;
    this.spare = undefined;
    child.removeAllListeners('error');
    child.removeAllListeners('exit');
    child.removeAllListeners('message');
    return child.connected && child.exitCode === null ? child : undefined;
  }

  protected async releaseTools() {
    this.prewarmEnabled = false;
    this.spare?.kill();
    this.spare = undefined;
    this.probeChild?.kill();
  }

  protected start(record: BuildRecord) {
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
      child = this.takeSpare() ?? forkRunner();
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
      const message = value as YosysWorkerMessage;
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
      // The job is over and the CPU is free: get the next worker ready.
      this.prepareSpare();
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
    child.send({ project: record.project } satisfies YosysRequest, (error) => {
      if (error) void this.finish(record, 'error', 'Ошибка связи с Yosys', error.message);
    });
  }
}
