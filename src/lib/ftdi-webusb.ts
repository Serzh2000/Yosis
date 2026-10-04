/** Minimal structural WebUSB types keep the transport testable without browser globals. */
export interface UsbEndpointDescriptor {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
}
export interface UsbAlternateDescriptor {
  alternateSetting: number;
  interfaceClass: number;
  endpoints: readonly UsbEndpointDescriptor[];
}
export interface UsbInterfaceDescriptor {
  interfaceNumber: number;
  alternate: UsbAlternateDescriptor;
  alternates: readonly UsbAlternateDescriptor[];
}
export interface UsbConfigurationDescriptor {
  configurationValue: number;
  interfaces: readonly UsbInterfaceDescriptor[];
}
export interface UsbControlSetup {
  requestType: 'vendor';
  recipient: 'device';
  request: number;
  value: number;
  index: number;
}
export interface UsbInResult {
  status: 'ok' | 'stall' | 'babble';
  data?: DataView;
}
export interface UsbOutResult {
  status: 'ok' | 'stall';
  bytesWritten: number;
}
export interface WebUsbDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly serialNumber?: string;
  readonly productName?: string;
  readonly opened: boolean;
  readonly configuration: UsbConfigurationDescriptor | null;
  readonly configurations: readonly UsbConfigurationDescriptor[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
  controlTransferIn(setup: UsbControlSetup, length: number): Promise<UsbInResult>;
  controlTransferOut(setup: UsbControlSetup): Promise<UsbOutResult>;
  transferIn(endpointNumber: number, length: number): Promise<UsbInResult>;
  transferOut(endpointNumber: number, data: Uint8Array<ArrayBuffer>): Promise<UsbOutResult>;
}

export const TANG_NANO_USB_FILTER = { vendorId: 0x0403, productId: 0x6010 } as const;
const INTERFACE_A = 0;
const FTDI_CHANNEL_A = 1; // FTDI vendor requests count channels from 1; WebUSB interface numbers count from 0.
const FTDI_RESET = 0x00;
const FTDI_SET_LATENCY = 0x09;
const FTDI_GET_LATENCY = 0x0a;
const FTDI_SET_BITMODE = 0x0b;
const MAX_TRANSFER = 4096;
const MAX_READ_BYTES = 1024 * 1024;

export interface FtdiWebUsbOptions {
  timeoutMs?: number;
  readTimeoutMs?: number;
  maxReadBytes?: number;
}

export interface FtdiEndpoints {
  configurationValue: number;
  alternateSetting: number;
  input: number;
  output: number;
  packetSize: number;
}

export function discoverFtdiInterfaceA(device: WebUsbDevice): FtdiEndpoints {
  if (
    device.vendorId !== TANG_NANO_USB_FILTER.vendorId ||
    device.productId !== TANG_NANO_USB_FILTER.productId
  )
    throw new Error('Нужен USB-программатор Tang Nano 20K (0403:6010).');
  const candidates: FtdiEndpoints[] = [];
  for (const configuration of device.configurations) {
    const interfaces = configuration.interfaces.filter(
      (item) => item.interfaceNumber === INTERFACE_A,
    );
    if (interfaces.length > 1) throw new Error('USB interface A имеет неоднозначное описание.');
    for (const alternate of interfaces[0]?.alternates ?? []) {
      if (
        alternate.interfaceClass !== 0xff ||
        alternate.endpoints.length !== 2 ||
        alternate.endpoints.some((endpoint) => endpoint.type !== 'bulk')
      )
        continue;
      const input = alternate.endpoints.filter((endpoint) => endpoint.direction === 'in');
      const output = alternate.endpoints.filter((endpoint) => endpoint.direction === 'out');
      if (input.length !== 1 || output.length !== 1) continue;
      const pair = [input[0], output[0]];
      if (
        pair.some(
          (endpoint) =>
            !Number.isInteger(endpoint.endpointNumber) ||
            endpoint.endpointNumber < 1 ||
            endpoint.endpointNumber > 15 ||
            ![64, 512].includes(endpoint.packetSize),
        )
      )
        continue;
      candidates.push({
        configurationValue: configuration.configurationValue,
        alternateSetting: alternate.alternateSetting,
        input: input[0].endpointNumber,
        output: output[0].endpointNumber,
        packetSize: input[0].packetSize,
      });
    }
  }
  if (candidates.length !== 1)
    throw new Error(
      'Не найден единственный vendor bulk interface A для JTAG. Интерфейс UART не используется.',
    );
  return candidates[0];
}

