import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DebuggerBackupStore } from '../server/debugger-backup-store';

test('recovery images validate hashes, stay immutable, and are isolated by owner', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'yosis-backups-'));
  try {
    const store = new DebuggerBackupStore(root, 512 * 1024);
    const bytes = Buffer.alloc(512 * 1024, 0x5a);
    const hash = createHash('sha256').update(bytes).digest('hex');
    await store.save('alice', '248602f5b735', hash, bytes);
    await store.save('alice', '248602f5b735', hash, bytes);
    assert.deepEqual(await store.read('alice', '248602f5b735', hash), bytes);
    await assert.rejects(store.read('bob', '248602f5b735', hash), /не найдена/);
    await assert.rejects(store.save('alice', '../escape', hash, bytes), /идентификатор/);
    await assert.rejects(store.save('alice', '248602f5b735', '0'.repeat(64), bytes), /SHA-256/);
    const another = Buffer.alloc(bytes.length, 1);
    await assert.rejects(
      store.save(
        'alice',
        '248602f5b735',
        createHash('sha256').update(another).digest('hex'),
        another,
      ),
      /места/,
    );
    const namespace = createHash('sha256').update('alice').digest('hex');
    await writeFile(
      path.join(root, namespace, `248602f5b735-${hash}.bin`),
      Buffer.alloc(bytes.length),
    );
    await assert.rejects(store.read('alice', '248602f5b735', hash), /повреждена/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
