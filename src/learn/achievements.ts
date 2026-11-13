// Names of the achievements (plan §5.6) and the diff between what is earned and what was shown.
import type { BookDef } from './content/schema';
import { earnedAchievements, type BookProgress } from './progress';

const fixed: Record<string, string> = {
  'first-led': 'Первый светодиод',
  'first-program': 'Первая программа',
  'no-hints': 'Без пропусков',
  'book-done': 'Книга пройдена',
};

/** «Глава пройдена: Электроника» for `chapter:<id>`; the plain name for the others. */
export function achievementTitle(book: BookDef, id: string): string {
  if (id.startsWith('chapter:')) {
    const chapter = book.chapters.find((item) => `chapter:${item.id}` === id);
    return chapter ? `Глава пройдена: ${chapter.title}` : 'Глава пройдена';
  }
  return fixed[id] ?? id;
}

export interface AchievementDiff {
  /** Everything earned now, to be saved. */
  all: string[];
  /** Earned since the last save: these are announced. */
  fresh: string[];
}

/** Achievements are only ever added: one that was shown stays, even if progress is reset. */
export function diffAchievements(
  book: BookDef,
  progress: BookProgress,
  saved: string[],
): AchievementDiff {
  const earned = earnedAchievements(book, progress);
  const known = new Set(saved);
  const fresh = earned.filter((id) => !known.has(id));
  return { all: [...saved, ...fresh], fresh };
}

/** The achievements of a book that the learner has, in a stable order for the list. */
export function ownedFor(book: BookDef, saved: string[]): string[] {
  const prefix = new Set(['first-led', 'first-program', 'no-hints', 'book-done']);
  const ids = new Set(book.chapters.map((chapter) => `chapter:${chapter.id}`));
  return saved.filter((id) => prefix.has(id) || ids.has(id));
}
