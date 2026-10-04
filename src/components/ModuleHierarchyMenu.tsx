import { useEffect, useId, useRef, useState } from 'react';
import { Boxes, ChevronDown, GitBranch } from 'lucide-react';
import type { HierarchyNode } from '../lib/netlist';
import { HierarchyBranch } from './HierarchyBranch';
import './module-hierarchy.css';

/** Compact module picker for the RTL and Gowin views (the tree used to live in the file panel). */
export function ModuleHierarchyMenu({
  hierarchy,
  selected,
  onSelect,
}: {
  hierarchy: HierarchyNode | null;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="module-hierarchy" ref={root}>
      <button
        type="button"
        className="module-hierarchy-trigger"
        aria-expanded={open}
        aria-controls={popoverId}
        title="Иерархия модулей: выберите, какую часть устройства показать"
        onClick={() => setOpen(!open)}
      >
        <Boxes size={14} aria-hidden="true" />
        <span>Модули</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="module-hierarchy-popover"
          id={popoverId}
          role="region"
          aria-label="Иерархия модулей"
        >
          {hierarchy ? (
            <HierarchyBranch
              node={hierarchy}
              selected={selected}
              onSelect={(name) => {
                onSelect(name);
                setOpen(false);
              }}
            />
          ) : (
            <p className="module-hierarchy-empty">
              <GitBranch size={16} aria-hidden="true" />
              Модули появятся после синтеза
            </p>
          )}
        </div>
      )}
    </div>
  );
}
