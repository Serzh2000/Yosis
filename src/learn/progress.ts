// Learner state of the textbook (plan §4.5). Everything lives in localStorage, every read and
// write is guarded: a missing, full or corrupted storage never breaks the book. The helpers
// below are pure and return new objects.
import { flattenBook, type BookDef, type LessonDef, type PageDef } from './content/schema';

import { localStore } from '../lib/storage';

export type StorageGetter = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** The browser's storage through the studio's guarded wrapper: a full or blocked one never throws. */
export const defaultStorage: StorageGetter = () => ({
  getItem: (key) => localStore.getItem(key),
  setItem: (key, value) => void localStore.setItem(key, value),
  removeItem: (key) => localStore.removeItem(key),
});

const prefix = 'yosis.learn.v1.';
export const currentKey = `${prefix}current`;
export const progressKey = (bookId: string) => `${prefix}book.${bookId}.progress`;
export const uiKey = `${prefix}ui`;
export const achievementsKey = `${prefix}achievements`;

export interface CurrentPlace {
  bookId: string;
  pageId: string;
}
export interface BookProgress {
  done: string[];
  skipped: string[];
  /** The option the learner chose last, by page id. */
  quiz: Record<string, number>;
}
export type DrawerState = 'closed' | 'code' | 'serial';
export interface UiState {
  collapsed: boolean;
  drawer: DrawerState;
  sound: boolean;
}
export type LessonState = 'new' | 'started' | 'done';

export const emptyProgress = (): BookProgress => ({ done: [], skipped: [], quiz: {} });
export const defaultUi = (): UiState => ({ collapsed: false, drawer: 'closed', sound: true });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) if (typeof item === 'string' && item) seen.add(item);
  return [...seen];
};

function read(storage: StorageGetter, key: string): unknown {
  try {
    const text = storage().getItem(key);
    return text === null ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}
function write(storage: StorageGetter, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* the book works without storage */
  }
}

/* Validation */

export function parseCurrent(value: unknown): CurrentPlace | null {
  if (!isRecord(value)) return null;
  const { bookId, pageId } = value;
  return typeof bookId === 'string' && bookId && typeof pageId === 'string' && pageId
    ? { bookId, pageId }
    : null;
}
export function parseProgress(value: unknown): BookProgress {
  if (!isRecord(value)) return emptyProgress();
  const done = strings(value.done);
  const skipped = strings(value.skipped).filter((id) => !done.includes(id));
  const quiz: Record<string, number> = {};
  if (isRecord(value.quiz))
    for (const [id, choice] of Object.entries(value.quiz))
      if (typeof choice === 'number' && Number.isInteger(choice) && choice >= 0) quiz[id] = choice;
  return { done, skipped, quiz };
}
export function parseUi(value: unknown): UiState {
  const ui = defaultUi();
  if (!isRecord(value)) return ui;
  if (typeof value.collapsed === 'boolean') ui.collapsed = value.collapsed;
  if (value.drawer === 'closed' || value.drawer === 'code' || value.drawer === 'serial')
    ui.drawer = value.drawer;
  if (typeof value.sound === 'boolean') ui.sound = value.sound;
  return ui;
}

/* Storage */

export const loadCurrent = (storage = defaultStorage): CurrentPlace | null =>
  parseCurrent(read(storage, currentKey));
export const saveCurrent = (place: CurrentPlace, storage = defaultStorage) =>
  write(storage, currentKey, place);

/** The page a book was left open at: the shelf returns to it when the book is picked again. */
export const placeKey = (bookId: string) => `${prefix}book.${bookId}.place`;
export const loadPlace = (bookId: string, storage = defaultStorage): string | null => {
  const value = read(storage, placeKey(bookId));
  return typeof value === 'string' && value ? value : null;
};
export const savePlace = (bookId: string, pageId: string, storage = defaultStorage) =>
  write(storage, placeKey(bookId), pageId);

export const loadProgress = (bookId: string, storage = defaultStorage): BookProgress =>
  parseProgress(read(storage, progressKey(bookId)));
