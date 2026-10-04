import { useState } from 'react';
import { Dialog } from './Dialog';

export function ProjectNameDialog({
  name: currentName,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Переименовать проект" onClose={onClose} closeDisabled={busy} busy={busy}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          void onConfirm(name)
            .then(onClose)
            .catch((cause) =>
              setError(cause instanceof Error ? cause.message : 'Проверьте название.'),
            )
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Название
          <input
            autoFocus
            value={name}
            maxLength={100}
            required
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p>Название не влияет на сохранённые файлы и идентификатор проекта.</p>
        {error && (
          <div role="alert" className="dialog-error">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button subtle" type="button" disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button className="button primary" disabled={busy} type="submit">
            Сохранить название
          </button>
        </div>
      </form>
    </Dialog>
  );
}
