import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { PARTS, PART_GROUPS } from '../../lib/lab/catalog';
import { PartIcon } from './PartIcon';

/** What a card dragged out of the library carries: the id of its part. */
export const PART_DRAG_TYPE = 'application/x-yosis-lab-part';

/** The list of parts does not depend on the running design, so it is drawn once. */
export const Library = memo(function Library({ onAdd }: { onAdd: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([PART_GROUPS[0]]));
  const found = query.trim().toLowerCase();
  return (
    <aside className="lab-library" aria-label="Детали">
      <label className="lab-search">
        <Search size={14} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Найти среди ${PARTS.length} деталей`}
          aria-label="Поиск детали"
        />
      </label>
      <div className="lab-library-list">
        {PART_GROUPS.map((group) => {
          const parts = PARTS.filter(
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
                {group} <small>{parts.length}</small>
              </button>
              {shown && (
                <div className="lab-cards">
                  {parts.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      className="lab-item"
                      title={`${part.title}. ${part.note}`}
                      aria-label={`Добавить деталь: ${part.title}`}
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
