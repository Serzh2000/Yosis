class BitstreamError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const MAX_PROGRAMMING_BYTES = 16 * 1024 * 1024;
const FRAME_BITS = 3376;
const MIN_FRAMES = 1342;
const MAX_FRAMES = 4096;
const TABLE = Uint16Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xa001 : value >>> 1;
  return value;
});

// Same CRC-16/ARC parameters and chained-frame coverage as Apicula bslib.
export function crc16Arc(bytes: Uint8Array, initial = 0): number {
  let crc = initial;
  for (const byte of bytes) crc = TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return crc;
}

function bytesOf(bits: string): Uint8Array {
  if (!bits.length || bits.length % 8 || !/^[01]+$/.test(bits))
    throw new BitstreamError('Битстрим должен содержать целые двоичные строки .fs.');
  const bytes = new Uint8Array(bits.length / 8);
  for (let offset = 0; offset < bytes.length; offset++)
    bytes[offset] = Number.parseInt(bits.slice(offset * 8, offset * 8 + 8), 2);
  return bytes;
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function uint16(bytes: Uint8Array, offset: number, little = false) {
  return little
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1];
}
function requireBytes(bytes: Uint8Array, expected: string, description: string) {
  if (hex(bytes) !== expected) throw new BitstreamError(`Некорректный ${description} битстрима.`);
}

export interface ValidatedProgrammingBitstream {
  userCode: string;
  frames: number;
  programmerText: string;
  wireBytes: Uint8Array;
}