export const saveProgress = (bookId: string, progress: BookProgress, storage = defaultStorage) =>
  write(storage, progressKey(bookId), progress);

export const loadUi = (storage = defaultStorage): UiState => parseUi(read(storage, uiKey));
export const saveUi = (ui: UiState, storage = defaultStorage) => write(storage, uiKey, ui);

export const loadAchievements = (storage = defaultStorage): string[] =>
  strings(read(storage, achievementsKey));
export const saveAchievements = (ids: string[], storage = defaultStorage) =>
  write(storage, achievementsKey, strings(ids));

/* Pure helpers */

export function markDone(progress: BookProgress, pageId: string): BookProgress {
  if (progress.done.includes(pageId) && !progress.skipped.includes(pageId)) return progress;
  return {
    ...progress,
    done: progress.done.includes(pageId) ? progress.done : [...progress.done, pageId],
    skipped: progress.skipped.filter((id) => id !== pageId),
  };
}
/** A page that is already done cannot become skipped. */
export function markSkipped(progress: BookProgress, pageId: string): BookProgress {
  if (progress.done.includes(pageId) || progress.skipped.includes(pageId)) return progress;
  return { ...progress, skipped: [...progress.skipped, pageId] };
}
export function recordQuiz(progress: BookProgress, pageId: string, choice: number): BookProgress {
  if (progress.quiz[pageId] === choice) return progress;
  return { ...progress, quiz: { ...progress.quiz, [pageId]: choice } };
}

const hasTask = (page: PageDef) => page.task !== undefined;

/** done: every page with a task is done; started: something is done, skipped or answered. */
export function lessonState(lesson: LessonDef, progress: BookProgress): LessonState {
  const tasks = lesson.pages.filter(hasTask);
  if (tasks.length > 0 && tasks.every((page) => progress.done.includes(page.id))) return 'done';
  const touched = lesson.pages.some(
    (page) =>
      progress.done.includes(page.id) ||
      progress.skipped.includes(page.id) ||
      page.id in progress.quiz,
  );
  return touched ? 'started' : 'new';
}

/** Pages with a task, and how many of them are done. */
export function bookProgress(
  book: BookDef,
  progress: BookProgress,
): { done: number; total: number } {
  let done = 0,
    total = 0;
  for (const { page } of flattenBook(book)) {
    if (!hasTask(page)) continue;
    total++;
    if (progress.done.includes(page.id)) done++;
  }
  return { done, total };
}

/**
 * Achievements of plan §5.6, computed from progress alone.
 * - `first-led`: any page with a `build` task is done.
 * - `first-program`: any page with a `sim` task is done.
 * - `chapter:<id>`: the chapter has task pages and all of them are done.
 * - `no-hints`: a lesson with task pages whose task pages are all done and none skipped.
 * - `book-done`: the book has task pages and all of them are done.
 */
export function earnedAchievements(book: BookDef, progress: BookProgress): string[] {
  const earned: string[] = [];
  const doneTask = (kind: string) =>
    flattenBook(book).some(
      ({ page }) => page.task?.kind === kind && progress.done.includes(page.id),
    );
  if (doneTask('build')) earned.push('first-led');
  if (doneTask('sim') || doneTask('circuit')) earned.push('first-program');
  for (const chapter of book.chapters) {
    const tasks = chapter.lessons.flatMap((lesson) => lesson.pages).filter(hasTask);
    if (tasks.length > 0 && tasks.every((page) => progress.done.includes(page.id)))
      earned.push(`chapter:${chapter.id}`);
  }
  const clean = book.chapters.some((chapter) =>
    chapter.lessons.some((lesson) => {
      const tasks = lesson.pages.filter(hasTask);
      return (
        tasks.length > 0 &&
        tasks.every(
          (page) => progress.done.includes(page.id) && !progress.skipped.includes(page.id),
        )
      );
    }),
  );
  if (clean) earned.push('no-hints');
  const total = bookProgress(book, progress);
  if (total.total > 0 && total.done === total.total) earned.push('book-done');
  return earned;
}
