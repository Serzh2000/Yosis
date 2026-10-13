import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project } from '../../shared/types';
import type { Example } from '../lib/examples';
import {
  dismissStaleNotice,
  findStaleExampleCopy,
  isStaleNoticeDismissed,
} from '../lib/example-origin';

/**
 * Сообщение «копия примера устарела». Библиотека примеров весит почти полмегабайта, поэтому она
 * подгружается лениво, когда проекты уже открыты, а не входит в стартовый бандл.
 */
export function useStaleExample(project: Project, ready: boolean) {
  const [library, setLibrary] = useState<readonly Example[] | null>(null);
  const [noticeVersion, setNoticeVersion] = useState(0);
  useEffect(() => {
    if (!ready || library) return;
    let disposed = false;
    void import('../lib/examples')
      .then((module) => {
        if (!disposed) setLibrary(module.examples);
      })
      .catch(() => {
        /* Напоминание необязательно: без библиотеки студия работает как обычно. */
      });
    return () => {
      disposed = true;
    };
  }, [ready, library]);
  const candidate = useMemo(
    () => (ready && library ? findStaleExampleCopy(project, library) : null),
    [project, ready, library],
  );
  // noticeVersion заставляет перечитать признак скрытия после нажатия «Скрыть».
  const staleExample =
    noticeVersion >= 0 && candidate && !isStaleNoticeDismissed(project.id, candidate.currentHash)
      ? candidate
      : null;
  const dismiss = useCallback(() => {
    if (!staleExample) return;
    dismissStaleNotice(project.id, staleExample.currentHash);
    setNoticeVersion((value) => value + 1);
  }, [project.id, staleExample]);
  return { staleExample, dismissStaleExample: dismiss };
}
