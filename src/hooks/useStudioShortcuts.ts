import { useEffect, useRef } from 'react';

/**
 * Горячие клавиши студии: Ctrl/Cmd+Enter запускает синтез, Ctrl/Cmd+S сохраняет проект,
 * Escape закрывает лёгкие окна.
 */
export function useStudioShortcuts({
  startBuild,
  flushSave,
  onEscape,
}: {
  startBuild: () => Promise<void>;
  flushSave: () => Promise<unknown>;
  onEscape: () => void;
}) {
  const escape = useRef(onEscape);
  escape.current = onEscape;
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.defaultPrevented) {
        event.preventDefault();
        void startBuild();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flushSave().catch(() => {});
      }
      if (event.key === 'Escape') escape.current();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [startBuild, flushSave]);
}
