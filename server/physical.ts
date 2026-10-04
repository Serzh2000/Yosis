import { toolCommand, terminateLinuxGroup } from './process-limits';
import { atomicWrite } from './atomic-write';
import { incrementalStatus, storedStatus } from './job-status';
import { fork, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, YosysNetlist } from '../shared/types';
import type { PhysicalConfig, PhysicalResult, PhysicalToolStatus } from '../shared/physical';
import { BuildManager } from './builds';
import { RequestError, projectHash } from './validation';
import { JobQueue, executorCount } from './job-queue';
import { JobRetention, markJob } from './job-retention';
import { workspace } from './paths';

const RUNNER = fileURLToPath(new URL('./physical-yosys-runner.mjs', import.meta.url));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TERMINAL = new Set(['success', 'error', 'cancelled']);
const ARTIFACTS: Record<string, string> = {
  'placement.json': 'application/json',
  'timing.json': 'application/json',
  'design.fs': 'application/octet-stream',
  'logs.txt': 'text/plain; charset=utf-8',
};
interface Job {
  result: PhysicalResult;
  project: Project;
  technology: YosysNetlist;
  directory: string;
  child?: ChildProcess;
  timer?: NodeJS.Timeout;
  abort: AbortController;
  persistence: Promise<void>;
}

export function validatePhysicalConfig(value: unknown, project: Project): PhysicalConfig {
  if (!value || typeof value !== 'object')
    throw new RequestError('Укажите файл ограничений и частоту.');
  const config = value as Record<string, unknown>;
  if (
    typeof config.cstFile !== 'string' ||
    !/\.cst$/.test(config.cstFile) ||
    !project.files.some((file) => file.name === config.cstFile)
  )
    throw new RequestError('Выберите существующий .cst из проекта.');
  if (
    typeof config.frequencyMHz !== 'number' ||
    !Number.isFinite(config.frequencyMHz) ||
    config.frequencyMHz < 1 ||
    config.frequencyMHz > 500
  )
    throw new RequestError('Целевая частота должна быть от 1 до 500 МГц.');
  return { cstFile: config.cstFile, frequencyMHz: config.frequencyMHz };
}

export class PhysicalManager {
  private jobs = new Map<string, Job>();
  private scheduler: JobQueue<Job>;
  private retention: JobRetention;
  private probe?: Promise<PhysicalToolStatus>;
  private probeChild?: ChildProcess;
  private toolsDirectory = path.join(workspace, '.tools/gowin');
  private nextpnr =
    process.env.YOSIS_NEXTPNR ??
    path.join(
      this.toolsDirectory,
      process.platform === 'win32'
        ? 'Scripts/yowasp-nextpnr-himbaechel-gowin.exe'
        : 'bin/yowasp-nextpnr-himbaechel-gowin',
    );
  private packer =
    process.env.YOSIS_GOWIN_PACK ??
    path.join(
      this.toolsDirectory,
      process.platform === 'win32' ? 'Scripts/gowin_pack.exe' : 'bin/gowin_pack',
    );

  constructor(
    public root: string,
    private builds: BuildManager,
    private timeoutMs = 240000,
  ) {
    this.root = path.resolve(root);
    this.scheduler = new JobQueue({
      capacity: 4,
      concurrency: executorCount('physical'),
      timeoutMs,
      start: (job) => {
        void this.perform(job);
      },
      timeout: (job) => {
        void this.finish(job, 'error', 'Размещение превысило лимит времени.');
      },
    });
    this.retention = new JobRetention(
      this.root,
      () => new Set([...this.jobs].filter(([, r]) => this.scheduler.isActive(r)).map(([id]) => id)),
      (id) => this.jobs.delete(id),
    );
  }
  prune() {
    return this.retention.sweep();
  }

