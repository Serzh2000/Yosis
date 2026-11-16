import { t } from '../../lib/i18n';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { books } from '../content/books';
import { ApiError, api, setExpectedUser, type Attempt, type PublicUser } from './api';
import { AuthDialog } from './AuthDialog';
import { ProgressSync } from './sync';
import './account.css';

/**
 * loading: the server has not answered yet; off: this build has no accounts (the book works as
 * a guest's book); guest: nobody signed in; user: signed in.
 */
export type AccountStatus = 'loading' | 'off' | 'guest' | 'user';

export interface Account {
  status: AccountStatus;
  user: PublicUser | null;
  sync: ProgressSync;
  openAuth: () => void;
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (login: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  /** Sends the result of a firmware check; a guest's results stay in the browser only. */
  recordAttempt: (attempt: Omit<Attempt, 'at' | 'solved'>) => void;
}

const AccountContext = createContext<Account | null>(null);

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount works inside AccountProvider.');
  return account;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const sync = useMemo(() => new ProgressSync(books.map((book) => book.id)), []);
  const [status, setStatus] = useState<AccountStatus>('loading');
  const [user, setUserState] = useState<PublicUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const userRef = useRef<PublicUser | null>(null);

  const adopt = useCallback(
    (next: PublicUser) => {
      userRef.current = next;
      setExpectedUser(next.id);
      setUserState(next);
      setStatus('user');
      setNotice('');
      // Only a student keeps progress on the server.
      if (next.role === 'student') void sync.start(next.id);
    },
    [sync],
  );

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then(({ user: found }) => {
        if (!alive) return;
        if (found) adopt(found);
        else setStatus('guest');
      })
      .catch(() => {
        if (alive) setStatus('off');
      });
    return () => {
      alive = false;
    };
  }, [adopt]);

  // The server ended the login (two hours of silence, or another account in this browser).
  useEffect(() => {
    sync.onSignedOut = () => {
      userRef.current = null;
      setExpectedUser(null);
      setUserState(null);
      setStatus('guest');
      setNotice(
        t(
          'Вход закончился. Прогресс сохранён в этом браузере; войди снова, и он синхронизируется.',
        ),
      );
    };
    return () => {
      sync.onSignedOut = null;
    };
  }, [sync]);

  // Leaving the page sends what is waiting.
  useEffect(() => {
    const leave = () => {
      if (document.visibilityState === 'hidden') void sync.flush(true);
    };
    document.addEventListener('visibilitychange', leave);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', leave);
      window.removeEventListener('pagehide', leave);
    };
  }, [sync]);

  const signIn = useCallback(
    async (login: string, password: string) => {
      adopt((await api.login(login, password)).user);
      setAuthOpen(false);
    },
    [adopt],
  );
  const signUp = useCallback(
    async (login: string, displayName: string, password: string) => {
      adopt((await api.register(login, displayName, password)).user);
      setAuthOpen(false);
    },
    [adopt],
  );
  const signOut = useCallback(async () => {
    if (userRef.current?.role === 'student') await sync.stop();
    try {
      await api.logout();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
    userRef.current = null;
    setExpectedUser(null);
    setUserState(null);
    setStatus('guest');
  }, [sync]);
  const setUser = useCallback((next: PublicUser) => {
    userRef.current = next;
    setUserState(next);
  }, []);
  const recordAttempt = useCallback((attempt: Omit<Attempt, 'at' | 'solved'>) => {
    if (userRef.current?.role !== 'student') return;
    void api.attempt(attempt).catch(() => undefined);
  }, []);

  const account = useMemo<Account>(
    () => ({
      status,
      user,
      sync,
      openAuth: () => setAuthOpen(true),
      signIn,
      signUp,
      signOut,
      setUser,
      recordAttempt,
    }),
    [status, user, sync, signIn, signUp, signOut, setUser, recordAttempt],
  );
  return (
    <AccountContext.Provider value={account}>
      {children}
      {notice ? (
        <div className="acct-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setAuthOpen(true)}>
            {t('Войти')}
          </button>
          <button
            type="button"
            aria-label={t('Закрыть сообщение')}
            title={t('Закрыть')}
            onClick={() => setNotice('')}
          >
            ×
          </button>
        </div>
      ) : null}
      {authOpen ? (
        <AuthDialog onClose={() => setAuthOpen(false)} onSignIn={signIn} onSignUp={signUp} />
      ) : null}
    </AccountContext.Provider>
  );
}
