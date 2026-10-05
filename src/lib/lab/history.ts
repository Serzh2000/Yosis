/** Undo and redo for any state that is replaced as a whole. States are immutable snapshots. */
export interface History<T> {
  past: T[];
  future: T[];
  /** The kind of the last edit: a quick run of edits of one kind is one step. */
  key: string;
  at: number;
}
export const HISTORY_LIMIT = 100;
/** Edits of one kind closer together than this (typing, nudging) undo as one. */
export const COALESCE_MS = 700;

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [], key: '', at: 0 });

/** Remember `before`, the state an edit is about to replace. */
export function record<T>(
  history: History<T>,
  before: T,
  key = '',
  now = Date.now(),
  limit = HISTORY_LIMIT,
): History<T> {
  const joined = key !== '' && key === history.key && now - history.at < COALESCE_MS;
  return {
    past: joined && history.past.length ? history.past : [...history.past, before].slice(-limit),
    future: [],
    key,
    at: now,
  };
}
export function undo<T>(
  history: History<T>,
  present: T,
): { history: History<T>; present: T } | null {
  if (!history.past.length) return null;
  return {
    present: history.past[history.past.length - 1],
    history: {
      past: history.past.slice(0, -1),
      future: [present, ...history.future],
      key: '',
      at: 0,
    },
  };
}
export function redo<T>(
  history: History<T>,
  present: T,
): { history: History<T>; present: T } | null {
  if (!history.future.length) return null;
  return {
    present: history.future[0],
    history: {
      past: [...history.past, present],
      future: history.future.slice(1),
      key: '',
      at: 0,
    },
  };
}
