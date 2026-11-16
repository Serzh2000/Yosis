import { useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../../lib/i18n';

interface FormProps {
  /** Signals of the design that no pin uses yet and that could go on this contact. */
  signals: readonly string[];
  label: string;
  /** What to say when there is nothing to choose from. */
  empty: string;
  error: string;
  onAssign: (signal: string) => void;
}

/** Choose a free signal for a contact and write it to the pin file. */
export function AssignForm({ signals, label, empty, error, onAssign }: FormProps) {
  const [signal, setSignal] = useState('');
  return signals.length ? (
    <>
      <div className="lab-assign">
        <select
          value={signal}
          onChange={(event) => setSignal(event.target.value)}
          aria-label={label}
        >
          <option value="">{t('Выберите сигнал…')}</option>
          {signals.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button primary"
          disabled={!signal}
          onClick={() => {
            onAssign(signal);
            setSignal('');
          }}
        >
          {t('Назначить')}
        </button>
      </div>
      {error && (
        <p className="lab-warn" role="alert">
          {error}
        </p>
      )}
    </>
  ) : (
    <p>{empty}</p>
  );
}

/** A small card over the bench when a wire was just dropped on a contact no signal uses. */
export function AssignPopover({
  fpga,
  onClose,
  ...form
}: FormProps & { fpga: number; onClose: () => void }) {
  return (
    <div
      className="lab-popover lab-popover-fixed"
      role="group"
      aria-label={t('Назначить сигнал контакту {fpga}', { fpga })}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p>
        <b>{t('Контакт {fpga} не назначен.', { fpga })}</b> {t('Сигнал:')}
      </p>
      <AssignForm {...form} />
      <button
        type="button"
        className="lab-popover-close"
        aria-label={t('Закрыть подсказку')}
        onClick={onClose}
      >
        <X size={13} />
      </button>
    </div>
  );
}
