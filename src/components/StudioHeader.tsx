import { CloudUpload, Cpu, Folder, HelpCircle, Moon, Play, Plus, Square, Sun } from 'lucide-react';
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
    <header className="sh-header">
      <a
        className="sh-brand"
        href="#"
        aria-label="Yosis FPGA Studio"
        onClick={(event) => {
          event.preventDefault();
          onCode();
        }}
      >
        <span className="sh-brand-mark">
          <Cpu size={20} />
        </span>
        <strong>
          yosis<span>.</span>
        </strong>
      </a>
      <div className="project-switcher sh-project" title={project.name || 'Без имени'}>
        <Folder size={16} aria-hidden="true" />
        <span>{project.name || 'Без имени'}</span>
      </div>
      <div className="sh-primary">
        {showSynthesis &&
          (busy ? (
            <button className="sh-btn danger" disabled={submitting} onClick={onCancel}>
              <Square size={13} fill="currentColor" />
              Остановить
            </button>
          ) : (
            <button
              className="sh-btn primary"
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
      <div className="sh-actions">
        <button
          className="sh-btn outline"
          disabled={busy}
          onClick={onProjectHub}
          data-tour="new-project"
          aria-label="Создать проект"
          title="Создание, примеры и сохранённые проекты"
        >
          <Plus size={16} aria-hidden="true" />
          <span>Создать проект</span>
        </button>
        <span className="sh-divider" aria-hidden="true" />
        <button
          className="sh-btn quiet sh-sync"
          title="Сохранение проектов и учебного прогресса на сервере"
          aria-label={serverLabel}
          disabled={busy}
          onClick={onServer}
        >
          <CloudUpload size={16} aria-hidden="true" />
          <span>{serverLabel}</span>
        </button>
        <button
          className="sh-btn quiet icon"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          onClick={() => onToggleTheme()}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="sh-btn quiet icon"
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
