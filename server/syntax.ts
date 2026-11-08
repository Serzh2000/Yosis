import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Project, Diagnostic } from '../shared/types';
import type { SyntaxRequest, SyntaxWorkerMessage } from '../shared/worker-protocol';
import { cpus } from 'node:os';
import { JobCache, sourceKey } from './job-cache';
import { JobQueue, executorCount } from './job-queue';
import { SpareWorkers } from './spare-workers';
import { parseDiagnostics } from './validation';
import { materializeCircuitProject } from '../shared/schematic';

const runner = fileURLToPath(new URL('./syntax-runner.mjs', import.meta.url));
interface SyntaxRecord {
  user: string;
  project: Project;
  signal: AbortSignal;
  finished: boolean;
  /** The worker ended by itself, so the result is its own answer. */
  final?: boolean;
  logs: string;
  child?: ChildProcess;
  resolve: (result: { diagnostics: Diagnostic[]; error?: string }) => void;
}
function forkWorker(): ChildProcess {
  return fork(runner, [], {
    execArgv: ['--max-old-space-size=1024'],
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}
export class SyntaxManager {
  private users = new Map<string, SyntaxRecord>();
  private concurrency = executorCount(
    'syntax',
    Math.min(4, Math.max(1, Math.floor(cpus().length / 3))),
  );
  private cache = new JobCache<{ diagnostics: Diagnostic[]; error?: string }>();
  private spares = new SpareWorkers(
    () => forkWorker(),
    (child) => child.send({ warm: true } satisfies SyntaxRequest),
    this.concurrency,
  );
  private queue = new JobQueue<SyntaxRecord>({
    capacity: 64,
    concurrency: this.concurrency,
    timeoutMs: 20000,
    start: (record) => this.run(record),
    timeout: (record) => this.finish(record, 'Проверка превысила 20 секунд.'),
  });
  /** Keep warm Yosys workers ready. The server calls this once; tests and tools do not. */
  prewarm() {
    this.spares.enable();
  }
  /** The answer already known for these sources, if any: the laboratory reuses a failure of it. */
  known(project: Project) {
    return this.cache.peek(sourceKey(materializeCircuitProject(project)));
  }
  check(user: string, project: Project, signal: AbortSignal) {
    project = materializeCircuitProject(project);
    const previous = this.users.get(user);
    if (previous) this.finish(previous, 'Проверка заменена новым изменением.');
    // The same sources are checked once, however many people send them.
    return this.cache.get(sourceKey(project), () => this.submit(user, project, signal));
  }
  private async submit(user: string, project: Project, signal: AbortSignal) {
    const release = this.queue.reserve();
    try {
      let record!: SyntaxRecord;
      const result = new Promise<{ diagnostics: Diagnostic[]; error?: string }>((resolve) => {
        record = { user, project, signal, finished: false, logs: '', resolve };
        this.users.set(user, record);
        signal.addEventListener('abort', () => this.finish(record, 'Проверка отменена.'), {
          once: true,
        });
        this.queue.enqueue(record);
        if (signal.aborted) this.finish(record, 'Проверка отменена.');
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
  private run(record: SyntaxRecord) {
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
        this.finish(record, 'Журнал проверки превышает 1 МБ.');
        return;
      }
      record.logs += text;
    };
    const onMessage = (value: SyntaxWorkerMessage) => {
      if (value.type === 'log') log(value.text ?? '');
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
        code === 0 && success ? undefined : (error ?? 'Не удалось проверить Verilog.'),
      );
      this.queue.complete(record);
      if (reusable && !this.spares.give(child)) child.kill();
    };
    child.once('close', (code) => done(code, false));
    child.send({ project: record.project, reuse: true } satisfies SyntaxRequest, (cause) => {
      if (cause) this.finish(record, cause.message);
    });
  }
  private finish(record: SyntaxRecord, error?: string) {
    if (record.finished) return;
    record.finished = true;
    if (this.users.get(record.user) === record) this.users.delete(record.user);
    const diagnostics = parseDiagnostics(record.logs);
    if (error && !diagnostics.some((item) => item.severity === 'error'))
      diagnostics.push({ severity: 'error', message: error });
    record.resolve({ diagnostics, ...(error ? { error } : {}) });
    if (record.child && record.child.exitCode === null && record.child.signalCode === null)
      record.child.kill();
    else this.queue.complete(record);
  }
}
