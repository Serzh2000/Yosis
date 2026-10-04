import { parseGowinBitstream } from '../../shared/gowin-bitstream';

export interface JtagTransport {
  write(data: Uint8Array): Promise<void>;
  readExact(length: number): Promise<Uint8Array>;
}
export interface JtagIdentity {
  idCode: number;
  userCode: number;
  status: number;
}
export interface ProgrammingProgress {
  stage: string;
  percent: number;
}
const ALLOWED = new Set([0x02, 0x05, 0x08, 0x09, 0x0a, 0x11, 0x12, 0x13, 0x15, 0x17, 0x3a, 0x41]);
const EXPECTED_ID = 0x81b;
const reverse = Uint8Array.from({ length: 256 }, (_, byte) => {
  let result = 0;
  for (let bit = 0; bit < 8; bit++) result = (result << 1) | ((byte >>> bit) & 1);
  return result;
});
const bytes = (...chunks: (number[] | Uint8Array)[]) =>
  Uint8Array.from(chunks.flatMap((chunk) => Array.from(chunk)));

// FTDI AN_108: six TMS clocks per command avoids the seven-bit firmware quirk.
export function tmsCommands(bits: readonly number[], tdi = 0): Uint8Array {
  if (!bits.length || bits.some((bit) => bit !== 0 && bit !== 1) || (tdi !== 0 && tdi !== 1))
    throw new Error('Некорректные уровни JTAG.');
  const result: number[] = [];
  for (let offset = 0; offset < bits.length; offset += 6) {
    const chunk = bits.slice(offset, offset + 6);
    let value = tdi << 7;
    chunk.forEach((bit, index) => {
      value |= bit << index;
    });
    value |= chunk[chunk.length - 1] << chunk.length;
    result.push(0x4b, chunk.length - 1, value);
  }
  return Uint8Array.from(result);
}
export function instructionCommand(opcode: number): Uint8Array {
  if (!ALLOWED.has(opcode)) throw new Error('Эта команда FPGA не разрешена.');
  return bytes(
    tmsCommands([1, 1, 0, 0]),
    [0x1b, 6, opcode & 0x7f, 0x4b, 0, 3 | (opcode & 0x80)],
    tmsCommands([1, 0]),
    tmsCommands([0, 0, 0, 0, 0, 0]),
  );
}
export function registerReadCommand(width: 32 | 64): Uint8Array {
  const whole = width / 8 - 1;
  return bytes(
    tmsCommands([1, 0, 0], 1),
    [0x39, whole - 1, 0],
    new Uint8Array(whole).fill(255),
    [0x3b, 6, 0x7f, 0x6b, 0, 0x83],
    tmsCommands([1, 0], 1),
    [0x87],
  );
}
export function decodeRegister(raw: Uint8Array, width: 32 | 64): Uint8Array {
  if (raw.length !== width / 8 + 1) throw new Error('Неполный ответ регистра JTAG.');
  const result = raw.slice(0, -1);
  result[result.length - 1] = (raw[raw.length - 2] >>> 1) | (raw[raw.length - 1] & 0x80);
  return result;
}
export function* dataWriteCommands(data: Uint8Array): Generator<Uint8Array> {
  if (!data.length) throw new Error('Поток конфигурации пуст.');
  yield tmsCommands([1, 0, 0]);
  // Every FTDI command fits within 512 bytes. All intermediate chunks stay Shift-DR.
  for (let offset = 0; offset < data.length - 1; offset += 509) {
    const chunk = data.subarray(offset, Math.min(offset + 509, data.length - 1));
    yield bytes([0x19, (chunk.length - 1) & 255, (chunk.length - 1) >>> 8], chunk);
  }
  const last = data[data.length - 1];
  yield bytes([0x1b, 6, last & 0x7f, 0x4b, 0, 3 | (last & 0x80)], tmsCommands([1, 0]), [0x87]);
}
function uint32(data: Uint8Array, offset = 0) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

/** SRAM sequence based on Gowin TN653/UG290 and openFPGALoader gowin.cpp.
 * No flash commands, MCU bootloader commands, automatic retries or reloads.
 */
