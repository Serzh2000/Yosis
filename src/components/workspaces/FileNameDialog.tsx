import type { FormEvent } from 'react';
import { FileCode2, X } from 'lucide-react';
import type { FileDialogState } from '../../hooks/useProjectFiles';
import { Dialog } from '../Dialog';

/** Окно «Новый файл» / «Переименовать файл». */
export function FileNameDialog({
  dialog,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  dialog: NonNullable<FileDialogState>;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Dialog onClose={onClose} labelledBy="file-dialog-heading" key="file">
      <form onSubmit={onSubmit}>
        <div className="dialog-heading">
          <FileCode2 size={20} />
          <h2 id="file-dialog-heading">
            {dialog.kind === 'add' ? 'Новый файл' : 'Переименовать файл'}
          </h2>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label htmlFor="filename">Имя файла</label>
        <input
          id="filename"
          autoFocus
          value={dialog.value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="module.v"
        />
        <p>
          Расширения .v, .sv, .vh, .svh, .cst, .ysch, .hex или .mem. Можно указать папку, например
          rtl/alu.v.
        </p>
        {error && (
          <div className="dialog-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button subtle" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="button primary">
            {dialog.kind === 'add' ? 'Создать файл' : 'Переименовать'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