/** FTDI prepends modem/line status to EVERY USB packet, including a final short packet. */
export function stripFtdiStatusBytes(
  data: DataView | Uint8Array,
  packetSize: number,
): Uint8Array<ArrayBuffer> {
  if (!Number.isInteger(packetSize) || packetSize < 3 || packetSize > 1024)
    throw new Error('Некорректный размер пакета FTDI.');
  const bytes =
    data instanceof DataView ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : data;
  const remainder = bytes.length % packetSize;
  if (bytes.length === 1 || remainder === 1)
    throw new Error('Неполный пакет FTDI: отсутствуют два байта статуса.');
  const payloadLength =
    Math.floor(bytes.length / packetSize) * (packetSize - 2) + Math.max(0, remainder - 2);
  const payload = new Uint8Array(payloadLength);
  let written = 0;
  for (let offset = 0; offset < bytes.length; offset += packetSize) {
    const end = Math.min(offset + packetSize, bytes.length);
    const fragment = bytes.subarray(offset + 2, end);
    payload.set(fragment, written);
    written += fragment.length;
  }
  return payload;
}

/**
 * FTDI vendor requests follow libftdi ftdi.c; MPSSE commands follow FTDI AN_108.
 * Only channel A is claimed. A timed-out browser transfer poisons the session:
 * WebUSB has no per-transfer cancellation, so close the handle and require reconnect.
 */
export class FtdiWebUsbTransport {
  readonly requestedFrequency = 2_500_000;
  // Divide-by-five gives a 12 MHz base. Divisor 2 is the fastest clock below 2.5 MHz.
  readonly actualFrequency = 2_000_000;
  readonly endpoints: FtdiEndpoints;
  private readonly timeoutMs: number;
  private readonly readTimeoutMs: number;
  private readonly maxReadBytes: number;
  private used = false;
  private owned = false;
  private claimed = false;
  private verified = false;
  private failed = false;
  private hung = false;
  private busy = false;
  private closing = false;
  private originalLatency: number | undefined;
  private pending = new Uint8Array(0);
  private closePromise: Promise<void> | undefined;

  constructor(
    readonly device: WebUsbDevice,
    options: FtdiWebUsbOptions = {},
  ) {
    this.endpoints = discoverFtdiInterfaceA(device);
    this.timeoutMs = boundedOption(options.timeoutMs ?? 2000, 1, 60_000, 'таймаут USB');
    this.readTimeoutMs = boundedOption(options.readTimeoutMs ?? 2000, 1, 60_000, 'таймаут чтения');
    this.maxReadBytes = boundedOption(
      options.maxReadBytes ?? MAX_READ_BYTES,
      1,
      MAX_READ_BYTES,
      'размер чтения',
    );
  }

  get ready(): boolean {
    return this.claimed && this.verified && !this.failed && !this.closing;
  }

  static async open(
    device: WebUsbDevice,
    options: FtdiWebUsbOptions = {},
  ): Promise<FtdiWebUsbTransport> {
    const transport = new FtdiWebUsbTransport(device, options);
    await transport.open();
    return transport;
  }

