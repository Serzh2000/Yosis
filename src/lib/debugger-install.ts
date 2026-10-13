import manifest from './dirtyjtag-package.json';
import { download } from './api';
import {
  Bl616FlashSession,
  FIRMWARE_ADDRESS,
  FLASH_SECTOR,
  MAX_DEBUGGER_FLASH,
  firmwareHash,
  installationSectors,
  type FlashProgress,
  type FirmwareImage,
  type RomTranscript,
} from './bl616-flash';
import type { RomSerialPort } from './bl616-rom';
import {
  originalDebuggerBackup,
  saveDebuggerBackup,
  storedDebuggerBackup,
  validateDebuggerBackup,
  type DebuggerBackup,
} from './debugger-backups';
import {
  earliestServerBackup,
  requestBackupStorage,
  retainServerBackup,
  verifyServerBackup,
} from './debugger-backup-recovery';

export const debuggerPackage = manifest;
export async function loadDebuggerPackage(): Promise<FirmwareImage[]> {
  if (
    manifest.version !== 1 ||
    manifest.board !== 'tangnano20k' ||
    manifest.images.length !== 2 ||
    manifest.images[0].address !== 0 ||
    manifest.images[1].address !== FIRMWARE_ADDRESS ||
    !manifest.usb.msos20
  )
    throw new Error('Некорректный комплект прошивки.');
  const images: FirmwareImage[] = [];
  for (const image of manifest.images) {
    if (!['bootloader.bin', 'dirtyjtag.bin'].includes(image.name))
      throw new Error('Неизвестный образ прошивки.');
    const bytes = await download(
      `/firmware/dirtyjtag/${image.name}`,
      undefined,
      (status) => `Пакет прошивки недоступен (${status}).`,
    );
    if (bytes.length !== image.size || (await firmwareHash(bytes)) !== image.sha256)
      throw new Error('SHA-256 пакета прошивки не совпал. Установка запрещена.');
    if (
      (image.address === 0 && bytes.length > FIRMWARE_ADDRESS) ||
      (image.address !== 0 && (bytes.length <= FLASH_SECTOR || bytes.length > 0x40000))
    )
      throw new Error('Неподдерживаемый размер образа.');
    images.push({ address: image.address, bytes });
  }
  return images;
}
export interface InstallPlan {
  mode: 'install' | 'restore';
  backup: DebuggerBackup;
  original: DebuggerBackup | null;
  images: FirmwareImage[];
  sectors: number;
}
type Progress = (value: FlashProgress) => void;
/** A backup file saved by the installer: its name carries the board and the SHA-256 of its content. */
export interface BackupFile {
  chipId: string;
  hash: string;
  bytes: Uint8Array;
}
export const backupFileName = (backup: Pick<DebuggerBackup, 'chipId' | 'hash'>) =>
  `bl616-${backup.chipId}-${backup.hash}.bin`;
