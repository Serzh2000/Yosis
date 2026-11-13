import { useId, useState, type FormEvent } from 'react';
import { ApiError } from './api';
import { Modal } from './Modal';

type Mode = 'login' | 'register';

/** A labelled input; the hint is read as the description of the field, not as part of its name. */
function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="acct-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </div>
  );
}

export const PRIVACY_LINE =
  'Учитель видит твой логин, имя и то, какие уроки пройдены и как прошли проверки прошивки. Почта и настоящее ФИО не нужны.';

/** Sign in or register: one dialog, two tabs. The errors come from the server already in Russian. */
export function AuthDialog({
  onClose,
  onSignIn,
  onSignUp,
}: {
  onClose: () => void;
  onSignIn: (login: string, password: string) => Promise<void>;
  onSignUp: (login: string, displayName: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && password !== repeat) {
      setError('Пароли не совпадают.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await onSignIn(login.trim(), password);
      else await onSignUp(login.trim(), name, password);
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Не получилось. Попробуй ещё раз.');
      setBusy(false);
    }
  };
  const register = mode === 'register';
  return (
    <Modal title={register ? 'Регистрация' : 'Вход'} onClose={onClose}>
      <div className="acct-tabs" role="tablist" aria-label="Что сделать">
        {(['login', 'register'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            className={mode === item ? 'on' : undefined}
            onClick={() => {
              setMode(item);
              setError('');
            }}
          >
            {item === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="acct-form">
        <Field
          label="Логин"
          hint={
            register
              ? 'Латинские буквы, цифры, точка, дефис, подчёркивание. От 3 до 32 знаков.'
              : undefined
          }
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={32}
          required
        />
        {register ? (
          <Field
            label="Имя на экране"
            hint="Так тебя увидит учитель. Подойдёт имя или ник."
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="nickname"
            maxLength={40}
            required
          />
        ) : null}
        <Field
          label="Пароль"
          hint={register ? 'От 6 знаков.' : undefined}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={register ? 'new-password' : 'current-password'}
          maxLength={128}
          required
        />
        {register ? (
          <Field
            label="Пароль ещё раз"
            type="password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            autoComplete="new-password"
            maxLength={128}
            required
          />
        ) : null}
        <p className="acct-error" role="alert">
          {error}
        </p>
        <button type="submit" className="acct-primary" disabled={busy}>
          {busy ? 'Подожди…' : register ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>
      <p className="acct-privacy">{PRIVACY_LINE}</p>
      <p className="acct-privacy">
        Без аккаунта учебник работает как раньше: прогресс хранится только в этом браузере.
      </p>
    </Modal>
  );
}
