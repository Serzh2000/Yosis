import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

/** Linux resource limits inherited by native tools and their child processes. */
export function toolCommand(
  executable: string,
  args: string[],
  cpuSeconds: number,
  addressSpaceMb?: number,
) {
  if (process.platform !== 'linux') return { executable, args };
  const limiter = '/usr/bin/prlimit';
  if (!existsSync(limiter)) throw new Error('Linux worker requires /usr/bin/prlimit (util-linux).');
  const limits = [`--cpu=${Math.max(1, Math.ceil(cpuSeconds))}`, '--fsize=67108864', '--core=0'];
  // Wasmtime reserves a large virtual range: apply AS only to native Icarus.
  if (addressSpaceMb) limits.push(`--as=${addressSpaceMb * 1024 * 1024}`);
  return { executable: limiter, args: [...limits, '--', executable, ...args] };
}

export function terminateLinuxGroup(child: ChildProcess) {
  if (process.platform === 'linux' && child.pid) {
    try {
      process.kill(-child.pid, 'SIGKILL');
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
        console.error('Cannot stop worker group:', error);
    }
  }
  child.kill('SIGKILL');
}

/**
 * Останавливает дочерний процесс вместе с его потомками. Icarus и nextpnr запускают собственные
 * дочерние процессы, поэтому на Windows убивается всё дерево (`taskkill /T`), на Linux — группа.
 * `untilClosed` дополнительно ждёт события `close`, когда потоки процесса уже закрыты.
 */
export async function stopProcess(
  child: ChildProcess | undefined,
  { untilClosed = false }: { untilClosed?: boolean } = {},
): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = untilClosed ? new Promise<void>((resolve) => child.once('close', resolve)) : null;
  if (process.platform === 'win32' && child.pid) {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        shell: false,
      });
      killer.once('error', () => {
        child.kill();
        resolve();
      });
      killer.once('close', (code) => {
        if (code !== 0) child.kill();
        resolve();
      });
    });
  } else terminateLinuxGroup(child);
  await closed;
}

/**
 * Короткий запуск инструмента ради его вывода (проверка версии). Успех — код 0 и весь вывод;
 * иначе ошибка с выводом. По таймауту дерево процессов останавливается. `track` сообщает о
 * запущенном процессе, чтобы менеджер мог остановить его при выключении сервиса.
 */
export function captureTool(
  binary: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    timeoutMs: number;
    timeoutMessage: string;
    /** Имя инструмента для сообщения об ошибке; по умолчанию имя файла. */
    name?: string;
    /** Сколько последних символов вывода хранить. */
    tail?: number;
    track?: (child: ChildProcess | undefined) => void;
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: options.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    options.track?.(child);
    let output = '';
    const timer = setTimeout(() => {
      void stopProcess(child);
      reject(new Error(options.timeoutMessage));
    }, options.timeoutMs);
    const collect = (chunk: Buffer) => {
      output = options.tail
        ? (output + String(chunk)).slice(-options.tail)
        : output + String(chunk);
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      options.track?.(undefined);
      if (code === 0) resolve(output);
      else
        reject(
          new Error(
            output.trim() || `${options.name ?? path.basename(binary)} завершился с кодом ${code}.`,
          ),
        );
    });
  });
}
