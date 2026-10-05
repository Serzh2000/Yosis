import { useCallback, useMemo, useRef, useState } from 'react';
import { emptyHistory, record, redo as redoStep, undo as undoStep } from '../../lib/lab/history';
import type { LabLayout } from '../../lib/lab/runtime';

type Change = LabLayout | ((layout: LabLayout) => LabLayout);

/**
 * The bench layout with undo and redo. `commit` is one undoable step; `live` shows an
 * in-progress change (a drag) that `endLive` then turns into one step. `silent` changes what
 * undo must not touch, like the zoom.
 */
export function useLabHistory(initial: () => LabLayout, persist: (layout: LabLayout) => void) {
  const [layout, setLayout] = useState(initial);
  const state = useRef({
    present: layout,
    history: emptyHistory<LabLayout>(),
    anchor: null as LabLayout | null,
  });
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const show = useCallback((next: LabLayout) => {
    state.current.present = next;
    setLayout(next);
  }, []);

  return useMemo(
    () => ({
      layout,
      /** The latest layout, also between renders. */
      get: () => state.current.present,
      canUndo: state.current.history.past.length > 0,
      canRedo: state.current.history.future.length > 0,
      commit(change: Change, key?: string) {
        const s = state.current;
        const next = typeof change === 'function' ? change(s.present) : change;
        if (next === s.present) return;
        s.history = record(s.history, s.present, key);
        show(next);
        persistRef.current(next);
      },
      live(change: Change) {
        const s = state.current;
        show(typeof change === 'function' ? change(s.present) : change);
      },
      beginLive() {
        state.current.anchor = state.current.present;
      },
      endLive(keep = true) {
        const s = state.current;
        const anchor = s.anchor;
        s.anchor = null;
        if (!anchor) return;
        if (!keep) show(anchor);
        else if (s.present !== anchor) {
          s.history = record(s.history, anchor);
          persistRef.current(s.present);
        }
      },
      silent(patch: Partial<LabLayout>) {
        const next = { ...state.current.present, ...patch };
        show(next);
        persistRef.current(next);
      },
      undo() {
        const s = state.current;
        const step = undoStep(s.history, s.present);
        if (!step) return;
        s.history = step.history;
        const next = { ...step.present, zoom: s.present.zoom, autoPower: s.present.autoPower };
        show(next);
        persistRef.current(next);
      },
      redo() {
        const s = state.current;
        const step = redoStep(s.history, s.present);
        if (!step) return;
        s.history = step.history;
        const next = { ...step.present, zoom: s.present.zoom, autoPower: s.present.autoPower };
        show(next);
        persistRef.current(next);
      },
      reset(next: LabLayout) {
        state.current.history = emptyHistory();
        state.current.anchor = null;
        show(next);
      },
    }),
    // The history object is read through the ref; a new layout is what changes the snapshot.
    [layout, show],
  );
}
