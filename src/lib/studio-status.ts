import type { BuildResult } from '../../shared/types';
import type { PhysicalResult } from '../../shared/physical';
import type { WorkspaceStatus } from './studio-tabs';

/** Значок на вкладке «Синтез»: идёт работа, результат устарел, готово или ошибка. */
export function synthesisStatus(
  build: BuildResult | null,
  busy: boolean,
  stale: boolean,
): WorkspaceStatus | undefined {
  if (busy) return 'busy';
  if (stale) return 'stale';
  if (build?.status === 'success') return 'success';
  if (build?.status === 'error') return 'error';
  return undefined;
}

/** Значок на вкладке «Кристалл»: размещение относится к текущему проекту или устарело. */
export function physicalStatus(
  physical: { result: PhysicalResult | null; snapshot: string },
  projectSnapshot: string,
): WorkspaceStatus | undefined {
  const status = physical.result?.status;
  if (status === 'success') return physical.snapshot === projectSnapshot ? 'success' : 'stale';
  if (status === 'error') return 'error';
  if (status === 'running' || status === 'queued') return 'busy';
  return undefined;
}
