import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  categories,
  emptyCircuit,
  library,
  newLibraryNode,
  type LibraryEntry,
} from '../../shared/schematic';
import { circuitGeometry } from '../lib/circuit-geometry';
import { CircuitSymbol } from './CircuitSymbol';

export const BLOCK_DRAG_TYPE = 'application/x-yosis-block';

export function SymbolPreview({ entry }: { entry: LibraryEntry }) {
  const node = useMemo(() => {
    const created = newLibraryNode(emptyCircuit(), entry.id);
    return { ...created, x: 0, y: 0 };
  }, [entry.id]);
  const geo = circuitGeometry(node);
  const margin = 24;
  return (
    <svg
      className="palette-symbol"
      viewBox={`${-margin} ${-margin} ${geo.width + margin * 2} ${geo.height + margin * 2}`}
      role="img"
      aria-label={`Символ: ${entry.title}`}
    >
      <CircuitSymbol node={node} />
      {geo.pins.map((pin) => (
        <circle key={pin.name} className="cs-pin-preview" cx={pin.x} cy={pin.y} r={3.5} />
      ))}
    </svg>
  );
}

export function CircuitPalette({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (entryId: string) => void;
}) {
  const [query, setQuery] = useState(''),
    [hover, setHover] = useState<LibraryEntry | null>(null);
  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      library.filter(
        (entry) =>
          !normalized ||
          `${entry.title} ${entry.help} ${entry.keywords ?? ''}`.toLowerCase().includes(normalized),
      ),
    [normalized],
  );
  return (
    <aside className="circuit-palette" aria-label="Библиотека элементов">
      <h3>Библиотека</h3>
      <label className="palette-search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          aria-label="Поиск элемента"
          placeholder="Найти: счётчик, И, кнопка…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="palette-scroll">
        {categories.map((category) => {
          const entries = visible.filter((entry) => entry.category === category.id);
          if (!entries.length) return null;
          return (
            <details
              key={category.id}
              open={!!normalized || category.id === 'logic' || category.id === 'io'}
            >
              <summary title={category.help}>
                {category.title} <span>{entries.length}</span>
              </summary>
              <ul>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      draggable={!disabled}
                      disabled={disabled}
                      aria-describedby={hover?.id === entry.id ? 'palette-card' : undefined}
                      onMouseEnter={() => setHover(entry)}
                      onFocus={() => setHover(entry)}
                      onMouseLeave={() =>
                        setHover((value) => (value?.id === entry.id ? null : value))
                      }
                      onBlur={() => setHover((value) => (value?.id === entry.id ? null : value))}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(BLOCK_DRAG_TYPE, entry.id);
                        event.dataTransfer.setData('text/plain', entry.title);
                        event.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAdd(entry.id)}
                    >
                      {entry.title}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        {!visible.length && (
          <p className="palette-empty">Ничего не найдено. Попробуйте другое слово.</p>
        )}
      </div>
      <p className="palette-hint">Нажмите на элемент или перетащите его на схему.</p>
      {hover && (
        <div className="palette-card" id="palette-card" role="tooltip">
          <SymbolPreview entry={hover} />
          <strong>{hover.title}</strong>
          <p>{hover.help}</p>
          {hover.sketch && <pre aria-label="Таблица истинности">{hover.sketch.join('\n')}</pre>}
        </div>
      )}
    </aside>
  );
}
