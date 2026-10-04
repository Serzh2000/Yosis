/** Read-only Bouffalo ROM probe. No image, memory, flash or eFuse commands exist here. */
export interface RomSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

export const BOUFFALO_ROM_FILTERS = [
  // Native BL616 ROM identity observed on the user's stock Tang Nano 20K.
  { usbVendorId: 0x349b, usbProductId: 0x6160 },
  { usbVendorId: 0xffff, usbProductId: 0xffff },
  { usbVendorId: 0x42bf, usbProductId: 0xb210 },
] as const;

export interface RomBootInfo {
  usbId: string;
  version: string;
  signing: number;
  encryption: number;
  chipId: string;
  raw: string;
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Offsets follow Bouffalo's BL616 img loader, not the BL602 boot-info layout. */
export function decodeBl616BootInfo(bytes: Uint8Array, usbId: string): RomBootInfo {
  if (bytes.length < 20 || bytes.length > 64)
    throw new Error('Неожиданный размер ответа BootInfo BL616.');
  if (bytes.subarray(0, 4).every((byte) => byte === 0xff))
    throw new Error(
      'На порту уже исполняется загрузчик; это не ответ ROM. Войдите в UPDATE заново.',
    );
  if (bytes.every((byte) => byte === 0) || bytes.every((byte) => byte === 0xff))
    throw new Error('Некорректный ответ BootInfo.');
  return {
    usbId,
    version: '0x' + hex(bytes.slice(0, 4).reverse()),
    signing: bytes[4],
    encryption: bytes[5],
    chipId: hex(bytes.slice(12, 18).reverse()),
    raw: hex(bytes),
  };
}

/**
 * Sources: Bouffalo bflb_interface_uart.py (handshake/ack framing),
 * bflb_img_loader.py (GetBootInfo 0x10 and BL616 offsets).
 * A successful read does NOT prove that the ROM accepts an unsigned RAM image.
 */
export async function probeBl616Rom(
  port: RomSerialPort,
  options: {
    timeoutMs?: number;
    onStage?: (stage: string) => void;
  } = {},
): Promise<RomBootInfo> {
  const timeoutMs = options.timeoutMs ?? 2000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000)
    throw new Error('Некорректный таймаут ROM.');
  const usb = port.getInfo();
  if (
    !BOUFFALO_ROM_FILTERS.some(
      (filter) =>
        filter.usbVendorId === usb.usbVendorId && filter.usbProductId === usb.usbProductId,
    )
  )
    throw new Error(
      'Нужен порт загрузчика Bouffalo. Обычные USB Debugger COM9/COM11 относятся к FTDI, а не ROM.',
    );
  const usbId = `${usb.usbVendorId!.toString(16).padStart(4, '0')}:${usb.usbProductId!.toString(16).padStart(4, '0')}`;
  let opened = false;
  let finishing = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  let pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | undefined;
  let pendingWrite: Promise<void> | undefined;
  let pending = new Uint8Array(0);
  let failure: unknown;
  let bootInfo: RomBootInfo | undefined;

