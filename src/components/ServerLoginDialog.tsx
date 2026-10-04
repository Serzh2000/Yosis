import { useState } from 'react';
import { Dialog } from './Dialog';

export function ServerLoginDialog({
  onLogin,
  onClose,
}: {
  onLogin: (token: string) => Promise<void>;
  onClose: () => void;
}) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog title="Подключиться к мастерской" onClose={onClose} closeDisabled={busy} busy={busy}>
      <p>
        Введите код доступа, который выдал преподаватель. На сервере будут доступны ваши сборки,
        проекты и прогресс курса.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          void onLogin(token.trim())
            .then(onClose)
            .catch((cause) =>
              setError(cause instanceof Error ? cause.message : 'Не удалось войти.'),
            )
            .finally(() => {
              setBusy(false);
              setToken('');
            });
        }}
      >
        <label>
          Код доступа
          <input
            autoFocus
            type="password"
            autoComplete="off"
            value={token}
            required
            maxLength={512}
            disabled={busy}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        {error && (
          <div className="dialog-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button subtle" disabled={busy} onClick={onClose}>
            Продолжить с локальным кодом
          </button>
          <button className="button primary" disabled={busy || !token.trim()} type="submit">
            Подключиться
          </button>
        </div>
      </form>
    </Dialog>
  );
}
