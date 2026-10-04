import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type {
  ProgrammingBackend,
  ProgrammingDevice,
  ProgrammingHealth,
} from '../shared/programming';

const IDCODE = '0x0000081b' as const;
const LOG_LIMIT = 512 * 1024;

export interface ProgrammingProgress {
  stage: (message: string) => void;
  log: (message: string) => void;
}

/** Adapters expose SRAM operations only. Paths and arguments never come from HTTP requests. */
export interface ProgrammingAdapter {
  readonly backend: ProgrammingBackend;
  health(): Promise<ProgrammingHealth>;
  devices(): Promise<ProgrammingDevice[]>;
  program(
    device: ProgrammingDevice,
    filename: string,
    userCode: string,
    progress: ProgrammingProgress,
  ): Promise<void>;
}

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
  onOutput?: (text: string) => void;
}
export type CommandRunner = (
  executable: string,
  args: readonly string[],
  options?: CommandOptions,
) => Promise<string>;

export const runProgrammingCommand: CommandRunner = (executable, args, options = {}) =>
  new Promise((resolve, reject) => {
    // A terminal Ctrl+C belongs to the helper. Its shutdown handler waits for SRAM
    // writing, so keep the programmer in its own process group (hidden on Windows).
    const child = spawn(executable, [...args], {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let failure: Error | undefined;
    const timer = setTimeout(() => {
      failure = new Error(
        'Программатор не завершил операцию за отведённое время. Переподключите плату перед повторной загрузкой.',
      );
      child.kill();
    }, options.timeoutMs ?? 120_000);
    timer.unref();
    const receive = (data: Buffer) => {
      const text = stripVTControlCharacters(data.toString('utf8')).replace(/\r/g, '\n');
      if (output.length + text.length > LOG_LIMIT) {
        if (!failure) failure = new Error('Журнал программатора превысил допустимый размер.');
        child.kill();
        return;
      }
      output += text;
      options.onOutput?.(text);
    };
    child.stdout.on('data', receive);
    child.stderr.on('data', receive);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`Не удалось запустить программатор: ${error.message}`));
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(
          new Error(
            `Программатор завершился с ошибкой (${signal ?? code}). ${output.trim().slice(-2000)}`,
          ),
        );
      else resolve(output);
    });
  });

export function parseGowinCableLocations(output: string): number[] {
  const locations: number[] = [];
  for (const line of output.split(/\r?\n/)) {
    const cable =
      /Cable found:\s*USB Debugger A\/0\/(\d+)\/(?:[^\s]+)\s*\(USB location:(\d+)\)/i.exec(line);
    if (!cable) continue;
    const location = Number(cable[1]);
    if (location !== Number(cable[2]) || !Number.isSafeInteger(location) || location < 1)
      throw new Error('Не удалось однозначно определить USB location платы.');
    if (locations.includes(location))
      throw new Error('Обнаружены платы с одинаковым USB location.');
    locations.push(location);
  }
  return locations;
}

export function assertGowinIdentity(output: string): void {
  // A chain with two devices must never be silently programmed as a single Tang Nano.
  const ids = [
    ...output.matchAll(/(?:GW[A-Z0-9-]+\s*\(|(?:ID\s*Code|IDCODE)\s*[:=]?\s*)(0x[0-9a-f]+)\)?/gi),
  ];
  if (ids.length !== 1 || Number.parseInt(ids[0][1], 16) !== 0x81b)
    throw new Error(
      'Ожидается единственный GW2AR-18C с ID 0x0000081B. Проверьте подключение платы.',
    );
}

export class GowinProgrammingAdapter implements ProgrammingAdapter {
  readonly backend = 'gowin' as const;
  constructor(
    readonly executable: string,
    private readonly run: CommandRunner = runProgrammingCommand,
  ) {}

  async health(): Promise<ProgrammingHealth> {
    try {
      const output = await this.run(this.executable, ['--help'], { timeoutMs: 10_000 });
      if (!/Gowin FPGA Programmer/i.test(output))
        throw new Error('Указанная программа не является Gowin Programmer.');
      return {
        version: 1,
        backend: this.backend,
        available: true,
        detail: 'Gowin Programmer готов. Загрузка в SRAM.',
      };
    } catch (error) {
      return { version: 1, backend: this.backend, available: false, detail: errorMessage(error) };
    }
  }

  private args(location: number): string[] {
    return [
      '--device',
      'GW2AR-18C',
      '--cable-index',
      '4',
      '--location',
      String(location),
      '--frequency',
      '2.5MHz',
    ];
  }

