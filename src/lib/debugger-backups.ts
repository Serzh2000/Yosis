import { FLASH_SECTOR, MAX_DEBUGGER_FLASH, firmwareHash, type DebuggerFlash } from './bl616-flash';
import { DATABASES } from './storage';

export interface DebuggerBackup {
  version: 1;
  key: string;
  chipId: string;
  createdAt: number;
  identity: DebuggerFlash;
  hash: string;
  bytes: ArrayBuffer;
}
export async function validateDebuggerBackup(value: DebuggerBackup): Promise<DebuggerBackup> {
  if (
    !value ||
    value.version !== 1 ||
    !/^[a-f0-9]{12}$/.test(value.chipId) ||
    value.identity?.boot?.chipId !== value.chipId ||
    !(value.bytes instanceof ArrayBuffer) ||
    value.bytes.byteLength !== value.identity.size ||
    value.bytes.byteLength < 2 ** 19 ||
    value.bytes.byteLength > MAX_DEBUGGER_FLASH ||
    value.bytes.byteLength % FLASH_SECTOR ||
    !/^[a-f0-9]{64}$/.test(value.hash) ||
    value.key !== `${value.chipId}:${value.hash}` ||
    !Number.isFinite(value.createdAt) ||
    (await firmwareHash(new Uint8Array(value.bytes))) !== value.hash
  )
    throw new Error('Резервная копия BL616 повреждена. Запись запрещена.');
  return value;
}
async function database() {
  if (typeof indexedDB === 'undefined')
    throw new Error('Браузер не поддерживает сохранение резервной копии. Установка запрещена.');
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      DATABASES.debuggerBackups.name,
      DATABASES.debuggerBackups.version,
    );
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('backups', { keyPath: 'key' });
      store.createIndex('chipId', 'chipId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('Не удалось открыть хранилище резервных копий BL616.'));
    request.onblocked = () =>
      reject(new Error('Другая вкладка блокирует хранилище. Закрой её перед установкой.'));
  });
}
export async function saveDebuggerBackup(
  identity: DebuggerFlash,
  bytes: Uint8Array,
): Promise<DebuggerBackup> {
  const hash = await firmwareHash(bytes),
    key = `${identity.boot.chipId}:${hash}`;
  const backup: DebuggerBackup = {
    version: 1,
    key,
    chipId: identity.boot.chipId,
    identity: structuredClone(identity),
    createdAt: Date.now(),
    hash,
    bytes: new Uint8Array(bytes).buffer,
  };
  await validateDebuggerBackup(backup);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('backups', 'readwrite', { durability: 'strict' }),
        store = transaction.objectStore('backups');
      // Keep the first timestamp for an identical image. Older originals are never overwritten.
      const request = store.index('chipId').getAll(backup.chipId);
      request.onsuccess = () => {
        const previous = request.result as DebuggerBackup[];
        if (previous.some((item) => item.key === key)) return;
        backup.createdAt = Math.max(
          backup.createdAt,
          ...previous.map((item) => item.createdAt + 1),
        );
        store.add(backup);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(
          new Error(
            'Резервная копия не сохранена. Проверь свободное место в браузере. Запись запрещена.',
          ),
        );
    });
    const read = await new Promise<DebuggerBackup>((resolve, reject) => {
      const request = db.transaction('backups', 'readonly').objectStore('backups').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Не удалось перечитать сохранённую копию.'));
    });
    return await validateDebuggerBackup(read);
  } finally {
    db.close();
  }
}
export async function originalDebuggerBackup(chipId: string): Promise<DebuggerBackup | null> {
  const db = await database();
  try {
    const rows = await new Promise<DebuggerBackup[]>((resolve, reject) => {
      const request = db
        .transaction('backups', 'readonly')
        .objectStore('backups')
        .index('chipId')
        .getAll(chipId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Не удалось прочитать резервную копию.'));
    });
    rows.sort((a, b) => a.createdAt - b.createdAt);
    return rows.length ? await validateDebuggerBackup(rows[0]) : null;
  } finally {
    db.close();
  }
}
export async function storedDebuggerBackup(key: string): Promise<DebuggerBackup> {
  const db = await database();
  try {
    const backup = await new Promise<DebuggerBackup>((resolve, reject) => {
      const request = db.transaction('backups', 'readonly').objectStore('backups').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Не удалось перечитать резервную копию перед записью.'));
    });
    return await validateDebuggerBackup(backup);
  } finally {
    db.close();
  }
}
