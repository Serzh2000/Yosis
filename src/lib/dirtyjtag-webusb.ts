import type { JtagTransport } from './gowin-jtag';
import type { WebUsbDevice } from './ftdi-webusb';

export const DIRTYJTAG_USB_FILTER = { vendorId: 0x1209, productId: 0xc0ca } as const;
const REVERSE = Uint8Array.from({ length: 256 }, (_, byte) => {
  let reversed = 0;
  for (let bit = 0; bit < 8; bit++) reversed |= ((byte >>> bit) & 1) << (7 - bit);
  return reversed;
});
type Step = { packet: Uint8Array; read: number; decode?: (bytes: Uint8Array) => number[] };

/** Translate only the clock commands emitted by GowinJtag. No FTDI control requests
 * reach DirtyJTAG. DJTAG2 shifts MSB first; the established Gowin scanner uses LSB
 * first MPSSE framing. This boundary preserves its tested TAP/bitstream sequence.
 * Protocol source: pepijndevos/bl616_dirtyjtag@64fe564, dirtyjtag.c + jtag_gpio.c.
 */
function translate(source: Uint8Array): Step[] {
  if (!source.length || source.length > 1024 * 1024)
    throw new Error('Некорректный размер команды JTAG.');
  const steps: Step[] = [];
  let offset = 0;
  const requireBytes = (count: number) => {
    if (offset + count > source.length) throw new Error('Неполная команда JTAG.');
  };
  while (offset < source.length) {
    const opcode = source[offset++];
    if (opcode === 0x87) continue;
    if (opcode === 0x19 || opcode === 0x39) {
      requireBytes(2);
      const count = source[offset++] + (source[offset++] << 8) + 1;
      requireBytes(count);
      steps.push({ packet: Uint8Array.of(4, 0x10, 0), read: 0 }); // TMS low before data clocks.
      for (let byte = 0; byte < count; byte += 62) {
        const chunk = source.subarray(offset + byte, offset + Math.min(byte + 62, count));
        const bits = chunk.length * 8;
        const command = 3 | (opcode === 0x19 ? 0x80 : 0) | (bits >= 256 ? 0x40 : 0);
        steps.push({
          packet: Uint8Array.of(command, bits & 255, ...chunk.map((value) => REVERSE[value])),
          read: opcode === 0x39 ? chunk.length : 0,
          decode: (bytes) => Array.from(bytes, (value) => REVERSE[value]),
        });
      }
      offset += count;
    } else if (opcode === 0x1b || opcode === 0x3b) {
      requireBytes(2);
      const count = source[offset++] + 1,
        value = source[offset++];
      if (count > 8) throw new Error('Некорректное число битов JTAG.');
      steps.push({ packet: Uint8Array.of(4, 0x10, 0), read: 0 });
      steps.push({
        packet: Uint8Array.of(opcode === 0x3b ? 3 : 0x83, count, REVERSE[value]),
        read: opcode === 0x3b ? 1 : 0,
        decode: (bytes) => [(REVERSE[bytes[0]] << (8 - count)) & 255],
      });
    } else if (opcode === 0x4b || opcode === 0x6b) {
      requireBytes(2);
      const count = source[offset++] + 1,
        value = source[offset++];
      if (count > 7) throw new Error('Некорректное число тактов TMS.');
      // CLK can return only the final sample. Use one pulse per sampled bit.
      for (let bit = 0; bit < count;) {
        const tms = (value >>> bit) & 1;
        let run = 1;
        if (opcode === 0x4b)
          while (bit + run < count && ((value >>> (bit + run)) & 1) === tms) run++;
        const shift = 8 - count + bit;
        steps.push({
          packet: Uint8Array.of(
            opcode === 0x6b ? 0x86 : 6,
            (tms << 4) | (((value >>> 7) & 1) << 2),
            run,
          ),
          read: opcode === 0x6b ? 1 : 0,
          decode: (bytes) => [bytes[0] ? 1 << shift : 0],
        });
        bit += run;
      }
      if (opcode === 0x6b && count > 1)
        throw new Error('Многобитное чтение TMS не используется сканером Gowin.');
    } else throw new Error(`Неподдерживаемая команда JTAG 0x${opcode.toString(16)}.`);
  }
  return steps;
}

