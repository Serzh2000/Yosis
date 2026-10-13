import { useEffect, useMemo, useState } from 'react';
import type { BuildResult, Project, YosysNetlist } from '../../shared/types';
import { getHierarchy, getResources } from '../lib/netlist';
import type { RtlSignalLink } from '../lib/signal-link';
import type { WorkTab } from '../lib/studio-tabs';

export type NetlistKind = 'rtl' | 'technology';

/** Модуль, который показывается на схеме: выбранный, иначе верхний, иначе первый в списке. */
export function pickModuleName(
  netlist: YosysNetlist | undefined,
  selected: string,
  top: string,
): string {
  if (netlist?.modules[selected]) return selected;
  if (netlist?.modules[top]) return top;
  return Object.keys(netlist?.modules || {})[0];
}

/** Что ученик выбрал на схеме: модуль, элемент и сигнал, подсвеченный из диаграмм. */
export function useNetlistSelection(top: string, workTab: WorkTab) {
  const [selectedModule, setSelectedModule] = useState(top);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [highlightedSignal, setHighlightedSignal] = useState<RtlSignalLink | null>(null);
  // Выбранный элемент относится к схеме одной вкладки: при смене вкладки выбор сбрасывается.
  useEffect(() => {
    setSelectedCell(null);
  }, [workTab]);
  return {
    selectedModule,
    setSelectedModule,
    selectedCell,
    setSelectedCell,
    highlightedSignal,
    setHighlightedSignal,
  };
}

/** Нетлист вкладки RTL или Gowin, модуль на схеме, иерархия, ресурсы и выбранная ячейка. */
export function useNetlistView({
  build,
  project,
  workTab,
  selectedModule,
  selectedCell,
}: {
  build: BuildResult | null;
  project: Project;
  workTab: WorkTab;
  selectedModule: string;
  selectedCell: string | null;
}) {
  const view: NetlistKind = workTab === 'technology' ? 'technology' : 'rtl';
  const netlist = view === 'rtl' ? build?.rtl : build?.technology;
  const top = build?.top || project.top;
  const moduleName = pickModuleName(netlist, selectedModule, top);
  const hierarchy = useMemo(() => (netlist ? getHierarchy(netlist, top) : null), [netlist, top]);
  const resources = useMemo(
    () => (netlist && moduleName ? getResources(netlist, moduleName) : null),
    [netlist, moduleName],
  );
  const currentCell =
    selectedCell && netlist && moduleName
      ? netlist.modules[moduleName]?.cells[selectedCell] || null
      : null;
  return { view, netlist, moduleName, hierarchy, resources, currentCell };
}
