import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { BookDef } from './content/schema';
import { lessonState, type BookProgress } from './progress';

const MARK = { new: '·', started: '◐', done: '✓' } as const;
const STATE = { new: 'не начат', started: 'начат', done: 'пройден' } as const;

/**
 * The map of the course: a window over the desk with the books of the shelf, and the chapters and
 * lessons of the open one, each with how far the learner is. A lesson opens at its first page.
 */
export function Contents({
  book,
  currentLessonId,
  progress,
  books,
  onPickBook,
  onGo,
  onClose,
}: {
  book: BookDef;
  currentLessonId: string | null;
  progress: BookProgress;
  books: { id: string; title: string; available: boolean; done: number; total: number }[];
  onPickBook: (bookId: string) => void;
  onGo: (pageId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="map" role="dialog" aria-label="Оглавление">
      <header className="map-head">
        <h2>{book.title}</h2>
        <button type="button" aria-label="Закрыть оглавление" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="map-body">
        <ul className="map-books" aria-label="Книги">
          {books.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === book.id}
                disabled={!item.available}
                onClick={() => onPickBook(item.id)}
              >
                <b>{item.title}</b>
                <small>{item.available ? `${item.done} из ${item.total} заданий` : 'скоро'}</small>
                <i
                  style={{
                    width: item.total ? `${Math.round((100 * item.done) / item.total)}%` : '0%',
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
        {book.chapters.map((chapter) => (
          <section key={chapter.id}>
            <h3>{chapter.title}</h3>
            <ul>
              {chapter.lessons.map((lesson) => {
                const state = lessonState(lesson, progress);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={lesson.id === currentLessonId ? 'now' : ''}
                      aria-current={lesson.id === currentLessonId ? 'step' : undefined}
                      onClick={() => onGo(lesson.pages[0]!.id)}
                    >
                      <span className={`map-mark ${state}`} aria-hidden="true">
                        {MARK[state]}
                      </span>
                      <span>{lesson.title}</span>
                      <small>
                        {lesson.minutes ? `${lesson.minutes} мин · ` : ''}
                        {STATE[state]}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
