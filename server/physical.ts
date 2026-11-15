import { fork, type ChildProcess } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, YosysNetlist } from '../shared/types';
import type { PhysicalConfig, PhysicalResult, PhysicalToolStatus } from '../shared/physical';
import type { FlattenRequest, FlattenWorkerMessage } from '../shared/worker-protocol';
import { BuildManager } from './builds';
import { JOB_ID, TERMINAL } from './job-constants';
import { JobManager, type JobRecord } from './job-manager';
import { captureTool, stopProcess } from './process-limits';
import { RequestError, projectHash } from './validation';
import { fixCarryHeads } from './carry-head';
import { dropUnconstrainedPads, reservedPinsUsed, usesConfigurationPins } from './unconstrained';
import { pllClockConstraints, retargetToBufferNets, sanitizeSdc } from './sdc';
import { workspace } from './paths';
import { atomicWrite } from './atomic-write';

const RUNNER = fileURLToPath(new URL('./physical-yosys-runner.mjs', import.meta.url));
const ARTIFACTS: Record<string, string> = {
  'placement.json': 'application/json',
  'timing.json': 'application/json',
  'design.fs': 'application/octet-stream',
  'logs.txt': 'text/plain; charset=utf-8',
};
interface PhysicalJob extends JobRecord<PhysicalResult> {
  project: Project;
  technology: YosysNetlist;
  rtl?: YosysNetlist;
  /** Отмена ожиданий, которые не привязаны к дочернему процессу (проверка nextpnr). */
  abort: AbortController;
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

export class PhysicalManager extends JobManager<PhysicalResult, PhysicalJob> {
  protected readonly notFound = 'Размещение не найдено.';
  protected readonly logOverflow = {
    stage: 'Журнал размещения превышает 4 МБ.',
    error: 'Журнал размещения превышает 4 МБ.',
  };
  protected readonly shutdownStage = 'Сервис завершает работу';
  protected readonly persistenceStage = 'Ошибка сохранения размещения';
  protected readonly transientFields = ['placed', 'report', 'logs'];
  /** Журнал целиком пишется вместе с метаданными (см. snapshotWriter). */
  protected readonly appendsLogFile = false;
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
    root: string,
    private builds: BuildManager,
    timeoutMs = 240000,
  ) {
    super(root, { capacity: 4, executor: 'physical', timeoutMs });
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
        const logs = await captureTool(this.nextpnr, ['--version'], {
          env: this.environment(),
          timeoutMs: 120000,
          timeoutMessage: 'Проверка nextpnr превысила 120 секунд.',
          name: 'nextpnr',
          tail: 256000,
          track: (child) => {
            this.probeChild = child;
          },
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
      const taken = reservedPinsUsed(
        project.files.find((file) => file.name === config.cstFile)?.content ?? '',
      )[0];
      if (taken)
        throw new RequestError(
          `Порту ${taken.port} назначен вывод ${taken.pin} (${taken.role}): он занят конфигурацией платы, и сигнал на нём не появится. Выберите другой вывод во вкладке «Выводы».`,
        );
      if (typeof buildId !== 'string' || !JOB_ID.test(buildId))
        throw new RequestError('Сначала синтезируйте проект.');
      const build = await this.builds.get(buildId);
      if (build.status !== 'success' || !build.technology)
        throw new RequestError('Для размещения нужен завершённый синтез.');
      if (build.projectHash !== projectHash(project))
        throw new RequestError(
          'Исходники или .cst изменились после синтеза. Синтезируйте текущий проект.',
        );
      if (this.scheduler.stopping) throw new RequestError('Сервис завершает работу.', 503);
      const { id, directory } = await this.prepareDirectory(
        project.files.filter((file) => file.name === config.cstFile || file.name.endsWith('.sdc')),
        { 'project.json': JSON.stringify(project, null, 2) },
      );
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
      return await this.enqueue({
        result,
        project: structuredClone(project),
        technology: build.technology,
        rtl: build.rtl,
        directory,
        persistence: Promise.resolve(),
        abort: new AbortController(),
      });
    } finally {
      release();
    }
  }

  /** Любая ошибка чтения сохранённого размещения означает «не найдено». */
  override async get(id: string): Promise<PhysicalResult> {
    try {
      return await super.get(id);
    } catch (cause) {
      if (cause instanceof RequestError) throw cause;
      throw new RequestError(this.notFound, 404);
    }
  }
  async artifact(
    id: string,
    name: string,
  ): Promise<{ filename: string; content: Buffer; mime: string }> {
    if (!JOB_ID.test(id) || !Object.hasOwn(ARTIFACTS, name))
      throw new RequestError('Артефакт не найден.', 404);
    const result = await this.get(id);
    if (!TERMINAL.has(result.status))
      throw new RequestError('Дождитесь завершения размещения.', 409);
    if (name === 'design.fs' && !result.bitstreamAvailable)
      throw new RequestError('Битстрим не создан.', 404);
    await this.records.get(id)?.persistence;
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

  protected interrupt(result: PhysicalResult) {
    result.status = 'error';
    result.stage = 'Размещение прервано перезапуском сервиса';
    result.error = result.stage;
  }
  protected async attachStored(result: PhysicalResult, directory: string) {
    try {
      result.placed = JSON.parse(
        await readFile(path.join(directory, 'placement.json'), 'utf8'),
      ) as YosysNetlist;
    } catch {
      /* A failed or cancelled run may not have placed cells yet. */
    }
    try {
      result.report = JSON.parse(await readFile(path.join(directory, 'timing.json'), 'utf8'));
    } catch {
      /* No clocks may produce no timing report. */
    }
  }
  protected async cancelRecord(job: PhysicalJob) {
    await this.finish(job, 'cancelled', 'Отменено');
  }
  protected onTimeout(job: PhysicalJob) {
    void this.finish(job, 'error', 'Размещение превысило лимит времени.');
  }
  protected start(job: PhysicalJob) {
    void this.perform(job);
  }
  protected async releaseTools() {
    if (this.probeChild) await this.stopChild(this.probeChild);
  }
  /** Сообщение об ошибке размещения совпадает с его стадией. */
  protected finish(
    job: PhysicalJob,
    status: 'success' | 'error' | 'cancelled',
    stage: string,
    error = status === 'error' ? stage : undefined,
  ) {
    return super.finish(job, status, stage, error);
  }
  protected finalize(job: PhysicalJob) {
    job.abort.abort();
  }
  protected async stop(job: PhysicalJob) {
    if (job.child) await this.stopChild(job.child);
  }
  protected afterFinish(job: PhysicalJob) {
    this.trimMemory(job);
  }
  /** Метаданные и журнал пишутся вместе: журнал размещения не дописывается по частям. */
  protected snapshotWriter(job: PhysicalJob) {
    const json = this.metadataJson(job);
    const { logs } = job.result;
    return async () => {
      await atomicWrite(path.join(job.directory, 'metadata.json'), json);
      await writeFile(path.join(job.directory, 'logs.txt'), logs, 'utf8');
    };
  }
  protected persistenceFailed(job: PhysicalJob, error: unknown) {
    // Запись больше нельзя сохранить: завершить без повторной попытки, остановить процессы.
    console.error(`${this.persistenceStage}:`, error);
    if (TERMINAL.has(job.result.status)) return;
    job.result.status = 'error';
    job.result.stage = this.persistenceStage;
    job.result.error = error instanceof Error ? error.message : String(error);
    job.result.finishedAt = new Date().toISOString();
    job.abort.abort();
    void this.stop(job).then(() => this.scheduler.complete(job));
  }
  private stopChild(child: ChildProcess) {
    return stopProcess(child, { untilClosed: true });
  }

  /** Встроенная SDRAM GW2AR даёт в каждом запуске полсотни строк «Cell … not found»: убираем их. */
  protected override appendLog(record: PhysicalJob, text: string) {
    super.appendLog(
      record,
      text
        .replace(/^Info: Cell (?:O|IO)_sdram_\S+ not found.*\r?\n/gm, '')
        .replace(/^.*Feature 'write_xaiger2' is experimental.*\r?\n/gm, ''),
    );
  }

  private async perform(job: PhysicalJob) {
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
      // The same project placed by another nextpnr may land differently: keep the version with the log.
      if (health.nextpnrVersion)
        this.appendLog(
          job,
          `Инструменты: ${health.nextpnrVersion}
`,
        );
      job.result.stage = 'Подготовка плоского нетлиста';
      await this.save(job);
      if (TERMINAL.has(job.result.status)) return;
      const whole = await this.flatten(job);
      if (TERMINAL.has(job.result.status)) return;
      const cst =
        job.project.files.find((file) => file.name === job.result.config.cstFile)?.content ?? '';
      const {
        json: flat,
        dropped,
        cst: placedCst,
      } = dropUnconstrainedPads(whole, cst, job.project.top);
      if (dropped.length)
        this.appendLog(
          job,
          `\nПредупреждение: портам ${dropped.join(', ')} не назначен вывод в ${job.result.config.cstFile}. Они не попали в битстрим: выходы никуда не выведены, входы читаются как 0. Назначьте им выводы во вкладке «Выводы», если они нужны.\n`,
        );
      // A tri-state buffer that did not become TBUF/IOBUF cannot be placed: nextpnr would stop
      // with a message about an unknown cell type. Say what to do instead.
      if (flat.includes('"$_TBUF_"'))
        throw new Error(
          'Трёхстабильный выход (значение z) остался вне вывода платы: такой буфер можно разместить только на внешнем порту верхнего модуля. Выведите шину на порт (inout или output) или уберите z из внутренней логики.',
        );
      await writeFile(path.join(job.directory, 'flat.json'), flat);
      // The constraints nextpnr reads: the pupil's file plus pins for the N side of LVDS pairs.
      await writeFile(path.join(job.directory, 'placement.cst'), placedCst, 'utf8');
      const sdcFile = job.project.files.find((file) => file.name.endsWith('.sdc'));
      let userSdc = '';
      if (sdcFile) {
        const reduced = sanitizeSdc(sdcFile.content);
        userSdc = retargetToBufferNets(reduced.text, flat, job.project.top, (port) =>
          this.appendLog(
            job,
            `\nПредупреждение: в ${sdcFile.name} порт ${port} не найден среди входов проекта, ограничение для него не применено.\n`,
          ),
        );
        if (reduced.skipped.length)
          this.appendLog(
            job,
            `\nПредупреждение: из ${sdcFile.name} применены только create_clock; пропущены команды: ${reduced.skipped.join('; ')}\n`,
          );
      }
      // Outputs of a PLL run at their own frequency, which nextpnr cannot work out by itself.
      const constrained = new Set(
        [...userSdc.matchAll(/get_nets \{([^}]+)\}/g)].map((match) => match[1]),
      );
      const sdcText = userSdc + pllClockConstraints(flat, job.project.top, constrained);
      const sdc = sdcText !== '';
      if (sdc) await writeFile(path.join(job.directory, 'placement.sdc'), sdcText, 'utf8');
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
        'cst=placement.cst',
        '--json',
        'flat.json',
        '--write',
        'placement.json',
        '--report',
        'timing.json',
        '--freq',
        String(job.result.config.frequencyMHz),
        // Fmax below the target is not a failure of the design: the pupil still gets a placement,
        // a bitstream and a clear warning instead of a bare exit code.
        '--timing-allow-fail',
        // Timing constraints of the pupil (clock periods of derived clocks, false paths).
        ...(sdc ? ['--sdc', 'placement.sdc'] : []),
      ]);
      // nextpnr prints the figure twice (after placement and after routing): the last one counts.
      const slowest = new Map<string, string>();
      for (const line of job.result.logs.match(/^.*Max frequency for clock.*\(FAIL at .*$/gm) ?? [])
        slowest.set(/clock '([^']*)'/.exec(line)?.[1] ?? line, line);
      for (const line of slowest.values())
        this.appendLog(
          job,
          `\nПредупреждение: схема не успевает на заданной частоте: ${line.replace(/^\s*Info:\s*/, '')}\n`,
        );
      if (TERMINAL.has(job.result.status)) return;
      // Older nextpnr writes a wrong table into the head of some carry chains (apicula #541).
      const placement = fixCarryHeads(
        await readFile(path.join(job.directory, 'placement.json'), 'utf8'),
      );
      if (placement.fixed) {
        await writeFile(path.join(job.directory, 'placement.json'), placement.json, 'utf8');
        this.appendLog(
          job,
          `\nИсправлена таблица в начале цепочки переноса (${placement.fixed}): nextpnr этой версии ставит туда 0x505a, из-за чего результат зависел от места на кристалле.\n`,
        );
      }
      job.result.placed = JSON.parse(placement.json) as YosysNetlist;
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
          // Pins 52-57 double as the configuration interface (SSPI/flash). They only work as
          // ordinary I/O when the bitstream sets the fuse that gives them up.
          ...(usesConfigurationPins(placedCst) ? ['--sspi_as_gpio'] : []),
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
  private waitFor<T>(job: PhysicalJob, operation: Promise<T>): Promise<T> {
    if (job.abort.signal.aborted) return Promise.reject(new Error('Размещение отменено.'));
    return new Promise((resolve, reject) => {
      const abort = () => reject(new Error('Размещение отменено.'));
      job.abort.signal.addEventListener('abort', abort, { once: true });
      operation
        .then(resolve, reject)
        .finally(() => job.abort.signal.removeEventListener('abort', abort));
    });
  }
  private flatten(job: PhysicalJob): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = fork(RUNNER, [], {
        execArgv: ['--max-old-space-size=2048'],
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      job.child = child;
      let text: string | undefined, error: string | undefined;
      child.on('message', (message) => {
        const value = message as FlattenWorkerMessage;
        if (value.type === 'log') this.appendLog(job, value.text ?? '');
        else if (value.type === 'flat') text = value.text;
        else if (value.type === 'error') error = value.error;
      });
      child.stderr?.on('data', (data) => this.appendLog(job, String(data)));
      child.once('error', reject);
      child.once('close', (code) => {
        if (job.child === child) job.child = undefined;
        if (code === 0 && text) resolve(text);
        else reject(new Error(error ?? 'Не удалось подготовить нетлист.'));
      });
      child.send({
        technology: job.technology,
        rtl: job.rtl,
        top: job.project.top,
      } satisfies FlattenRequest);
    });
  }
  private command(job: PhysicalJob, executable: string, args: string[]) {
    return this.runTool(job, executable, args, {
      env: this.environment(),
      failure: (tool, code) => {
        const reason = [
          ...job.result.logs.matchAll(/^(?:ERROR|Exception|ValueError|[A-Za-z]*Error):\s*(.+)$/gm),
        ]
          .pop()?.[1]
          ?.trim();
        return reason
          ? `Инструмент ${tool} завершился с кодом ${code}: ${reason}`
          : `Инструмент ${tool} завершился с кодом ${code}. Подробности в журнале.`;
      },
    });
  }
}
