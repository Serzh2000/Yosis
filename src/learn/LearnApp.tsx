import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Cpu, GraduationCap, Workflow } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { AccountButton } from './account/AccountButton';
import { AccountProvider, useAccount } from './account/AccountProvider';
import { Bench, judgeBench } from './BenchTask';
import { books } from './content/books';
import { flattenBook, type BenchState, type BookDef, type PageDef } from './content/schema';
import { LessonCard, type TaskStatus } from './LessonCard';
import {
  bookProgress,
  loadCurrent,
  loadPlace,
  loadProgress,
  saveCurrent,
  savePlace,
} from './progress';
import { learnRoutePath, learnView, parseLearnRoute } from './routes';
import { SchematicTask } from './SchematicTask';
import { resolveStart } from './start';
import { deskFor, type DeskView } from './stages';
import { useLearnProgress } from './useLearnProgress';
import type { RunResult } from './useExerciseRun';
import { VerilogTask } from './VerilogTask';
import './learn.css';
import './account/account.css';

const CabinetPage = lazy(() => import('./account/CabinetPage'));
const MODE_ICON = { verilog: Cpu, schematic: Workflow } as const;
const DESIGN_LABEL = { verilog: 'Код', schematic: 'Схема' } as const;

/** Entry of the textbook: the lesson screen, or one of the two cabinets that live beside it. */
export default function LearnApp() {
  const view = learnView(location.pathname);
  if (view === 'book')
    return (
      <AccountProvider>
        <Lesson />
      </AccountProvider>
    );
  return (
    <Suspense fallback={null}>
      <CabinetPage view={view} />
    </Suspense>
  );
}

