import { useState } from 'react';
import { X } from 'lucide-react';
import { BENCH, BOARD, type Point } from '../../lib/lab/bench';

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
          <option value="">Выберите сигнал…</option>
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
          Назначить
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

/** A small card by the contact a wire was just dropped on, when no signal uses the contact. */
export function AssignPopover({
  fpga,
  at,
  zoom,
  onClose,
  ...form
}: FormProps & { fpga: number; at: Point; zoom: number; onClose: () => void }) {
  const below = at.y < BOARD.y + BOARD.h / 2;
  // The card keeps its size on screen whatever the zoom of the bench.
  const size = 1 / zoom;
  const left = Math.max(4, Math.min(BENCH.w - 284 * size, at.x - 140 * size));
  return (
    <div
      className="lab-popover"
      role="group"
      aria-label={`Назначить сигнал контакту ${fpga}`}
      data-nodrag=""
      style={{
        left,
        top: below ? at.y + 20 * size : at.y - 20 * size,
        transform: `scale(${size})${below ? '' : ' translateY(-100%)'}`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p>
        <b>Контакт {fpga} не назначен.</b> Сигнал:
      </p>
      <AssignForm {...form} />
      <button
        type="button"
        className="lab-popover-close"
        aria-label="Закрыть подсказку"
        onClick={onClose}
      >
        <X size={13} />
      </button>
    </div>
  );
}
