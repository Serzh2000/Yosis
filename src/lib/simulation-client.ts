import type { Project, SimulationConfig, SimulationResult } from '../../shared/types';
import { pollJob } from './job-client';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Ошибка сервиса: ${response.status}`);
  return data as T;
}

function pause(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Операция отменена', 'AbortError'));
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('Операция отменена', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 450);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function runSimulation(
  project: Project,
  config: SimulationConfig,
  signal: AbortSignal,
  onProgress?: (result: SimulationResult) => void,
): Promise<SimulationResult> {
  if (signal.aborted) throw new DOMException('Операция отменена', 'AbortError');
  // Keep the submission response so cancellation can retrieve and cancel its job id.
  // Aborting this POST after the server queued the job would lose that id.
  let result = await request<SimulationResult>('/api/simulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, config }),
  });
  const id = result.id;
  const cancel = () => {
    void fetch(`/api/simulations/${id}/cancel`, { method: 'POST' }).catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) {
    cancel();
    throw new DOMException('Операция отменена', 'AbortError');
  }
  try {
    onProgress?.(result);
    while (result.status === 'queued' || result.status === 'running') {
      await pause(signal);
      if (signal.aborted) throw new DOMException('Операция отменена', 'AbortError');
      result = await pollJob(`/api/simulations/${id}`, result, signal);
      onProgress?.(result);
    }
    if (result.status !== 'success' || !result.vcd)
      throw new Error(
        result.error ||
          (result.status === 'cancelled' ? 'Симуляция отменена.' : 'Симулятор не вернул VCD.'),
      );
    return result;
  } catch (failure) {
    if (!signal.aborted && (result.status === 'queued' || result.status === 'running')) cancel();
    throw failure;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