  async function timed<T>(promise: Promise<T>, stage: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(`Нет ответа ROM: ${stage}. Проверьте режим UPDATE и переподключите USB.`),
              ),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function send(bytes: Uint8Array) {
    pendingWrite = writer!.write(bytes);
    await timed(pendingWrite, 'отправка');
    pendingWrite = undefined;
  }
  async function readExact(length: number): Promise<Uint8Array> {
    // One deadline covers the whole response, including empty or tiny fragments.
    return timed(
      (async () => {
        while (pending.length < length) {
          pendingRead ??= reader!.read();
          const chunk = await pendingRead;
          pendingRead = undefined;
          if (chunk.done) throw new Error('Порт ROM отключён до окончания ответа.');
          if (pending.length + chunk.value.length > 256)
            throw new Error('Порт вернул слишком много данных для BootInfo.');
          const combined = new Uint8Array(pending.length + chunk.value.length);
          combined.set(pending);
          combined.set(chunk.value, pending.length);
          pending = combined;
        }
        const result = pending.slice(0, length);
        pending = pending.slice(length);
        return result;
      })(),
      'чтение',
    );
  }
  async function acknowledge() {
    const ack = await readExact(2);
    if (ack[0] === 0x46 && ack[1] === 0x4c) {
      const code = await readExact(2);
      throw new Error(`ROM вернул FL, код 0x${hex(code.slice().reverse())}.`);
    }
    if (ack[0] !== 0x4f || ack[1] !== 0x4b) throw new Error('Не получен ответ OK от ROM.');
  }
  async function drainHandshake() {
    // Some ROM revisions return FL0201 for trailing 0x55 after their first OK.
    // Drain only before GetBootInfo; retain the outstanding read across an idle gap.
    let total = pending.length;
    pending = new Uint8Array(0);
    const deadline = Date.now() + 500;
    while (Date.now() < deadline) {
      pendingRead ??= reader!.read();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let chunk: ReadableStreamReadResult<Uint8Array> | undefined;
      try {
        chunk = await Promise.race([
          pendingRead,
          new Promise<undefined>((resolve) => {
            timer = setTimeout(() => resolve(undefined), 100);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      if (!chunk) return;
      pendingRead = undefined;
      if (chunk.done) throw new Error('ROM-порт отключён после handshake.');
      total += chunk.value.length;
      if (total > 256) throw new Error('Неожиданный поток данных от ROM во время handshake.');
    }
    throw new Error('ROM не завершил handshake. Переподключите USB.');
  }

  try {
    options.onStage?.('Открываем ROM-порт…');
    // USB CDC ignores physical UART rate; the upstream handshake uses 69 bytes at 115200.
    const opening = port.open({ baudRate: 115200 }).then(async () => {
      opened = true;
      if (finishing) await port.close();
    });
    await timed(opening, 'открытие порта');
    if (!port.readable || !port.writable)
      throw new Error('ROM-порт не предоставляет чтение и запись.');
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    options.onStage?.('Проверяем ответ ROM…');
    await send(new Uint8Array(69).fill(0x55));
    // After an earlier session the ROM is already in command mode and answers FL to the 0x55 run.
    const hello = await readExact(2);
    if (hello[0] === 0x46 && hello[1] === 0x4c) await readExact(2);
    else if (hello[0] !== 0x4f || hello[1] !== 0x4b) throw new Error('Не получен ответ OK от ROM.');
    await drainHandshake();
    options.onStage?.('Читаем BootInfo…');
    await send(new Uint8Array([0x10, 0, 0, 0]));
    await acknowledge();
    let size = await readExact(2);
    // Upstream accommodates repeated OK packets before the response length.
    for (let count = 0; size[0] === 0x4f && size[1] === 0x4b; count++) {
      if (count === 2) throw new Error('Слишком много повторных OK от ROM.');
      size = await readExact(2);
    }
    const length = size[0] | (size[1] << 8);
    if (length < 20 || length > 64) throw new Error(`Неожиданная длина BootInfo: ${length}.`);
    bootInfo = decodeBl616BootInfo(await readExact(length), usbId);
  } catch (cause) {
    failure = cause;
  } finally {
    finishing = true;
    // Cancel pending stream operations before releasing locks. A failed session is never reused.
    const cleanup: Promise<unknown>[] = [];
    if (reader) cleanup.push(reader.cancel().catch(() => undefined));
    if (writer && pendingWrite) cleanup.push(writer.abort().catch(() => undefined));
    if (pendingRead) cleanup.push(pendingRead.catch(() => undefined));
    if (pendingWrite) cleanup.push(pendingWrite.catch(() => undefined));
    if (cleanup.length)
      await timed(Promise.all(cleanup), 'закрытие потоков').catch(() => undefined);
    try {
      reader?.releaseLock();
    } catch {
      /* A detached/hung port can retain a pending operation. */
    }
    try {
      writer?.releaseLock();
    } catch {
      /* A detached/hung port can retain a pending operation. */
    }
    if (opened) {
      try {
        await timed(port.close(), 'закрытие порта');
      } catch (cause) {
        failure ??= cause;
      }
    }
  }
  if (failure) throw failure;
  return bootInfo!;
}
