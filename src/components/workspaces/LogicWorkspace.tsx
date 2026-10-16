import { Suspense } from 'react';
import { Cpu, GitBranch, LoaderCircle, Play, RotateCcw, Search } from 'lucide-react';
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
            <div className="inspector-guide">
              <svg viewBox="0 0 220 72" aria-hidden="true">
                <path
                  d="M8 22h30M8 50h30M98 36h38"
                  stroke="var(--trace)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M38 12h26a24 24 0 0 1 0 48H38z"
                  fill="var(--panel)"
                  stroke="var(--text-soft)"
                  strokeWidth="2"
                />
                <rect
                  x="136"
                  y="22"
                  width="56"
                  height="28"
                  rx="4"
                  fill="var(--panel)"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                <text
                  x="164"
                  y="40"
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill="var(--accent)"
                >
                  LUT4
                </text>
                <path
                  d="M176 48l6 16 3-6 6 4-3-6 7-1z"
                  fill="var(--text)"
                  stroke="var(--panel)"
                  strokeWidth="1.5"
                />
              </svg>
              <h3>Нажмите на элемент схемы</h3>
              <p>Справа появятся его входы и выходы, параметры и таблица истинности LUT.</p>
            </div>
          )}
          <div className="resource-section resource-groups">
            {resourceRows ? (
              <>
                <section className="resource-group" aria-label="Логика">
                  <h4 className="resource-group-title">
                    Логика
                    <small>{resourceRows.slice(0, 3).reduce((sum, [, v]) => sum + v, 0)}</small>
                  </h4>
                  <div className="resource-tiles">
                    {resourceRows.slice(0, 3).map(([label, value]) => (
                      <HelpTrigger
                        topic={{ kind: 'resource', resource: label === 'I/O' ? 'IO' : label, view }}
                        className={`resource-tile ${value ? 'has-resource' : ''}`}
                        key={label}
                      >
                        <span>{label}</span>
                        <strong>{value.toLocaleString('ru-RU')}</strong>
                      </HelpTrigger>
                    ))}
                  </div>
                </section>
                <section className="resource-group" aria-label="Память и ввод-вывод">
                  <h4 className="resource-group-title">
                    Память и ввод-вывод
                    <small>{resourceRows.slice(3).reduce((sum, [, v]) => sum + v, 0)}</small>
                  </h4>
                  <div className="resource-tiles">
                    {resourceRows.slice(3).map(([label, value]) => (
                      <HelpTrigger
                        topic={{ kind: 'resource', resource: label === 'I/O' ? 'IO' : label, view }}
                        className={`resource-tile ${value ? 'has-resource' : ''}`}
                        key={label}
                      >
                        <span>{label}</span>
                        <strong>{value.toLocaleString('ru-RU')}</strong>
                      </HelpTrigger>
                    ))}
                  </div>
                </section>
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
              <p className="resource-note">Подсчёт ресурсов появится после синтеза.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
