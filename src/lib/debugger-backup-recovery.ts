import { firmwareHash, type DebuggerFlash } from './bl616-flash';
import { saveDebuggerBackup, type DebuggerBackup } from './debugger-backups';
import { download, requestRaw, requestVoid } from './api';

export type BackupStorage = 'persistent' | 'temporary' | 'unavailable';
export async function requestBackupStorage(): Promise<BackupStorage> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unavailable';
  try {
    if (await navigator.storage.persisted()) return 'persistent';
    return (await navigator.storage.persist?.()) ? 'persistent' : 'temporary';
  } catch {
    return 'unavailable';
  }
}

const url = (chipId: string, hash?: string) =>
  `/api/debugger-backups/${chipId}${hash ? `/${hash}` : ''}`;
async function readServerCopy(chipId: string, hash: string, size: number): Promise<Uint8Array> {
  const bytes = await download(
    url(chipId, hash),
    undefined,
    'Серверная резервная копия недоступна. Подготовь установку заново.',
  );
  if (bytes.length !== size || (await firmwareHash(bytes)) !== hash)
    throw new Error('SHA-256 серверной резервной копии не совпал. Запись запрещена.');
  return bytes;
}

/** Upload is followed by a full read, rather than trusting an HTTP success receipt. */
export async function retainServerBackup(backup: DebuggerBackup): Promise<void> {
  await requestVoid(
    url(backup.chipId, backup.hash),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: backup.bytes,
    },
    'Не удалось сохранить резервную копию на сервере. Запись запрещена.',
  );
  await verifyServerBackup(backup);
}

export async function verifyServerBackup(backup: DebuggerBackup): Promise<void> {
  await readServerCopy(backup.chipId, backup.hash, backup.bytes.byteLength);
}

/** After browser data loss, recover the earliest retained image for this exact chip. */
export async function earliestServerBackup(
  identity: DebuggerFlash,
): Promise<DebuggerBackup | null> {
  const response = await requestRaw(url(identity.boot.chipId));
  if (!response.ok) throw new Error('Не удалось проверить копии этой платы на сервере.');
  const values: unknown = await response.json();
  if (!Array.isArray(values)) throw new Error('Некорректный список резервных копий.');
  const first = values[0] as { hash?: unknown; size?: unknown } | undefined;
  if (!first) return null;
  if (
    typeof first.hash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(first.hash) ||
    first.size !== identity.size
  )
    throw new Error('Серверная копия относится к другой flash.');
  return saveDebuggerBackup(
    identity,
    await readServerCopy(identity.boot.chipId, first.hash, identity.size),
  );
}