  async open(): Promise<void> {
    if (this.used || this.device.opened)
      throw new Error('USB-сессия уже открыта или использована. Подключите плату заново.');
    this.used = true;
    this.busy = true;
    try {
      await this.timed(this.device.open(), 'открытие USB');
      this.owned = true;
      if (this.device.configuration?.configurationValue !== this.endpoints.configurationValue)
        await this.timed(
          this.device.selectConfiguration(this.endpoints.configurationValue),
          'выбор USB-конфигурации',
        );
      await this.timed(this.device.claimInterface(INTERFACE_A), 'захват JTAG interface A');
      this.claimed = true;
      const alternate = this.device.configuration?.interfaces.find(
        (item) => item.interfaceNumber === INTERFACE_A,
      )?.alternate.alternateSetting;
      if (alternate !== this.endpoints.alternateSetting)
        await this.timed(
          this.device.selectAlternateInterface(INTERFACE_A, this.endpoints.alternateSetting),
          'выбор JTAG alternate',
        );
      this.originalLatency = await this.getLatency();
      await this.control(FTDI_RESET, 0);
      await this.control(FTDI_SET_BITMODE, 0);
      await this.purge();
      await this.control(FTDI_SET_LATENCY, 2);
      await this.control(FTDI_SET_BITMODE, 0x020b);
      await delay(50);
      await this.purge();
      await this.writeInternal(Uint8Array.of(0xaa, 0x87));
      const sync = await this.readInternal(2);
      if (sync[0] !== 0xfa || sync[1] !== 0xaa || this.pending.length)
        throw new Error('Программатор не подтвердил режим MPSSE. Переподключите USB платы.');
      // Divide by five, disable loopback, set divisor, TMS high/TCK low, ADBUS direction 0x0b.
      // Avoid clock-only 0x8e/0x8f, unsupported by some Sipeed debugger firmware.
      await this.writeInternal(Uint8Array.of(0x8b, 0x85, 0x86, 2, 0, 0x80, 0x08, 0x0b, 0x87));
      this.verified = true;
    } catch (error) {
      this.failed = true;
      await this.cleanup();
      throw error;
    } finally {
      this.busy = false;
    }
  }

  async write(bytes: Uint8Array): Promise<void> {
    this.startOperation();
    try {
      await this.writeInternal(bytes);
    } catch (error) {
      this.failed = true;
      throw error;
    } finally {
      this.busy = false;
    }
  }

  async readExact(length: number): Promise<Uint8Array<ArrayBuffer>> {
    boundedOption(length, 1, this.maxReadBytes, 'размер чтения');
    this.startOperation();
    try {
      return await this.readInternal(length);
    } catch (error) {
      this.failed = true;
      throw error;
    } finally {
      this.busy = false;
    }
  }

  async close(): Promise<string[]> {
    if (this.busy) throw new Error('Дождитесь завершения USB-операции перед отключением.');
    this.closing = true;
    return this.cleanup();
  }

  private startOperation(): void {
    if (!this.ready) throw new Error('USB-сессия недоступна. Подключите плату заново.');
    if (this.busy) throw new Error('Другая USB-операция уже выполняется.');
    this.busy = true;
  }

  private async writeInternal(source: Uint8Array): Promise<void> {
    if (!source.length || source.length > 1024 * 1024)
      throw new Error('Неподдерживаемый размер MPSSE-команды.');
    for (let offset = 0; offset < source.length; offset += MAX_TRANSFER) {
      // Copy each chunk into an ArrayBuffer accepted by browser WebUSB implementations.
      const bytes = new Uint8Array(source.subarray(offset, offset + MAX_TRANSFER));
      const result = await this.timed(
        this.device.transferOut(this.endpoints.output, bytes),
        'запись USB',
      );
      if (result.status !== 'ok' || result.bytesWritten !== bytes.length)
        throw new Error(
          `Неполная запись USB (${result.bytesWritten}/${bytes.length}); повтор команды запрещён.`,
        );
    }
  }

