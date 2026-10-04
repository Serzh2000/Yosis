import { useState } from 'react';
import { Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import type { HierarchyNode } from '../lib/netlist';

export function HierarchyBranch({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: HierarchyNode;
  selected: string;
  onSelect: (name: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <>
      <div
        className={`tree-row ${selected === node.moduleName ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 15 }}
      >
        <button
          className="tree-expander"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Свернуть модуль' : 'Раскрыть модуль'}
          disabled={!node.children.length}
        >
          {node.children.length ? (
            expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )
          ) : (
            <span className="tree-leaf" />
          )}
        </button>
        <button
          className="tree-module"
          onClick={() => onSelect(node.moduleName)}
          title={`${node.moduleName} · ${node.resources.total} элементов`}
        >
          <Boxes size={14} />
          <span>{node.name}</span>
          <small>{node.resources.total}</small>
        </button>
      </div>
      {expanded &&
        node.children.map((child) => (
          <HierarchyBranch
            key={child.id}
            node={child}
            selected={selected}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
      {node.truncated && (
        <div className="tree-truncated" style={{ paddingLeft: 17 + depth * 15 }}>
          Часть экземпляров скрыта
        </div>
      )}
    </>
  );
}
