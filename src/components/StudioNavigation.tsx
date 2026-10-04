import { useRef, type KeyboardEvent } from 'react';
import {
  Activity,
  CircleAlert,
  CircleCheck,
  CircuitBoard,
  Code2,
  Cpu,
  Folder,
  GitBranch,
  GraduationCap,
  Layers3,
  LoaderCircle,
  RefreshCw,
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
    label: 'Виртуальная',
    icon: CircuitBoard,
    caption: 'Виртуальная плата: кнопки, светодиоды и Verilog',
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
  success: { label: 'Готово', icon: CircleCheck },
  error: { label: 'Ошибка', icon: CircleAlert },
  stale: { label: 'Нужна новая сборка', icon: RefreshCw },
  busy: { label: 'Выполняется', icon: LoaderCircle },
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
}: StudioNavigationProps) {
  const tabs = useRef<HTMLElement>(null);
  function handleKeys(event: KeyboardEvent<HTMLButtonElement>, id: WorkTab) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = getTabDestination(
      event.key,
      workspaceTabs.findIndex((item) => item.id === id),
      workspaceTabs.length,
    );
    if (next === null) return;
    event.preventDefault();
    const destination = workspaceTabs[next].id;
    onChange(destination);
    tabs.current?.querySelector<HTMLButtonElement>(`#tab-${destination}`)?.focus();
  }
  return (
    <div className="sh-nav">
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
        <Folder size={18} aria-hidden="true" />
      </button>
      <nav
        className="sh-tabs"
        aria-label="Рабочие вкладки"
        role="tablist"
        aria-orientation="horizontal"
        ref={tabs}
      >
        {groups.map((group, index) => (
          <div className="sh-tab-group" role="presentation" key={group.label} title={group.label}>
            {index > 0 && <span className="sh-tab-sep" aria-hidden="true" />}
            {group.tabs.map((id) => {
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
                  title={`${group.label}: ${item.caption}${state ? ` · ${state.label}` : ''}`}
                  className={`sh-tab ${tab === id ? 'active' : ''}`}
                  onClick={() => onChange(id)}
                  onKeyDown={(event) => handleKeys(event, id)}
                >
                  <item.icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                  {id === 'constraints' && constraintsCount > 0 && (
                    <small aria-label={`${constraintsCount} файлов ограничений`}>
                      {constraintsCount}
                    </small>
                  )}
                  {state && (
                    <state.icon
                      className={`tab-state ${status} ${status === 'busy' ? 'spin' : ''}`}
                      size={13}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
