import { useRef, type KeyboardEvent } from 'react';
import {
  Activity,
  CircuitBoard,
  Code2,
  Cpu,
  Folder,
  GitBranch,
  GraduationCap,
  Layers3,
  SlidersHorizontal,
  Usb,
  type LucideIcon,
} from 'lucide-react';
import { getTabDestination } from '../lib/accessibility';

export type WorkTab =
  | 'design'
  | 'code'
  | 'rtl'
  | 'technology'
  | 'constraints'
  | 'simulation'
  | 'virtual'
  | 'chip'
  | 'lessons'
  | 'board';
export type WorkspaceStatus = 'success' | 'error' | 'stale' | 'busy';
export const workspaceTabs: { id: WorkTab; label: string; icon: LucideIcon; caption: string }[] = [
  {
    id: 'lessons',
    label: 'Обучение',
    icon: GraduationCap,
    caption: 'От первого бита к своему устройству',
  },
  { id: 'code', label: 'Код', icon: Code2, caption: 'Исходники проекта' },
  {
    id: 'design',
    label: 'Конструктор',
    icon: CircuitBoard,
    caption: 'Схема из логических элементов без ручного Verilog',
  },
  {
    id: 'constraints',
    label: 'Выводы',
    icon: SlidersHorizontal,
    caption: 'Физические выводы и ограничения .cst',
  },
  { id: 'rtl', label: 'RTL', icon: GitBranch, caption: 'Логические элементы и связи' },
  { id: 'simulation', label: 'Диаграммы', icon: Activity, caption: 'Сигналы во времени' },
  {
    id: 'virtual',
    label: 'Лаборатория',
    icon: CircuitBoard,
    caption: 'Плата на столе: детали, провода и схема в работе',
  },
  { id: 'technology', label: 'Gowin', icon: Cpu, caption: 'LUT, регистры и ресурсы' },
  { id: 'chip', label: 'Кристалл', icon: Layers3, caption: 'Размещение и карта занятости' },
  { id: 'board', label: 'Подключение', icon: Usb, caption: 'Работа с настоящей платой' },
];
const groups: { label: string; tabs: WorkTab[] }[] = [
  { label: 'Узнать', tabs: ['lessons'] },
  { label: 'Создать', tabs: ['code', 'design', 'constraints'] },
  { label: 'Проверить', tabs: ['rtl', 'simulation', 'virtual'] },
  { label: 'Собрать', tabs: ['technology', 'chip'] },
  { label: 'Плата', tabs: ['board'] },
];
const statuses = {
  success: { label: 'Готово' },
  error: { label: 'Ошибка' },
  stale: { label: 'Нужна новая сборка' },
  busy: { label: 'Выполняется' },
} as const;

export interface StudioNavigationProps {
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
  const visible = workspaceTabs.filter((item) => item.id !== 'design' || schematicAvailable);
  const tabs = useRef<HTMLElement>(null);
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
          if (!items.length) return null;
          return (
            <div className="sh-tab-group" role="presentation" key={group.label}>
              <span className="sh-tab-group-label" aria-hidden="true">
                {group.label}
              </span>
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