export function parseGowinBitstream(text: string): ValidatedProgrammingBitstream {
  if (typeof text !== 'string' || !text || text.length > MAX_PROGRAMMING_BYTES)
    throw new BitstreamError('Файл .fs пуст или превышает 16 МБ.', 413);
  // eslint-disable-next-line no-control-regex -- The ASCII bitstream grammar explicitly permits tab and line endings.
  if (/[^\x09\x0a\x0d\x20-\x7e]/.test(text))
    throw new BitstreamError('Ожидается текстовый файл Gowin .fs.');
  const lines: string[] = [];
  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.length > FRAME_BITS + 64)
      throw new BitstreamError('Неподдерживаемая длина строки .fs.');
    lines.push(line);
  }
  if (lines.length < MIN_FRAMES + 12 || lines.length > MAX_FRAMES + 32)
    throw new BitstreamError('Файл .fs неполный или содержит неподдерживаемые данные.');
  requireBytes(bytesOf(lines[0]), 'ff'.repeat(20), 'начальный блок');
  requireBytes(bytesOf(lines[1]), 'ffff', 'начальный блок');
  requireBytes(bytesOf(lines[2]), 'a5c3', 'маркер формата');

  let offset = 3;
  let headerCrc = 0;
  const headers = new Map<number, Uint8Array>();
  for (; offset < Math.min(lines.length, 16); offset++) {
    const bytes = bytesOf(lines[offset]);
    const opcode = bytes[0];
    if (![0x06, 0x10, 0x51, 0x0b, 0xd2, 0x12, 0x3b].includes(opcode) || headers.has(opcode))
      throw new BitstreamError(
        'Нужен обычный несжатый .fs для Tang Nano 20K; этот режим конфигурации не поддерживается.',
      );
    headers.set(opcode, bytes);
    // SPI boot address is not covered by the first frame CRC.
    if (opcode !== 0xd2) headerCrc = crc16Arc(bytes, headerCrc);
    if (opcode === 0x3b) {
      offset++;
      break;
    }
  }
  for (const opcode of [0x06, 0x10, 0x12, 0x3b])
    if (!headers.has(opcode)) throw new BitstreamError('Заголовок .fs неполный.');
  requireBytes(headers.get(0x06)!, '060000000000081b', 'ID GW2AR-18C');
  requireBytes(headers.get(0x12)!, '12000000', 'сброс адреса');
  if (headers.has(0x0b)) requireBytes(headers.get(0x0b)!, '0b000000', 'параметр SecurityBit');
  if (headers.has(0x51))
    requireBytes(headers.get(0x51)!, '5100ffffffffffff', 'параметры несжатого потока');
  if (headers.has(0xd2)) requireBytes(headers.get(0xd2)!, 'd200ffff00000000', 'адрес SPI');
  const settings = headers.get(0x10)!;
  if (
    settings.length !== 8 ||
    (BigInt('0x' + hex(settings)) & ~(0x1000000000000000n | 0xff0000n)) !== 0n
  )
    throw new BitstreamError(
      'Поддерживается несжатый и незашифрованный .fs с обычным режимом загрузки.',
    );
  const count = headers.get(0x3b)!;
  if (count.length !== 4 || count[1] !== 0x80)
    throw new BitstreamError('Для загрузки требуется битстрим с включённой проверкой CRC.');
  const frames = uint16(count, 2);
  if (frames < MIN_FRAMES || frames > MAX_FRAMES || lines.length !== offset + frames + 6)
    throw new BitstreamError('Количество кадров .fs не соответствует GW2AR-18C или файл неполный.');

  for (let frame = 0; frame < frames; frame++) {
    const bytes = bytesOf(lines[offset++]);
    if (bytes.length !== (FRAME_BITS + 64) / 8 || !bytes.subarray(-6).every((byte) => byte === 255))
      throw new BitstreamError(`Некорректный размер или окончание кадра ${frame + 1}.`);
    const observed = uint16(bytes, bytes.length - 8, true);
    const calculated = crc16Arc(
      bytes.subarray(0, -8),
      frame === 0 ? headerCrc : crc16Arc(new Uint8Array(6).fill(255)),
    );
    if (observed !== calculated)
      throw new BitstreamError(`Ошибка CRC в кадре ${frame + 1}; файл не будет загружен.`);
  }
  const footer = lines.slice(offset).map(bytesOf);
  if (
    footer[0].length !== 20 ||
    !footer[0].subarray(0, 18).every((byte) => byte === 255) ||
    uint16(footer[0], 18, true) !== crc16Arc(new Uint8Array(24).fill(255))
  )
    throw new BitstreamError('Некорректное окончание данных конфигурации.');
  if (footer[1].length !== 8 || hex(footer[1].subarray(0, 4)) !== '0a000000')
    throw new BitstreamError('Некорректный UserCode .fs.');
  requireBytes(footer[2], 'ff'.repeat(8), 'служебный блок');
  requireBytes(footer[3], '08000000', 'завершение конфигурации');
  requireBytes(footer[4], 'ff'.repeat(8), 'служебный блок');
  requireBytes(footer[5], 'ffff', 'служебный блок');

  const userCode = `0x${hex(footer[1].subarray(4)).toUpperCase()}`;
  const rateCode = settings[5];
  const rate = rateCode ? 125_000_000 / ((((rateCode & 0x7f) ^ 0x44) >>> 2) + 1) : 2_500_000;
  // Gowin's Windows parser needs metadata. Derive it from the validated binary
  // commands; never trust supplied comments to select a device or loading mode.
  const metadata = [
    '//Generated by Yosis; binary configuration rows unchanged.',
    '//File Title: Bitstream file',
    '//Device: GW2AR-18',
    '//Device Version: C',
    '//Part Number: GW2AR-LV18QN88C8/I7',
    '//Device-package: GW2AR-18C-QFN88',
    '//BackgroundProgramming: OFF',
    `//CheckSum: ${userCode}`,
    `//UserCode: ${userCode}`,
    `//LoadingRate: ${(rate / 1_000_000).toFixed(6)}MHz`,
    '//CRCCheck: ON',
    '//Compress: OFF',
    '//Encryption: OFF',
    `//SecurityBit: ${headers.has(0x0b) ? 'ON' : 'OFF'}`,
    '//SecureMode: OFF',
    '//JTAGAsRegularIO: OFF',
    '//MultiBootSPIAddr: 0x00000000',
  ];
  const wireBytes = new Uint8Array(lines.reduce((length, line) => length + line.length / 8, 0));
  let wireOffset = 0;
  for (const line of lines) {
    const bytes = bytesOf(line);
    wireBytes.set(bytes, wireOffset);
    wireOffset += bytes.length;
  }
  return { userCode, frames, wireBytes, programmerText: [...metadata, ...lines, ''].join('\n') };
}
