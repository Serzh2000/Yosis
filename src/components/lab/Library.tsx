import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { PARTS, PART_GROUPS } from '../../lib/lab/catalog';
import { PartIcon } from './PartIcon';
import { t } from '../../lib/i18n';

/** What a card dragged out of the library carries: the id of its part. */
export const PART_DRAG_TYPE = 'application/x-yosis-lab-part';

/** The list of parts does not depend on the running design, so it is drawn once. */
export const Library = memo(function Library({
  onAdd,
  allowed,
}: {
  onAdd: (id: string) => void;
  /** Only these parts are offered; all of them when absent (a textbook page may narrow the choice). */
  allowed?: readonly string[];
}) {
  const offered = allowed ? PARTS.filter((part) => allowed.includes(part.id)) : PARTS;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(['Макетные платы', 'Светодиоды']),
  );
  const found = query.trim().toLowerCase();
  return (
    <aside className="lab-library" aria-label={t('Детали')}>
      <label className="lab-search">
        <Search size={14} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Найти среди {n} деталей', { n: offered.length })}
          aria-label={t('Поиск детали')}
        />
      </label>
      <div className="lab-library-list">
        {PART_GROUPS.map((group) => {
          const parts = offered.filter(
            (part) =>
              part.group === group &&
              (!found || `${part.title} ${part.note}`.toLowerCase().includes(found)),
          );
          if (!parts.length) return null;
          const shown = !!found || open.has(group);
          const Chevron = shown ? ChevronDown : ChevronRight;
          return (
            <section key={group}>
              <button
                type="button"
                className="lab-group"
                aria-expanded={shown}
                onClick={() =>
                  setOpen((value) => {
                    const next = new Set(value);
                    if (next.has(group)) next.delete(group);
                    else next.add(group);
                    return next;
                  })
                }
              >
                <Chevron size={14} aria-hidden="true" />
                {t(group)} <small>{parts.length}</small>
              </button>
              {shown && (
                <div className="lab-cards">
                  {parts.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      className="lab-item"
                      title={`${part.title}. ${part.note}`}
                      aria-label={t('Добавить деталь: {title}', { title: part.title })}
                      onClick={() => onAdd(part.id)}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(PART_DRAG_TYPE, part.id);
                        event.dataTransfer.effectAllowed = 'copy';
                        const icon = event.currentTarget.querySelector('svg');
                        if (icon) event.dataTransfer.setDragImage(icon, 36, 27);
                      }}
                    >
                      <PartIcon def={part} />
                      <strong>{part.title}</strong>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
});

/**
 * The parts a textbook page offers, on a shelf at the foot of the scene. Each is added by a click or
 * dragged out onto the table, like a card of the library.
 */
export const PartsShelf = memo(function PartsShelf({
  parts,
  onAdd,
}: {
  parts: readonly string[];
  onAdd: (id: string) => void;
}) {
  const offered = PARTS.filter((part) => parts.includes(part.id));
  if (!offered.length) return null;
  return (
    <aside className="lab-shelf" aria-label={t('Детали страницы')}>
      <span className="lab-shelf-title">{t('Детали')}</span>
      {offered.map((part) => (
        <button
          key={part.id}
          type="button"
          className="lab-shelf-item"
          title={`${part.title}. ${part.note}`}
          aria-label={t('Добавить деталь: {title}', { title: part.title })}
          onClick={() => onAdd(part.id)}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(PART_DRAG_TYPE, part.id);
            event.dataTransfer.effectAllowed = 'copy';
            const icon = event.currentTarget.querySelector('svg');
            if (icon) event.dataTransfer.setDragImage(icon, 36, 27);
          }}
        >
          <PartIcon def={part} />
          <strong>{part.title}</strong>
        </button>
      ))}
    </aside>
  );
});
