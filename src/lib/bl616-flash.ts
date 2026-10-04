import {
  BOUFFALO_ROM_FILTERS,
  decodeBl616BootInfo,
  type RomBootInfo,
  type RomSerialPort,
} from './bl616-rom';
import flashParameters from './bl616-flash-parameters.json';

/** BL616 native ROM flash path (Bouffalo load_function=2), not an IF/RAM image loader.
 * Packet layouts: openbouffalo/bflb-mcu-tool@9caeb5d7 bflb_eflash_loader.py,
 * cross-checked with Bouffalo SDK boot2 ISP. No eFuse, chip-erase, arbitrary
 * memory, image execution, or automatic retry commands are exposed here. */
const CHUNK = 2048;
// A write frame must fit one 64-byte USB packet (8 header + 32 data = 40 bytes). On the
// board the ROM went silent after a multi-packet write frame twice (2056 bytes: 24th
// write; 264 bytes: 7th), while every single-packet frame has been answered.
const WRITE_CHUNK = 32;
export const FLASH_SECTOR = 4096;
export const FIRMWARE_ADDRESS = 0x20000;
export const MAX_DEBUGGER_FLASH = 16 * 1024 * 1024;
const ALLOWED = new Set([0x10, 0x22, 0x30, 0x31, 0x32, 0x36, 0x3a, 0x3b, 0x3d]);
export const bytesHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export async function firmwareHash(bytes: Uint8Array): Promise<string> {
  return bytesHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))));
}
export function romFrame(command: number, payload = new Uint8Array(), checksum = true) {
  if (!ALLOWED.has(command) || payload.length > CHUNK + 8)
    throw new Error('Команда не входит в протокол установки BL616.');
  const bytes = new Uint8Array(4 + payload.length);
  bytes[0] = command;
  bytes[2] = payload.length & 255;
  bytes[3] = payload.length >>> 8;
  bytes.set(payload, 4);
  if (checksum) bytes[1] = bytes.subarray(2).reduce((sum, value) => sum + value, 0) & 255;
  return bytes;
}
function words(...values: number[]) {
  const result = new Uint8Array(values.length * 4),
    view = new DataView(result.buffer);
  values.forEach((value, index) => view.setUint32(index * 4, value, true));
  return result;
}
export interface DebuggerFlash {
  boot: RomBootInfo;
  jedec: string;
  size: number;
  parameterSource?: string;
}
export interface FlashProgress {
  stage: string;
  done: number;
  total: number;
}
/** Wire journal of one ROM session for hardware diagnosis. Long payloads are cut to
 * 96 bytes; a full-flash read keeps the first 2000 and the last 4000 lines. */
export class RomTranscript {
  private head: string[] = [];
  private tail: string[] = [];
  private dropped = 0;
  private started = Date.now();
  private push(line: string) {
    const entry = `+${String(Date.now() - this.started).padStart(7)}ms ${line}`;
    if (this.head.length < 2000) this.head.push(entry);
    else {
      this.tail.push(entry);
      if (this.tail.length > 4000) {
        this.tail.shift();
        this.dropped++;
      }
    }
  }
  note(text: string) {
    this.push(`# ${text}`);
  }
  wire(direction: 'tx' | 'rx', bytes: Uint8Array) {
    const shown = bytes.subarray(0, 96);
    this.push(
      `${direction} ${String(bytes.length).padStart(4)}  ${bytesHex(shown)}${bytes.length > shown.length ? '…' : ''}`,
    );
  }
  get empty() {
    return !this.head.length;
  }
  text() {
    return (
      [
        ...this.head,
        ...(this.dropped ? [`# … пропущено строк: ${this.dropped}`] : []),
        ...this.tail,
      ].join('\n') + '\n'
    );
  }
}
type Options = {
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: FlashProgress) => void;
  transcript?: RomTranscript;
};

