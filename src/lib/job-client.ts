import { request } from './api';
import { translateServerMessage } from './i18n';

interface JobRecord {
  id: string;
  status: string;
  logs: string;
}

type JobUpdate<T> = Partial<T> & {
  status: string;
  logs: string;
  nextLogOffset: number;
  logReset: boolean;
};

/** Журнал в том виде, как его отдал сервер: смещение считается по нему, а не по переведённому. */
const rawLogs = new WeakMap<object, string>();

const terminalStatuses = new Set(['success', 'error', 'cancelled']);

/** Poll small metadata and new log text; download artifacts once at completion. */
export async function pollJob<T extends JobRecord>(
  endpoint: string,
  current: T,
  signal: AbortSignal,
): Promise<T> {
  const previousLogs = rawLogs.get(current) ?? current.logs;
  const update = await request<JobUpdate<T>>(
    `${endpoint}/status?logOffset=${previousLogs.length}`,
    { signal },
  );
  if (terminalStatuses.has(update.status)) {
    const final = await request<T>(endpoint, { signal });
    return { ...final, logs: translateServerMessage(final.logs) };
  }
  const { logs, logReset, nextLogOffset: _offset, ...metadata } = update;
  const raw = logReset ? logs : previousLogs + logs;
  const next = { ...current, ...metadata, logs: translateServerMessage(raw) } as T;
  rawLogs.set(next, raw);
  return next;
}
