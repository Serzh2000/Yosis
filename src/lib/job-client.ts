import { request } from './api';

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

const terminalStatuses = new Set(['success', 'error', 'cancelled']);

/** Poll small metadata and new log text; download artifacts once at completion. */
export async function pollJob<T extends JobRecord>(
  endpoint: string,
  current: T,
  signal: AbortSignal,
): Promise<T> {
  const update = await request<JobUpdate<T>>(
    `${endpoint}/status?logOffset=${current.logs.length}`,
    { signal },
  );
  if (terminalStatuses.has(update.status)) return request<T>(endpoint, { signal });
  const { logs, logReset, nextLogOffset: _offset, ...metadata } = update;
  return { ...current, ...metadata, logs: logReset ? logs : current.logs + logs } as T;
}
