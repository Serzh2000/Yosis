import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { WireProgress } from '../../../shared/learn-sync';
import { books } from '../content/books';
import { flattenBook } from '../content/schema';
import { bookProgress, loadCurrent, loadPlace } from '../progress';
import { learnRoutePath } from '../routes';
import { resolveStart } from '../start';
import { ApiError, api } from './api';
import { AccountProvider, useAccount } from './AccountProvider';
import { Message, ProfileCard } from './ProfileCard';
import { fromWire } from './sync';
import { describePage } from './cabinet-logic';
import { TeacherCabinet } from './TeacherCabinet';

export type CabinetView = 'cabinet' | 'teacher';

/** The frame of both cabinets: a way back to the book, the title and who is signed in. */
export function CabinetFrame({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const account = useAccount();
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — Yosis`;
    return () => {
      document.title = previous;
    };
  }, [title]);
  return (
    <div className="mcu-studio acct-page">
      <header className="acct-top">
        <a className="acct-back" href="/learn">
          ← К учебнику
        </a>
        <h1>{title}</h1>
        {account.user ? (
          <span className="acct-who">
            {account.user.displayName}
            <button
              type="button"
              className="acct-link"
              onClick={() => void account.signOut().then(() => (location.href = '/learn'))}
            >
              Выйти
            </button>
          </span>
        ) : null}
      </header>
      <main className={'acct-main' + (wide ? ' wide' : '')}>{children}</main>
    </div>
  );
}

function SignInPrompt({ text }: { text: string }) {
  const account = useAccount();
  return (
    <section className="acct-card">
      <p>{text}</p>
      <button type="button" className="acct-primary" onClick={account.openAuth}>
        Войти или создать аккаунт
      </button>
    </section>
  );
}

/** «Мой кабинет»: where to continue, how far each book is, what the teacher credited, the profile. */
function StudentCabinet() {
  const account = useAccount();
  const [wire, setWire] = useState<WireProgress | null>(null);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    api
      .progress()
      .then((answer) => setWire(answer.books))
      .catch((error) =>
        setProblem(error instanceof ApiError ? error.message : 'Не удалось загрузить прогресс.'),
      );
  }, []);

  const place = useMemo(() => resolveStart({}, books, loadCurrent(), (id) => loadPlace(id)), []);
  const placeBook = books.find((book) => book.id === place.bookId)!;
  const placeLesson = flattenBook(placeBook).find(({ page }) => page.id === place.pageId)?.lesson;

  const credits = useMemo(() => {
    const out: { key: string; text: string; note?: string }[] = [];
    for (const book of books) {
      const done = wire?.[book.id]?.done ?? {};
      for (const [pageId, item] of Object.entries(done))
        if (item.by === 'teacher')
          out.push({
            key: `${book.id}/${pageId}`,
            text: `${book.title}: ${describePage(book, pageId)}`,
            note: item.note,
          });
    }
    return out;
  }, [wire]);

  const user = account.user!;
  return (
    <>
      {user.mustChangePassword ? (
        <section className="acct-card warn" role="status">
          <p>Пароль тебе выдал учитель. Задай свой в блоке «Профиль» ниже.</p>
        </section>
      ) : null}
      <section className="acct-card" aria-labelledby="acct-continue">
        <h2 id="acct-continue">Продолжить</h2>
        <p>
          {placeBook.title}
          {placeLesson ? `: ${placeLesson.title}` : ''}
        </p>
        <a className="acct-primary as-link" href={learnRoutePath(place)}>
          Продолжить с этого места
        </a>
      </section>
      <section className="acct-card" aria-labelledby="acct-progress">
        <h2 id="acct-progress">Прогресс по книгам</h2>
        {problem ? <Message text={problem} bad /> : null}
        <ul className="acct-books">
          {books
            .filter((book) => book.available)
            .map((book) => {
              const share = bookProgress(
                book,
                wire
                  ? fromWire(wire[book.id] ?? { done: {}, skipped: {}, quiz: {} }).progress
                  : { done: [], skipped: [], quiz: {} },
              );
              const percent = share.total ? Math.round((share.done / share.total) * 100) : 0;
              return (
                <li key={book.id}>
                  <span className="acct-book-name">{book.title}</span>
                  <progress
                    value={share.done}
                    max={Math.max(share.total, 1)}
                    aria-label={`${book.title}: ${percent}%`}
                  />
                  <span className="acct-book-count">
                    {share.done} из {share.total} заданий
                  </span>
                </li>
              );
            })}
        </ul>
        {credits.length ? (
          <>
            <h3>Засчитал учитель</h3>
            <ul className="acct-credits">
              {credits.map((credit) => (
                <li key={credit.key}>
                  {credit.text}
                  {credit.note ? <q>{credit.note}</q> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <ProfileCard />
    </>
  );
}

function Body({ view }: { view: CabinetView }) {
  const account = useAccount();
  const title = view === 'teacher' ? 'Кабинет учителя' : 'Мой кабинет';
  let content: ReactNode;
  if (account.status === 'loading') content = <p role="status">Загрузка…</p>;
  else if (account.status === 'off')
    content = (
      <section className="acct-card">
        <p>
          Аккаунты на этом сервере не включены. Учебник работает без них: прогресс хранится в
          браузере.
        </p>
      </section>
    );
  else if (!account.user)
    content = (
      <SignInPrompt
        text={
          view === 'teacher'
            ? 'Кабинет учителя открывается после входа.'
            : 'Кабинет открывается после входа. Без аккаунта прогресс хранится только в этом браузере.'
        }
      />
    );
  else if (view === 'teacher')
    content =
      account.user.role === 'teacher' ? (
        <TeacherCabinet />
      ) : (
        <section className="acct-card">
          <p>Кабинет учителя доступен только учителю.</p>
          <a className="acct-link" href="/learn/cabinet">
            Мой кабинет
          </a>
        </section>
      );
  else
    content =
      account.user.role === 'teacher' ? (
        <section className="acct-card">
          <p>Ты вошёл как учитель.</p>
          <a className="acct-primary as-link" href="/learn/teacher">
            Открыть кабинет учителя
          </a>
        </section>
      ) : (
        <StudentCabinet />
      );
  return (
    <CabinetFrame title={title} wide={view === 'teacher'}>
      {content}
    </CabinetFrame>
  );
}

export default function CabinetPage({ view }: { view: CabinetView }) {
  useTheme();
  return (
    <AccountProvider>
      <Body view={view} />
    </AccountProvider>
  );
}
