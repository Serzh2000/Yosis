import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  MoreHorizontal,
  SlidersHorizontal,
  Usb,
  type LucideIcon,
} from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { getTabDestination } from '../lib/accessibility';
import { localStore, STORAGE_KEYS } from '../lib/storage';
import { studioTabs, type WorkspaceStatus, type WorkTab } from '../lib/studio-tabs';
import { t } from '../lib/i18n';

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
  { label: t('Узнать'), tabs: ['lessons'] },
  { label: t('Создать'), tabs: ['code', 'design', 'constraints'] },
  { label: t('Проверить'), tabs: ['rtl', 'simulation', 'virtual'] },
  // Everything up to the Лаборатория works without a board; these are for the real one.
  { label: t('Настоящая плата'), tabs: ['technology', 'chip', 'board'], collapsible: true },
];
const savedOpen = () => localStore.getItem(STORAGE_KEYS.realBoardTabs) === '1';
const statuses = {
  success: { label: t('Готово') },
  error: { label: t('Ошибка') },
  stale: { label: t('Нужна новая сборка') },
  busy: { label: t('Выполняется') },
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
  const mobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const [opened, setOpened] = useState(savedOpen);
  useEffect(() => setMoreOpen(false), [tab, mobile]);
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
  if (mobile) {
    // Phones: four everyday tabs in a bottom bar, everything else behind "Ещё".
    const main: WorkTab[] = [
      'code',
      schematicAvailable ? 'design' : 'constraints',
      'simulation',
      'virtual',
    ];
    const rest = workspaceTabs.filter(
      (item) => !main.includes(item.id) && (item.id !== 'design' || schematicAvailable),
    );
    const statusOf = (id: WorkTab) =>
      id === 'chip'
        ? physicalStatus
        : id === 'rtl' || id === 'technology'
          ? synthesisStatus
          : undefined;
    const tabButton = (id: WorkTab, wide: boolean) => {
      const item = workspaceTabs.find((candidate) => candidate.id === id)!;
      const status = statusOf(id);
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
          aria-label={`${item.label}${state ? ` · ${state.label}` : ''}`}
          className={`sh-tab ${wide ? 'sheet' : ''} ${tab === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <item.icon size={wide ? 20 : 22} aria-hidden="true" />
          <span>{item.label}</span>
          {status && <i className={`sh-via ${status}`} aria-hidden="true" />}
        </button>
      );
    };
    const restBusy = rest.some((item) => ['busy', 'error'].includes(statusOf(item.id) ?? ''));
    return (
      <>
        {moreOpen && (
          <div
            className="sh-sheet-backdrop"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
        )}
        {moreOpen && (
          <div className="sh-sheet" role="dialog" aria-label={t('Ещё')}>
            <span className="sh-sheet-grip" aria-hidden="true" />
            <div className="sh-sheet-tabs" role="tablist" aria-label={t('Рабочие вкладки')}>
              {rest.map((item) => tabButton(item.id, true))}
            </div>
            {filesAvailable && (
              <button
                type="button"
                className={`sh-files sheet ${fileManagerOpen ? 'active' : ''}`}
                aria-expanded={fileManagerOpen}
                aria-controls="project-files"
                onClick={() => {
                  onToggleFiles();
                  setMoreOpen(false);
                }}
              >
                <Folder size={20} aria-hidden="true" />
                <span>{t('Файлы проекта')}</span>
              </button>
            )}
          </div>
        )}
        <nav className="sh-bottom" aria-label={t('Рабочие вкладки')}>
          <div className="sh-bottom-tabs" role="tablist" aria-orientation="horizontal">
            {main.map((id) => tabButton(id, false))}
          </div>
          <button
            type="button"
            className={`sh-tab sh-more-tab ${moreOpen || rest.some((item) => item.id === tab) ? 'active' : ''}`}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen((value) => !value)}
          >
            <MoreHorizontal size={22} aria-hidden="true" />
            <span>{t('Ещё')}</span>
            {restBusy && (
              <i
                className={`sh-via ${[physicalStatus, synthesisStatus].find((v) => v === 'busy' || v === 'error')}`}
                aria-hidden="true"
              />
            )}
          </button>
        </nav>
      </>
    );
  }
  return (
    <div className="sh-nav">
      <nav
        className="sh-tabs"
        aria-label={t('Рабочие вкладки')}
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
                      ? t('Показать вкладки для настоящей платы')
                      : t('Свернуть вкладки настоящей платы')
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
          aria-label={narrow ? t('Развернуть меню') : t('Свернуть меню')}
          title={narrow ? t('Показать названия вкладок') : t('Оставить в меню только значки')}
          aria-pressed={narrow}
          onClick={onToggleNarrow}
        >
          {narrow ? (
            <PanelLeftOpen size={17} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={17} aria-hidden="true" />
          )}
          <span>{t('Свернуть меню')}</span>
        </button>
      )}
      <button
        type="button"
        className={`sh-files ${fileManagerOpen && filesAvailable ? 'active' : ''} ${filesAvailable ? '' : 'unavailable'}`}
        aria-label={t('Файлы проекта')}
        title={t('Показать или скрыть файлы проекта')}
        aria-expanded={fileManagerOpen && filesAvailable}
        aria-controls="project-files"
        aria-hidden={filesAvailable ? undefined : true}
        disabled={!filesAvailable}
        tabIndex={filesAvailable ? undefined : -1}
        onClick={onToggleFiles}
      >
        <Folder size={17} aria-hidden="true" />
        <span>{t('Файлы')}</span>
      </button>
    </div>
  );
}