  health(): Promise<PhysicalToolStatus> {
    return (this.probe ??= (async () => {
      const result: PhysicalToolStatus = {
        available: false,
        engine: 'YoWASP nextpnr · himbaechel/gowin',
        bitstreamAvailable: false,
      };
      try {
        await access(this.nextpnr);
        let logs = '';
        await new Promise<void>((resolve, reject) => {
          const child = spawn(this.nextpnr, ['--version'], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: this.environment(),
          });
          this.probeChild = child;
          const timer = setTimeout(() => {
            void this.stopChild(child);
            reject(new Error('Проверка nextpnr превысила 120 секунд.'));
          }, 120000);
          const log = (data: Buffer) => {
            logs = (logs + String(data)).slice(-256000);
          };
          child.stdout?.on('data', log);
          child.stderr?.on('data', log);
          child.once('error', (cause) => {
            clearTimeout(timer);
            reject(cause);
          });
          child.once('close', (code) => {
            clearTimeout(timer);
            if (this.probeChild === child) this.probeChild = undefined;
            if (code === 0) resolve();
            else reject(new Error(logs.trim() || `nextpnr завершился с кодом ${code}.`));
          });
        });
        result.available = true;
        result.nextpnrVersion =
          logs
            .split(/\r?\n/)
            .find((line) => /nextpnr.*(?:version|\d+\.)/i.test(line))
            ?.trim() ?? logs.trim().slice(0, 200);
        try {
          await access(this.packer);
          result.bitstreamAvailable = true;
        } catch {
          /* Placement remains useful without the packer. */
        }
      } catch (cause) {
        result.error =
          cause instanceof Error && !/ENOENT/.test(cause.message)
            ? cause.message
            : 'Установите локальный Gowin-тулчейн командой npm run setup:gowin.';
        setTimeout(() => {
          this.probe = undefined;
        }, 10000).unref();
      }
      return result;
    })());
  }
  private environment(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      YOWASP_CACHE_DIR: process.env.YOWASP_CACHE_DIR ?? path.join(workspace, '.tools/gowin-cache'),
      XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? path.join(workspace, '.tools/gowin-cache'),
      PYTHONUTF8: '1',
    };
  }
  async create(project: Project, buildId: string, value: unknown): Promise<PhysicalResult> {
    const release = this.scheduler.reserve();
    try {
      const config = validatePhysicalConfig(value, project);
      if (typeof buildId !== 'string' || !UUID.test(buildId))
        throw new RequestError('Сначала синтезируйте проект.');
      const build = await this.builds.get(buildId);
      if (build.status !== 'success' || !build.technology)
        throw new RequestError('Для размещения нужен завершённый синтез.');
      if (build.projectHash !== projectHash(project))
        throw new RequestError(
          'Исходники или .cst изменились после синтеза. Синтезируйте текущий проект.',
        );
      if (this.scheduler.stopping) throw new RequestError('Сервис завершает работу.', 503);
      const id = randomUUID(),
        directory = path.join(this.root, id);
      await mkdir(path.join(directory, 'sources'), { recursive: true });
      await markJob(directory, id);
      for (const file of project.files.filter((file) => file.name === config.cstFile)) {
        const filename = path.join(directory, 'sources', ...file.name.split('/'));
        await mkdir(path.dirname(filename), { recursive: true });
        await writeFile(filename, file.content, 'utf8');
      }
      await writeFile(path.join(directory, 'project.json'), JSON.stringify(project, null, 2));
      const result: PhysicalResult = {
        id,
        buildId,
        projectHash: build.projectHash,
        status: 'queued',
        stage: 'В очереди',
        startedAt: new Date().toISOString(),
        logs: '',
        config,
        engine: 'YoWASP nextpnr · himbaechel/gowin',
        bitstreamAvailable: false,
      };
      if (this.scheduler.stopping) throw new RequestError('Сервис завершает работу.', 503);
      const job: Job = {
        result,
        project: structuredClone(project),
        technology: build.technology,
        directory,
        persistence: Promise.resolve(),
        abort: new AbortController(),
      };
      this.jobs.set(id, job);
      await this.save(job);
      this.scheduler.enqueue(job);
      const snapshot = structuredClone(result);
      return snapshot;
    } finally {
      release();
    }
  }
  async status(id: string, logOffset = 0) {
    const record = this.jobs.get(id);
    return record
      ? incrementalStatus(record.result, logOffset)
      : storedStatus(this.root, id, logOffset);
  }

  async get(id: string): Promise<PhysicalResult> {
    if (!UUID.test(id)) throw new RequestError('Размещение не найдено.', 404);
    const job = this.jobs.get(id);
    if (job) return job.result;
    try {
      const result = JSON.parse(
        await readFile(path.join(this.root, id, 'metadata.json'), 'utf8'),
      ) as PhysicalResult;
      result.logs = await readFile(path.join(this.root, id, 'logs.txt'), 'utf8');
      if (!TERMINAL.has(result.status)) {
        result.status = 'error';
        result.stage = 'Размещение прервано перезапуском сервиса';
        result.error = result.stage;
      }
      if (TERMINAL.has(result.status)) {
        try {
          result.placed = JSON.parse(
            await readFile(path.join(this.root, id, 'placement.json'), 'utf8'),
          ) as YosysNetlist;
        } catch {
          /* A failed or cancelled run may not have placed cells yet. */
        }
        try {
          result.report = JSON.parse(
            await readFile(path.join(this.root, id, 'timing.json'), 'utf8'),
          );
        } catch {
          /* No clocks may produce no timing report. */
        }
      }
      return result;
    } catch (cause) {
      if (cause instanceof RequestError) throw cause;
      throw new RequestError('Размещение не найдено.', 404);
    }
  }
  async cancel(id: string): Promise<PhysicalResult> {
    if (!UUID.test(id)) throw new RequestError('Размещение не найдено.', 404);
    const job = this.jobs.get(id);
    if (!job) return this.get(id);
    if (!TERMINAL.has(job.result.status)) {
      await this.finish(job, 'cancelled', 'Отменено');
    }
    return job.result;
  }
  async artifact(
    id: string,
    name: string,
  ): Promise<{ filename: string; content: Buffer; mime: string }> {
    if (!UUID.test(id) || !Object.hasOwn(ARTIFACTS, name))
      throw new RequestError('Артефакт не найден.', 404);
    const result = await this.get(id);
    if (!TERMINAL.has(result.status))
      throw new RequestError('Дождитесь завершения размещения.', 409);
    if (name === 'design.fs' && !result.bitstreamAvailable)
      throw new RequestError('Битстрим не создан.', 404);
    await this.jobs.get(id)?.persistence;
    try {
      return {
        filename: name,
        content: await readFile(path.join(this.root, id, name)),
        mime: ARTIFACTS[name],
      };
    } catch {
      throw new RequestError('Артефакт не создан.', 404);
    }
  }
  private async perform(job: Job) {
    if (TERMINAL.has(job.result.status)) {
      this.scheduler.complete(job);
      return;
    }
    job.result.status = 'running';
    try {
      job.result.stage = 'Проверка nextpnr';
      await this.save(job);
      const health = await this.waitFor(job, this.health());
      if (TERMINAL.has(job.result.status)) return;
      if (!health.available) throw new Error(health.error ?? 'nextpnr недоступен.');
      job.result.stage = 'Подготовка плоского нетлиста';
      await this.save(job);
      if (TERMINAL.has(job.result.status)) return;
      const flat = await this.flatten(job);
      if (TERMINAL.has(job.result.status)) return;
      await writeFile(path.join(job.directory, 'flat.json'), flat);
      if (TERMINAL.has(job.result.status)) return;
      job.result.stage = 'Размещение и трассировка';
      await this.save(job);
      if (TERMINAL.has(job.result.status)) return;
      await this.command(job, this.nextpnr, [
        '--device',
        'GW2AR-LV18QN88C8/I7',
        '--vopt',
        'family=GW2A-18C',
        '--vopt',
        `cst=sources/${job.result.config.cstFile}`,
        '--json',
        'flat.json',
        '--write',
        'placement.json',
        '--report',
        'timing.json',
        '--freq',
        String(job.result.config.frequencyMHz),
      ]);
      if (TERMINAL.has(job.result.status)) return;
      job.result.placed = JSON.parse(
        await readFile(path.join(job.directory, 'placement.json'), 'utf8'),
      ) as YosysNetlist;
      try {
        job.result.report = JSON.parse(
          await readFile(path.join(job.directory, 'timing.json'), 'utf8'),
        );
      } catch {
        /* Some combinational designs have no timed paths. */
      }
      if (health.bitstreamAvailable) {
        job.result.stage = 'Генерация битстрима Apicula';
        await this.save(job);
        if (TERMINAL.has(job.result.status)) return;
        await this.command(job, this.packer, [
          '-d',
          'GW2A-18C',
          '-o',
          'design.fs',
          'placement.json',
        ]);
        if (TERMINAL.has(job.result.status)) return;
        await access(path.join(job.directory, 'design.fs'));
        job.result.bitstreamAvailable = true;
      }
      await this.finish(
        job,
        'success',
        job.result.bitstreamAvailable ? 'Битстрим готов' : 'Размещение готово',
      );
    } catch (cause) {
      if (!TERMINAL.has(job.result.status))
        await this.finish(job, 'error', cause instanceof Error ? cause.message : String(cause));
    }
  }
  private waitFor<T>(job: Job, operation: Promise<T>): Promise<T> {
    if (job.abort.signal.aborted) return Promise.reject(new Error('Размещение отменено.'));
    return new Promise((resolve, reject) => {
      const abort = () => reject(new Error('Размещение отменено.'));
      job.abort.signal.addEventListener('abort', abort, { once: true });
      operation
        .then(resolve, reject)
        .finally(() => job.abort.signal.removeEventListener('abort', abort));
    });
  }
  private flatten(job: Job): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = fork(RUNNER, [], {
        execArgv: ['--max-old-space-size=2048'],
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      job.child = child;
      let text: string | undefined, error: string | undefined;
      child.on('message', (message) => {
        const value = message as { type: string; text?: string; error?: string };
        if (value.type === 'log') this.log(job, value.text ?? '');
        else if (value.type === 'flat') text = value.text;
        else if (value.type === 'error') error = value.error;
      });
      child.stderr?.on('data', (data) => this.log(job, String(data)));
      child.once('error', reject);
      child.once('close', (code) => {
        if (job.child === child) job.child = undefined;
        if (code === 0 && text) resolve(text);
        else reject(new Error(error ?? 'Не удалось подготовить нетлист.'));
      });
      child.send({ technology: job.technology, top: job.project.top });
    });
  }
  private command(job: Job, executable: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = toolCommand(executable, args, this.timeoutMs / 1000);
      const child = spawn(command.executable, command.args, {
        cwd: job.directory,
        env: this.environment(),
        detached: process.platform === 'linux',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      job.child = child;
      child.stdout?.on('data', (data) => this.log(job, String(data)));
      child.stderr?.on('data', (data) => this.log(job, String(data)));
      child.once('error', reject);
      child.once('close', (code) => {
        if (job.child === child) job.child = undefined;
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `Инструмент ${path.basename(executable)} завершился с кодом ${code}. Подробности в журнале.`,
            ),
          );
      });
    });
  }
  private log(job: Job, text: string) {
    if (TERMINAL.has(job.result.status)) return;
    if (Buffer.byteLength(job.result.logs) + Buffer.byteLength(text) > 4 * 1024 * 1024) {
      void this.finish(job, 'error', 'Журнал размещения превышает 4 МБ.');
      return;
    }
    job.result.logs += text;
  }
  private save(job: Job): Promise<void> {
    const { placed: _placed, report: _report, logs, ...metadata } = job.result;
    const json = JSON.stringify(metadata, null, 2);
    job.persistence = job.persistence
      .catch(() => {})
      .then(async () => {
        await atomicWrite(path.join(job.directory, 'metadata.json'), json);
        await writeFile(path.join(job.directory, 'logs.txt'), logs, 'utf8');
      })
      .catch(async (error) => {
        job.result.status = 'error';
        job.result.stage = 'Ошибка сохранения размещения';
        job.result.error = error instanceof Error ? error.message : String(error);
        job.result.finishedAt = new Date().toISOString();
        job.abort.abort();
        if (job.child) await this.stopChild(job.child);
        this.scheduler.complete(job);
        console.error('Physical persistence failed:', error);
      });
    return job.persistence;
  }
  private async finish(job: Job, status: 'success' | 'error' | 'cancelled', stage: string) {
    if (TERMINAL.has(job.result.status)) return;
    job.result.status = status;
    job.result.stage = stage;
    job.abort.abort();
    job.result.finishedAt = new Date().toISOString();
    job.result.elapsedMs = Date.now() - Date.parse(job.result.startedAt);
    if (status === 'error') job.result.error = stage;
    if (job.timer) clearTimeout(job.timer);
    if (job.child) await this.stopChild(job.child);
    await this.save(job);
    this.scheduler.complete(job);
    void this.retention.sweep();
    if (this.jobs.size > 24)
      for (const [id, item] of this.jobs) {
        if (item !== job && TERMINAL.has(item.result.status)) {
          this.jobs.delete(id);
          break;
        }
      }
  }
  private stopChild(child: ChildProcess): Promise<void> {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null)
      return Promise.resolve();
    return new Promise((resolve) => {
      child.once('close', () => resolve());
      if (process.platform === 'win32') {
        const terminator = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
          shell: false,
        });
        terminator.once('error', () => child.kill());
        terminator.once('close', (code) => {
          if (code !== 0) child.kill();
        });
      } else terminateLinuxGroup(child);
    });
  }
  async close() {
    this.scheduler.stop();
    if (this.probeChild) await this.stopChild(this.probeChild);
    await Promise.allSettled(
      [...this.jobs.values()]
        .filter((job) => !TERMINAL.has(job.result.status))
        .map((job) => this.finish(job, 'cancelled', 'Сервис завершает работу')),
    );
    await Promise.allSettled([...this.jobs.values()].map((job) => job.persistence));
  }
}
