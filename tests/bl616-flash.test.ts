import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  Bl616FlashSession,
  FLASH_SECTOR,
  FIRMWARE_ADDRESS,
  RomTranscript,
  firmwareHash,
  installationSectors,
  romFrame,
} from '../src/lib/bl616-flash';
import {
  loadDebuggerPackage,
  prepareDebuggerInstall,
  applyDebuggerInstall,
  backupFileName,
  readBackupFile,
} from '../src/lib/debugger-install';
import {
  originalDebuggerBackup,
  saveDebuggerBackup,
  validateDebuggerBackup,
} from '../src/lib/debugger-backups';
import type { RomSerialPort } from '../src/lib/bl616-rom';
import manifest from '../src/lib/dirtyjtag-package.json';

// Independent ROM peer: parses actual wire frames and changes a byte-addressed NOR.
// It never calls production packet/framing or sector-plan helpers.
function romDouble(
  options: {
    chipByte?: number;
    failCommand?: number;
    corruptHash?: boolean;
    fragmented?: boolean;
    vendor?: number;
    emptyRead?: boolean;
    stall?: boolean;
    jedecFlag?: number;
    jedec?: number[];
    signing?: number;
    encryption?: number;
    revision?: number;
    shaDelay?: number;
  } = {},
) {
  let input: ReadableStreamDefaultController<Uint8Array>,
    opened = false,
    synced = false;
  const flash = Uint8Array.from(
    { length: 2 ** (options.jedec?.[2] ?? 19) },
    (_, i) => (i * 17 + (i >>> 12)) & 255,
  );
  const boot = Uint8Array.from(
    Buffer.from('01001606000101002792800135b7f50286241a000f758010', 'hex'),
  );
  boot[12] = options.chipByte ?? 0x35;
  boot[4] = options.signing ?? 0;
  boot[5] = options.encryption ?? 1;
  boot[0] = options.revision ?? 1;
  const commands: { code: number; payload: Uint8Array }[] = [];
  let closes = 0;
  const faults = { failWriteAt: 0, writes: 0 };
  const respond = (data: Uint8Array) => {
    if (options.stall) return;
    if (options.fragmented)
      for (let i = 0; i < data.length; i += 97) input.enqueue(data.slice(i, i + 97));
    else input.enqueue(data);
  };
  const reply = (data?: Uint8Array) =>
    respond(
      data
        ? Uint8Array.of(79, 75, data.length & 255, data.length >>> 8, ...data)
        : Uint8Array.of(79, 75),
    );
  const port: RomSerialPort = {
    readable: null,
    writable: null,
    getInfo: () => ({ usbVendorId: options.vendor ?? 0x349b, usbProductId: 0x6160 }),
    async open() {
      assert.equal(opened, false);
      opened = true;
      port.readable = new ReadableStream({
        start(c) {
          input = c;
        },
      });
      port.writable = new WritableStream({
        write(frame) {
          // As observed on the board: OK for the first handshake after power-up, FL 0x0102 for later ones.
          if (frame.length === 69 && frame.every((b) => b === 85)) {
            respond(synced ? Uint8Array.of(70, 76, 2, 1) : Uint8Array.of(79, 75));
            synced = true;
            return;
          }
          const code = frame[0],
            length = frame[2] | (frame[3] << 8),
            payload = frame.slice(4);
          assert.equal(length, payload.length);
          assert.ok([0x10, 0x22, 0x30, 0x31, 0x32, 0x36, 0x3a, 0x3b, 0x3d].includes(code));
          assert.equal(
            frame[1],
            code === 0x10 ? 0 : Array.from(frame.slice(2)).reduce((a, b) => a + b, 0) & 255,
          );
          commands.push({ code, payload });
          if (code === 0x31 && ++faults.writes === faults.failWriteAt) {
            respond(Uint8Array.of(70, 76, 3, 0));
            return;
          }
          if (code === options.failCommand) {
            respond(Uint8Array.of(70, 76, 3, 0));
            return;
          }
          const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
          if (code === 0x10) reply(boot);
          else if (code === 0x22) {
            assert.equal(view.getUint32(0, true), 1);
            assert.equal(view.getUint32(4, true), 115200);
            reply();
          } else if (code === 0x3b) {
            assert.equal(view.getUint32(0, true), 0x01014102);
            assert.ok([4, 88].includes(payload.length));
            if (payload.length === 88) {
              assert.equal(payload[17], 0xc8);
              assert.equal(
                createHash('sha256').update(payload.subarray(4)).digest('hex'),
                '002c41f38bb652bdaf89136183aaef70ae11abbf85f554a59d7242748f32e1e0',
              );
            }
            reply();
          } else if (code === 0x36)
            reply(
              Uint8Array.of(...(options.jedec ?? [0xef, 0x40, 0x13]), options.jedecFlag ?? 0x80),
            );
          else if (code === 0x32 || code === 0x3d) {
            const a = view.getUint32(0, true),
              n = view.getUint32(4, true);
            assert.ok(a + n <= flash.length);
            if (code === 0x32) reply(flash.slice(a, a + (options.emptyRead ? n - 1 : n)));
            else {
              const hash = new Uint8Array(
                createHash('sha256')
                  .update(flash.subarray(a, a + n))
                  .digest(),
              );
              if (options.corruptHash) hash[0] ^= 1;
              if (options.shaDelay) setTimeout(() => reply(hash), options.shaDelay);
              else reply(hash);
            }
          } else if (code === 0x30) {
            const a = view.getUint32(0, true),
              b = view.getUint32(4, true);
            assert.equal(a % 4096, 0);
            assert.equal(b, a + 4095);
            assert.ok(b < flash.length);
            flash.fill(255, a, b + 1);
            respond(Uint8Array.of(80, 68, 79, 75));
          } else if (code === 0x31) {
            const a = view.getUint32(0, true);
            assert.equal(payload.length, 36);
            payload.subarray(4).forEach((value, i) => {
              assert.equal(flash[a + i] & value, value);
              flash[a + i] = value;
            });
            reply();
          } else reply();
        },
      });
    },
    async close() {
      closes++;
      opened = false;
    },
  };
  return { port, flash, boot, commands, faults, closes: () => closes };
}
const remoteBackups = new Map<string, ArrayBuffer>();
const bundledFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (url.startsWith('/api/debugger-backups/')) {
    if (init?.method === 'POST') {
      const bytes = init.body as ArrayBuffer;
      remoteBackups.set(url, bytes.slice(0));
      return Response.json({ bytes: bytes.byteLength }, { status: 201 });
    }
    if (url.split('/').length === 4) {
      const entries = [...remoteBackups]
        .filter(([key]) => key.startsWith(`${url}/`))
        .map(([key, bytes]) => ({ hash: key.split('/').at(-1), size: bytes.byteLength }));
      return Response.json(entries);
    }
    const bytes = remoteBackups.get(url);
    return bytes ? new Response(bytes) : new Response('', { status: 404 });
  }
  assert.match(url, /^\/firmware\/dirtyjtag\/(bootloader|dirtyjtag)\.bin$/);
  return new Response(await readFile(path.join(process.cwd(), 'public', url)));
};
const nativeFetch = globalThis.fetch;
test.beforeEach(() => {
  remoteBackups.clear();
  globalThis.fetch = bundledFetch;
});
test.afterEach(() => {
  globalThis.fetch = nativeFetch;
});

