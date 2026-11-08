import { useRef, useState, type KeyboardEvent } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CircuitBoard,
  Code2,
  Cpu,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  GraduationCap,
  Layers3,
  SlidersHorizontal,
  Usb,
  type LucideIcon,
} from 'lucide-react';
import { getTabDestination } from '../lib/accessibility';
import { localStore, STORAGE_KEYS } from '../lib/storage';
import { studioTabs, type WorkspaceStatus, type WorkTab } from '../lib/studio-tabs';

export type { WorkspaceStatus };
const tabIcons: Record<WorkTab, LucideIcon> = {
  lessons: GraduationCap,
  code: Code2,
  design: CircuitBoard,
  constraints: SlidersHorizontal,
  rtl: GitBranch,
  simulation: Activity,
  virtual: CircuitBoard,
  technology: Cpu,
  chip: Layers3,
  board: Usb,
};
export const workspaceTabs: { id: WorkTab; label: string; icon: LucideIcon; caption: string }[] =
  studioTabs.map((item) => ({ ...item, icon: tabIcons[item.id] }));
const groups: { label: string; tabs: WorkTab[]; collapsible?: boolean }[] = [
  { label: 'Узнать', tabs: ['lessons'] },
  { label: 'Создать', tabs: ['code', 'design', 'constraints'] },
  { label: 'Проверить', tabs: ['rtl', 'simulation', 'virtual'] },
  // Everything up to the Лаборатория works without a board; these are for the real one.
  { label: 'Настоящая плата', tabs: ['technology', 'chip', 'board'], collapsible: true },
];
const savedOpen = () => localStore.getItem(STORAGE_KEYS.realBoardTabs) === '1';
const statuses = {
  success: { label: 'Готово' },
  error: { label: 'Ошибка' },
  stale: { label: 'Нужна новая сборка' },
  busy: { label: 'Выполняется' },
} as const;

export interface StudioNavigationProps {
  /** The menu is folded to icons. */
  narrow?: boolean;
  onToggleNarrow?: () => void;
  tab: WorkTab;
  onChange: (tab: WorkTab) => void;
  fileManagerOpen: boolean;
  /** The file panel is only relevant on source-text tabs; the toggle keeps its slot either way. */
  filesAvailable?: boolean;
  onToggleFiles: () => void;
  constraintsCount: number;
  synthesisStatus?: WorkspaceStatus;
  physicalStatus?: WorkspaceStatus;
  /** The schematic editor is offered only to projects that have a schematic. */
  schematicAvailable?: boolean;
}

export function StudioNavigation({
  narrow = false,
  onToggleNarrow,
  tab,
  onChange,
  fileManagerOpen,
  filesAvailable = true,
  onToggleFiles,
  constraintsCount,
  synthesisStatus,
  physicalStatus,
  schematicAvailable = true,
}: StudioNavigationProps) {
  const [opened, setOpened] = useState(savedOpen);
  const tabs = useRef<HTMLElement>(null);
  const hasTab = (group: (typeof groups)[number], id: WorkTab) => group.tabs.includes(id);
  // A group that is folded away still shows the tab that is open in it.
  const folded = (group: (typeof groups)[number]) =>
    !!group.collapsible && !opened && !hasTab(group, tab);
  const visible = workspaceTabs.filter(
    (item) =>
      (item.id !== 'design' || schematicAvailable) &&
      !groups.some((group) => folded(group) && hasTab(group, item.id)),
  );
  const toggle = () =>
    setOpened((value) => {
      localStore.setItem(STORAGE_KEYS.realBoardTabs, value ? '0' : '1');
      return !value;
    });
  function handleKeys(event: KeyboardEvent<HTMLButtonElement>, id: WorkTab) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = getTabDestination(
      event.key,
      visible.findIndex((item) => item.id === id),
      visible.length,
    );
    if (next === null) return;
    event.preventDefault();
    const destination = visible[next].id;
    onChange(destination);
    tabs.current?.querySelector<HTMLButtonElement>(`#tab-${destination}`)?.focus();
  }
  return (
    <div className="sh-nav">
      <nav
        className="sh-tabs"
        aria-label="Рабочие вкладки"
        role="tablist"
        aria-orientation="vertical"
        ref={tabs}
      >
        {groups.map((group) => {
          const items = group.tabs.filter((id) => visible.some((item) => item.id === id));
          const closed = folded(group);
          if (!items.length && !closed) return null;
          const busy = [physicalStatus, synthesisStatus].find(
            (value) => value === 'busy' || value === 'error',
          );
          return (
            <div className="sh-tab-group" role="presentation" key={group.label}>
              {group.collapsible ? (
                <button
                  type="button"
                  className="sh-tab-group-toggle"
                  aria-expanded={!closed}
                  title={
                    closed
                      ? 'Показать вкладки для настоящей платы'
                      : 'Свернуть вкладки настоящей платы'
                  }
                  onClick={toggle}
                  disabled={!closed && hasTab(group, tab)}
                >
                  {closed ? (
                    <ChevronRight size={13} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={13} aria-hidden="true" />
                  )}
                  <span>{group.label}</span>
                  {closed && busy && <i className={`sh-via ${busy}`} aria-hidden="true" />}
                </button>
              ) : (
                <span className="sh-tab-group-label" aria-hidden="true">
                  {group.label}
                </span>
              )}
              {items.map((id) => {
                const item = workspaceTabs.find((candidate) => candidate.id === id)!;
                const status =
                  id === 'chip'
                    ? physicalStatus
                    : id === 'rtl' || id === 'technology'
                      ? synthesisStatus
                      : undefined;
                const state = status ? statuses[status] : null;
                return (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    data-tour={`tab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    aria-controls={`panel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    aria-label={`${item.label}${state ? ` · ${state.label}` : ''}`}
                    title={`${item.caption}${state ? ` · ${state.label}` : ''}`}
                    className={`sh-tab ${tab === id ? 'active' : ''}`}
                    onClick={() => onChange(id)}
                    onKeyDown={(event) => handleKeys(event, id)}
                  >
                    <item.icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                    {id === 'constraints' && constraintsCount > 0 && (
                      <small aria-label={`${constraintsCount} файлов ограничений`}>
                        {constraintsCount}
                      </small>
                    )}
                    {status && <i className={`sh-via ${status}`} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      {onToggleNarrow && (
        <button
          type="button"
          className="sh-files sh-rail-toggle"
          aria-label={narrow ? 'Развернуть меню' : 'Свернуть меню'}
          title={narrow ? 'Показать названия вкладок' : 'Оставить в меню только значки'}
          aria-pressed={narrow}
          onClick={onToggleNarrow}
        >
          {narrow ? (
            <PanelLeftOpen size={17} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={17} aria-hidden="true" />
          )}
          <span>Свернуть меню</span>
        </button>
      )}
      <button
        type="button"
        className={`sh-files ${fileManagerOpen && filesAvailable ? 'active' : ''} ${filesAvailable ? '' : 'unavailable'}`}
        aria-label="Файлы проекта"
        title="Показать или скрыть файлы проекта"
        aria-expanded={fileManagerOpen && filesAvailable}
        aria-controls="project-files"
        aria-hidden={filesAvailable ? undefined : true}
        disabled={!filesAvailable}
        tabIndex={filesAvailable ? undefined : -1}
        onClick={onToggleFiles}
      >
        <Folder size={17} aria-hidden="true" />
        <span>Файлы</span>
      </button>
    </div>
  );
}
