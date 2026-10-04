import { toolCommand, terminateLinuxGroup } from './process-limits';
import { atomicWrite } from './atomic-write';
import { incrementalStatus, storedStatus } from './job-status';
import { fork, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, appendFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, SimulationConfig, SimulationResult, YosysPort } from '../shared/types';
import { generateTestbench, TESTBENCH_TOP } from './simulation-testbench';
import { parseDiagnostics, projectHash, RequestError } from './validation';
import { JobQueue, executorCount } from './job-queue';
import { JobRetention, markJob } from './job-retention';
import { workspace } from './paths';
import { materializeCircuitProject } from '../shared/schematic';
import { readSimulationChecks } from '../shared/simulation-scenario';

const RUNNER = fileURLToPath(new URL('./yosys-runner.mjs', import.meta.url));
const terminal = new Set(['success', 'error', 'cancelled']);
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_VCD = 16 * 1024 * 1024;
const MAX_LOG = 4 * 1024 * 1024;

interface Tools {
  compiler: string;
  runtime: string;
  library?: string;
  env: NodeJS.ProcessEnv;
}
interface SimulationRecord {
  result: SimulationResult;
  project: Project;
  directory: string;
  persistence: Promise<void>;
  child?: ChildProcess;
  aborted: boolean;
  timer?: NodeJS.Timeout;
}
function tools(): Tools {
  const portable = path.join(workspace, '.tools', 'iverilog', 'mingw64');
  const bin = path.join(portable, 'bin');
  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] ?? ''}`;
  return {
    compiler:
      process.env.IVERILOG_PATH ??
      (process.platform === 'win32' ? path.join(bin, 'iverilog.exe') : 'iverilog'),
    runtime:
      process.env.VVP_PATH ?? (process.platform === 'win32' ? path.join(bin, 'vvp.exe') : 'vvp'),
    library:
      process.env.IVERILOG_LIB ??
      (process.platform === 'win32' ? path.join(portable, 'lib', 'ivl') : undefined),
    env,
  };
}

function stopProcess(child?: ChildProcess): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  if (process.platform !== 'win32' || !child.pid) {
    terminateLinuxGroup(child);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    // Icarus launches ivl/ivlpp children; terminate the full tree on Windows.
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
      shell: false,
    });
    killer.once('error', () => {
      child.kill();
      resolve();
    });
    killer.once('close', () => resolve());
  });
}

export class SimulationManager {
  private records = new Map<string, SimulationRecord>();
  private scheduler: JobQueue<SimulationRecord>;
  private retention: JobRetention;
  private healthPromise?: Promise<{ available: boolean; engine: string; version?: string }>;
  constructor(
    public root: string,
    private timeoutMs = 60_000,
  ) {
    this.root = path.resolve(root);
    this.scheduler = new JobQueue({
      capacity: 8,
      concurrency: executorCount('simulation'),
      timeoutMs,
      start: (record) => this.start(record),
      timeout: (record) =>
        void this.finish(
          record,
          'error',
          'Истекло время симуляции',
          `Симуляция превысила ${this.timeoutMs / 1000} секунд.`,
        ),
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

  health() {
    return (this.healthPromise ??= (async () => {
      const tool = tools();
      try {
        const version = await this.probe(
          tool.compiler,
          [...(tool.library ? ['-B', tool.library] : []), '-V'],
          tool.env,
        );
        await this.probe(tool.runtime, ['-V'], tool.env);
        return {
          available: true,
          engine: 'Icarus Verilog',
          version: version.match(/Icarus Verilog version[^\r\n]*/)?.[0] ?? 'Icarus Verilog',
        };
      } catch {
        setTimeout(() => {
          this.healthPromise = undefined;
        }, 10_000).unref();
        return { available: false, engine: 'Icarus Verilog' };
      }
    })());
  }

  async create(project: Project, config: SimulationConfig): Promise<SimulationResult> {
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
      await writeFile(path.join(directory, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
      await writeFile(path.join(directory, 'logs.txt'), '', 'utf8');
      const result: SimulationResult = {
        id,
        status: 'queued',
        stage: 'В очереди',
        startedAt: new Date().toISOString(),
        logs: '',
        diagnostics: [],
        top: project.top,
        projectHash: sourceHash,
        config,
        engine: 'Icarus Verilog',
      };
      const record: SimulationRecord = {
        result,
        project,
        directory,
        persistence: Promise.resolve(),
        aborted: false,
      };
      this.records.set(id, record);
      await this.save(record);
      const queued = structuredClone(result);
      this.scheduler.enqueue(record);
      for (const [key, entry] of this.records) {
        if (this.records.size <= 24) break;
        if (terminal.has(entry.result.status) && !this.scheduler.isActive(entry))
          this.records.delete(key);
      }
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

  async get(id: string): Promise<SimulationResult> {
    if (!validId.test(id)) throw new RequestError('Симуляция не найдена.', 404);
    const record = this.records.get(id);
    if (record) return record.result;
    const directory = path.join(this.root, id);
    try {
      const result = JSON.parse(
        await readFile(path.join(directory, 'metadata.json'), 'utf8'),
      ) as SimulationResult;
      result.logs = await readFile(path.join(directory, 'logs.txt'), 'utf8');
      if (!terminal.has(result.status)) {
        result.status = 'error';
        result.error = 'Симуляция прервана перезапуском сервиса.';
        result.stage = result.error;
      }
      if (result.status === 'success')
        result.vcd = await readFile(path.join(directory, 'wave.vcd'), 'utf8');
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError('Симуляция не найдена.', 404);
      throw error;
    }
  }

  async cancel(id: string) {
    if (!validId.test(id)) throw new RequestError('Симуляция не найдена.', 404);
    const record = this.records.get(id);
    if (!record) return this.get(id);
    if (!terminal.has(record.result.status))
      await this.finish(record, 'cancelled', 'Симуляция отменена');
    return record.result;
  }

  async artifact(id: string, name: string) {
    if (!validId.test(id) || !['wave.vcd', 'logs.txt'].includes(name))
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

  async close() {
    this.scheduler.stop();
    await Promise.all(
      [...this.records.values()]
        .filter((record) => !terminal.has(record.result.status))
        .map((record) => this.finish(record, 'cancelled', 'Сервис завершён')),
    );
    await Promise.all([...this.records.values()].map((record) => record.persistence));
  }

  private start(record: SimulationRecord) {
    if (terminal.has(record.result.status)) {
      this.scheduler.complete(record);
      return;
    }
    record.result.status = 'running';
    record.result.startedAt = new Date().toISOString();
    void this.perform(record).catch((error) => {
      if (!terminal.has(record.result.status))
        void this.finish(
          record,
          'error',
          'Ошибка симуляции',
          error instanceof Error ? error.message : String(error),
        );
    });
  }

  private async perform(record: SimulationRecord) {
    const health = await this.health();
    if (record.aborted) return;
    if (!health.available)
      throw new Error(
        'Icarus Verilog / vvp не доступны. Выполните npm run setup:iverilog или настройте IVERILOG_PATH и VVP_PATH.',
      );
    record.result.toolVersion = health.version;
    this.stage(record, 'Подготовка RTL');
    const prepared = await this.prepare(record);
    if (record.aborted) return;
    if (prepared.modules.includes(TESTBENCH_TOP))
      throw new Error(`Имя ${TESTBENCH_TOP} зарезервировано для тестового окружения.`);
    const testbench = generateTestbench(record.project.top, prepared.ports, record.result.config);
    await writeFile(path.join(record.directory, 'design.v'), prepared.design, 'utf8');
    await writeFile(path.join(record.directory, 'testbench.v'), testbench, 'utf8');
    if (record.aborted) return;
    const tool = tools();
    this.stage(record, 'Компиляция Icarus Verilog');
    this.log(
      record,
      '\nRTL: Yosys hierarchy/proc/opt → normalized Verilog. Icarus Verilog: 1ns/1ps, clock/reset, input timeline, settled port checks.\n',
    );
    await this.run(
      record,
      tool.compiler,
      [
        ...(tool.library ? ['-B', tool.library] : []),
        '-g2012',
        '-s',
        TESTBENCH_TOP,
        '-o',
        'simulation.vvp',
        'design.v',
        'testbench.v',
      ],
      tool.env,
    );
    if (record.aborted) return;
    this.stage(record, 'Моделирование RTL');
    await this.run(
      record,
      tool.runtime,
      [...(tool.library ? ['-M', tool.library] : []), 'simulation.vvp'],
      tool.env,
    );
    if (record.aborted) return;
    const filename = path.join(record.directory, 'wave.vcd');
    if ((await stat(filename)).size > MAX_VCD)
      throw new Error('VCD превышает 16 МБ. Уменьшите число циклов или размер проекта.');
    const vcd = await readFile(filename, 'utf8');
    if (!vcd.includes('$enddefinitions')) throw new Error('Симулятор не создал корректный VCD.');
    record.result.vcd = vcd;
    if (record.result.config.expectations?.length) {
      const checksFile = path.join(record.directory, 'checks.txt');
      if ((await stat(checksFile)).size > MAX_VCD)
        throw new Error('Отчёт проверок превышает 16 МБ.');
      record.result.checks = readSimulationChecks(
        await readFile(checksFile, 'utf8'),
        record.result.config.expectations,
        prepared.ports,
      );
    }
    await this.finish(record, 'success', 'Симуляция завершена');
  }

  private prepare(
    record: SimulationRecord,
  ): Promise<{ ports: Record<string, YosysPort>; modules: string[]; design: string }> {
    return new Promise((resolve, reject) => {
      const child = fork(RUNNER, [], {
        execArgv: ['--max-old-space-size=2048'],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
      });
      record.child = child;
      let result:
        { ports: Record<string, YosysPort>; modules: string[]; design: string } | undefined;
      let succeeded = false;
      child.on('message', (value) => {
        const message = value as {
          type: string;
          text?: string;
          error?: string;
          ports: Record<string, YosysPort>;
          modules: string[];
          design: string;
        };
        if (record.aborted) return;
        if (message.type === 'log') this.log(record, message.text ?? '');
        else if (message.type === 'simulation-design')
          result = { ports: message.ports, modules: message.modules, design: message.design };
        else if (message.type === 'success') succeeded = true;
        else if (message.type === 'failure')
          reject(new Error(message.error ?? 'Ошибка подготовки RTL.'));
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (record.child === child) record.child = undefined;
        if (result && succeeded && code === 0) resolve(result);
        else
          reject(
            new Error(
              record.aborted ? 'Симуляция отменена.' : `Ошибка подготовки RTL (код ${code}).`,
            ),
          );
      });
      child.stderr?.on('data', (chunk) => this.log(record, String(chunk)));
      child.send({ project: record.project, prepareSimulation: true }, (error) => {
        if (error) reject(error);
      });
    });
  }

  private run(
    record: SimulationRecord,
    binary: string,
    args: string[],
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = toolCommand(binary, args, this.timeoutMs / 1000, 1024);
      const child = spawn(command.executable, command.args, {
        cwd: record.directory,
        env,
        detached: process.platform === 'linux',
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      record.child = child;
      child.stdout?.on('data', (chunk) => this.log(record, String(chunk)));
      child.stderr?.on('data', (chunk) => this.log(record, String(chunk)));
      child.once('error', reject);
      child.once('close', (code) => {
        if (record.child === child) record.child = undefined;
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `${path.basename(binary)} завершился с кодом ${code}. Подробности — в журнале.`,
            ),
          );
      });
    });
  }

  private probe(binary: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, {
        env,
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Проверка симулятора превысила время.'));
      }, 10_000);
      child.stdout?.on('data', (chunk) => {
        output += String(chunk);
      });
      child.stderr?.on('data', (chunk) => {
        output += String(chunk);
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(output);
        else reject(new Error(output));
      });
    });
  }

  private stage(record: SimulationRecord, stage: string) {
    record.result.stage = stage;
    void this.save(record);
  }
  private log(record: SimulationRecord, text: string) {
    if (record.aborted) return;
    if (Buffer.byteLength(record.result.logs) + Buffer.byteLength(text) > MAX_LOG) {
      void this.finish(record, 'error', 'Журнал слишком велик', 'Журнал симуляции превышает 4 МБ.');
      return;
    }
    record.result.logs += text;
    this.persist(record, () => appendFile(path.join(record.directory, 'logs.txt'), text, 'utf8'));
  }
  private async finish(
    record: SimulationRecord,
    status: 'success' | 'error' | 'cancelled',
    stage: string,
    error?: string,
  ) {
    if (terminal.has(record.result.status)) return;
    record.aborted = true;
    clearTimeout(record.timer);
    record.result.status = status;
    record.result.stage = stage;
    record.result.error = error;
    record.result.finishedAt = new Date().toISOString();
    record.result.elapsedMs = Date.now() - Date.parse(record.result.startedAt);
    record.result.diagnostics = parseDiagnostics(record.result.logs);
    if (status === 'error' && !record.result.diagnostics.some((item) => item.severity === 'error'))
      record.result.diagnostics.push({ severity: 'error', message: error ?? stage });
    await stopProcess(record.child);
    await this.save(record);
    this.scheduler.complete(record);
    void this.retention.sweep();
  }
  private save(record: SimulationRecord) {
    const { logs: _logs, vcd: _vcd, ...metadata } = record.result;
    const json = JSON.stringify(metadata, null, 2);
    return this.persist(record, async () => {
      await atomicWrite(path.join(record.directory, 'metadata.json'), json);
    });
  }
  private persist(record: SimulationRecord, action: () => Promise<void>) {
    record.persistence = record.persistence.then(action).catch((error) => {
      console.error('Simulation persistence failed:', error);
      if (!terminal.has(record.result.status))
        void this.finish(
          record,
          'error',
          'Ошибка сохранения симуляции',
          error instanceof Error ? error.message : String(error),
        );
    });
    return record.persistence;
  }
}