  async devices(): Promise<ProgrammingDevice[]> {
    const output = await this.run(this.executable, ['--scan-cables', 'F'], { timeoutMs: 15_000 });
    const locations = parseGowinCableLocations(output);
    const devices: ProgrammingDevice[] = [];
    for (const location of locations) {
      const detected = await this.run(this.executable, [...this.args(location), '--scan'], {
        timeoutMs: 15_000,
      });
      assertGowinIdentity(detected);
      devices.push({
        id: `gowin:${location}`,
        label: `Tang Nano 20K · USB ${location}`,
        board: 'tangnano20k',
        model: 'GW2AR-18C',
        deviceID: IDCODE,
        backend: this.backend,
        location,
      });
    }
    return devices;
  }

  async program(
    device: ProgrammingDevice,
    filename: string,
    userCode: string,
    progress: ProgrammingProgress,
  ): Promise<void> {
    if (
      device.backend !== this.backend ||
      !Number.isSafeInteger(device.location) ||
      device.location! < 1 ||
      device.id !== `gowin:${device.location}`
    )
      throw new Error('Некорректный адрес платы.');
    const args = this.args(device.location!);
    progress.stage('Проверка подключённой платы');
    assertGowinIdentity(
      await this.run(this.executable, [...args, '--scan'], {
        timeoutMs: 15_000,
        onOutput: progress.log,
      }),
    );
    progress.stage('Загрузка в SRAM');
    const output = await this.run(
      this.executable,
      [...args, '--operation', '2', '--fsFile', filename],
      { timeoutMs: 120_000, onOutput: progress.log },
    );
    if (!/\bFinished\./i.test(output) || /\b(?:failed|error)\b/i.test(output))
      throw new Error('Gowin Programmer не подтвердил завершение загрузки.');
    progress.stage('Чтение состояния FPGA');
    const status = await this.run(this.executable, [...args, '--operation', '74'], {
      timeoutMs: 15_000,
      onOutput: progress.log,
    });
    const statusCode = /Status Code is:\s*(0x[0-9a-f]+)/i.exec(status);
    if (!statusCode || ![0x2020, 0x6020].includes(Number.parseInt(statusCode[1], 16)))
      throw new Error(
        'FPGA не подтвердила завершение конфигурации. Переподключите плату и повторите загрузку.',
      );
    const code = await this.run(this.executable, [...args, '--operation', '73'], {
      timeoutMs: 15_000,
      onOutput: progress.log,
    });
    const actual = /User Code is:\s*(0x[0-9a-f]+)/i.exec(code);
    if (
      !actual ||
      Number.parseInt(actual[1], 16) !== Number.parseInt(userCode.replace(/^0x/i, ''), 16)
    )
      throw new Error('UserCode FPGA отличается от загружаемого битстрима.');
    progress.log(
      '\nКонфигурация завершена; состояние и UserCode прочитаны. Проверьте ожидаемое поведение LED или выходов.\n',
    );
  }
}

/** USB table format is defined in openFPGALoader src/libusb_ll.cpp. Column boundaries preserve spaces in the product name. */
export function parseOpenFpgaloaderSerials(output: string): string[] {
  // eslint-disable-next-line no-control-regex -- USB helper logs contain terminal escape sequences.
  const lines = output.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/);
  const header = lines.findIndex((line) => /\bvid:pid\b/i.test(line) && /\bserial\b/i.test(line));
  if (header < 0) throw new Error('Не удалось прочитать список USB от openFPGALoader.');
  const serialOffset = lines[header].indexOf('serial');
  const productOffset = lines[header].indexOf('product');
  if (serialOffset < 0 || productOffset <= serialOffset)
    throw new Error('Неизвестный формат списка USB.');
  const serials: string[] = [];
  for (const line of lines.slice(header + 1)) {
    if (!/^\s*\d+\s+\d+\s+0x0403:0x6010\b/i.test(line)) continue;
    const serial = line.slice(serialOffset, productOffset).trim();
    if (!serial || /^(?:none|null)$/i.test(serial) || !/^[\w.-]{1,128}$/.test(serial))
      throw new Error('У USB-программатора нет однозначного серийного номера.');
    if (serials.includes(serial))
      throw new Error('Обнаружены USB-программаторы с одинаковыми серийными номерами.');
    serials.push(serial);
  }
  return serials;
}

export function assertOpenFpgaloaderIdentity(output: string): void {
  const ids = [...output.matchAll(/^\s*idcode\s+(0x[0-9a-f]+)\s*$/gim)];
  if (ids.length !== 1 || Number.parseInt(ids[0][1], 16) !== 0x81b)
    throw new Error('Ожидается единственный GW2AR-18C с ID 0x0000081B.');
}

export class OpenFpgaloaderProgrammingAdapter implements ProgrammingAdapter {
  readonly backend = 'openfpgaloader' as const;
  constructor(
    readonly executable: string,
    private readonly run: CommandRunner = runProgrammingCommand,
  ) {}

