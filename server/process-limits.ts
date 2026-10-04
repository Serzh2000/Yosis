import { existsSync } from 'node:fs';
import type { ChildProcess } from 'node:child_process';

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
