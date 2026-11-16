import { t } from '../../lib/i18n';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from './api';
import { useAccount } from './AccountProvider';
import { PRIVACY_LINE } from './AuthDialog';

/** A form with one text field and a button, used for the name and for the password. */
export function Message({ text, bad = false }: { text: string; bad?: boolean }) {
  return (
    <p className={'acct-msg' + (bad ? ' bad' : '')} role={bad ? 'alert' : 'status'}>
      {text}
    </p>
  );
}

export function ProfileCard() {
  const account = useAccount();
  const user = account.user!;
  const [name, setName] = useState(user.displayName);
  const [nameMsg, setNameMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; bad: boolean } | null>(null);

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    try {
      account.setUser((await api.rename(name)).user);
      setNameMsg({ text: t('Имя сохранено.'), bad: false });
    } catch (error) {
      setNameMsg({ text: error instanceof ApiError ? error.message : t('Не получилось.'), bad: true });
    }
  };
  const change = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== repeat) {
      setPwMsg({ text: t('Новые пароли не совпадают.'), bad: true });
      return;
    }
    try {
      account.setUser((await api.password(current, next)).user);
      setCurrent('');
      setNext('');
      setRepeat('');
      setPwMsg({ text: t('Пароль изменён. Другие входы в этот аккаунт закрыты.'), bad: false });
    } catch (error) {
      setPwMsg({ text: error instanceof ApiError ? error.message : t('Не получилось.'), bad: true });
    }
  };
  return (
    <section className="acct-card" aria-labelledby="acct-profile">
      <h2 id="acct-profile">{t('Профиль')}</h2>
      <p className="acct-meta">
        {t('Логин:')} <strong>{user.login}</strong>
      </p>
      <form className="acct-form inline" onSubmit={rename}>
        <label>
          <span>{t('Имя на экране')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </label>
        <button type="submit" className="acct-btn">
          {t('Сохранить имя')}
        </button>
      </form>
      {nameMsg ? <Message {...nameMsg} /> : null}
      <form className="acct-form" onSubmit={change}>
        <h3>{t('Сменить пароль')}</h3>
        <label>
          <span>{t('Текущий пароль')}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>
        <label>
          <span>{t('Новый пароль')}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={6}
            maxLength={128}
            required
          />
        </label>
        <label>
          <span>{t('Новый пароль ещё раз')}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="acct-btn">
          {t('Сменить пароль')}
        </button>
      </form>
      {pwMsg ? <Message {...pwMsg} /> : null}
      <p className="acct-privacy">{PRIVACY_LINE}</p>
      <p className="acct-privacy">
        {t('Вход действует 2 часа после последнего действия, потом нужно войти снова.')}
      </p>
    </section>
  );
}
