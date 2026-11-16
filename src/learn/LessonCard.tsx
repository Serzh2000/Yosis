import { t } from '../lib/i18n';
import { BookOpen, Check, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { BlockView } from './Blocks';
import { Contents } from './Contents';
import type { BookDef, FlatPage } from './content/schema';
import type { BookProgress } from './progress';
import { routeOf, stageInfo, stagesOfLesson } from './stages';
import { localStore } from '../lib/storage';

const WINDOW_KEY = 'yosis.learn.v1.ui.window';
interface WindowState {
  folded: boolean;
  place: { x: number; y: number } | null;
}
function loadWindow(): WindowState {
  try {
    const saved = JSON.parse(localStore.getItem(WINDOW_KEY) ?? 'null');
    const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    return {
      folded: saved?.folded === true,
      place: saved?.place && ok(saved.place.x) && ok(saved.place.y) ? saved.place : null,
    };
  } catch {
    return { folded: false, place: null };
  }
}

/** What the task of the open page is doing right now, as the desk sees it. */
export interface TaskStatus {
  /** The items of a checklist and which of them hold on the bench. */
  items: { text: string; ok: boolean }[];
  /** The last check of a circuit or a program: how many cases, how many failed, what went wrong. */
  result: { total: number; failed: number; detail: string } | null;
}

export interface Learning {
  progress: BookProgress;
  status: TaskStatus;
  /** «Задание не выполнено. Всё равно дальше?» is on the page. */
  confirmSkip: boolean;
  onSkipAnswer: (go: boolean) => void;
  /** The button of the account: sign in, or the way to the cabinet. */
  accountButton: ReactNode;
  /** The books of the app, how far each is, and the way to open another one. */
  books: { id: string; title: string; available: boolean; done: number; total: number }[];
  onPickBook: (bookId: string) => void;
  onAnswer: (pageId: string, choice: number) => void;
  onInsert: (code: string) => void;
}

/**
 * The card on the left of the lesson screen: one step of the lesson, how far the lesson is, and
 * the way to the next step. It is a window on the desk: it can be folded to its title and dragged
 * out of the way, and it stays where it was left.
 */
export function LessonCard({
  book,
  pages,
  index,
  contentsOpen,
  onTurn,
  onGo,
  onContents,
  onFold,
  learning,
}: {
  book: BookDef;
  pages: FlatPage[];
  index: number;
  contentsOpen: boolean;
  onTurn: (delta: number) => void;
  onGo: (pageId: string) => void;
  onContents: (open: boolean) => void;
  /** The desk makes room for the card while it is open. */
  onFold: (folded: boolean) => void;
  learning: Learning;
}) {
  const flat = pages[index]!;
  const { page, lesson } = flat;
  const [folded, setFolded] = useState(() => loadWindow().folded);
  const [place, setPlace] = useState<WindowState['place']>(() => loadWindow().place);
  useEffect(() => {
    localStore.setItem(WINDOW_KEY, JSON.stringify({ folded, place }));
  }, [folded, place]);
  useEffect(() => onFold(folded), [folded, onFold]);
  const win = useRef<HTMLElement>(null);
  const drag = (event: PointerEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, a, input')) return;
    const box = win.current?.getBoundingClientRect();
    const parent = win.current?.offsetParent?.getBoundingClientRect();
    if (!box || !parent) return;
    const grip = { x: event.clientX - box.left, y: event.clientY - box.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (at: globalThis.PointerEvent) =>
      setPlace({
        x: Math.min(Math.max(0, at.clientX - grip.x - parent.left), parent.width - 80),
        y: Math.min(Math.max(0, at.clientY - grip.y - parent.top), parent.height - 48),
      });
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const steps = lesson?.pages ?? [];
  const at = Math.max(
    0,
    steps.findIndex((item) => item.id === page.id),
  );
  const done = learning.progress.done.includes(page.id);
  const chapterLessons = flat.chapter?.lessons ?? [];
  const where = lesson
    ? t('{chapter} · урок {n} из {total}', {
        chapter: flat.chapter?.title ?? t('Урок'),
        n: chapterLessons.indexOf(lesson) + 1,
        total: chapterLessons.length,
      })
    : t('Справочник');
  const stageIds = stagesOfLesson(steps);
  const route = routeOf(stageIds);
  const here = stageIds[at] ?? 'idea';
  const hereAt = route.findIndex((stop) => stop.stage.id === here);
  const inStage = route[hereAt];
  const nextStage = stageIds[at + 1];
  const nextLabel =
    lesson && at === steps.length - 1
      ? t('К следующему уроку')
      : nextStage && nextStage !== here
        ? stageInfo(nextStage).to
        : t('Дальше');
  const { status } = learning;
  const task = page.task;
  // Hints come one at a time, from a nudge to almost the answer; a new page starts again.
  const [asked, setAsked] = useState({ page: '', shown: 0 });
  const hints = task && (task.kind === 'sim' || task.kind === 'circuit') ? (task.hints ?? []) : [];
  const shown = asked.page === page.id ? Math.min(asked.shown, hints.length) : 0;
  return (
    <section
      ref={win}
      className={'lc' + (folded ? ' is-folded' : '')}
      aria-label={t('Книга «{title}»', { title: book.title })}
      style={place ? { left: place.x, top: place.y } : undefined}
    >
      <header className="lc-head">
        <div className="lc-tools" onPointerDown={drag}>
          <small>{where}</small>
          <span className="lc-tool-buttons">
            <button
              type="button"
              aria-label={folded ? t('Развернуть урок') : t('Свернуть урок')}
              title={folded ? t('Развернуть') : t('Свернуть')}
              aria-expanded={!folded}
              onClick={() => setFolded((value) => !value)}
            >
              {folded ? <Plus size={17} /> : <Minus size={17} />}
            </button>
            <button
              type="button"
              aria-label={t('Оглавление')}
              title={t('Оглавление · Home')}
              onClick={() => onContents(!contentsOpen)}
            >
              <BookOpen size={17} />
            </button>
            {learning.accountButton}
          </span>
        </div>
        <h2>{lesson?.title ?? t('Справочник')}</h2>
        {route.length > 1 ? (
          <nav
            className="lc-route"
            aria-label={t('Этапы урока')}
            style={{ '--stops': route.length } as CSSProperties}
          >
            {route.map((stop, k) => {
              const state = k < hereAt ? 'done' : k === hereAt ? 'now' : undefined;
              return (
                <button
                  key={stop.stage.id}
                  type="button"
                  className={'lc-stop' + (state ? ' is-' + state : '')}
                  aria-current={k === hereAt ? 'step' : undefined}
                  title={`${stop.stage.label}: ${stop.stage.verb}`}
                  onClick={() => steps[stop.first] && onGo(steps[stop.first]!.id)}
                >
                  <span className="lc-stop-n">
                    {state === 'done' ? <Check size={13} strokeWidth={3} /> : k + 1}
                  </span>
                  <span className="lc-stop-text">
                    <b>{stop.stage.label}</b>
                    <small>{stop.stage.verb}</small>
                  </span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </header>
      <article key={page.id} lang="ru" className="lc-body" data-done={done || undefined}>
        {page.title ? <h3 className="lc-page-title">{page.title}</h3> : null}
        <div className="lc-blocks">
          {page.blocks.map((block, k) => (
            <BlockView
              key={k}
              block={block}
              chosen={block.kind === 'quiz' ? learning.progress.quiz[page.id] : undefined}
              onAnswer={(choice) => learning.onAnswer(page.id, choice)}
              onInsert={learning.onInsert}
            />
          ))}
        </div>
        {task ? (
          <section className={'lc-task' + (done ? ' done' : '')} aria-label={t('Задание')}>
            <span className="lc-task-mark" aria-hidden="true">
              {done ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            <div className="lc-task-body">
              <p>
                <strong>{done ? t('Задание выполнено') : t('Задание')}</strong>
                {task.kind !== 'quiz' ? <> · {task.text}</> : null}
              </p>
              {status.items.length ? (
                <ul className="lc-checklist" aria-label={t('Что нужно сделать')}>
                  {status.items.map((item) => (
                    <li key={item.text} className={item.ok ? 'on' : ''}>
                      <span className="lc-check-mark" aria-hidden="true">
                        {item.ok ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : null}
              {status.result ? (
                <p
                  className={
                    'lc-task-line ' +
                    (status.result.total === 0
                      ? 'error'
                      : status.result.failed === 0
                        ? 'passed'
                        : 'failed')
                  }
                  role="status"
                >
                  {status.result.total === 0
                    ? status.result.detail
                    : status.result.failed === 0
                      ? t('Все проверки прошли: {n} из {total}.', {
                          n: status.result.total,
                          total: status.result.total,
                        })
                      : t('Прошло {n} из {total}. {detail}', {
                          n: status.result.total - status.result.failed,
                          total: status.result.total,
                          detail: status.result.detail,
                        })}
                </p>
              ) : null}
              {task.kind === 'sim' || task.kind === 'circuit' ? (
                <p className="lc-task-note">
                  {t('Кнопка «Проверить» — на столе справа')}
                  {task.kind === 'circuit' ? t(' под схемой') : t(' под кодом')}.
                </p>
              ) : null}
              {hints.slice(0, shown).map((hint, at) => (
                <p key={at} className="lc-hint">
                  <b>{t('Подсказка {n}.', { n: at + 1 })}</b> {hint}
                </p>
              ))}
              {!done && shown < hints.length ? (
                <button
                  type="button"
                  className="lc-hint-button"
                  onClick={() => setAsked({ page: page.id, shown: shown + 1 })}
                >
                  {shown === 0 ? t('Нужна подсказка') : t('Ещё подсказку')}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </article>
      <footer className="lc-foot">
        <button
          type="button"
          aria-label={t('Назад')}
          disabled={index === 0}
          onClick={() => onTurn(-1)}
        >
          <ChevronLeft size={18} /> {t('Назад')}
        </button>
        {inStage && inStage.count > 1 ? (
          <span className="lc-count" aria-label={t('Страница этапа')}>
            {at - inStage.first + 1} / {inStage.count}
          </span>
        ) : null}
        <button
          type="button"
          className="lc-next"
          aria-label={t('Вперёд')}
          disabled={index === pages.length - 1}
          onClick={() => onTurn(1)}
        >
          {nextLabel} <ChevronRight size={18} />
        </button>
      </footer>
      {learning.confirmSkip ? (
        <div className="lc-confirm" role="alertdialog" aria-label={t('Задание не выполнено')}>
          <p>
            <strong>{t('Задание не выполнено.')}</strong>
            {t(' Всё равно дальше?')}
          </p>
          <div className="lc-confirm-row">
            <button type="button" autoFocus onClick={() => learning.onSkipAnswer(false)}>
              {t('Остаться')}
            </button>
            <button type="button" onClick={() => learning.onSkipAnswer(true)}>
              {t('Дальше')}
            </button>
          </div>
        </div>
      ) : null}
      {contentsOpen ? (
        <Contents
          book={book}
          currentLessonId={lesson?.id ?? null}
          progress={learning.progress}
          books={learning.books}
          onPickBook={(id) => {
            onContents(false);
            learning.onPickBook(id);
          }}
          onGo={(id) => {
            onGo(id);
            onContents(false);
          }}
          onClose={() => onContents(false)}
        />
      ) : null}
    </section>
  );
}