export function discoverDirtyJtag(device: WebUsbDevice) {
  if (
    device.vendorId !== DIRTYJTAG_USB_FILTER.vendorId ||
    device.productId !== DIRTYJTAG_USB_FILTER.productId
  )
    throw new Error('Нужен адаптер DirtyJTAG (1209:c0ca).');
  const candidates: { configuration: number; alternate: number; input: number; output: number }[] =
    [];
  for (const config of device.configurations) {
    for (const intf of config.interfaces.filter((item) => item.interfaceNumber === 0)) {
      for (const alt of intf.alternates) {
        if (
          alt.interfaceClass !== 0xff ||
          alt.endpoints.length !== 2 ||
          alt.endpoints.some((ep) => ep.type !== 'bulk' || ep.packetSize !== 64)
        )
          continue;
        const inputs = alt.endpoints.filter(
          (ep) => ep.direction === 'in' && ep.endpointNumber === 2,
        );
        const outputs = alt.endpoints.filter(
          (ep) => ep.direction === 'out' && ep.endpointNumber === 1,
        );
        if (inputs.length === 1 && outputs.length === 1)
          candidates.push({
            configuration: config.configurationValue,
            alternate: alt.alternateSetting,
            input: 2,
            output: 1,
          });
      }
    }
  }
  if (candidates.length !== 1)
    throw new Error(
      'Не найден однозначный JTAG-интерфейс DirtyJTAG v2. UART-интерфейсы не используются.',
    );
  return candidates[0];
}

