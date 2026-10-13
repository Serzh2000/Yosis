import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Diagnostic, Project } from '../shared/types';
import type { LabDesign } from '../shared/lab';
import type { YosysRequest, YosysWorkerMessage } from '../shared/worker-protocol';
import { JobQueue } from './job-queue';
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
  logs: string;
  design?: LabDesign;
  child?: ChildProcess;
  resolve: (result: LabResult) => void;
}

/** Turns a project into plain gates and flip-flops for the laboratory's in-browser simulator. */
export class LabManager {
  private users = new Map<string, LabRecord>();
  private queue = new JobQueue<LabRecord>({
    capacity: 16,
    concurrency: 1,
    timeoutMs: 60000,
    start: (record) => this.run(record),
    timeout: (record) =>
      this.finish(
        record,
        'Схема слишком велика для лаборатории: её подготовка заняла больше минуты. Так бывает с процессорами и большой памятью — проверяйте такой проект синтезом и на плате.',
      ),
  });
  compile(user: string, project: Project, signal: AbortSignal) {
    project = materializeCircuitProject(project);
    const release = this.queue.reserve();
    try {
      const previous = this.users.get(user);
      if (previous) this.finish(previous, 'Подготовка заменена новым запросом.');
      return new Promise<LabResult>((resolve) => {
        const record: LabRecord = { user, project, finished: false, logs: '', resolve };
        this.users.set(user, record);
        signal.addEventListener('abort', () => this.finish(record, 'Подготовка отменена.'), {
          once: true,
        });
        this.queue.enqueue(record);
        if (signal.aborted) this.finish(record, 'Подготовка отменена.');
      });
    } finally {
      release();
    }
  }
  close() {
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
      child = fork(runner, [], {
        execArgv: ['--max-old-space-size=2048'],
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
        this.finish(record, 'Журнал подготовки превышает 1 МБ.');
        return;
      }
      record.logs += text;
    };
    child.on('message', (value: YosysWorkerMessage) => {
      if (value.type === 'log') log(value.text ?? '');
      else if (value.type === 'lab') record.design = value.design;
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
        code === 0 && success && record.design
          ? undefined
          : (error ?? 'Не удалось подготовить схему для лаборатории.'),
      );
      this.queue.complete(record);
    });
    child.send({ project: record.project, lab: true } satisfies YosysRequest, (cause) => {
      if (cause) this.finish(record, cause.message);
    });
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
