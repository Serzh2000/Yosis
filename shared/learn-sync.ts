// Progress of the textbook as it travels between the browser and the account store. Pure
// functions only: the server and the client merge with the very same code, so a result
// never depends on which side did the merging.

/** A page counted as done: by the learner (the bench judged it) or by the teacher, with a comment. */
export interface WireDone {
  at: number;
  by: 'student' | 'teacher';
  note?: string;
}
export interface WireQuiz {
  choice: number;
  at: number;
}
/** One book of one learner, with the time of every fact so that two copies can be merged. */
export interface WireBook {
  done: Record<string, WireDone>;
  skipped: Record<string, number>;
  quiz: Record<string, WireQuiz>;
}
export type WireProgress = Record<string, WireBook>;

export const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
export const ID_MAX = 100;
export const NOTE_MAX = 400;
/** Limits that keep one account small; the textbook has under a thousand pages per book. */
export const MAX_BOOKS = 20;
export const MAX_PAGES_PER_BOOK = 2000;

export const emptyWireBook = (): WireBook => ({ done: {}, skipped: {}, quiz: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validId = (value: string) => value.length <= ID_MAX && ID_PATTERN.test(value);
const time = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
export const cleanNote = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\r/g, '').trim().slice(0, NOTE_MAX) : '';

/** Keeps only well-formed facts and at most MAX_PAGES_PER_BOOK of each kind; never throws. */
export function sanitizeBook(raw: unknown, now = Date.now()): WireBook {
  const book = emptyWireBook();
  if (!isRecord(raw)) return book;
  if (isRecord(raw.done))
    for (const [id, item] of Object.entries(raw.done).slice(0, MAX_PAGES_PER_BOOK)) {
      if (!validId(id) || !isRecord(item)) continue;
      const entry: WireDone = {
        at: time(item.at, now),
        by: item.by === 'teacher' ? 'teacher' : 'student',
      };
      const note = cleanNote(item.note);
      if (note) entry.note = note;
      book.done[id] = entry;
    }
  if (isRecord(raw.skipped))
    for (const [id, at] of Object.entries(raw.skipped).slice(0, MAX_PAGES_PER_BOOK))
      if (validId(id)) book.skipped[id] = time(at, now);
  if (isRecord(raw.quiz))
    for (const [id, item] of Object.entries(raw.quiz).slice(0, MAX_PAGES_PER_BOOK)) {
      if (!validId(id) || !isRecord(item)) continue;
      const { choice } = item;
      if (typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice < 20)
        book.quiz[id] = { choice, at: time(item.at, 0) };
    }
  for (const id of Object.keys(book.skipped)) if (book.done[id]) delete book.skipped[id];
  return book;
}

/** Books of a request; the book count is limited and unknown shapes are dropped. */
export function sanitizeProgress(raw: unknown, now = Date.now()): WireProgress {
  const out: WireProgress = {};
  if (!isRecord(raw)) return out;
  for (const [bookId, book] of Object.entries(raw).slice(0, MAX_BOOKS))
    if (validId(bookId)) out[bookId] = sanitizeBook(book, now);
  return out;
}

/**
 * Two copies of one book become one. Done pages are united (the earlier time stays; a
 * teacher's credit and its comment win over the learner's own mark). Skipped pages are united
 * minus the done ones. For quiz answers the newer one wins; on a tie, the larger choice, so
 * both sides pick the same one.
 */
export function mergeBook(a: WireBook, b: WireBook): WireBook {
  const out = emptyWireBook();
  for (const source of [a, b])
    for (const [id, item] of Object.entries(source.done)) {
      const have = out.done[id];
      if (!have) out.done[id] = { ...item };
      else {
        const teacher = have.by === 'teacher' ? have : item.by === 'teacher' ? item : null;
        const merged: WireDone = {
          at: Math.min(have.at, item.at),
          by: teacher ? 'teacher' : 'student',
        };
        const note = teacher?.note ?? have.note ?? item.note;
        if (note) merged.note = note;
        out.done[id] = merged;
      }
    }
  for (const source of [a, b])
    for (const [id, at] of Object.entries(source.skipped))
      if (!out.done[id]) out.skipped[id] = Math.min(out.skipped[id] ?? at, at);
  for (const source of [a, b])
    for (const [id, item] of Object.entries(source.quiz)) {
      const have = out.quiz[id];
      if (!have || item.at > have.at || (item.at === have.at && item.choice > have.choice))
        out.quiz[id] = { ...item };
    }
  return out;
}

export function mergeProgress(a: WireProgress, b: WireProgress): WireProgress {
  const out: WireProgress = {};
  for (const bookId of new Set([...Object.keys(a), ...Object.keys(b)]))
    out[bookId] = mergeBook(a[bookId] ?? emptyWireBook(), b[bookId] ?? emptyWireBook());
  return out;
}

/** Same facts, whatever the order of keys. Used to tell whether a merge changed anything. */
export function sameBook(a: WireBook, b: WireBook): boolean {
  const norm = (book: WireBook) =>
    JSON.stringify([
      Object.entries(book.done).sort(),
      Object.entries(book.skipped).sort(),
      Object.entries(book.quiz).sort(),
    ]);
  return norm(a) === norm(b);
}