export class DirtyJtagWebUsbTransport implements JtagTransport {
  private endpoints;
  private used = false;
  private owned = false;
  private claimed = false;
  private verified = false;
  private failed = false;
  private busy = false;
  private pending = new Uint8Array(0);
  private timeoutMs: number;
  private closePromise?: Promise<void>;
  constructor(
    readonly device: WebUsbDevice,
    options: { timeoutMs?: number } = {},
  ) {
    this.endpoints = discoverDirtyJtag(device);
    this.timeoutMs = options.timeoutMs ?? 2000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 60_000)
      throw new Error('Некорректный таймаут DirtyJTAG.');
  }
  static async open(device: WebUsbDevice, options: { timeoutMs?: number } = {}) {
    const transport = new DirtyJtagWebUsbTransport(device, options);
    await transport.open();
    return transport;
  }
  private async open() {
    if (this.used || this.device.opened)
      throw new Error('USB-сессия уже открыта. Выберите плату заново.');
    this.used = true;
    this.busy = true;
    try {
      await this.timed(this.device.open(), 'открытие');
      this.owned = true;
      if (this.device.configuration?.configurationValue !== this.endpoints.configuration)
        await this.timed(
          this.device.selectConfiguration(this.endpoints.configuration),
          'конфигурация',
        );
      await this.timed(this.device.claimInterface(0), 'захват DirtyJTAG');
      this.claimed = true;
      if (
        this.device.configuration?.interfaces.find((item) => item.interfaceNumber === 0)?.alternate
          .alternateSetting !== this.endpoints.alternate
      )
        await this.timed(
          this.device.selectAlternateInterface(0, this.endpoints.alternate),
          'alternate',
        );
      await this.send(Uint8Array.of(1, 0)); // INFO; consume optional trailing debug fields in this USB response.
      const info = await this.receive();
      if (info.length < 7 || new TextDecoder().decode(info.subarray(0, 7)) !== 'DJTAG2\n')
        throw new Error('Адаптер не подтвердил DirtyJTAG v2.');
      await this.send(Uint8Array.of(2, 0x03, 0xe8, 4, 0x16, 0x10, 0)); // 1000 kHz, TMS high, TCK/TDI low.
      this.verified = true;
    } catch (cause) {
      this.failed = true;
      await this.cleanup();
      throw cause;
    } finally {
      this.busy = false;
    }
  }
  private begin() {
    if (!this.verified || this.failed || this.closePromise)
      throw new Error('Сессия DirtyJTAG недоступна. Переподключите плату.');
    if (this.busy) throw new Error('Операция DirtyJTAG уже выполняется.');
    this.busy = true;
  }
  async write(source: Uint8Array) {
    const steps = translate(source); // Validate the entire input before touching GPIO.
    this.begin();
    try {
      const response: number[] = [];
      for (const step of steps) {
        await this.send(step.packet);
        if (step.read) {
          const raw = await this.receiveExact(step.read);
          response.push(...step.decode!(raw));
        }
      }
      if (this.pending.length + response.length > 1024 * 1024)
        throw new Error('Слишком большой ответ DirtyJTAG.');
      const combined = new Uint8Array(this.pending.length + response.length);
      combined.set(this.pending);
      combined.set(response, this.pending.length);
      this.pending = combined;
    } catch (cause) {
      this.failed = true;
      throw cause;
    } finally {
      this.busy = false;
    }
  }
  async readExact(length: number): Promise<Uint8Array> {
    if (!Number.isInteger(length) || length < 1 || length > 1024 * 1024)
      throw new Error('Некорректный размер ответа JTAG.');
    this.begin();
    try {
      if (this.pending.length < length) throw new Error('Неполный ответ JTAG.');
      const result = this.pending.slice(0, length);
      this.pending = this.pending.slice(length);
      return result;
    } catch (cause) {
      this.failed = true;
      throw cause;
    } finally {
      this.busy = false;
    }
  }
  private async send(packet: Uint8Array) {
    if (!packet.length || packet.length > 64)
      throw new Error('Пакет DirtyJTAG превышает 64 байта.');
    const result = await this.timed(
      this.device.transferOut(this.endpoints.output, new Uint8Array(packet)),
      'передача',
    );
    if (result.status !== 'ok' || result.bytesWritten !== packet.length)
      throw new Error('Неполная передача DirtyJTAG. Повтор команды запрещён.');
  }
  private async receive() {
    const result = await this.timed(this.device.transferIn(this.endpoints.input, 64), 'чтение');
    if (result.status !== 'ok' || !result.data || result.data.byteLength > 64)
      throw new Error('Повреждённый ответ DirtyJTAG.');
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }
  private async receiveExact(length: number) {
    const output = new Uint8Array(length);
    let count = 0;
    const deadline = Date.now() + this.timeoutMs;
    while (count < length) {
      if (Date.now() >= deadline) throw new Error('Истекло время чтения DirtyJTAG.');
      const bytes = await this.receive();
      if (!bytes.length || bytes.length > length - count)
        throw new Error('Неожиданная длина ответа DirtyJTAG.');
      output.set(bytes, count);
      count += bytes.length;
    }
    return output;
  }
  private async timed<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined,
      expired = false;
    try {
      return await Promise.race([
        promise.then((result) => {
          if (expired) void this.device.close().catch(() => {});
          return result;
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            this.failed = true;
            void this.closeUsb().catch(() => {});
            reject(
              new Error(
                `Нет ответа DirtyJTAG: ${label}. Переподключите USB; повтор команды запрещён.`,
              ),
            );
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  private closeUsb() {
    return (this.closePromise ??= new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('DirtyJTAG не закрыл USB. Переподключите плату.')),
        this.timeoutMs,
      );
      this.device.close().then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        (cause) => {
          clearTimeout(timer);
          reject(cause);
        },
      );
    }));
  }
  private async cleanup() {
    const warnings: string[] = [];
    if (this.claimed && !this.closePromise) {
      try {
        await this.timed(this.device.releaseInterface(0), 'освобождение');
      } catch (cause) {
        warnings.push(String(cause));
      }
    }
    if (this.owned || this.closePromise) {
      try {
        await this.closeUsb();
      } catch (cause) {
        warnings.push(String(cause));
      }
    }
    this.claimed = false;
    this.owned = false;
    this.verified = false;
    this.pending = new Uint8Array(0);
    return warnings;
  }
  async close() {
    if (this.busy) throw new Error('Дождитесь окончания операции DirtyJTAG.');
    this.verified = false;
    return this.cleanup();
  }
}
