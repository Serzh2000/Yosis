import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { RequestError } from '../shared/errors';

const payloadFields = new Set(['rtl', 'technology', 'vcd', 'placed', 'report']);
export function incrementalStatus<T extends { logs: string; status: string }>(
  result: T,
  offset: number,
) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new RequestError('Некорректное смещение журнала.');
  const metadata = Object.fromEntries(
    Object.entries(result).filter(([key]) => !payloadFields.has(key) && key !== 'logs'),
  );
  const logReset = offset > result.logs.length;
  return {
    ...metadata,
    status: result.status,
    logs: result.logs.slice(logReset ? 0 : offset),
    nextLogOffset: result.logs.length,
    logReset,
  };
}
export async function storedStatus(root: string, id: string, offset: number) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
    throw new RequestError('Задание не найдено.', 404);
  try {
    const result = JSON.parse(await readFile(path.join(root, id, 'metadata.json'), 'utf8'));
    result.logs = await readFile(path.join(root, id, 'logs.txt'), 'utf8');
    if (result.status === 'queued' || result.status === 'running') {
      result.status = 'error';
      result.stage = 'Задание прервано перезапуском сервиса';
      result.error = result.stage;
    }
    return incrementalStatus(result, offset);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new RequestError('Задание не найдено.', 404);
    throw error;
  }
}
