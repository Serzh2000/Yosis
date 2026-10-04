import { lstat, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TERMINAL = new Set(['success', 'error', 'cancelled']);
export interface RetentionPolicy {
  maxCount: number;
  maxAgeMs: number;
  maxBytes: number;
}
export const defaultRetention: RetentionPolicy = {
  maxCount: 64,
  maxAgeMs: 7 * 86400000,
  maxBytes: 512 * 1024 * 1024,
};

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${name} должен быть положительным целым числом.`);
  return value;
}
export function retentionPolicy(): RetentionPolicy {
  return {
    maxCount: envNumber('YOSIS_JOB_RETAIN_COUNT', defaultRetention.maxCount),
    maxAgeMs: envNumber('YOSIS_JOB_RETAIN_DAYS', 7) * 86400000,
    maxBytes: envNumber('YOSIS_JOB_RETAIN_MB', 512) * 1024 * 1024,
  };
}
export async function markJob(directory: string, id: string) {
  await writeFile(path.join(directory, '.yosis-job'), id, { flag: 'wx' });
}
async function directoryBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const name of await readdir(directory)) {
    const target = path.join(directory, name),
      info = await lstat(target);
    // Never traverse junctions or symbolic links, including inside a job.
    if (info.isSymbolicLink()) throw new Error('Linked job data is excluded from retention.');
    bytes += info.isDirectory() ? await directoryBytes(target) : info.size;
  }
  return bytes;
}

/** Only recognized job snapshots are eligible; arbitrary folders and fixtures remain intact. */
export class JobRetention {
  private pending = Promise.resolve();
  constructor(
    private root: string,
    private protectedIds: () => Set<string>,
    private removed: (id: string) => void,
    private policy = retentionPolicy(),
  ) {}
  sweep(now = Date.now()): Promise<void> {
    this.pending = this.pending
      .then(() => this.perform(now))
      .catch((error) => console.error('Job retention failed:', error));
    return this.pending;
  }
  private async perform(now: number) {
    const root = path.resolve(this.root);
    if (root === path.parse(root).root) throw new Error('Refusing retention at a filesystem root.');
    let names: string[];
    try {
      names = await readdir(root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const eligible: Array<{ id: string; directory: string; date: number; bytes: number }> = [];
    const protectedAtStart = this.protectedIds();
    for (const id of names) {
      if (!UUID.test(id) || protectedAtStart.has(id)) continue;
      const directory = path.resolve(root, id);
      if (path.dirname(directory) !== root) throw new Error('Job target escaped its storage root.');
      try {
        const info = await lstat(directory);
        if (!info.isDirectory() || info.isSymbolicLink()) continue;
        const metadata = JSON.parse(
          await readFile(path.join(directory, 'metadata.json'), 'utf8'),
        ) as {
          id?: string;
          projectHash?: string;
          status?: string;
          startedAt?: string;
          finishedAt?: string;
        };
        if (
          metadata.id !== id ||
          !/^[0-9a-f]{64}$/.test(metadata.projectHash ?? '') ||
          !Number.isFinite(Date.parse(metadata.startedAt ?? ''))
        )
          continue;
        let marked = false;
        try {
          marked = (await readFile(path.join(directory, '.yosis-job'), 'utf8')) === id;
        } catch {
          /* Older managed runs predate the marker. */
        }
        const legacyManagedRoot = ['.builds', '.simulations', '.physical'].includes(
          path.basename(root),
        );
        if (!marked && !legacyManagedRoot) continue;
        // On startup only, nonterminal records from a dead service may expire too.
        if (!TERMINAL.has(metadata.status ?? '') && now - info.mtimeMs < this.policy.maxAgeMs)
          continue;
        eligible.push({
          id,
          directory,
          date: Date.parse(metadata.finishedAt ?? metadata.startedAt!),
          bytes: await directoryBytes(directory),
        });
      } catch {
        /* Incomplete, linked, malformed and unrelated directories are not deletion candidates. */
      }
    }
    eligible.sort((a, b) => a.date - b.date);
    let count = eligible.length,
      bytes = eligible.reduce((sum, item) => sum + item.bytes, 0);
    for (const item of eligible) {
      if (
        count <= this.policy.maxCount &&
        bytes <= this.policy.maxBytes &&
        now - item.date <= this.policy.maxAgeMs
      )
        break;
      if (this.protectedIds().has(item.id)) continue;
      // Recheck identity and link status immediately before the recursive operation.
      const info = await lstat(item.directory);
      if (
        path.dirname(path.resolve(item.directory)) !== root ||
        !info.isDirectory() ||
        info.isSymbolicLink()
      )
        continue;
      await rm(item.directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
      this.removed(item.id);
      count--;
      bytes -= item.bytes;
    }
  }
}
