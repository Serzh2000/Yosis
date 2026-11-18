import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { t } from '../lib/i18n';

export interface PinChoice {
  number: number;
  /** Pad name and function, e.g. "IOT27A". */
  label: string;
  /** What the board wires to the pin (LED0, S1…), when known. */
  role: string;
  /** The signal that holds the pin now, if another one does. */
  holder?: string;
}

/**
 * Phone version of the pin drop-down: a sheet with a search box. Pins that the board gives a
 * name (LEDs, buttons, UART) come first, then free pins; taken pins say who holds them.
 */
export function PinPickerSheet({
  signal,
  current,
  choices,
  onPick,
  onClose,
}: {
  signal: string;
  current: number | null;
  choices: PinChoice[];
  onPick: (number: number | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const found = query.trim().toLowerCase();
    const rank = (item: PinChoice) => (item.holder ? 2 : item.role ? 0 : 1);
    return choices
      .filter(
        (item) =>
          !found ||
          `${item.number} ${item.label} ${item.role} ${item.holder ?? ''}`
            .toLowerCase()
            .includes(found),
      )
      .sort((a, b) => rank(a) - rank(b) || a.number - b.number);
  }, [choices, query]);
  return (
    <>
      <div className="pin-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="pin-sheet"
        role="dialog"
        aria-label={t('Выберите вывод для {name}', { name: signal })}
      >
        <div className="pin-sheet-head">
          <strong>{t('Выберите вывод для {name}', { name: signal })}</strong>
          <button type="button" className="icon-button" aria-label={t('Закрыть')} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <label className="pin-sheet-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Номер, LED, S1, UART…')}
            aria-label={t('Поиск вывода')}
          />
        </label>
        <ul className="pin-sheet-list">
          {current !== null && (
            <li>
              <button type="button" className="pin-sheet-free" onClick={() => onPick(null)}>
                <X size={16} aria-hidden="true" />
                {t('Снять вывод')}
              </button>
            </li>
          )}
          {rows.map((item) => (
            <li key={item.number}>
              <button
                type="button"
                className={item.number === current ? 'current' : ''}
                aria-pressed={item.number === current}
                onClick={() => onPick(item.number)}
              >
                <b>{item.number}</b>
                <span>
                  {item.role || item.label}
                  {item.role ? <small>{item.label}</small> : null}
                </span>
                {item.holder && <em>{t('занят: {holder}', { holder: item.holder })}</em>}
              </button>
            </li>
          ))}
          {!rows.length && <li className="pin-sheet-empty">{t('Ничего не найдено')}</li>}
        </ul>
      </div>
    </>
  );
}
