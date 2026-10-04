import { createHash } from 'node:crypto';
import { RequestError } from './validation';
import { parseGowinBitstream } from '../shared/gowin-bitstream';
export { crc16Arc, MAX_PROGRAMMING_BYTES } from '../shared/gowin-bitstream';

export function validateProgrammingBitstream(text: string, expectedSha256: string) {
  if (typeof expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedSha256))
    throw new RequestError('Укажите SHA256 выбранного битстрима.');
  if (typeof text !== 'string') throw new RequestError('Ожидается текстовый файл Gowin .fs.');
  const sha256 = createHash('sha256').update(text, 'utf8').digest('hex');
  if (sha256 !== expectedSha256.toLowerCase())
    throw new RequestError('SHA256 файла не совпадает с выбранным битстримом.');
  try {
    return { ...parseGowinBitstream(text), sha256 };
  } catch (error) {
    throw new RequestError(
      error instanceof Error ? error.message : 'Некорректный .fs.',
      (error as { status?: number }).status ?? 400,
    );
  }
}