  private async readInternal(length: number): Promise<Uint8Array<ArrayBuffer>> {
    const output = new Uint8Array(length);
    let copied = Math.min(length, this.pending.length);
    output.set(this.pending.subarray(0, copied));
    this.pending = new Uint8Array(this.pending.subarray(copied));
    const deadline = Date.now() + this.readTimeoutMs;
    let transfers = 0;
    while (copied < length) {
      const remaining = deadline - Date.now();
      if (remaining <= 0 || ++transfers > 4096)
        throw new Error(`Истекло время чтения USB (${copied}/${length} байт).`);
      const packetSize = this.endpoints.packetSize;
      const requested = Math.min(
        MAX_TRANSFER,
        Math.ceil((length - copied) / (packetSize - 2)) * packetSize,
      );
      const result = await this.timed(
        this.device.transferIn(this.endpoints.input, requested),
        'чтение USB',
        Math.min(this.timeoutMs, remaining),
      );
      if (result.status !== 'ok' || !result.data || result.data.byteLength > requested)
        throw new Error('USB вернул повреждённый пакет или ошибку чтения.');
      const bytes = stripFtdiStatusBytes(result.data, packetSize);
      const count = Math.min(bytes.length, length - copied);
      output.set(bytes.subarray(0, count), copied);
      copied += count;
      this.pending = new Uint8Array(bytes.subarray(count));
      if (!bytes.length) await delay(1); // Status-only packets are valid; never spin indefinitely on them.
    }
    return output;
  }

  private setup(request: number, value: number): UsbControlSetup {
    return { requestType: 'vendor', recipient: 'device', request, value, index: FTDI_CHANNEL_A };
  }
  private async control(request: number, value: number): Promise<void> {
    const result = await this.timed(
      this.device.controlTransferOut(this.setup(request, value)),
      'настройка FTDI',
    );
    if (result.status !== 'ok' || result.bytesWritten !== 0)
      throw new Error('FTDI не принял управляющий запрос.');
  }
  private async getLatency(): Promise<number> {
    const result = await this.timed(
      this.device.controlTransferIn(this.setup(FTDI_GET_LATENCY, 0), 1),
      'чтение задержки FTDI',
    );
    if (result.status !== 'ok' || result.data?.byteLength !== 1 || result.data.getUint8(0) < 1)
      throw new Error('Не удалось прочитать исходную задержку FTDI.');
    return result.data.getUint8(0);
  }
  private async purge(): Promise<void> {
    await this.control(FTDI_RESET, 1);
    await this.control(FTDI_RESET, 2);
    this.pending = new Uint8Array(0);
  }

  private timed<T>(
    promise: Promise<T>,
    label: string,
    timeout = this.timeoutMs,
    abortOnTimeout = true,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        this.failed = true;
        if (abortOnTimeout) {
          this.hung = true;
          void this.closeUsb().catch(() => {});
        }
        reject(
          new Error(
            `Истекло время операции «${label}». Переподключите плату; повтор USB-команды запрещён.`,
          ),
        );
      }, timeout);
      promise.then(
        (result) => {
          clearTimeout(timer);
          if (expired) {
            // A late open/claim must not leave an abandoned browser handle behind.
            if (abortOnTimeout) void this.device.close().catch(() => {});
          } else resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          if (!expired) reject(error);
        },
      );
    });
  }

  private closeUsb(): Promise<void> {
    if (!this.closePromise)
      this.closePromise = this.timed(this.device.close(), 'закрытие USB', this.timeoutMs, false);
    return this.closePromise;
  }

  private async cleanup(): Promise<string[]> {
    const warnings: string[] = [];
    const attempt = async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Ошибка отключения USB.');
      }
    };
    // Never send FTDI commands unless interface A was successfully claimed.
    // An outstanding timed-out transfer can complete late; only closing USB is safe then.
    if (this.claimed && !this.hung) {
      if (this.verified)
        await attempt(() => this.writeInternal(Uint8Array.of(0x80, 0x08, 0, 0x87)));
      if (!this.hung) await attempt(() => this.control(FTDI_SET_BITMODE, 0));
      if (!this.hung && this.originalLatency !== undefined)
        await attempt(() => this.control(FTDI_SET_LATENCY, this.originalLatency!));
      if (!this.hung)
        await attempt(() =>
          this.timed(this.device.releaseInterface(INTERFACE_A), 'освобождение JTAG interface A'),
        );
    }
    this.claimed = false;
    this.verified = false;
    this.pending = new Uint8Array(0);
    if (this.owned || this.hung) await attempt(() => this.closeUsb());
    this.owned = false;
    return warnings;
  }
}

function boundedOption(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Некорректный ${label}.`);
  return value;
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
