import { Suspense } from 'react';
import { Braces, Cpu, GitBranch, LoaderCircle, Play, RotateCcw, Search } from 'lucide-react';
import type { BuildResult, Project, YosysCell, YosysNetlist } from '../../../shared/types';
import type { HierarchyNode, ResourceCounts } from '../../lib/netlist';
import type { RtlSignalLink } from '../../lib/signal-link';
import type { NetlistKind } from '../../hooks/useNetlistView';
import type { HighlightedSource } from '../../hooks/useSourceNavigation';
import { HelpTrigger } from '../HelpCard';
import { ModuleHierarchyMenu } from '../ModuleHierarchyMenu';
import { PanelBoundary } from '../PanelBoundary';
import { LutInspector, Schematic } from './lazy-panels';

/** Разобранный нетлист вкладки: то, что считает `useNetlistView`. */
export interface NetlistModel {
  view: NetlistKind;
  netlist: YosysNetlist | undefined;
  moduleName: string;
  hierarchy: HierarchyNode | null;
  resources: ResourceCounts | null;
  currentCell: YosysCell | null;
}
/** Выбор на схеме и подсветка. */
export interface NetlistSelection {
  selectedCell: string | null;
  highlightedSignal: RtlSignalLink | null;
  highlightedSource: HighlightedSource | undefined;
  onSelectCell: (cell: string | null) => void;
  onSelectModule: (name: string) => void;
}
/** Переход от элемента схемы к строке кода. */
export interface SourceLinks {
  navigateSource: (file: string, line: number) => void;
  canNavigateSource: (file: string) => boolean;
}

/** Вкладки «RTL» и «Gowin»: схема, инспектор элемента и ресурсы модуля. */
export function LogicWorkspace({
  tab,
  project,
  build,
  model,
  selection,
  links,
  stale,
  busy,
  synthesisAvailable,
  onSynthesize,
}: {
  tab: 'rtl' | 'technology';
  project: Project;
  build: BuildResult | null;
  model: NetlistModel;
  selection: NetlistSelection;
  links: SourceLinks;
  stale: boolean;
  busy: boolean;
  synthesisAvailable: boolean;
  onSynthesize: () => void;
}) {
  const { view, netlist, moduleName, hierarchy, resources, currentCell } = model;
  const { selectedCell, highlightedSignal, highlightedSource } = selection;
  const resourceRows = resources
    ? ([
        ['LUT', resources.LUT],
        ['FF', resources.FF],
        ['ALU', resources.ALU],
        ['BRAM', resources.BRAM],
        ['DSP', resources.DSP],
        ['I/O', resources.IO],
      ] as const)
    : null;
  return (
    <div
      id={`panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab}`}
      className="logic-workspace"
    >
      <section className="schematic-pane">
        <div className="pane-title">
          <GitBranch size={16} />
          <span>{view === 'rtl' ? 'RTL-схема' : 'Примитивы Gowin'}</span>
          <ModuleHierarchyMenu
            hierarchy={hierarchy}
            selected={moduleName}
            onSelect={selection.onSelectModule}
          />
          <span className="pane-meta">{moduleName || project.top}</span>
        </div>
        {stale && (
          <div className="stale-banner">
            <RotateCcw size={14} />
            <span>Исходники изменены. Схема относится к предыдущей сборке.</span>
            <button onClick={onSynthesize} disabled={busy}>
              Обновить
            </button>
          </div>
        )}
        <div className="schematic-content">
          {netlist && moduleName ? (
            <PanelBoundary name="схема" resetKey={project.id}>
              <Suspense fallback={<div className="editor-loading">Строим схему…</div>}>
                <Schematic
                  netlist={netlist}
                  moduleName={moduleName}
                  selectedCell={selectedCell}
                  onSelectCell={selection.onSelectCell}
                  onSourceNavigate={links.navigateSource}
                  canNavigateSource={links.canNavigateSource}
                  highlightedSource={highlightedSource}
                  highlightedBits={
                    !stale && view === 'rtl' && highlightedSignal?.module === moduleName
                      ? highlightedSignal.bits
                      : undefined
                  }
                  onSelectModule={selection.onSelectModule}
                />
              </Suspense>
            </PanelBoundary>
          ) : (
            <div className="empty-workspace">
              <span className="empty-chip">
                <Cpu size={46} />
              </span>
              <span className="workspace-eyebrow">ОТ VERILOG К ЛОГИКЕ</span>
              <h2>
                {busy
                  ? 'Yosys строит схему…'
                  : build?.status === 'error'
                    ? 'Проверьте исходный код'
                    : 'Схема вашего устройства'}
              </h2>
              <p>
                {busy
                  ? 'Готовое представление появится здесь. Ход работы доступен в журнале.'
                  : build?.status === 'error'
                    ? build.error || 'Откройте диагностику сборки.'
                    : view === 'rtl'
                      ? 'Вентили, сумматоры, мультиплексоры и регистры — с привычными схемными обозначениями.'
                      : 'Реальные LUT, триггеры и другие примитивы Gowin. Выберите LUT, чтобы увидеть её таблицу истинности.'}
              </p>
              <button
                className="button primary"
                disabled={busy || !synthesisAvailable}
                onClick={onSynthesize}
              >
                {busy ? <LoaderCircle size={15} className="spin" /> : <Play size={15} />}
                Синтезировать проект
              </button>
            </div>
          )}
        </div>
        <div className="schematic-footer">
          <span>
            {netlist
              ? `${Object.keys(netlist.modules[moduleName]?.cells || {}).length} элементов в модуле`
              : 'Ожидаем результат синтеза'}
          </span>
          <span>{view === 'rtl' ? 'До отображения на FPGA' : 'До упаковки и размещения'}</span>
        </div>
      </section>
      <aside className="inspector-pane">
        <div className="pane-title">
          <Search size={15} />
          <span>Инспектор</span>
        </div>
        <div className="inspector-scroll">
          {currentCell ? (
            <PanelBoundary name="инспектор" resetKey={project.id}>
              <Suspense fallback={null}>
                <LutInspector
                  cell={currentCell}
                  cellName={selectedCell}
                  onSourceNavigate={links.navigateSource}
                  canNavigateSource={links.canNavigateSource}
                />
              </Suspense>
            </PanelBoundary>
          ) : (
            <div className="inspector-intro">
              <Braces size={27} />
              <h3>Выберите элемент</h3>
              <p>Нажмите на схеме, чтобы изучить подключения, параметры и таблицу LUT.</p>
            </div>
          )}
          <div className="resource-section">
            <div className="section-label">Ресурсы модуля</div>
            {resourceRows ? (
              <>
                <div className="resource-grid">
                  {resourceRows.map(([label, value]) => (
                    <HelpTrigger
                      topic={{
                        kind: 'resource',
                        resource: label === 'I/O' ? 'IO' : label,
                        view,
                      }}
                      className={value ? 'has-resource' : ''}
                      key={label}
                    >
                      <strong>{value.toLocaleString('ru-RU')}</strong>
                      <span>{label}</span>
                    </HelpTrigger>
                  ))}
                </div>
                {resources!.other > 0 && (
                  <HelpTrigger
                    topic={{ kind: 'resource', resource: 'other', view }}
                    className="other-resources"
                  >
                    <span>Другие элементы</span>
                    <strong>{resources!.other}</strong>
                  </HelpTrigger>
                )}
                <p className="resource-note">
                  {view === 'rtl'
                    ? 'RTL-операции до технологического синтеза.'
                    : 'После synth_gowin; до упаковки и размещения.'}
                </p>
              </>
            ) : (
              <p className="resource-note">Подсчёт появится после синтеза.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
