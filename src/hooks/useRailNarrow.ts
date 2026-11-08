import { useCallback, useState } from 'react';
import { localStore, STORAGE_KEYS } from '../lib/storage';

/** Whether the menu on the left is folded to icons; the choice is kept for the next visit. */
export function useRailNarrow() {
  const [narrow, setNarrow] = useState(() => localStore.getItem(STORAGE_KEYS.railNarrow) === '1');
  const toggle = useCallback(
    () =>
      setNarrow((value) => {
        localStore.setItem(STORAGE_KEYS.railNarrow, value ? '0' : '1');
        return !value;
      }),
    [],
  );
  return { narrow, toggle };
}
