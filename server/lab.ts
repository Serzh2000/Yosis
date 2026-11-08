import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Diagnostic, Project } from '../shared/types';
import type { LabDesign } from '../shared/lab';
import type { YosysRequest, YosysWorkerMessage } from '../shared/worker-protocol';
import { cpus } from 'node:os';
import { JobCache, sourceKey } from './job-cache';
import { JobQueue, executorCount } from './job-queue';
import { SpareWorkers } from './spare-workers';
import { parseDiagnostics } from './validation';
import { materializeCircuitProject } from '../shared/schematic';

const runner = fileURLToPath(new URL('./yosys-runner.mjs', import.meta.url));
export interface LabResult {
  design?: LabDesign;
  diagnostics: Diagnostic[];
  error?: string;
}
interface LabRecord {
  user: string;
  project: Project;
  finished: boolean;
  /** The worker ended by itself, so the result is its own answer. */
  final?: boolean;
  logs: string;
  design?: LabDesign;
  child?: ChildProcess;
  resolve: (result: LabResult) => void;
}

function forkWorker(): ChildProcess {
  return fork(runner, [], {
    execArgv: ['--max-old-space-size=2048'],
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

/** Turns a project into plain gates and flip-flops for the laboratory's in-browser simulator. */
export class LabManager {
  private users = new Map<string, LabRecord>();
  private concurrency = executorCount(
    'lab',
    Math.min(4, Math.max(1, Math.floor(cpus().length / 3))),
  );
  private cache = new JobCache<LabResult>();
  private spares = new SpareWorkers(
    () => forkWorker(),
    (child) => child.send({ warm: true } satisfies YosysRequest),
    this.concurrency,
  );
  private queue = new JobQueue<LabRecord>({
    capacity: 64,
    concurrency: this.concurrency,
    timeoutMs: 60000,
    start: (record) => this.run(record),
    timeout: (record) =>
      this.finish(
        record,
        'Схема слишком велика для лаборатории: её подготовка заняла больше минуты. Так бывает с процессорами и большой памятью — проверяйте такой проект синтезом и на плате.',
      ),
  });
  /** Keep warm Yosys workers ready. The server calls this once; tests and tools do not. */
  prewarm() {
    this.spares.enable();
  }
  /**
   * Set by the server: what a source check already found out about these sources. Text that
   * does not read cannot become a design, so the check's errors are the laboratory's too.
   */
  knownCheck?: (project: Project) => { diagnostics: Diagnostic[]; error?: string } | undefined;
  compile(user: string, project: Project, signal: AbortSignal) {
    const failed = this.knownCheck?.(project);
    if (failed?.error) return Promise.resolve<LabResult>(failed);
    project = materializeCircuitProject(project);
    const previous = this.users.get(user);
    if (previous) this.finish(previous, 'Подготовка заменена новым запросом.');
    // The same sources are prepared once, however many people send them.
    return this.cache.get(sourceKey(project), () => this.submit(user, project, signal));
  }
  private async submit(user: string, project: Project, signal: AbortSignal) {
    const release = this.queue.reserve();
    try {
      let record!: LabRecord;
      const result = new Promise<LabResult>((resolve) => {
        record = { user, project, finished: false, logs: '', resolve };
        this.users.set(user, record);
        signal.addEventListener('abort', () => this.finish(record, 'Подготовка отменена.'), {
          once: true,
        });
        this.queue.enqueue(record);
        if (signal.aborted) this.finish(record, 'Подготовка отменена.');
      });
      const answer = await result;
      return { result: answer, final: record.final === true };
    } finally {
      release();
    }
  }
  close() {
    this.spares.stop();
    this.queue.stop();
    for (const record of this.users.values()) this.finish(record, 'Сервис завершает работу.');
  }
  private run(record: LabRecord) {
    if (record.finished) {
      this.queue.complete(record);
      return;
    }
    let child: ChildProcess;
    try {
      child = this.spares.take() ?? forkWorker();
    } catch (error) {
      this.finish(record, error instanceof Error ? error.message : String(error));
      return;
    }
    record.child = child;
    let success = false,
      error: string | undefined;
    const log = (text: string) => {
      if (record.finished) return;
      if (Buffer.byteLength(record.logs) + Buffer.byteLength(text) > 1024 * 1024) {
        this.finish(record, 'Журнал подготовки превышает 1 МБ.');
        return;
      }
      record.logs += text;
    };
    const onMessage = (value: YosysWorkerMessage) => {
      if (value.type === 'log') log(value.text ?? '');
      else if (value.type === 'lab') record.design = value.design;
      else if (value.type === 'success') success = true;
      else if (value.type === 'failure') error = value.error;
      else if (value.type === 'idle') done(0, true);
    };
    child.on('message', onMessage);
    const onData = (data: Buffer) => log(String(data));
    const onError = (cause: Error) => this.finish(record, cause.message);
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('error', onError);
    // The job is over: the worker ended, or says it is idle and stays for the next job.
    const done = (code: number | null, reusable: boolean) => {
      child.off('message', onMessage);
      child.off('error', onError);
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      record.child = undefined;
      record.final = !record.finished;
      this.finish(
        record,
        code === 0 && success && record.design
          ? undefined
          : (error ?? 'Не удалось подготовить схему для лаборатории.'),
      );
      this.queue.complete(record);
      if (reusable && !this.spares.give(child)) child.kill();
    };
    child.once('close', (code) => done(code, false));
    child.send(
      { project: record.project, lab: true, reuse: true } satisfies YosysRequest,
      (cause) => {
        if (cause) this.finish(record, cause.message);
      },
    );
  }
  private finish(record: LabRecord, error?: string) {
    if (record.finished) return;
    record.finished = true;
    if (this.users.get(record.user) === record) this.users.delete(record.user);
    const diagnostics = parseDiagnostics(record.logs);
    if (error && !diagnostics.some((item) => item.severity === 'error'))
      diagnostics.push({ severity: 'error', message: error });
    record.resolve({
      ...(error ? { error } : { design: record.design }),
      diagnostics,
    });
    if (record.child && record.child.exitCode === null && record.child.signalCode === null)
      record.child.kill();
    else this.queue.complete(record);
  }
}
