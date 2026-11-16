import { useState } from 'react';
import { Check, CircuitBoard, Copy, Folder, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type { ProjectSummary } from '../lib/projects';
import { Dialog } from './Dialog';
import { t } from '../lib/i18n';

export function ProjectLibraryDialog({
  projects,
  currentId,
  onOpen,
  onClose,
  onImport,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  embedded = false,
  onBusyChange,
}: {
  projects: ProjectSummary[];
  currentId?: string;
  onOpen: (id: string) => Promise<void>;
  onClose: () => void;
  onImport: () => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDuplicate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [action, setAction] = useState<{
    kind: 'rename' | 'duplicate' | 'delete';
    project: ProjectSummary;
  } | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      await operation();
      setAction(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Не удалось изменить проект.'));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <Dialog
      embedded={embedded}
      className="dialog project-library-dialog"
      labelledBy="library-heading"
      onClose={onClose}
      closeDisabled={busy}
      busy={busy}
    >
      <div className="dialog-heading">
        <Folder size={21} />
        <h2 id="library-heading">{t('Ваши проекты')}</h2>
        <button
          className="icon-button"
          aria-label={t('Закрыть проекты')}
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p>
        {t(
          'Каждый проект сохраняется отдельно в этом браузере. Название можно менять, не теряя исходники.',
        )}
      </p>
      {action ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              action.kind === 'delete'
                ? onDelete(action.project.id)
                : action.kind === 'rename'
                  ? onRename(action.project.id, name)
                  : onDuplicate(action.project.id, name),
            );
          }}
        >
          <h3>
            {action.kind === 'delete'
              ? t('Удалить «{name}»?', { name: action.project.name })
              : action.kind === 'rename'
                ? t('Переименовать проект')
                : t('Создать копию проекта')}
          </h3>
          {action.kind === 'delete' ? (
            <p>{t('Исходники этого проекта будут удалены из библиотеки браузера.')}</p>
          ) : (
            <label>
              {t('Название')}
              <input
                autoFocus
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={busy}
              />
            </label>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button subtle"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setError('');
              }}
            >
              {t('Отмена')}
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {action.kind === 'delete'
                ? t('Удалить проект')
                : action.kind === 'rename'
                  ? t('Сохранить название')
                  : t('Создать копию')}
            </button>
          </div>
        </form>
      ) : (
        <div className="saved-project-list">
          {projects.map((saved) => (
            <div className="saved-project-row" key={saved.id}>
              <button disabled={busy} onClick={() => void run(() => onOpen(saved.id))}>
                <CircuitBoard size={22} />
                <span>
                  <strong>{saved.name}</strong>
                  <small>
                    {t('{count} файлов', { count: saved.fileCount })} · {saved.top}
                  </small>
                </span>
                {saved.id === currentId && <Check size={17} />}
              </button>
              <div className="saved-project-actions">
                {(['rename', 'duplicate', 'delete'] as const).map((kind) => (
                  <button
                    className="icon-button"
                    disabled={busy}
                    key={kind}
                    title={
                      kind === 'rename'
                        ? t('Переименовать')
                        : kind === 'duplicate'
                          ? t('Создать копию')
                          : t('Удалить')
                    }
                    aria-label={`${kind === 'rename' ? t('Переименовать') : kind === 'duplicate' ? t('Создать копию') : t('Удалить')} ${saved.name}`}
                    onClick={() => {
                      setAction({ kind, project: saved });
                      setName(
                        kind === 'duplicate'
                          ? t('{name} — копия', { name: saved.name }).slice(0, 100)
                          : saved.name,
                      );
                      setError('');
                    }}
                  >
                    {kind === 'rename' ? (
                      <Pencil size={15} />
                    ) : kind === 'duplicate' ? (
                      <Copy size={15} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!projects.length && <p>{t('Создайте первый проект.')}</p>}
        </div>
      )}
      {error && (
        <div className="dialog-error" role="alert">
          {error}
        </div>
      )}
      {!action && (
        <div className="dialog-actions">
          <button className="button subtle" disabled={busy} onClick={onImport}>
            <Upload size={15} />
            {t('Импорт JSON')}
          </button>
          <button className="button primary" disabled={busy} onClick={onCreate}>
            <Plus size={16} />
            {t('Новый проект')}
          </button>
        </div>
      )}
    </Dialog>
  );
}
