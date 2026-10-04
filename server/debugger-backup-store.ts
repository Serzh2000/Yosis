import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import express, { type Request } from 'express';
import { RequestError } from '../shared/errors';

const MIN_BYTES = 512 * 1024;
const MAX_BYTES = 16 * 1024 * 1024;
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Recovery images are immutable and excluded from job retention. */
export class DebuggerBackupStore {
  private readonly writes = new Map<string, Promise<unknown>>();
  constructor(
    readonly root: string,
    readonly quotaBytes = 64 * 1024 * 1024,
  ) {}

  private filename(owner: string, chipId: string, hash: string) {
    if (!owner || !/^[a-f0-9]{12}$/.test(chipId) || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new RequestError('Некорректный идентификатор резервной копии.');
    }
    const namespace = createHash('sha256').update(owner).digest('hex');
    return path.join(path.resolve(this.root), namespace, `${chipId}-${hash}.bin`);
  }

  async read(owner: string, chipId: string, hash: string): Promise<Buffer> {
    const filename = this.filename(owner, chipId, hash);
    let bytes: Buffer;
    try {
      bytes = await readFile(filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RequestError('Копия на сервере не найдена.', 404);
      throw error;
    }
    if (
      bytes.length < MIN_BYTES ||
      bytes.length > MAX_BYTES ||
      bytes.length % 4096 ||
      sha256(bytes) !== hash
    ) {
      throw new RequestError('Копия на сервере повреждена.', 409);
    }
    return bytes;
  }

  async list(
    owner: string,
    chipId: string,
  ): Promise<{ hash: string; size: number; createdAt: number }[]> {
    const directory = path.dirname(this.filename(owner, chipId, '0'.repeat(64)));
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const results = [];
    for (const entry of entries) {
      if (!entry.startsWith(`${chipId}-`) || !/^[a-f0-9]{12}-[a-f0-9]{64}\.bin$/.test(entry))
        continue;
      const hash = entry.slice(13, -4);
      const metadata = await stat(path.join(directory, entry));
      results.push({
        hash,
        size: metadata.size,
        createdAt: metadata.birthtimeMs || metadata.mtimeMs,
      });
    }
    return results.sort((a, b) => a.createdAt - b.createdAt || a.hash.localeCompare(b.hash));
  }

  async save(owner: string, chipId: string, hash: string, bytes: Uint8Array): Promise<void> {
    const filename = this.filename(owner, chipId, hash);
    if (
      bytes.byteLength < MIN_BYTES ||
      bytes.byteLength > MAX_BYTES ||
      bytes.byteLength % 4096 ||
      sha256(bytes) !== hash
    ) {
      throw new RequestError('Размер или SHA-256 резервной копии не совпал.');
    }
    // Serialize quota checks and writes per user. A retry cannot replace an image.
    const previous = this.writes.get(owner) ?? Promise.resolve();
    const writing = previous
      .catch(() => {})
      .then(async () => {
        try {
          await this.read(owner, chipId, hash);
          return;
        } catch (error) {
          if (!(error instanceof RequestError && error.status === 404)) throw error;
        }
        const directory = path.dirname(filename);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const entries = await readdir(directory);
        let used = 0;
        for (const entry of entries) {
          if (/^[a-f0-9]{12}-[a-f0-9]{64}\.bin$/.test(entry))
            used += (await stat(path.join(directory, entry))).size;
        }
        if (used + bytes.byteLength > this.quotaBytes)
          throw new RequestError('Недостаточно места для резервной копии на сервере.', 507);
        const file = await open(filename, 'wx', 0o600);
        try {
          await file.writeFile(bytes);
          await file.sync();
        } finally {
          await file.close();
        }
        await this.read(owner, chipId, hash);
      });
    this.writes.set(owner, writing);
    try {
      await writing;
    } finally {
      if (this.writes.get(owner) === writing) this.writes.delete(owner);
    }
  }
}

export function createDebuggerBackupRouter(
  store: DebuggerBackupStore,
  owner: (request: Request) => string,
) {
  const router = express.Router();
  router.post(
    '/:chipId/:hash',
    express.raw({ type: 'application/octet-stream', limit: MAX_BYTES }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body))
        throw new RequestError('Ожидается бинарная резервная копия.', 415);
      await store.save(
        owner(request),
        String(request.params.chipId),
        String(request.params.hash),
        request.body,
      );
      response.status(201).json({ hash: request.params.hash, bytes: request.body.length });
    },
  );
  router.get('/:chipId/:hash', async (request, response) => {
    const bytes = await store.read(
      owner(request),
      String(request.params.chipId),
      String(request.params.hash),
    );
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.send(bytes);
  });
  router.get('/:chipId', async (request, response) => {
    response.json(await store.list(owner(request), String(request.params.chipId)));
  });
  return router;
}