  async health(): Promise<ProgrammingHealth> {
    try {
      const output = await this.run(this.executable, ['-V'], { timeoutMs: 10_000 });
      if (!/openFPGALoader/i.test(output))
        throw new Error('Указанная программа не является openFPGALoader.');
      return {
        version: 1,
        backend: this.backend,
        available: true,
        detail: 'openFPGALoader готов. Загрузка в SRAM.',
      };
    } catch (error) {
      return { version: 1, backend: this.backend, available: false, detail: errorMessage(error) };
    }
  }

  private args(serial: string): string[] {
    return [
      '-b',
      'tangnano20k',
      '--ftdi-serial',
      serial,
      '--ftdi-channel',
      '0',
      '--freq',
      '2500000',
    ];
  }

  async devices(): Promise<ProgrammingDevice[]> {
    const serials = parseOpenFpgaloaderSerials(
      await this.run(this.executable, ['--scan-usb'], { timeoutMs: 15_000 }),
    );
    const devices: ProgrammingDevice[] = [];
    for (const serial of serials) {
      const detected = await this.run(this.executable, [...this.args(serial), '--detect'], {
        timeoutMs: 15_000,
      });
      // FT2232 bridges can drive other FPGA families; omit them from the Tang Nano list.
      try {
        assertOpenFpgaloaderIdentity(detected);
      } catch {
        continue;
      }
      devices.push({
        id: `openfpgaloader:${serial}`,
        label: `Tang Nano 20K · ${serial}`,
        board: 'tangnano20k',
        model: 'GW2AR-18C',
        deviceID: IDCODE,
        backend: this.backend,
        serial,
      });
    }
    return devices;
  }

  async program(
    device: ProgrammingDevice,
    filename: string,
    _userCode: string,
    progress: ProgrammingProgress,
  ): Promise<void> {
    if (
      device.backend !== this.backend ||
      !device.serial ||
      !/^[\w.-]{1,128}$/.test(device.serial) ||
      device.id !== `openfpgaloader:${device.serial}`
    )
      throw new Error('Некорректный серийный номер платы.');
    // Ensure this serial is still unique before allowing libftdi to select it.
    const serials = parseOpenFpgaloaderSerials(
      await this.run(this.executable, ['--scan-usb'], { timeoutMs: 15_000 }),
    );
    if (!serials.includes(device.serial)) throw new Error('Выбранная плата отключена.');
    const args = this.args(device.serial);
    progress.stage('Проверка подключённой платы');
    assertOpenFpgaloaderIdentity(
      await this.run(this.executable, [...args, '--detect'], {
        timeoutMs: 15_000,
        onOutput: progress.log,
      }),
    );
    progress.stage('Загрузка в SRAM');
    // -m explicitly selects SRAM; no flash, erase, MCU firmware or arbitrary options are exposed.
    const output = await this.run(this.executable, [...args, '-m', filename], {
      timeoutMs: 120_000,
      onOutput: progress.log,
    });
    if (/\b(?:failed|error)\b/i.test(output) || !/\b(?:Done|Success)\b/i.test(output))
      throw new Error('openFPGALoader не подтвердил завершение загрузки.');
    progress.log(
      '\nopenFPGALoader завершил загрузку в SRAM. Проверьте ожидаемое поведение выходов платы.\n',
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ошибка программатора.';
}

export async function createProgrammingAdapter(
  options: { backend?: ProgrammingBackend; executable?: string } = {},
): Promise<ProgrammingAdapter> {
  const backend = options.backend ?? (process.platform === 'win32' ? 'gowin' : 'openfpgaloader');
  if (backend === 'openfpgaloader')
    return new OpenFpgaloaderProgrammingAdapter(
      options.executable ?? process.env.YOSIS_OPENFPGALOADER ?? 'openFPGALoader',
    );
  const configured = options.executable ?? process.env.YOSIS_GOWIN_PROGRAMMER;
  if (configured) return new GowinProgrammingAdapter(configured);
  // Discovery is local configuration only. Pick a deterministic installed version.
  const roots = [
    'C:/Gowin',
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Gowin'),
  ].filter((root): root is string => Boolean(root));
  for (const root of roots) {
    let directories: string[];
    try {
      directories = await readdir(root);
    } catch {
      continue;
    }
    for (const directory of directories.sort().reverse()) {
      const executable = path.join(root, directory, 'Programmer', 'bin', 'programmer_cli.exe');
      try {
        await access(executable);
        return new GowinProgrammingAdapter(executable);
      } catch {
        /* Try the next installed version. */
      }
    }
  }
  return new GowinProgrammingAdapter('programmer_cli.exe');
}
