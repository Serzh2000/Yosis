import { useCallback, useState } from 'react';
import type { PhysicalResult } from '../../shared/physical';
import type { JtagIdentity } from '../lib/gowin-jtag';

/**
 * То, что вкладки «Кристалл» и «Подключение» сообщают студии: последнее размещение, найдена ли
 * плата и какой проект в неё записан. Миссия и значки навигации сверяют это с текущим проектом.
 */
export function useHardwareState() {
  const [physical, setPhysical] = useState<{
    result: PhysicalResult | null;
    snapshot: string;
  }>({ result: null, snapshot: '' });
  const [boardIdentified, setBoardIdentified] = useState(false);
  const [programmedSnapshot, setProgrammedSnapshot] = useState('');
  const onPhysicalResult = useCallback(
    (result: PhysicalResult | null, snapshot: string) => setPhysical({ result, snapshot }),
    [],
  );
  const onIdentity = useCallback(
    (identity: JtagIdentity | null) => setBoardIdentified(!!identity),
    [],
  );
  return {
    physical,
    boardIdentified,
    programmedSnapshot,
    onPhysicalResult,
    onIdentity,
    onProgrammed: setProgrammedSnapshot,
  };
}
