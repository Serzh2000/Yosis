import { fork } from 'node:child_process';
import { writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, SimulationConfig, SimulationResult, YosysPort } from '../shared/types';
import type { YosysRequest, YosysWorkerMessage } from '../shared/worker-protocol';
import { generateTestbench, TESTBENCH_TOP } from './simulation-testbench';
import { parseDiagnostics, projectHash } from './validation';
import { TERMINAL } from './job-constants';
import { JobManager, type JobRecord } from './job-manager';
import { captureTool, stopProcess } from './process-limits';
import { workspace } from './paths';
import { materializeCircuitProject } from '../shared/schematic';
import { readSimulationChecks } from '../shared/simulation-scenario';

const RUNNER = fileURLToPath(new URL('./yosys-runner.mjs', import.meta.url));
const ARTIFACTS = new Set(['wave.vcd', 'logs.txt']);
const MAX_VCD = 16 * 1024 * 1024;

interface Tools {
  compiler: string;
  runtime: string;
  library?: string;
  env: NodeJS.ProcessEnv;
}
interface SimulationRecord extends JobRecord<SimulationResult> {
  project: Project;
  aborted: boolean;
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

export class SimulationManager extends JobManager<SimulationResult, SimulationRecord> {
  protected readonly notFound = 'Симуляция не найдена.';
  protected readonly logOverflow = {
    stage: 'Журнал слишком велик',
    error: 'Журнал симуляции превышает 4 МБ.',
  };
  protected readonly shutdownStage = 'Сервис завершён';
  protected readonly persistenceStage = 'Ошибка сохранения симуляции';
  protected readonly transientFields = ['logs', 'vcd'];
  private healthPromise?: Promise<{ available: boolean; engine: string; version?: string }>;

  constructor(root: string, timeoutMs = 60_000) {
    super(root, { capacity: 8, executor: 'simulation', timeoutMs });
  }

  health() {
    return (this.healthPromise ??= (async () => {
      const tool = tools();
      try {
        const probe = (binary: string, args: string[]) =>
          captureTool(binary, args, {
            env: tool.env,
            timeoutMs: 10_000,
            timeoutMessage: 'Проверка симулятора превысила время.',
          });
        const version = await probe(tool.compiler, [
          ...(tool.library ? ['-B', tool.library] : []),
          '-V',
        ]);
        await probe(tool.runtime, ['-V']);
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
      const { id, directory } = await this.prepareDirectory(project.files, {
        'project.json': JSON.stringify(project, null, 2),
        'config.json': JSON.stringify(config, null, 2),
        'logs.txt': '',
      });
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
      return await this.enqueue({
        result,
        project,
        directory,
        persistence: Promise.resolve(),
        aborted: false,
      });
    } finally {
      release();
    }
  }

  async artifact(id: string, name: string) {
    return this.artifactPath(id, name, ARTIFACTS);
  }

  protected interrupt(result: SimulationResult) {
    result.status = 'error';
    result.error = 'Симуляция прервана перезапуском сервиса.';
    result.stage = result.error;
  }
  protected async attachStored(result: SimulationResult, directory: string) {
    if (result.status === 'success')
      result.vcd = await readFile(path.join(directory, 'wave.vcd'), 'utf8');
  }
  protected async cancelRecord(record: SimulationRecord) {
    await this.finish(record, 'cancelled', 'Симуляция отменена');
  }
  protected onTimeout(record: SimulationRecord) {
    void this.finish(
      record,
      'error',
      'Истекло время симуляции',
      `Симуляция превысила ${this.timeoutMs / 1000} секунд.`,
    );
  }
  protected stop(record: SimulationRecord) {
    // Icarus launches ivl/ivlpp children; the whole tree is terminated.
    return stopProcess(record.child);
  }
  protected acceptsLog(record: SimulationRecord) {
    return !record.aborted;
  }
  protected finalize(record: SimulationRecord) {
    const { result } = record;
    record.aborted = true;
    result.diagnostics = parseDiagnostics(result.logs);
    if (result.status === 'error' && !result.diagnostics.some((item) => item.severity === 'error'))
      result.diagnostics.push({ severity: 'error', message: result.error ?? result.stage });
  }

  protected start(record: SimulationRecord) {
    if (TERMINAL.has(record.result.status)) {
      this.scheduler.complete(record);
      return;
    }
    record.result.status = 'running';
    record.result.startedAt = new Date().toISOString();
    void this.perform(record).catch((error) => {
      if (!TERMINAL.has(record.result.status))
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
    this.appendLog(
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
        const message = value as YosysWorkerMessage;
        if (record.aborted) return;
        if (message.type === 'log') this.appendLog(record, message.text ?? '');
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
      child.stderr?.on('data', (chunk) => this.appendLog(record, String(chunk)));
      child.send(
        { project: record.project, prepareSimulation: true } satisfies YosysRequest,
        (error) => {
          if (error) reject(error);
        },
      );
    });
  }

  private run(record: SimulationRecord, binary: string, args: string[], env: NodeJS.ProcessEnv) {
    return this.runTool(record, binary, args, {
      env,
      addressSpaceMb: 1024,
      failure: (tool, code) => `${tool} завершился с кодом ${code}. Подробности — в журнале.`,
    });
  }

  private stage(record: SimulationRecord, stage: string) {
    record.result.stage = stage;
    void this.save(record);
  }
}
