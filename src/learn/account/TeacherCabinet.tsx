import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { WireProgress } from '../../../shared/learn-sync';
import { t, translateServerMessage } from '../../lib/i18n';
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
  dateLocale,
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
  error instanceof ApiError ? error.message : t('Не получилось. Попробуй ещё раз.');

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

  if (!overview)
    return problem ? <Message text={problem} bad /> : <p role="status">{t('Загрузка…')}</p>;
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
      <div className="acct-tabs page" role="tablist" aria-label={t('Разделы кабинета')}>
        {(
          [
            ['class', t('Класс')],
            ['people', t('Ученики и классы')],
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
        <summary>{t('Мой пароль и имя')}</summary>
        <ProfileCard />
      </details>
    </>
  );
}

function Summary({ overview }: { overview: Overview }) {
  const now = Date.now();
  const s = classSummary(overview.students, now);
  const cards: [number, string][] = [
    [s.total, t('учеников')],
    [s.activeToday, t('заходили за сутки')],
    [s.stuck, t('застряли')],
    [s.away, t('не заходили неделю')],
  ];
  return (
    <ul className="acct-stats" aria-label={t('Сводка по ученикам')}>
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
      <h2 id="acct-matrix-h">{t('Ученики и уроки')}</h2>
      <div className="acct-toolbar">
        <label>
          <span>{t('Книга')}</span>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            {openBooks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('Класс')}</span>
          <select
            value={filter.classId}
            onChange={(e) => setFilter({ ...filter, classId: e.target.value })}
          >
            <option value="all">{t('Все')}</option>
            <option value="none">{t('Без класса')}</option>
            {overview.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('Поиск')}</span>
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            placeholder={t('Имя или логин')}
          />
        </label>
        <label>
          <span>{t('Сортировка')}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">{t('По имени')}</option>
            <option value="activity">{t('По последнему входу')}</option>
            <option value="progress">{t('По числу выполненных заданий')}</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filter.onlyStuck}
            onChange={(e) => setFilter({ ...filter, onlyStuck: e.target.checked })}
          />
          <span>{t('Только застрявшие')}</span>
        </label>
        <button
          type="button"
          className="acct-btn"
          disabled={!rows.length}
          onClick={() => download(`class-${book.id}.csv`, classCsv(rows, book, className))}
        >
          {t('Скачать CSV')}
        </button>
      </div>
      <p className="acct-legend">
        <span className="cell done">✓</span> {t('пройден')} <span className="cell started">◐</span>{' '}
        {t('начат')} <span className="cell new">·</span>{' '}
        {t('не начат. Застрял — три неудачные проверки прошивки подряд на одном задании.')}
      </p>
      {rows.length === 0 ? (
        <p>
          {overview.students.length
            ? t('Никто не подошёл под условия.')
            : t(
                'Учеников пока нет. Они регистрируются сами, или добавь список на вкладке «Ученики и классы».',
              )}
        </p>
      ) : (
        <div
          className="acct-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('Таблица «ученик × урок»')}
        >
          <table className="acct-matrix">
            <caption className="sr-only">
              {t('Уроки книги «{title}» по ученикам', { title: book.title })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('Ученик')}</th>
                <th scope="col">{t('Заходил')}</th>
                <th scope="col">{t('Задания')}</th>
                <th scope="col">{t('Застрял')}</th>
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
                        title={t('Урок {no}: {title} — {state}', {
                          no: columns[at]!.no,
                          title: columns[at]!.lesson.title,
                          state: STATE_LABEL[state],
                        })}
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
        <h2 id="acct-people-h">{t('Все ученики')}</h2>
        {overview.students.length === 0 ? (
          <p>{t('Пока никого.')}</p>
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
                    t('без класса')}
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
      <h2 id="acct-classes-h">{t('Классы')}</h2>
      <ul className="acct-people">
        {overview.classes.map((group) => (
          <li key={group.id}>
            <strong>{group.name}</strong>
            <span>{t('{n} уч.', { n: group.count })}</span>
            <button
              type="button"
              className="acct-link"
              onClick={() => {
                const next = window.prompt(t('Новое название класса'), group.name);
                if (next && next !== group.name)
                  void run(() => api.renameClass(group.id, next), t('Класс переименован.'));
              }}
            >
              {t('Переименовать')}
            </button>
            <button
              type="button"
              className="acct-link danger"
              onClick={() => {
                if (
                  window.confirm(
                    t('Удалить класс «{name}»? Ученики останутся без класса.', {
                      name: group.name,
                    }),
                  )
                )
                  void run(() => api.deleteClass(group.id), t('Класс удалён.'));
              }}
            >
              {t('Удалить')}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="acct-form inline"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void run(() => api.createClass(name), t('Класс создан.')).then(() => setName(''));
        }}
      >
        <label>
          <span>{t('Новый класс')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t('Например, 8Б')}
            required
          />
        </label>
        <button type="submit" className="acct-btn">
          {t('Создать')}
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
      <h2 id="acct-add-h">{t('Добавить учеников списком')}</h2>
      <form className="acct-form" onSubmit={submit}>
        <label>
          <span>{t('Имена, по одному в строке')}</span>
          <textarea value={names} onChange={(e) => setNames(e.target.value)} rows={5} required />
          <small>
            {t(
              'Логины и временные пароли придумает сервер. Настоящие фамилии вписывать не обязательно: подойдёт «Аня К.».',
            )}
          </small>
        </label>
        <label>
          <span>{t('Класс')}</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t('Без класса')}</option>
            {overview.classes.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="acct-btn primary">
          {t('Создать учеников')}
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
      <h3>{t('Логины и временные пароли')}</h3>
      <p className="acct-meta">
        {t(
          'Пароли показаны один раз: потом их можно только сбросить. Ученику предложат сменить пароль при входе.',
        )}
      </p>
      <table className="acct-table">
        <thead>
          <tr>
            <th scope="col">{t('Имя')}</th>
            <th scope="col">{t('Логин')}</th>
            <th scope="col">{t('Пароль')}</th>
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
              {t('«{line}» не добавлен: {reason}', {
                line: item.line,
                reason: translateServerMessage(item.reason),
              })}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="acct-actions no-print">
        <button type="button" className="acct-btn" onClick={() => window.print()}>
          {t('Напечатать')}
        </button>
        <button
          type="button"
          className="acct-btn"
          onClick={() => download('passwords.csv', credentialsCsv(rows))}
        >
          {t('Скачать CSV')}
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
      setMsg({ text: t('Сохранено.'), bad: false });
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
          {t('← Ко всему классу')}
        </button>
      </p>
      <section className="acct-card" aria-labelledby="acct-student-h">
        <h2 id="acct-student-h">{summary.displayName}</h2>
        <p className="acct-meta">
          {t('Логин')} <strong>{summary.login}</strong> · {t('заходил:')}{' '}
          {ago(summary.lastActiveAt)} ·{t('зарегистрирован')}{' '}
          {new Date(summary.createdAt).toLocaleDateString(dateLocale())}
          {summary.mustChangePassword ? t(' · пароль временный') : ''}
        </p>
        {summary.stuck ? (
          <p className="acct-msg bad" role="status">
            {t('Застрял: {page} — {n} неудачных проверок подряд.', {
              page: describePage(bookById(summary.stuck.bookId), summary.stuck.pageId),
              n: summary.stuck.fails,
            })}
          </p>
        ) : null}
        <form className="acct-form" onSubmit={save}>
          <label>
            <span>{t('Имя')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </label>
          <label>
            <span>{t('Класс')}</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{t('Без класса')}</option>
              {overview.classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('Заметка учителя')}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={400}
            />
            <small>{t('Ученик её не видит.')}</small>
          </label>
          <button type="submit" className="acct-btn">
            {t('Сохранить')}
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
            {t('Сбросить пароль')}
          </button>
          {confirmDelete ? (
            <span role="alertdialog" aria-label={t('Удалить ученика')}>
              {t('Удалить ученика вместе с прогрессом? Это нельзя отменить.')}{' '}
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
                {t('Да, удалить')}
              </button>{' '}
              <button type="button" className="acct-btn" onClick={() => setConfirmDelete(false)}>
                {t('Отмена')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="acct-btn danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t('Удалить ученика')}
            </button>
          )}
        </div>
        {fresh ? <Credentials rows={[fresh]} /> : null}
      </section>

      <section className="acct-card" aria-labelledby="acct-lessons-h">
        <h2 id="acct-lessons-h">{t('Прогресс')}</h2>
        <div className="acct-toolbar">
          <label>
            <span>{t('Книга')}</span>
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {openBooks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <p className="acct-meta">
            {t('Заданий выполнено: {done} из {total}', { done: share.done, total: share.total })}
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
                  {t('Урок {no}. {title}', { no, title: lesson.title })}{' '}
                  <small>({STATE_LABEL[state]})</small>
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
        <h2 id="acct-attempts-h">{t('Проверки прошивки')}</h2>
        {!detail ? (
          <p role="status">{t('Загрузка…')}</p>
        ) : detail.attempts.length === 0 ? (
          <p>{t('Проверок пока не было.')}</p>
        ) : (
          <ul className="acct-attempts">
            {detail.attempts.map((attempt, at) => (
              <li key={at} className={attempt.solved ? 'ok' : 'fail'}>
                <p>
                  <strong>
                    {attempt.solved
                      ? t('Прошла')
                      : attempt.error
                        ? t('Не запустилась')
                        : t('Не прошла')}
                  </strong>{' '}
                  {new Date(attempt.at).toLocaleString(dateLocale())} ·{' '}
                  {describePage(bookById(attempt.bookId), attempt.pageId)}
                  {attempt.total
                    ? t(' · не прошло {failed} из {total}', {
                        failed: attempt.failed,
                        total: attempt.total,
                      })
                    : ''}
                </p>
                {attempt.error || attempt.detail ? (
                  <p className="acct-meta">{attempt.error ?? attempt.detail}</p>
                ) : null}
                {attempt.code ? (
                  <details>
                    <summary>{t('Код ученика')}</summary>
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
            ? entry.note
              ? t('Засчитано учителем: «{note}»', { note: entry.note })
              : t('Засчитано учителем')
            : t('Выполнено {date}', { date: new Date(entry.at).toLocaleDateString(dateLocale()) })
          : t('Не выполнено')}
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
            <span>{t('Комментарий ученику')}</span>
            <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={400} />
          </label>
          <button type="submit" className="acct-btn primary">
            {t('Засчитать')}
          </button>
          <button type="button" className="acct-btn" onClick={() => setOpen(false)}>
            {t('Отмена')}
          </button>
          {error ? <Message text={error} bad /> : null}
        </form>
      ) : (
        <button type="button" className="acct-btn" onClick={() => setOpen(true)}>
          {entry ? t('Изменить комментарий') : t('Засчитать вручную')}
        </button>
      )}
    </li>
  );
}
