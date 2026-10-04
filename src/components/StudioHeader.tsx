import { Cpu, Folder, HelpCircle, Moon, Play, Plus, Square, Sun } from 'lucide-react';
import type { Project } from '../../shared/types';

export function StudioHeader({
  project,
  busy,
  submitting,
  theme,
  showSynthesis,
  synthesisAvailable,
  healthLoading,
  serverLabel,
  onServer,
  onCode,
  onProjectHub,
  onCancel,
  onSynthesize,
  onToggleTheme,
  onGuide,
}: {
  project: Project;
  busy: boolean;
  submitting: boolean;
  theme: 'dark' | 'light';
  showSynthesis: boolean;
  synthesisAvailable: boolean;
  healthLoading: boolean;
  serverLabel: string;
  onServer: () => void;
  onCode: () => void;
  onProjectHub: () => void;
  onCancel: () => void;
  onSynthesize: () => void;
  onToggleTheme: () => void;
  onGuide: () => void;
}) {
  return (
    <header className="app-header">
      <a
        className="brand"
        href="#"
        aria-label="Yosis FPGA Studio"
        onClick={(event) => {
          event.preventDefault();
          onCode();
        }}
      >
        <span className="brand-mark">
          <Cpu size={22} />
        </span>
        <strong>
          yosis<span>.</span>
        </strong>
        <span className="brand-caption">FPGA STUDIO</span>
      </a>
      <span className="header-divider" />
      <div className="project-switcher" title={project.name || 'Без имени'}>
        <Folder size={16} />
        <span>{project.name || 'Без имени'}</span>
      </div>
      <div className="toolbar-actions">
        <button
          className="button subtle"
          disabled={busy}
          onClick={onProjectHub}
          data-tour="new-project"
          aria-label="Создать проект"
          title="Создание, примеры и сохранённые проекты"
        >
          <Plus size={16} />
          <span>Создать проект</span>
        </button>
        <span className="toolbar-divider" />
        {showSynthesis &&
          (busy ? (
            <button className="button stop" disabled={submitting} onClick={onCancel}>
              <Square size={13} fill="currentColor" />
              Остановить
            </button>
          ) : (
            <button
              className="button primary"
              onClick={onSynthesize}
              data-tour="synthesize"
              title="Запустить Yosys · Ctrl+Enter"
              disabled={!synthesisAvailable || healthLoading}
            >
              <Play size={14} fill="currentColor" />
              Синтезировать<kbd>Ctrl ↵</kbd>
            </button>
          ))}
      </div>
      <div className="header-right">
        <button
          className="button subtle server-button"
          title="Сохранение проектов и учебного прогресса на сервере"
          disabled={busy}
          onClick={onServer}
        >
          {serverLabel}
        </button>
        <button
          className="icon-button theme-toggle"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          onClick={() => onToggleTheme()}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="icon-button"
          title="Как пользоваться IDE"
          aria-label="Как пользоваться IDE"
          onClick={() => onGuide()}
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  );
}
