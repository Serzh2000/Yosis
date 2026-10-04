import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Project, Diagnostic } from '../shared/types';
import { JobQueue } from './job-queue';
import { parseDiagnostics } from './validation';
import { materializeCircuitProject } from '../shared/schematic';

const runner = fileURLToPath(new URL('./syntax-runner.mjs', import.meta.url));
interface SyntaxRecord {
  user: string;
  project: Project;
  signal: AbortSignal;
  finished: boolean;
  logs: string;
  child?: ChildProcess;
  resolve: (result: { diagnostics: Diagnostic[]; error?: string }) => void;
}
export class SyntaxManager {
  private users = new Map<string, SyntaxRecord>();
  private queue = new JobQueue<SyntaxRecord>({
    capacity: 16,
    concurrency: 1,
    timeoutMs: 20000,
    start: (record) => this.run(record),
    timeout: (record) => this.finish(record, 'Проверка превысила 20 секунд.'),
  });
  check(user: string, project: Project, signal: AbortSignal) {
    project = materializeCircuitProject(project);
    const release = this.queue.reserve();
    try {
      const previous = this.users.get(user);
      if (previous) this.finish(previous, 'Проверка заменена новым изменением.');
      return new Promise<{ diagnostics: Diagnostic[]; error?: string }>((resolve) => {
        const record: SyntaxRecord = { user, project, signal, finished: false, logs: '', resolve };
        this.users.set(user, record);
        signal.addEventListener('abort', () => this.finish(record, 'Проверка отменена.'), {
          once: true,
        });
        this.queue.enqueue(record);
        if (signal.aborted) this.finish(record, 'Проверка отменена.');
      });
    } finally {
      release();
    }
  }
  close() {
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
      child = fork(runner, [], {
        execArgv: ['--max-old-space-size=1024'],
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
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
    child.on('message', (value: { type: string; text?: string; error?: string }) => {
      if (value.type === 'log') log(value.text ?? '');
      else if (value.type === 'success') success = true;
      else if (value.type === 'failure') error = value.error;
    });
    child.stdout?.on('data', (data) => log(String(data)));
    child.stderr?.on('data', (data) => log(String(data)));
    child.once('error', (cause) => this.finish(record, cause.message));
    child.once('close', (code) => {
      record.child = undefined;
      this.finish(
        record,
        code === 0 && success ? undefined : (error ?? 'Не удалось проверить Verilog.'),
      );
      this.queue.complete(record);
    });
    child.send({ project: record.project }, (cause) => {
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