export class GowinJtag {
  private confirmed = false;
  private busy = false;
  constructor(
    private transport: JtagTransport,
    private progress: (value: ProgrammingProgress) => void = () => {},
    private pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ) {}
  private async instruction(opcode: number) {
    if (!this.confirmed && ![0x11, 0x13, 0x41].includes(opcode))
      throw new Error('Сначала требуется проверить модель FPGA.');
    await this.transport.write(instructionCommand(opcode));
  }
  private async register(opcode: number): Promise<number> {
    await this.instruction(opcode);
    await this.transport.write(registerReadCommand(32));
    return uint32(decodeRegister(await this.transport.readExact(5), 32));
  }
  async probe(): Promise<JtagIdentity> {
    if (this.busy) throw new Error('Операция JTAG уже выполняется.');
    this.busy = true;
    try {
      return await this.identify();
    } finally {
      this.busy = false;
    }
  }
  private async identify(): Promise<JtagIdentity> {
    this.confirmed = false;
    await this.transport.write(bytes(tmsCommands([1, 1, 1, 1, 1, 1]), tmsCommands([0])));
    // Reset selects IDCODE by default. Probe the chain before assuming an 8-bit IR.
    await this.transport.write(registerReadCommand(64));
    const id = decodeRegister(await this.transport.readExact(9), 64);
    if (uint32(id) !== EXPECTED_ID || uint32(id, 4) !== 0xffffffff)
      throw new Error('Ожидается одна Tang Nano 20K с JTAG ID 0x0000081B. Запись не начата.');
    this.confirmed = true;
    if ((await this.register(0x11)) !== EXPECTED_ID)
      throw new Error('JTAG ID изменился после проверки цепочки.');
    return {
      idCode: uint32(id),
      userCode: await this.register(0x13),
      status: await this.register(0x41),
    };
  }
  private async poll(mask: number, expected: number, label: string) {
    const deadline = Date.now() + 3000;
    do {
      const status = await this.register(0x41);
      if (status & 15) throw new Error(`Ошибка FPGA: 0x${status.toString(16)} (${label}).`);
      if ((status & mask) === expected) return status;
      await this.transport.write(tmsCommands(new Array(60).fill(0)));
      await this.pause(10);
    } while (Date.now() < deadline);
    throw new Error(`FPGA не завершила этап «${label}».`);
  }
  private async disable() {
    await this.instruction(0x3a);
    await this.instruction(0x02);
    await this.poll(0x80, 0, 'выход из конфигурации');
  }
  async program(text: string): Promise<JtagIdentity> {
    if (this.busy) throw new Error('Операция JTAG уже выполняется.');
    // Validate all commands and CRCs before any USB/JTAG traffic.
    const fs = parseGowinBitstream(text);
    this.busy = true;
    let touched = false;
    try {
      this.progress({ stage: 'Проверка FPGA', percent: 0 });
      const identity = await this.identify();
      if (identity.status & 15)
        throw new Error('FPGA сообщает ошибку конфигурации. Переподключите питание платы.');
      this.progress({ stage: 'Подготовка SRAM', percent: 2 });
      touched = true;
      await this.instruction(0x15);
      await this.poll(0x80, 0x80, 'включение конфигурации');
      await this.instruction(0x05);
      await this.instruction(0x02);
      await this.poll(0x20, 0x20, 'очистка SRAM');
      await this.instruction(0x09);
      await this.instruction(0x02);
      await this.disable();
      await this.instruction(0x15);
      await this.poll(0x80, 0x80, 'включение конфигурации');
      await this.instruction(0x12);
      await this.instruction(0x17);
      const wire = Uint8Array.from(fs.wireBytes, (byte) => reverse[byte]);
      const deadline = Date.now() + 180_000;
      let sent = 0,
        reported = -1;
      for (const command of dataWriteCommands(wire)) {
        if (Date.now() >= deadline)
          throw new Error('Передача битстрима превысила три минуты. Переподключите плату.');
        await this.transport.write(command);
        if (command[0] === 0x19) sent += command.length - 3;
        const percent = Math.min(97, 3 + Math.floor((sent / wire.length) * 94));
        if (percent !== reported) {
          reported = percent;
          this.progress({ stage: 'Передача битстрима', percent });
        }
      }
      // Set UserCode to the file value. GW2A checksum recomputation is unsupported upstream.
      await this.instruction(0x0a);
      const user = new Uint8Array(4);
      new DataView(user.buffer).setUint32(0, Number.parseInt(fs.userCode, 16), true);
      for (const command of dataWriteCommands(user)) await this.transport.write(command);
      await this.instruction(0x08);
      await this.disable();
      touched = false;
      this.progress({ stage: 'Проверка результата', percent: 98 });
      const status = await this.poll(0x2000, 0x2000, 'завершение конфигурации');
      const userCode = await this.register(0x13);
      if (userCode !== Number.parseInt(fs.userCode, 16))
        throw new Error('UserCode FPGA отличается от выбранного битстрима.');
      this.progress({ stage: 'Загрузка завершена', percent: 100 });
      return { idCode: EXPECTED_ID, status, userCode };
    } finally {
      if (touched) {
        try {
          await this.disable();
        } catch {
          /* Original failure remains visible. */
        }
      }
      this.busy = false;
    }
  }
}
