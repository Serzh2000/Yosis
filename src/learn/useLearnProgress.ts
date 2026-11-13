import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProgressSync } from './account/sync';
import type { BookDef } from './content/schema';
import { loadProgress, markDone, markSkipped, recordQuiz, saveProgress } from './progress';
import type { BookProgress } from './progress';

/**
 * What the learner has done in the open book: kept in localStorage and, with an account, sent
 * to the server after a pause. A copy that arrives from the server (sign-in, another device) is
 * shown without a reload.
 */
export function useLearnProgress(book: BookDef, sync?: ProgressSync) {
  const [state, setState] = useState(() => ({ bookId: book.id, progress: loadProgress(book.id) }));
  if (state.bookId !== book.id) setState({ bookId: book.id, progress: loadProgress(book.id) });
  const progress = state.bookId === book.id ? state.progress : loadProgress(book.id);

  const update = useCallback(
    (change: (progress: BookProgress) => BookProgress) =>
      setState((current) => {
        const next = change(current.progress);
        return next === current.progress ? current : { ...current, progress: next };
      }),
    [],
  );
  const saved = useRef({ bookId: book.id, progress });
  useEffect(() => {
    const before = saved.current;
    saved.current = { bookId: book.id, progress };
    if (before.progress === progress) return;
    saveProgress(book.id, progress);
    if (before.bookId === book.id) sync?.recordChange(book.id, before.progress, progress);
  }, [book.id, progress, sync]);
  useEffect(() => {
    if (!sync) return;
    return sync.onApplied((changed) => {
      if (!changed.includes(book.id)) return;
      const next = loadProgress(book.id);
      saved.current = { bookId: book.id, progress: next };
      setState({ bookId: book.id, progress: next });
    });
  }, [sync, book.id]);

  return {
    progress,
    markDone: useCallback((pageId: string) => update((p) => markDone(p, pageId)), [update]),
    markSkipped: useCallback((pageId: string) => update((p) => markSkipped(p, pageId)), [update]),
    answer: useCallback(
      (pageId: string, choice: number) => update((p) => recordQuiz(p, pageId, choice)),
      [update],
    ),
  };
}
export type LearnProgress = ReturnType<typeof useLearnProgress>;