export class Bl616FlashSession {
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private writer?: WritableStreamDefaultWriter<Uint8Array>;
  private pendingRead?: Promise<ReadableStreamReadResult<Uint8Array>>;
  private pending = new Uint8Array();
  private opened = false;
  private closed = false;
  private failed = false;
  private busy = false;
  private timeout: number;
  private flash?: DebuggerFlash;
  private constructor(
    private port: RomSerialPort,
    private options: Options,
  ) {
    this.timeout = options.timeoutMs ?? 3000;
    if (!Number.isInteger(this.timeout) || this.timeout < 1 || this.timeout > 10000)
      throw new Error('Некорректный таймаут BL616.');
  }
  static async open(port: RomSerialPort, options: Options = {}) {
    const session = new Bl616FlashSession(port, options);
    const info = port.getInfo();
    if (
      !BOUFFALO_ROM_FILTERS.some(
        (filter) =>
          filter.usbVendorId === info.usbVendorId && filter.usbProductId === info.usbProductId,
      )
    )
      throw new Error('Выбери порт Bouffalo CDC в режиме UPDATE/BOOT.');
    try {
      await session.timed(
        port.open({ baudRate: 115200 }).then(async () => {
          session.opened = true;
          if (session.closed) await port.close();
        }),
        session.timeout,
      );
      if (!port.readable || !port.writable)
        throw new Error('У ROM-порта нет потоков чтения и записи.');
      session.reader = port.readable.getReader();
      session.writer = port.writable.getWriter();
      await session.drain();
      session.options.onProgress?.({ stage: 'Handshake штатного ROM…', done: 0, total: 0 });
      await session.send(new Uint8Array(69).fill(0x55));
      // A ROM that already completed a handshake since power-up parses the 0x55 run as a
      // command and answers FL (observed 0x0102). It stays in command mode: BootInfo below
      // confirms synchronisation, so a second session needs no USB reconnect.
      try {
        const hello = bytesHex(await session.exact(2));
        if (hello === '464c')
          options.transcript?.note(
            `ROM уже в командном режиме (FL 0x${bytesHex((await session.exact(2)).reverse())}); handshake не требуется`,
          );
        else if (hello !== '4f4b') throw new Error('BL616 не подтвердил команду.');
      } catch (error) {
        throw new Error(
          `Handshake ROM: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      await session.drain();
      const boot = decodeBl616BootInfo(
        await session.command(0x10, new Uint8Array(), 64, false),
        `${info.usbVendorId!.toString(16)}:${info.usbProductId!.toString(16)}`,
      );
      // The bundled first-stage image declares AES-128 encryption and no signing.
      // Other ROM/protection combinations need their own compatibility check.
      if (boot.version !== '0x06160001' || boot.signing !== 0 || boot.encryption !== 1)
        throw new Error(
          'Эта ревизия или режим защиты BL616 пока не проверены для данного пакета. Запись не началась.',
        );
      // Official native-ROM flash path. CDC ignores the physical UART baud rate.
      await session.command(0x22, words(1, 115200));
      const raw = Uint8Array.from(boot.raw.match(/../g)!.map((byte) => parseInt(byte, 16)));
      const swUsage = new DataView(raw.buffer).getUint32(8, true),
        pin = (swUsage >>> 14) & 63;
      if (pin > 3) throw new Error('Пакет рассчитан на внутреннюю flash BL616 Tang Nano 20K.');
      await session.command(0x3b, words(0x01014100 | pin));
      const jedec = await session.command(0x36, new Uint8Array(), 4);
      let parameterSource = 'ROM';
      const id = bytesHex(jedec.subarray(0, 3));
      // BL616 ROM can return a valid JEDEC with flag 00 when its table lacks the
      // part. Official loader then sends an 84-byte spi_flash_cfg_type (0x3B).
      // Accept only the pinned SDK parameter record reviewed for c86016.
      if (jedec.length === 4 && jedec[3] === 0 && id === 'c86016') {
        const record = flashParameters.parameters.c86016;
        const params = Uint8Array.from(record.hex.match(/../g)!.map((byte) => parseInt(byte, 16)));
        if (
          flashParameters.version !== 1 ||
          params.length !== 84 ||
          params[13] !== jedec[0] ||
          (await firmwareHash(params)) !== record.sha256
        )
          throw new Error('Параметры flash SDK повреждены. Запись запрещена.');
        const payload = new Uint8Array(4 + params.length);
        payload.set(words(0x01014100 | pin));
        payload.set(params, 4);
        await session.command(0x3b, payload);
        const repeated = await session.command(0x36, new Uint8Array(), 4);
        if (
          repeated.length !== 4 ||
          bytesHex(repeated.subarray(0, 3)) !== id ||
          ![0, 0x80].includes(repeated[3])
        )
          throw new Error('Идентификатор flash изменился после настройки SDK. Запись запрещена.');
        parameterSource = 'Bouffalo SDK · c86016';
      }
      // ROM's 0x80 flag says that its flash parameter table recognized this JEDEC.
      if (
        jedec.length !== 4 ||
        (parameterSource === 'ROM' && jedec[3] !== 0x80) ||
        [0, 255].includes(jedec[0]) ||
        jedec[2] < 19 ||
        jedec[2] > 24
      )
        throw new Error(
          `ROM не подтвердил параметры flash (JEDEC: ${bytesHex(jedec)}, pin: ${pin}). Запись не началась.`,
        );
      const size = 2 ** jedec[2];
      if (size > MAX_DEBUGGER_FLASH || size <= FIRMWARE_ADDRESS)
        throw new Error('Неподдерживаемая ёмкость flash BL616.');
      session.flash = { boot, jedec: id, size, parameterSource };
      options.transcript?.note(
        `ROM ${boot.version} sign=${boot.signing} encrypt=${boot.encryption} chip=${boot.chipId} jedec=${bytesHex(jedec)} pin=${pin} параметры: ${parameterSource}`,
      );
      return session;
    } catch (error) {
      options.transcript?.note(
        `Сессия не открыта: ${error instanceof Error ? error.message : String(error)}`,
      );
      await session.close();
      throw error;
    }
  }
  get identity(): DebuggerFlash {
    if (!this.flash) throw new Error('BL616 не проверен.');
    return this.flash;
  }
  private ensure() {
    if (this.closed || this.failed)
      throw new Error('Сессия BL616 закрыта. Переподключи плату в BOOT.');
    this.options.signal?.throwIfAborted();
  }
  private async timed<T>(task: Promise<T>, milliseconds = this.timeout): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        task,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            this.failed = true;
            reject(
              new Error(
                'BL616 не ответил вовремя. Команда не повторяется; для восстановления переподключи плату в BOOT.',
              ),
            );
          }, milliseconds);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  private async send(data: Uint8Array) {
    this.ensure();
    this.options.transcript?.wire('tx', data);
    // Tells a stalled OUT pipe apart from a frame that was delivered but never acknowledged.
    try {
      await this.timed(this.writer!.write(data));
    } catch (error) {
      this.options.transcript?.note('передача в порт не завершилась');
      throw error;
    }
  }
  private async exact(length: number, timeout = this.timeout) {
    return this.timed(
      (async () => {
        while (this.pending.length < length) {
          this.pendingRead ??= this.reader!.read();
          const next = await this.pendingRead;
          this.pendingRead = undefined;
          if (next.done)
            throw new Error(
              'Плата отключена до окончания операции. Верни её в BOOT для восстановления.',
            );
          this.options.transcript?.wire('rx', next.value);
          if (this.pending.length + next.value.length > CHUNK + 128)
            throw new Error('Некорректный ответ BL616.');
          const joined = new Uint8Array(this.pending.length + next.value.length);
          joined.set(this.pending);
          joined.set(next.value, this.pending.length);
          this.pending = joined;
        }
        const result = this.pending.slice(0, length);
        this.pending = this.pending.slice(length);
        return result;
      })(),
      timeout,
    );
  }
  private async ack(timeout = this.timeout, allowPending = false) {
    const deadline = Date.now() + timeout;
    do {
      const result = bytesHex(await this.exact(2, Math.max(1, deadline - Date.now())));
      if (result === '4f4b') return;
      if (result === '464c') {
        const code = await this.exact(2);
        throw new Error(
          `BL616 вернул FL 0x${bytesHex(code.slice().reverse())}. Запись остановлена.`,
        );
      }
      if (result !== '5044' || !allowPending) throw new Error('BL616 не подтвердил команду.');
      this.options.onProgress?.({ stage: 'Стираем выбранный сектор…', done: 0, total: 0 });
    } while (Date.now() < deadline);
    throw new Error('Истекло время стирания сектора BL616.');
  }
  private async drain() {
    let count = this.pending.length;
    this.pending = new Uint8Array();
    const deadline = Date.now() + 500;
    while (Date.now() < deadline) {
      this.pendingRead ??= this.reader!.read();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let next: ReadableStreamReadResult<Uint8Array> | undefined;
      try {
        next = await Promise.race([
          this.pendingRead,
          new Promise<undefined>((resolve) => {
            timer = setTimeout(() => resolve(undefined), 100);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      if (!next) return;
      this.pendingRead = undefined;
      if (!next.done) {
        this.options.transcript?.note('очистка входа');
        this.options.transcript?.wire('rx', next.value);
      }
      if (next.done || (count += next.value.length) > 256)
        throw new Error('ROM не завершил handshake.');
    }
    throw new Error('ROM продолжает отдавать данные handshake.');
  }
  private async command(
    opcode: number,
    payload = new Uint8Array(),
    responseMax = 0,
    checksum = true,
    responseTimeout = this.timeout,
  ) {
    this.ensure();
    if (this.busy) throw new Error('Другая команда BL616 ещё выполняется.');
    this.busy = true;
    try {
      await this.send(romFrame(opcode, payload, checksum));
      await this.ack(opcode === 0x30 ? 10000 : responseTimeout, opcode === 0x30);
      if (!responseMax) return new Uint8Array();
      let size = await this.exact(2, responseTimeout);
      for (let repeated = 0; size[0] === 79 && size[1] === 75; repeated++) {
        if (repeated >= 2) throw new Error('Повторные ответы ROM.');
        size = await this.exact(2, responseTimeout);
      }
      const length = size[0] | (size[1] << 8);
      if (length < 1 || length > responseMax)
        throw new Error('Неподдерживаемая длина ответа BL616.');
      return await this.exact(length, responseTimeout);
    } catch (error) {
      this.failed = true;
      const label: Record<number, string> = {
        0x10: 'BootInfo',
        0x22: 'Тактирование ROM',
        0x30: 'Стирание сектора',
        0x31: 'Запись flash',
        0x32: 'Чтение flash',
        0x36: 'JEDEC',
        0x3a: 'Проверка записи',
        0x3b: 'Настройка flash',
        0x3d: 'SHA-256 flash',
      };
      const message = `${label[opcode]} (0x${opcode.toString(16)}): ${error instanceof Error ? error.message : String(error)}`;
      this.options.transcript?.note(`ОШИБКА ${message}`);
      throw new Error(message, { cause: error });
    } finally {
      this.busy = false;
    }
  }
  private range(address: number, length: number) {
    if (
      !Number.isInteger(address) ||
      !Number.isInteger(length) ||
      address < 0 ||
      length < 1 ||
      address + length > this.identity.size
    )
      throw new Error('Диапазон выходит за flash отладчика.');
  }
  async readFlash(address: number, length: number, stage = 'Резервная копия BL616') {
    this.range(address, length);
    const bytes = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += CHUNK) {
      const count = Math.min(CHUNK, length - offset),
        data = await this.command(0x32, words(address + offset, count), count);
      if (data.length !== count) {
        this.failed = true;
        throw new Error('Неполное чтение flash. Запись запрещена.');
      }
      bytes.set(data, offset);
      this.options.onProgress?.({ stage, done: offset + count, total: length });
    }
    return bytes;
  }
  async verify(address: number, bytes: Uint8Array) {
    this.range(address, bytes.length);
    // Bouffalo's loader increases the SHA deadline for images above 2 MiB:
    // 2 * (MiB / 2 + 1) seconds. A whole-flash check needs 6 s for 4 MiB,
    // and 18 s for our 16 MiB upper bound; the normal 3 s command budget is too short.
    const shaTimeout = Math.max(
      this.timeout,
      3000,
      Math.ceil(2000 * (bytes.length / (2 * 1024 * 1024) + 1)),
    );
    const remote = await this.command(0x3d, words(address, bytes.length), 32, true, shaTimeout);
    if (bytesHex(remote) !== (await firmwareHash(bytes))) {
      this.failed = true;
      throw new Error(
        'SHA-256 записанной flash не совпал. Верни BOOT и восстанови резервную копию.',
      );
    }
  }
  async writeSector(address: number, bytes: Uint8Array) {
    this.range(address, bytes.length);
    if (address % FLASH_SECTOR || bytes.length !== FLASH_SECTOR)
      throw new Error('Разрешена запись только полных секторов 4096 байт.');
    await this.command(0x30, words(address, address + FLASH_SECTOR - 1));
    for (let offset = 0; offset < bytes.length; offset += WRITE_CHUNK) {
      const payload = new Uint8Array(4 + WRITE_CHUNK);
      payload.set(words(address + offset));
      payload.set(bytes.subarray(offset, offset + WRITE_CHUNK), 4);
      await this.command(0x31, payload);
    }
    await this.command(0x3a);
    await this.verify(address, bytes);
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    const cleanup: Promise<unknown>[] = [];
    if (this.reader) cleanup.push(this.reader.cancel().catch(() => {}));
    if (this.writer) cleanup.push(this.writer.abort().catch(() => {}));
    await this.timed(Promise.all(cleanup)).catch(() => {});
    try {
      this.reader?.releaseLock();
    } catch {
      /* detached stream */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* detached stream */
    }
    if (this.opened) await this.timed(this.port.close()).catch(() => {});
  }
}

export interface FirmwareImage {
  address: number;
  bytes: Uint8Array;
}
export function installationSectors(original: Uint8Array, images: FirmwareImage[]) {
  if (!original.length || original.length % FLASH_SECTOR || original.length > MAX_DEBUGGER_FLASH)
    throw new Error('Некорректная резервная копия.');
  const touched = new Set<number>();
  const ranges: [number, number][] = [];
  const next = original.slice();
  for (const image of images) {
    const end = image.address + image.bytes.length;
    if (
      !image.bytes.length ||
      !Number.isInteger(image.address) ||
      image.address < 0 ||
      end > original.length ||
      ranges.some(([a, b]) => image.address < b && end > a)
    )
      throw new Error('Недопустимые или пересекающиеся образы.');
    ranges.push([image.address, end]);
    next.set(image.bytes, image.address);
    for (
      let sector = Math.floor(image.address / FLASH_SECTOR) * FLASH_SECTOR;
      sector < end;
      sector += FLASH_SECTOR
    )
      touched.add(sector);
  }
  // Secondary firmware, then the first-stage body, then sector zero containing
  // the boot header. This reduces the incomplete-loader window; it is not atomic.
  const priority = (address: number) => (address === 0 ? 2 : address < FIRMWARE_ADDRESS ? 1 : 0);
  return Array.from(touched)
    .sort((a, b) => priority(a) - priority(b) || a - b)
    .map((address) => ({ address, bytes: next.slice(address, address + FLASH_SECTOR) }));
}