test('native ROM frames match documented wire layout; dangerous commands are absent', () => {
  assert.deepEqual(
    Array.from(romFrame(0x30, Uint8Array.of(0, 0, 2, 0, 255, 15, 2, 0))),
    [0x30, 26, 8, 0, 0, 0, 2, 0, 255, 15, 2, 0],
  );
  assert.deepEqual(Array.from(romFrame(0x10)), [16, 0, 0, 0]);
  for (const command of [0x11, 0x18, 0x1a, 0x34, 0x40, 0x41, 0x50, 0x51])
    assert.throws(() => romFrame(command));
});
test('ROM reads protected stock BL616 flash, fragmented packets and SHA without erasing', async () => {
  const mock = romDouble({ fragmented: true }),
    session = await Bl616FlashSession.open(mock.port);
  assert.equal(session.identity.boot.encryption, 1);
  assert.equal(session.identity.boot.chipId, '248602f5b735');
  const bytes = await session.readFlash(0, flashSize());
  assert.deepEqual(bytes, mock.flash);
  await session.verify(0, bytes);
  await session.close();
  assert.equal(mock.closes(), 1);
  assert.ok(mock.commands.every((item) => ![0x30, 0x31].includes(item.code)));
  assert.equal(mock.port.readable?.locked, false);
  assert.equal(mock.port.writable?.locked, false);
});
function flashSize() {
  return 2 ** 19;
}
test('observed c8601600 ROM gets the exact pinned SDK parameters before reading', async () => {
  const mock = romDouble({ jedec: [0xc8, 0x60, 0x16], jedecFlag: 0 }),
    session = await Bl616FlashSession.open(mock.port);
  assert.equal(session.identity.size, 4 * 1024 * 1024);
  assert.equal(session.identity.parameterSource, 'Bouffalo SDK · c86016');
  assert.deepEqual(
    mock.commands.map((x) => x.code),
    [0x10, 0x22, 0x3b, 0x36, 0x3b, 0x36],
  );
  const read = await session.readFlash(0, 2048);
  assert.deepEqual(read, mock.flash.subarray(0, 2048));
  await session.verify(0, read);
  await session.close();
  assert.ok(mock.commands.every((x) => ![0x30, 0x31].includes(x.code)));
});
test('sector plan preserves gaps and partial tail, and activates signed loader last', () => {
  const original = new Uint8Array(flashSize()).fill(0x47);
  const sectors = installationSectors(original, [
    { address: 0, bytes: Uint8Array.of(1, 2) },
    { address: FIRMWARE_ADDRESS + 15, bytes: Uint8Array.of(3, 4) },
  ]);
  assert.deepEqual(
    sectors.map((x) => x.address),
    [FIRMWARE_ADDRESS, 0],
  );
  assert.equal(sectors[0].bytes[14], 0x47);
  assert.equal(sectors[0].bytes[15], 3);
  assert.equal(sectors[1].bytes[2], 0x47);
  assert.equal(original[0], 0x47);
  assert.throws(() =>
    installationSectors(original, [
      { address: 0, bytes: new Uint8Array(16) },
      { address: 15, bytes: new Uint8Array(1) },
    ]),
  );
  assert.throws(() =>
    installationSectors(original, [{ address: original.length, bytes: new Uint8Array(1) }]),
  );
});
test('boot header sector is last after the complete loader body for install and restore', () => {
  const original = new Uint8Array(flashSize()).fill(0x47);
  const install = installationSectors(original, [
    { address: 0, bytes: new Uint8Array(3 * FLASH_SECTOR) },
    { address: FIRMWARE_ADDRESS, bytes: new Uint8Array(2 * FLASH_SECTOR) },
  ]);
  assert.deepEqual(
    install.map((x) => x.address),
    [FIRMWARE_ADDRESS, FIRMWARE_ADDRESS + FLASH_SECTOR, FLASH_SECTOR, 2 * FLASH_SECTOR, 0],
  );
  const restore = installationSectors(original, [{ address: 0, bytes: original.slice() }]);
  assert.equal(restore.at(-1)!.address, 0);
});
test('flash SHA may take longer than a normal command without retrying it', async () => {
  const mock = romDouble({ shaDelay: 50 }),
    session = await Bl616FlashSession.open(mock.port, { timeoutMs: 20 });
  await session.verify(0, mock.flash);
  await session.close();
  assert.equal(mock.commands.filter((x) => x.code === 0x3d).length, 1);
  assert.ok(mock.commands.every((x) => ![0x30, 0x31].includes(x.code)));
});
test('real bundled firmware passes hashes; compiled image carries interface-0 WinUSB BOS', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = bundledFetch;
  try {
    const images = await loadDebuggerPackage();
    assert.equal(images[0].bytes.length, 68976);
    assert.equal(images[1].address, 0x20000);
    const bootSecurity = new DataView(images[0].bytes.buffer).getUint32(120, true);
    assert.equal(bootSecurity & 3, 0);
    assert.equal((bootSecurity >>> 2) & 3, 1, 'first stage requires the AES-128 boot profile');
    const bin = images[1].bytes,
      view = new DataView(bin.buffer);
    assert.equal(new TextDecoder().decode(bin.subarray(0, 4)), 'BFNP');
    assert.equal(view.getUint32(120, true) & 15, 0);
    assert.equal(view.getUint32(124, true), 4096);
    const pattern = Uint8Array.of(5, 15, 33, 0, 1, 28, 16, 5, 0, 0xdf, 0x60, 0xdd, 0xd8);
    const find = (bytes: Uint8Array, needle: Uint8Array) =>
      bytes.findIndex((_value, index) => needle.every((b, n) => bytes[index + n] === b));
    assert.ok(find(bin, pattern) >= 0);
    assert.ok(find(bin, new TextEncoder().encode('WINUSB')) >= 0);
    const msos = Uint8Array.of(
      10,
      0,
      0,
      0,
      0,
      0,
      3,
      6,
      178,
      0,
      8,
      0,
      1,
      0,
      0,
      0,
      168,
      0,
      8,
      0,
      2,
      0,
      0,
      0,
      160,
      0,
    );
    assert.ok(find(bin, msos) >= 0, 'configuration index 0, vendor interface 0, OS 2.0 set');
    assert.equal(bin.length, manifest.images[1].size);
  } finally {
    globalThis.fetch = original;
  }
});
test('installer creates durable original, installs all sectors, then restores byte-for-byte', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = bundledFetch;
  const mock = romDouble({ chipByte: 0x11 }),
    before = mock.flash.slice();
  try {
    const plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
    assert.equal(
      mock.commands.some((x) => x.code === 0x30),
      false,
    );
    const saved = await originalDebuggerBackup(plan.backup.chipId);
    assert.deepEqual(new Uint8Array(saved!.bytes), before);
    const firmwareSectors = Math.ceil(manifest.images[1].size / FLASH_SECTOR);
    const expectedSectors = firmwareSectors + Math.ceil(manifest.images[0].size / FLASH_SECTOR);
    const result = await applyDebuggerInstall(mock.port, plan, () => {});
    assert.equal(result.sectors, expectedSectors);
    const erased = mock.commands
      .filter((x) => x.code === 0x30)
      .map((x) => new DataView(x.payload.buffer).getUint32(0, true));
    assert.ok(erased.slice(0, firmwareSectors).every((a) => a >= FIRMWARE_ADDRESS));
    assert.equal(erased[firmwareSectors], FLASH_SECTOR);
    assert.equal(erased.at(-1), 0);
    const installBytes = await loadDebuggerPackage();
    installBytes.forEach((x) =>
      assert.deepEqual(mock.flash.subarray(x.address, x.address + x.bytes.length), x.bytes),
    );
    assert.deepEqual(
      mock.flash.subarray(68976, FIRMWARE_ADDRESS),
      before.subarray(68976, FIRMWARE_ADDRESS),
    );
    const restore = await prepareDebuggerInstall(mock.port, 'restore', () => {});
    await applyDebuggerInstall(mock.port, restore, () => {});
    assert.deepEqual(mock.flash, before);
    assert.deepEqual(
      new Uint8Array((await originalDebuggerBackup(plan.backup.chipId))!.bytes),
      before,
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test('changed flash or different board is rejected before the first erase', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = bundledFetch;
  const mock = romDouble({ chipByte: 0x12 });
  try {
    const plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
    const other = romDouble({ chipByte: 0x13 });
    await assert.rejects(
      applyDebuggerInstall(other.port, plan, () => {}),
      /другая плата/,
    );
    assert.ok(other.commands.every((x) => x.code !== 0x30));
    mock.flash[200] ^= 1;
    await assert.rejects(
      applyDebuggerInstall(mock.port, plan, () => {}),
      /SHA-256/,
    );
    assert.ok(mock.commands.every((x) => x.code !== 0x30));
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('missing server recovery copy stops installation before reopening the board', async () => {
  const mock = romDouble({ chipByte: 0x71 });
  const plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
  const before = mock.commands.length;
  remoteBackups.clear();
  await assert.rejects(
    applyDebuggerInstall(mock.port, plan, () => {}),
    /копия недоступна/,
  );
  assert.equal(mock.commands.length, before);
  assert.ok(mock.commands.every((item) => item.code !== 0x30));
});

test('server original recovers after browser storage loss without a downloaded file', async () => {
  const mock = romDouble({ chipByte: 0x72 });
  const before = mock.flash.slice();
  const plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
  await applyDebuggerInstall(mock.port, plan, () => {});
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase('yosis.debugger-backups');
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error);
  });
  const restore = await prepareDebuggerInstall(mock.port, 'restore', () => {});
  assert.equal(restore.original!.hash, plan.backup.hash);
  await applyDebuggerInstall(mock.port, restore, () => {});
  assert.deepEqual(mock.flash, before);
});
test('corrupt firmware package is rejected without opening the ROM port', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const reply = await bundledFetch(input);
    const bytes = new Uint8Array(await reply.arrayBuffer());
    bytes[16] ^= 1;
    return new Response(bytes);
  };
  const mock = romDouble();
  try {
    await assert.rejects(
      prepareDebuggerInstall(mock.port, 'install', () => {}),
      /SHA-256 пакета/,
    );
    assert.equal(mock.commands.length, 0);
    assert.equal(mock.closes(), 0);
  } finally {
    globalThis.fetch = original;
  }
});
test('flash/ROM mismatch, FL, short read and timeout release port and never retry writes', async () => {
  for (const options of [
    { vendor: 0x403 },
    { signing: 1 },
    { encryption: 0 },
    { revision: 2 },
    { jedecFlag: 0 },
    { failCommand: 0x36 },
    { stall: true },
  ]) {
    const mock = romDouble(options);
    await assert.rejects(Bl616FlashSession.open(mock.port, { timeoutMs: 15 }));
    assert.ok(mock.commands.every((x) => ![0x30, 0x31].includes(x.code)));
  }
  const short = romDouble({ emptyRead: true }),
    reader = await Bl616FlashSession.open(short.port);
  await assert.rejects(reader.readFlash(0, 2048), /Неполное чтение/);
  await reader.close();
  const fail = romDouble({ failCommand: 0x31 }),
    writer = await Bl616FlashSession.open(fail.port);
  await assert.rejects(writer.writeSector(0, new Uint8Array(FLASH_SECTOR)), /FL/);
  await writer.close();
  assert.equal(fail.commands.filter((x) => x.code === 0x31).length, 1);
  assert.equal(fail.closes(), 1);
});
test('corrupted stored backup is rejected before any restore traffic', async () => {
  const mock = romDouble({ chipByte: 0x21 }),
    session = await Bl616FlashSession.open(mock.port);
  const backup = await saveDebuggerBackup(session.identity, mock.flash);
  await session.close();
  const bad = structuredClone(backup);
  new Uint8Array(bad.bytes)[100] ^= 1;
  await assert.rejects(validateDebuggerBackup(bad), /повреждена/);
  assert.equal(await firmwareHash(new Uint8Array(backup.bytes)), backup.hash);
});
test('interrupted installation retains the original and restores all flash after reconnect', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = bundledFetch;
  const mock = romDouble({ chipByte: 0x31 }),
    before = mock.flash.slice();
  try {
    const plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
    mock.faults.failWriteAt = 5;
    await assert.rejects(
      applyDebuggerInstall(mock.port, plan, () => {}),
      /FL/,
    );
    assert.notDeepEqual(mock.flash, before);
    assert.ok(
      mock.commands
        .filter((x) => x.code === 0x30)
        .every((x) => new DataView(x.payload.buffer).getUint32(0, true) >= FIRMWARE_ADDRESS),
    );
    assert.deepEqual(
      new Uint8Array((await originalDebuggerBackup(plan.backup.chipId))!.bytes),
      before,
    );
    mock.faults.failWriteAt = 0;
    const restore = await prepareDebuggerInstall(mock.port, 'restore', () => {});
    await applyDebuggerInstall(mock.port, restore, () => {});
    assert.deepEqual(mock.flash, before);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test('cleared or damaged IndexedDB backup prevents installation before opening ROM', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = bundledFetch;
  try {
    for (const damage of [false, true]) {
      const mock = romDouble({ chipByte: damage ? 0x41 : 0x42 }),
        plan = await prepareDebuggerInstall(mock.port, 'install', () => {});
      const commandCount = mock.commands.length;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('yosis.debugger-backups', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('backups', 'readwrite'),
          store = tx.objectStore('backups');
        if (damage) {
          const corrupt = structuredClone(plan.backup);
          new Uint8Array(corrupt.bytes)[12] ^= 1;
          store.put(corrupt);
        } else store.delete(plan.backup.key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await assert.rejects(
        applyDebuggerInstall(mock.port, plan, () => {}),
        /повреждена/,
      );
      assert.equal(mock.commands.length, commandCount);
    }
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test('wire journal records frames, truncates long payloads and names the failed command', async () => {
  const journal = new RomTranscript(),
    mock = romDouble({ chipByte: 0x51 }),
    session = await Bl616FlashSession.open(mock.port, { transcript: journal });
  await session.readFlash(0, 4096);
  await session.close();
  const text = journal.text();
  assert.match(text, /tx {3}69 {2}5555/);
  assert.match(text, /tx {4}4 {2}10000000/);
  assert.match(text, /tx {3}12 {2}22[0-9a-f]{2}0800/);
  assert.match(text, /rx 2052 {2}4f4b0008[0-9a-f]{184}…/);
  assert.match(text, /# ROM 0x06160001 sign=0 encrypt=1 chip=248602f5b751/);
  const failed = new RomTranscript();
  await assert.rejects(
    Bl616FlashSession.open(romDouble({ failCommand: 0x22 }).port, { transcript: failed }),
  );
  assert.match(failed.text(), /# ОШИБКА Тактирование ROM \(0x22\): BL616 вернул FL 0x0003/);
  const long = new RomTranscript();
  for (let i = 0; i < 7000; i++) long.note(String(i));
  const lines = long.text().trim().split('\n');
  assert.equal(lines.length, 6001);
  assert.match(lines[2000], /пропущено строк: 1000/);
  assert.match(lines.at(-1)!, /# 6999$/);
});
test('backup file restores a board in a fresh profile; wrong name, content or board is rejected', async () => {
  const mock = romDouble({ chipByte: 0x61 }),
    chipId = '248602f5b761';
  const factory = Uint8Array.from({ length: flashSize() }, (_, i) => (i * 29 + 7) & 255),
    hash = await firmwareHash(factory);
  const name = backupFileName({ chipId, hash });
  assert.equal(name, `bl616-${chipId}-${hash}.bin`);
  await assert.rejects(readBackupFile('backup.bin', factory), /Имя файла/);
  const damaged = factory.slice();
  damaged[9] ^= 1;
  await assert.rejects(readBackupFile(name, damaged), /SHA-256 файла/);
  await assert.rejects(readBackupFile(name, factory.subarray(0, 4097)), /Размер файла/);
  const file = await readBackupFile(name.replace('.bin', ' (1).bin'), factory);
  assert.equal(file.chipId, chipId);
  const other = romDouble({ chipByte: 0x62 });
  await assert.rejects(
    prepareDebuggerInstall(other.port, 'restore', () => {}, undefined, { restoreFile: file }),
    /относится к плате/,
  );
  assert.ok(other.commands.every((x) => x.code !== 0x30));
  const plan = await prepareDebuggerInstall(mock.port, 'restore', () => {}, undefined, {
    restoreFile: file,
  });
  assert.equal(plan.original!.hash, hash);
  assert.ok(mock.commands.every((x) => x.code !== 0x30));
  assert.equal(
    (await originalDebuggerBackup(chipId))!.hash,
    hash,
    'the imported file stays the earliest copy',
  );
  await applyDebuggerInstall(mock.port, plan, () => {});
  assert.deepEqual(mock.flash, factory);
  await assert.rejects(
    prepareDebuggerInstall(mock.port, 'restore', () => {}, undefined, { restoreFile: file }),
    /Восстановление не требуется/,
  );
});