function Lesson() {
  const account = useAccount();
  const { theme, toggleTheme } = useTheme();
  const [route, setRoute] = useState(() =>
    resolveStart(parseLearnRoute(location.pathname), books, loadCurrent(), loadPlace),
  );
  const book = books.find((item) => item.id === route.bookId)!;
  const pages = useMemo(() => flattenBook(book), [book]);
  const index = Math.max(
    0,
    pages.findIndex((item) => item.page.id === route.pageId),
  );
  const current = pages[index]!;
  const page = current.page;
  const learner = useLearnProgress(book, account.sync);
  const progress = learner.progress;
  const done = progress.done.includes(page.id);

  // The address follows the page, and the page is remembered for next time.
  useEffect(() => {
    const path = learnRoutePath(route);
    if (location.pathname !== path) history.replaceState(null, '', path);
    saveCurrent(route);
    savePlace(route.bookId, route.pageId);
    document.title = `${current.lesson?.title ?? book.title} — Yosis`;
  }, [route, current, book.title]);
  useEffect(() => {
    const back = () =>
      setRoute(resolveStart(parseLearnRoute(location.pathname), books, loadCurrent(), loadPlace));
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  const go = useCallback((bookId: string, pageId: string) => {
    setRoute({ bookId, pageId });
    history.pushState(null, '', learnRoutePath({ bookId, pageId }));
  }, []);
  const goPage = useCallback((pageId: string) => go(book.id, pageId), [go, book.id]);

  // The desk shows the board, or the work of the page (the code or the circuit); a page that asks
  // for one of them turns the desk to it, and the learner can turn it back.
  const [view, setView] = useState<DeskView>(() => deskFor(page) ?? 'bench');
  const [benchSeen, setBenchSeen] = useState(view === 'bench');
  const wanted = deskFor(page);
  useEffect(() => {
    // A page without work of its own leaves nothing to show in the editor: back to the board.
    setView((now) => wanted ?? (now === 'design' ? 'bench' : now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);
  useEffect(() => {
    if (view === 'bench') setBenchSeen(true);
  }, [view]);

  const [contentsOpen, setContentsOpen] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [folded, setFolded] = useState(false);
  const [insert, setInsert] = useState<{ code: string; stamp: number } | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  const doneRef = useRef(progress.done);
  doneRef.current = progress.done;
  const taskDone = useCallback(
    (pageId: string) => {
      if (doneRef.current.includes(pageId)) return;
      learner.markDone(pageId);
      setSuccess(pageId);
    },
    [learner],
  );
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4200);
    return () => window.clearTimeout(timer);
  }, [success]);

  const turn = useCallback(
    (delta: number) => {
      const next = pages[index + delta];
      if (!next) return;
      // Going on past an unfinished task asks first; going back never does.
      if (delta > 0 && page.task && !doneRef.current.includes(page.id)) {
        setConfirmSkip(true);
        return;
      }
      setSuccess(null);
      goPage(next.page.id);
    },
    [pages, index, page, goPage],
  );
  const onSkipAnswer = (goOn: boolean) => {
    setConfirmSkip(false);
    const next = pages[index + 1];
    if (!goOn || !next) return;
    learner.markSkipped(page.id);
    goPage(next.page.id);
  };
  const pickBook = (bookId: string) => {
    if (bookId === book.id) return;
    const target = resolveStart({ bookId }, books, loadCurrent(), loadPlace);
    go(target.bookId, target.pageId);
  };
  useEffect(() => setConfirmSkip(false), [page.id]);

  // The bench tells how it stands; a build task is met when its conditions hold.
  const [bench, setBench] = useState<BenchState | null>(null);
  const status = useMemo<TaskStatus>(() => {
    const task = page.task;
    const verdict = task?.kind === 'build' && bench ? judgeBench(task, bench) : null;
    return { items: verdict?.items ?? [], result: results[page.id] ?? null };
  }, [page, bench, results]);
  const buildMet = page.task?.kind === 'build' && bench ? judgeBench(page.task, bench).done : false;
  useEffect(() => {
    if (buildMet) taskDone(page.id);
  }, [buildMet, page.id, taskDone]);

  const onResult = useCallback(
    (result: RunResult) => {
      setResults((all) => ({ ...all, [page.id]: result }));
      account.recordAttempt({
        bookId: book.id,
        pageId: page.id,
        total: result.total,
        failed: result.failed,
        detail: result.detail || undefined,
        code: result.code,
      });
      if (result.total > 0 && result.failed === 0) taskDone(page.id);
    },
    [account, book.id, page.id, taskDone],
  );
  const onAnswer = (pageId: string, choice: number) => {
    learner.answer(pageId, choice);
    const quiz = pages.find((item) => item.page.id === pageId)?.page;
    const block = quiz?.blocks.find((item) => item.kind === 'quiz');
    if (block?.kind === 'quiz' && choice === block.answer && quiz?.task?.kind === 'quiz')
      taskDone(pageId);
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, select, .monaco-editor')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && confirmSkip) setConfirmSkip(false);
      else if (event.key === 'Home') {
        event.preventDefault();
        setContentsOpen(true);
      } else if (contentsOpen || confirmSkip) return;
      else if (event.key === 'ArrowRight' || event.key === 'PageDown') turn(1);
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') turn(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [turn, contentsOpen, confirmSkip]);

  const shelf = useMemo(
    () =>
      books.map((item) => {
        const total = bookProgress(item, item.id === book.id ? progress : loadProgress(item.id));
        return {
          id: item.id,
          title: item.title,
          available: item.available,
          done: total.done,
          total: total.total,
        };
      }),
    [book.id, progress],
  );

  return (
    <div className="learn-root" data-theme-mode={theme}>
      <header className="learn-top">
        <a className="learn-brand" href="/" title="К студии">
          <GraduationCap size={18} /> <strong>Yosis</strong> <span>учебник</span>
        </a>
        <BookTitle book={book} />
        <div className="learn-views" role="group" aria-label="Что на столе">
          <button type="button" aria-pressed={view === 'design'} onClick={() => setView('design')}>
            {DESIGN_LABEL[book.mode]}
          </button>
          <button type="button" aria-pressed={view === 'bench'} onClick={() => setView('bench')}>
            Плата
          </button>
        </div>
        <span className="learn-top-space" />
        <button type="button" className="learn-top-button" onClick={toggleTheme}>
          {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </button>
      </header>
      <div className={'learn-desk' + (folded ? ' card-folded' : '')}>
        <section
          className="desk-view"
          hidden={view !== 'design'}
          aria-label={DESIGN_LABEL[book.mode]}
        >
          <DesignDesk book={book} page={page} done={done} insert={insert} onResult={onResult} />
        </section>
        <section className="desk-view desk-bench" hidden={view !== 'bench'} aria-label="Плата">
          {benchSeen ? (
            <Bench
              active={view === 'bench'}
              wanted={page.blocks.flatMap((block) =>
                block.kind === 'parts' ? block.items.map((part) => part.def) : [],
              )}
              onBench={setBench}
            />
          ) : null}
        </section>
        <LessonCard
          book={book}
          pages={pages}
          index={index}
          contentsOpen={contentsOpen}
          onTurn={turn}
          onGo={goPage}
          onContents={setContentsOpen}
          onFold={setFolded}
          learning={{
            progress,
            status,
            confirmSkip,
            onSkipAnswer,
            accountButton: <AccountButton />,
            books: shelf,
            onPickBook: pickBook,
            onAnswer,
            onInsert: (code) => {
              setInsert({ code, stamp: Date.now() });
              if (book.mode === 'verilog') setView('design');
            },
          }}
        />
        {success === page.id ? (
          <div className="learn-success" role="status">
            <div className="learn-success-card">
              <span className="learn-success-seal" aria-hidden="true">
                <Check size={30} strokeWidth={3} />
              </span>
              <strong className="learn-success-kicker">Задание выполнено</strong>
              <h2>{current.lesson?.title ?? 'Справочник'}</h2>
              <div className="learn-success-row">
                <button type="button" onClick={() => setSuccess(null)}>
                  Остаться
                </button>
                {index < pages.length - 1 ? (
                  <button
                    type="button"
                    className="learn-success-next"
                    onClick={() => {
                      setSuccess(null);
                      setConfirmSkip(false);
                      goPage(pages[index + 1]!.page.id);
                    }}
                  >
                    К следующему
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BookTitle({ book }: { book: BookDef }) {
  const Icon = MODE_ICON[book.mode];
  return (
    <span className="learn-book-title">
      <Icon size={15} /> {book.title}
    </span>
  );
}

/** The work of the page: the Verilog editor or the schematic editor, or a word that there is none. */
function DesignDesk({
  book,
  page,
  done,
  insert,
  onResult,
}: {
  book: BookDef;
  page: PageDef;
  done: boolean;
  insert: { code: string; stamp: number } | null;
  onResult: (result: RunResult) => void;
}) {
  const task = page.task;
  if (task?.kind === 'sim')
    return (
      <VerilogTask
        pageId={page.id}
        lessonId={task.lessonId}
        given={task.exercise}
        solved={done}
        insert={insert}
        onResult={onResult}
      />
    );
  if (task?.kind === 'circuit')
    return (
      <SchematicTask pageId={page.id} exercise={task.exercise} solved={done} onResult={onResult} />
    );
  return (
    <div className="desk-empty">
      <p>
        На этой странице нет задания {book.mode === 'verilog' ? 'с кодом' : 'со схемой'}. Откройте
        «Плата», чтобы посмотреть на стол, или идите дальше по уроку.
      </p>
    </div>
  );
}