export async function readBackupFile(name: string, bytes: Uint8Array): Promise<BackupFile> {
  const match = name.toLowerCase().match(/bl616-([a-f0-9]{12})-([a-f0-9]{64})/);
  if (!match)
    throw new Error(
      'Имя файла должно сохранить вид bl616-<плата>-<SHA-256>.bin: по нему проверяется содержимое.',
    );
  if (bytes.length < 2 ** 19 || bytes.length > MAX_DEBUGGER_FLASH || bytes.length % FLASH_SECTOR)
    throw new Error('Размер файла не соответствует flash BL616.');
  if ((await firmwareHash(bytes)) !== match[2])
    throw new Error('SHA-256 файла не совпал с именем. Копия повреждена или переименована.');
  return { chipId: match[1], hash: match[2], bytes };
}
export async function prepareDebuggerInstall(
  port: RomSerialPort,
  mode: InstallPlan['mode'],
  onProgress: Progress,
  signal?: AbortSignal,
  extra: { transcript?: RomTranscript; restoreFile?: BackupFile } = {},
): Promise<InstallPlan> {
  // Verify bundled binaries before opening the board or sending configuration commands.
  const images = mode === 'install' ? await loadDebuggerPackage() : [];
  await requestBackupStorage();
  const session = await Bl616FlashSession.open(port, {
    onProgress,
    signal,
    transcript: extra.transcript,
  });
  try {
    const flash = session.identity,
      bytes = await session.readFlash(0, flash.size);
    await session.verify(0, bytes);
    let imported: DebuggerBackup | null = await earliestServerBackup(flash);
    if (mode === 'restore' && extra.restoreFile) {
      const file = extra.restoreFile;
      if (file.chipId !== flash.boot.chipId)
        throw new Error(`Файл относится к плате ${file.chipId}, подключена ${flash.boot.chipId}.`);
      if (file.bytes.length !== flash.size)
        throw new Error('Размер файла отличается от flash этой платы.');
      // Stored before the current state: in a fresh browser profile the file stays the earliest copy.
      imported = await saveDebuggerBackup(flash, file.bytes);
    }
    const backup = await saveDebuggerBackup(flash, bytes),
      original = imported ?? (await originalDebuggerBackup(flash.boot.chipId));
    if (original) await retainServerBackup(original);
    await retainServerBackup(backup);
    if (mode === 'restore') {
      if (!original || original.hash === backup.hash)
        throw new Error(
          'Для этой платы нет отличающейся исходной копии. Восстановление не требуется.',
        );
      if (original.identity.size !== flash.size || original.identity.jedec !== flash.jedec)
        throw new Error('Резервная копия относится к другой flash.');
      images.push({ address: 0, bytes: new Uint8Array(original.bytes) });
    }
    const sectors = installationSectors(bytes, images).filter((sector) =>
      sector.bytes.some((byte, index) => byte !== bytes[sector.address + index]),
    ).length;
    if (!sectors)
      throw new Error('Выбранная прошивка уже записана. Переподключи USB обычным способом.');
    return { mode, backup, original, images, sectors };
  } finally {
    await session.close();
  }
}
export async function applyDebuggerInstall(
  port: RomSerialPort,
  plan: InstallPlan,
  onProgress: Progress,
  transcript?: RomTranscript,
): Promise<{ chipId: string; sectors: number }> {
  if (!['install', 'restore'].includes(plan.mode)) throw new Error('Неизвестный режим установки.');
  const backup = await storedDebuggerBackup((await validateDebuggerBackup(plan.backup)).key);
  const original =
    plan.mode === 'restore'
      ? await storedDebuggerBackup((await validateDebuggerBackup(plan.original!)).key)
      : null;
  await verifyServerBackup(backup);
  if (original) await verifyServerBackup(original);
  if (
    original &&
    (original.chipId !== backup.chipId ||
      original.identity.jedec !== backup.identity.jedec ||
      original.identity.size !== backup.identity.size)
  )
    throw new Error('Исходная копия относится к другой плате.');
  // Re-fetch hashes at the final action; a stale or modified plan cannot select arbitrary firmware.
  const images =
    plan.mode === 'install'
      ? await loadDebuggerPackage()
      : [{ address: 0, bytes: new Uint8Array(original!.bytes) }];
  const session = await Bl616FlashSession.open(port, { onProgress, transcript });
  try {
    if (
      session.identity.boot.chipId !== backup.chipId ||
      session.identity.jedec !== backup.identity.jedec ||
      session.identity.size !== backup.identity.size
    )
      throw new Error('Выбрана другая плата. Подготовь установку заново.');
    // Detect writes from another tab/device session before the first erase.
    await session.verify(0, new Uint8Array(backup.bytes));
    const previous = new Uint8Array(backup.bytes);
    const sectors = installationSectors(previous, images).filter((sector) =>
      sector.bytes.some((byte, index) => byte !== previous[sector.address + index]),
    );
    for (let index = 0; index < sectors.length; index++) {
      onProgress({
        stage: plan.mode === 'install' ? 'Установка DirtyJTAG' : 'Восстановление исходной прошивки',
        done: index,
        total: sectors.length,
      });
      await session.writeSector(sectors[index].address, sectors[index].bytes);
    }
    const expected = new Uint8Array(backup.bytes).slice();
    images.forEach((image) => expected.set(image.bytes, image.address));
    await session.verify(0, expected);
    onProgress({
      stage: 'Вся flash проверена SHA-256. Переподключи USB без UPDATE.',
      done: sectors.length,
      total: sectors.length,
    });
    return { chipId: backup.chipId, sectors: sectors.length };
  } finally {
    await session.close();
  }
}
