import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { WireProgress } from '../../../shared/learn-sync';
import { books } from '../content/books';
import { flattenBook, type BookDef } from '../content/schema';
import { bookProgress, lessonState } from '../progress';
import {
  ApiError,
  api,
  type CreatedStudent,
  type Overview,
  type StudentDetail,
  type StudentSummary,
} from './api';
import {
  STATE_LABEL,
  STATE_MARK,
  ago,
  classCsv,
  classSummary,
  credentialsCsv,
  describePage,
  filterStudents,
  lessonColumns,
  lessonStates,
  progressOf,
  sortStudents,
  type RosterFilter,
  type SortKey,
} from './cabinet-logic';
import { fromWire } from './sync';
import { Message, ProfileCard } from './ProfileCard';

const openBooks = books.filter((book) => book.available);
const problemText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Не получилось. Попробуй ещё раз.';

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

type Tab = 'class' | 'people';

export function TeacherCabinet() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [problem, setProblem] = useState('');
  const [tab, setTab] = useState<Tab>('class');
  const [openId, setOpenId] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setOverview(await api.overview());
      setProblem('');
    } catch (error) {
      setProblem(problemText(error));
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  if (!overview) return problem ? <Message text={problem} bad /> : <p role="status">Загрузка…</p>;
  const student = openId ? overview.students.find((item) => item.id === openId) : undefined;
  if (student)
    return (
      <StudentPage
        summary={student}
        overview={overview}
        onBack={() => {
          setOpenId(null);
          void reload();
        }}
        onChanged={reload}
      />
    );
  return (
    <>
      {problem ? <Message text={problem} bad /> : null}
      <Summary overview={overview} />
      <div className="acct-tabs page" role="tablist" aria-label="Разделы кабинета">
        {(
          [
            ['class', 'Класс'],
            ['people', 'Ученики и классы'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'on' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'class' ? (
        <ClassTable overview={overview} onOpen={setOpenId} />
      ) : (
        <People overview={overview} onOpen={setOpenId} onChanged={reload} />
      )}
      <details className="acct-card">
        <summary>Мой пароль и имя</summary>
        <ProfileCard />
      </details>
    </>
  );
}

function Summary({ overview }: { overview: Overview }) {
  const now = Date.now();
  const s = classSummary(overview.students, now);
  const cards: [number, string][] = [
    [s.total, 'учеников'],
    [s.activeToday, 'заходили за сутки'],
    [s.stuck, 'застряли'],
    [s.away, 'не заходили неделю'],
  ];
  return (
    <ul className="acct-stats" aria-label="Сводка по ученикам">
      {cards.map(([n, label]) => (
        <li key={label}>
          <strong>{n}</strong> {label}
        </li>
      ))}
    </ul>
  );
}

function bookById(id: string): BookDef {
  return openBooks.find((book) => book.id === id) ?? openBooks[0]!;
}

function ClassTable({ overview, onOpen }: { overview: Overview; onOpen: (id: string) => void }) {
  const [bookId, setBookId] = useState(openBooks[0]!.id);
  const [sort, setSort] = useState<SortKey>('name');
  const [filter, setFilter] = useState<RosterFilter>({
    query: '',
    classId: 'all',
    onlyStuck: false,
  });
  const book = bookById(bookId);
  const columns = useMemo(() => lessonColumns(book), [book]);
  const rows = useMemo(
    () => sortStudents(filterStudents(overview.students, filter), sort, book),
    [overview.students, filter, sort, book],
  );
  const className = (id: string | null) =>
    overview.classes.find((item) => item.id === id)?.name ?? '';
  const now = Date.now();
  return (
    <section className="acct-card" aria-labelledby="acct-matrix-h">
      <h2 id="acct-matrix-h">Ученики и уроки</h2>
      <div className="acct-toolbar">
        <label>
          <span>Книга</span>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            {openBooks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Класс</span>
          <select
            value={filter.classId}
            onChange={(e) => setFilter({ ...filter, classId: e.target.value })}
          >
            <option value="all">Все</option>
            <option value="none">Без класса</option>
            {overview.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Поиск</span>
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            placeholder="Имя или логин"
          />
        </label>
        <label>
          <span>Сортировка</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">По имени</option>
            <option value="activity">По последнему входу</option>
            <option value="progress">По числу выполненных заданий</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filter.onlyStuck}
            onChange={(e) => setFilter({ ...filter, onlyStuck: e.target.checked })}
          />
          <span>Только застрявшие</span>
        </label>
        <button
          type="button"
          className="acct-btn"
          disabled={!rows.length}
          onClick={() => download(`class-${book.id}.csv`, classCsv(rows, book, className))}
        >
          Скачать CSV
        </button>
      </div>
      <p className="acct-legend">
        <span className="cell done">✓</span> пройден <span className="cell started">◐</span> начат{' '}
        <span className="cell new">·</span> не начат. Застрял — три неудачные проверки прошивки
        подряд на одном задании.
      </p>
      {rows.length === 0 ? (
        <p>
          {overview.students.length
            ? 'Никто не подошёл под условия.'
            : 'Учеников пока нет. Они регистрируются сами, или добавь список на вкладке «Ученики и классы».'}
        </p>
      ) : (
        <div
          className="acct-scroll"
          tabIndex={0}
          role="region"
          aria-label="Таблица «ученик × урок»"
        >
          <table className="acct-matrix">
            <caption className="sr-only">Уроки книги «{book.title}» по ученикам</caption>
            <thead>
              <tr>
                <th scope="col">Ученик</th>
                <th scope="col">Заходил</th>
                <th scope="col">Задания</th>
                <th scope="col">Застрял</th>
                {columns.map((column) => (
                  <th key={column.no} scope="col" className="lesson" title={column.lesson.title}>
                    {column.no}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => {
                const states = lessonStates(student, book);
                const share = bookProgress(book, progressOf(student, book.id));
                return (
                  <tr key={student.id}>
                    <th scope="row">
                      <button
                        type="button"
                        className="acct-link"
                        onClick={() => onOpen(student.id)}
                      >
                        {student.displayName}
                      </button>
                    </th>
                    <td>{ago(student.lastActiveAt, now)}</td>
                    <td>
                      {share.done}/{share.total}
                    </td>
                    <td className={student.stuck ? 'stuck' : undefined}>
                      {student.stuck
                        ? describePage(bookById(student.stuck.bookId), student.stuck.pageId)
                        : ''}
                    </td>
                    {states.map((state, at) => (
                      <td
                        key={at}
                        className={'cell ' + state}
                        title={`Урок ${columns[at]!.no}: ${columns[at]!.lesson.title} — ${STATE_LABEL[state]}`}
                      >
                        <span aria-hidden="true">{STATE_MARK[state]}</span>
                        <span className="sr-only">{STATE_LABEL[state]}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function People({
  overview,
  onOpen,
  onChanged,
}: {
  overview: Overview;
  onOpen: (id: string) => void;
  onChanged: () => Promise<void>;
}) {
  return (
    <>
      <Classes overview={overview} onChanged={onChanged} />
      <AddStudents overview={overview} onChanged={onChanged} />
      <section className="acct-card" aria-labelledby="acct-people-h">
        <h2 id="acct-people-h">Все ученики</h2>
        {overview.students.length === 0 ? (
          <p>Пока никого.</p>
        ) : (
          <ul className="acct-people">
            {overview.students.map((student) => (
              <li key={student.id}>
                <button type="button" className="acct-link" onClick={() => onOpen(student.id)}>
                  {student.displayName}
                </button>
                <span>{student.login}</span>
                <span>
                  {overview.classes.find((item) => item.id === student.classId)?.name ??
                    'без класса'}
                </span>
                <span>{ago(student.lastActiveAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Classes({ overview, onChanged }: { overview: Overview; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setMsg({ text: done, bad: false });
      await onChanged();
    } catch (error) {
      setMsg({ text: problemText(error), bad: true });
    }
  };
  return (
    <section className="acct-card" aria-labelledby="acct-classes-h">
      <h2 id="acct-classes-h">Классы</h2>
      <ul className="acct-people">
        {overview.classes.map((group) => (
          <li key={group.id}>
            <strong>{group.name}</strong>
            <span>{group.count} уч.</span>
            <button
              type="button"
              className="acct-link"
              onClick={() => {
                const next = window.prompt('Новое название класса', group.name);
                if (next && next !== group.name)
                  void run(() => api.renameClass(group.id, next), 'Класс переименован.');
              }}
            >
              Переименовать
            </button>
            <button
              type="button"
              className="acct-link danger"
              onClick={() => {
                if (window.confirm(`Удалить класс «${group.name}»? Ученики останутся без класса.`))
                  void run(() => api.deleteClass(group.id), 'Класс удалён.');
              }}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <form
        className="acct-form inline"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void run(() => api.createClass(name), 'Класс создан.').then(() => setName(''));
        }}
      >
        <label>
          <span>Новый класс</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Например, 8Б"
            required
          />
        </label>
        <button type="submit" className="acct-btn">
          Создать
        </button>
      </form>
      {msg ? <Message {...msg} /> : null}
    </section>
  );
}

function AddStudents({
  overview,
  onChanged,
}: {
  overview: Overview;
  onChanged: () => Promise<void>;
}) {
  const [names, setNames] = useState('');
  const [classId, setClassId] = useState('');
  const [result, setResult] = useState<{
    created: CreatedStudent[];
    skipped: { line: string; reason: string }[];
  } | null>(null);
  const [problem, setProblem] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setResult(await api.bulk(names, classId || null));
      setProblem('');
      setNames('');
      await onChanged();
    } catch (error) {
      setProblem(problemText(error));
    }
  };
  return (
    <section className="acct-card" aria-labelledby="acct-add-h">
      <h2 id="acct-add-h">Добавить учеников списком</h2>
      <form className="acct-form" onSubmit={submit}>
        <label>
          <span>Имена, по одному в строке</span>
          <textarea value={names} onChange={(e) => setNames(e.target.value)} rows={5} required />
          <small>
            Логины и временные пароли придумает сервер. Настоящие фамилии вписывать не обязательно:
            подойдёт «Аня К.».
          </small>
        </label>
        <label>
          <span>Класс</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Без класса</option>
            {overview.classes.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="acct-btn primary">
          Создать учеников
        </button>
      </form>
      {problem ? <Message text={problem} bad /> : null}
      {result ? <Credentials rows={result.created} skipped={result.skipped} /> : null}
    </section>
  );
}

/** Logins and one-time passwords: they are shown now and can be printed or saved; the server keeps only hashes. */
function Credentials({
  rows,
  skipped = [],
}: {
  rows: { displayName: string; login: string; password: string }[];
  skipped?: { line: string; reason: string }[];
}) {
  return (
    <div className="acct-print">
      <h3>Логины и временные пароли</h3>
      <p className="acct-meta">
        Пароли показаны один раз: потом их можно только сбросить. Ученику предложат сменить пароль
        при входе.
      </p>
      <table className="acct-table">
        <thead>
          <tr>
            <th scope="col">Имя</th>
            <th scope="col">Логин</th>
            <th scope="col">Пароль</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.login}>
              <td>{row.displayName}</td>
              <td>{row.login}</td>
              <td className="mono">{row.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {skipped.length ? (
        <ul className="acct-skipped">
          {skipped.map((item, at) => (
            <li key={at}>
              «{item.line}» не добавлен: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="acct-actions no-print">
        <button type="button" className="acct-btn" onClick={() => window.print()}>
          Напечатать
        </button>
        <button
          type="button"
          className="acct-btn"
          onClick={() => download('passwords.csv', credentialsCsv(rows))}
        >
          Скачать CSV
        </button>
      </div>
    </div>
  );
}

function StudentPage({
  summary,
  overview,
  onBack,
  onChanged,
}: {
  summary: StudentSummary;
  overview: Overview;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [problem, setProblem] = useState('');
  const [bookId, setBookId] = useState(openBooks[0]!.id);
  const [name, setName] = useState(summary.displayName);
  const [classId, setClassId] = useState(summary.classId ?? '');
  const [note, setNote] = useState(summary.note);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [fresh, setFresh] = useState<{
    displayName: string;
    login: string;
    password: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = useCallback(async () => {
    try {
      setDetail(await api.student(summary.id));
    } catch (error) {
      setProblem(problemText(error));
    }
  }, [summary.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.updateStudent(summary.id, { displayName: name, classId: classId || null, note });
      setMsg({ text: 'Сохранено.', bad: false });
      await onChanged();
    } catch (error) {
      setMsg({ text: problemText(error), bad: true });
    }
  };
  const book = bookById(bookId);
  const wire: WireProgress = detail?.books ?? {};
  const progress = fromWire(wire[book.id] ?? { done: {}, skipped: {}, quiz: {} }).progress;
  const share = bookProgress(book, progress);
  const pages = flattenBook(book);
  const lessons = lessonColumns(book);

  return (
    <>
      <p>
        <button type="button" className="acct-link" onClick={onBack}>
          ← Ко всему классу
        </button>
      </p>
      <section className="acct-card" aria-labelledby="acct-student-h">
        <h2 id="acct-student-h">{summary.displayName}</h2>
        <p className="acct-meta">
          Логин <strong>{summary.login}</strong> · заходил: {ago(summary.lastActiveAt)} ·
          зарегистрирован {new Date(summary.createdAt).toLocaleDateString('ru-RU')}
          {summary.mustChangePassword ? ' · пароль временный' : ''}
        </p>
        {summary.stuck ? (
          <p className="acct-msg bad" role="status">
            Застрял: {describePage(bookById(summary.stuck.bookId), summary.stuck.pageId)} —{' '}
            {summary.stuck.fails} неудачных проверок подряд.
          </p>
        ) : null}
        <form className="acct-form" onSubmit={save}>
          <label>
            <span>Имя</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </label>
          <label>
            <span>Класс</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Без класса</option>
              {overview.classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Заметка учителя</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={400}
            />
            <small>Ученик её не видит.</small>
          </label>
          <button type="submit" className="acct-btn">
            Сохранить
          </button>
        </form>
        {msg ? <Message {...msg} /> : null}
        <div className="acct-actions">
          <button
            type="button"
            className="acct-btn"
            onClick={async () => {
              try {
                const answer = await api.resetPassword(summary.id);
                setFresh({
                  displayName: answer.displayName,
                  login: answer.login,
                  password: answer.password,
                });
                await onChanged();
              } catch (error) {
                setMsg({ text: problemText(error), bad: true });
              }
            }}
          >
            Сбросить пароль
          </button>
          {confirmDelete ? (
            <span role="alertdialog" aria-label="Удалить ученика">
              Удалить ученика вместе с прогрессом? Это нельзя отменить.{' '}
              <button
                type="button"
                className="acct-btn danger"
                onClick={async () => {
                  try {
                    await api.deleteStudent(summary.id);
                    onBack();
                  } catch (error) {
                    setMsg({ text: problemText(error), bad: true });
                  }
                }}
              >
                Да, удалить
              </button>{' '}
              <button type="button" className="acct-btn" onClick={() => setConfirmDelete(false)}>
                Отмена
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="acct-btn danger"
              onClick={() => setConfirmDelete(true)}
            >
              Удалить ученика
            </button>
          )}
        </div>
        {fresh ? <Credentials rows={[fresh]} /> : null}
      </section>

      <section className="acct-card" aria-labelledby="acct-lessons-h">
        <h2 id="acct-lessons-h">Прогресс</h2>
        <div className="acct-toolbar">
          <label>
            <span>Книга</span>
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {openBooks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <p className="acct-meta">
            Заданий выполнено: {share.done} из {share.total}
          </p>
        </div>
        {problem ? <Message text={problem} bad /> : null}
        <ol className="acct-lessons">
          {lessons.map(({ lesson, no }) => {
            const tasks = pages.filter((item) => item.lesson === lesson && item.page.task);
            if (!tasks.length) return null;
            const state = lessonState(lesson, progress);
            return (
              <li key={lesson.id}>
                <h3>
                  <span className={'cell ' + state} aria-hidden="true">
                    {STATE_MARK[state]}
                  </span>{' '}
                  Урок {no}. {lesson.title} <small>({STATE_LABEL[state]})</small>
                </h3>
                <ul>
                  {tasks.map(({ page }) => (
                    <TaskRow
                      key={page.id}
                      text={page.task!.text}
                      entry={wire[book.id]?.done[page.id]}
                      onCredit={async (comment) => {
                        const answer = await api.credit(summary.id, book.id, page.id, comment);
                        setDetail((current) =>
                          current ? { ...current, books: answer.books } : current,
                        );
                        await onChanged();
                      }}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="acct-card" aria-labelledby="acct-attempts-h">
        <h2 id="acct-attempts-h">Проверки прошивки</h2>
        {!detail ? (
          <p role="status">Загрузка…</p>
        ) : detail.attempts.length === 0 ? (
          <p>Проверок пока не было.</p>
        ) : (
          <ul className="acct-attempts">
            {detail.attempts.map((attempt, at) => (
              <li key={at} className={attempt.solved ? 'ok' : 'fail'}>
                <p>
                  <strong>
                    {attempt.solved ? 'Прошла' : attempt.error ? 'Не запустилась' : 'Не прошла'}
                  </strong>{' '}
                  {new Date(attempt.at).toLocaleString('ru-RU')} ·{' '}
                  {describePage(bookById(attempt.bookId), attempt.pageId)}
                  {attempt.total ? ` · не прошло ${attempt.failed} из ${attempt.total}` : ''}
                </p>
                {attempt.error || attempt.detail ? (
                  <p className="acct-meta">{attempt.error ?? attempt.detail}</p>
                ) : null}
                {attempt.code ? (
                  <details>
                    <summary>Код ученика</summary>
                    <pre>{attempt.code}</pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function TaskRow({
  text,
  entry,
  onCredit,
}: {
  text: string;
  entry: { at: number; by: 'student' | 'teacher'; note?: string } | undefined;
  onCredit: (comment: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(entry?.note ?? '');
  const [error, setError] = useState('');
  return (
    <li className={entry ? 'done' : undefined}>
      <span>{text}</span>
      <span className="acct-meta">
        {entry
          ? entry.by === 'teacher'
            ? `Засчитано учителем${entry.note ? `: «${entry.note}»` : ''}`
            : `Выполнено ${new Date(entry.at).toLocaleDateString('ru-RU')}`
          : 'Не выполнено'}
      </span>
      {entry?.by === 'student' ? null : open ? (
        <form
          className="acct-form inline"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await onCredit(comment);
              setOpen(false);
              setError('');
            } catch (problem) {
              setError(problemText(problem));
            }
          }}
        >
          <label>
            <span>Комментарий ученику</span>
            <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={400} />
          </label>
          <button type="submit" className="acct-btn primary">
            Засчитать
          </button>
          <button type="button" className="acct-btn" onClick={() => setOpen(false)}>
            Отмена
          </button>
          {error ? <Message text={error} bad /> : null}
        </form>
      ) : (
        <button type="button" className="acct-btn" onClick={() => setOpen(true)}>
          {entry ? 'Изменить комментарий' : 'Засчитать вручную'}
        </button>
      )}
    </li>
  );
}
