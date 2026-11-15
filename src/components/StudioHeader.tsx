import { CloudUpload, Folder, HelpCircle, Moon, Play, Plus, Square, Sun } from 'lucide-react';
import type { Project } from '../../shared/types';
import { language, switchLanguage, t } from '../lib/i18n';

export function StudioHeader({
  project,
  busy,
  submitting,
  theme,
  showSynthesis,
  synthesisAvailable,
  healthLoading,
  serverLabel,
  showServer,
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
  /** Server sync is offered only when the app runs against a shared server. */
  showServer: boolean;
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
        aria-label="Logra FPGA Studio"
        onClick={(event) => {
          event.preventDefault();
          onCode();
        }}
      >
        <span className="sh-brand-mark" aria-hidden="true" />
        <strong>logra</strong>
      </a>
      <div className="project-switcher sh-project" title={project.name || t('Без имени')}>
        <Folder size={16} aria-hidden="true" />
        <span>{project.name || t('Без имени')}</span>
      </div>
      <div className="sh-actions">
        <button
          className="sh-btn outline"
          disabled={busy}
          onClick={onProjectHub}
          data-tour="new-project"
          aria-label={t('Создать проект')}
          title={t('Создание, примеры и сохранённые проекты')}
        >
          <Plus size={16} aria-hidden="true" />
          <span>{t('Создать проект')}</span>
        </button>
        {showServer && (
          <button
            className="sh-btn quiet sh-sync"
            title={t('Сохранение проектов и учебного прогресса на сервере')}
            aria-label={serverLabel}
            disabled={busy}
            onClick={onServer}
          >
            <CloudUpload size={16} aria-hidden="true" />
            <span>{serverLabel}</span>
          </button>
        )}
        <button
          className="sh-btn quiet icon sh-lang"
          title={t('Язык интерфейса')}
          aria-label={t('Язык интерфейса')}
          onClick={() => switchLanguage(language() === 'en' ? 'ru' : 'en')}
        >
          {language() === 'en' ? 'RU' : 'EN'}
        </button>
        <button
          className="sh-btn quiet icon"
          title={theme === 'dark' ? t('Светлая тема') : t('Тёмная тема')}
          aria-label={theme === 'dark' ? t('Светлая тема') : t('Тёмная тема')}
          onClick={() => onToggleTheme()}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="sh-btn quiet icon"
          title={t('Как пользоваться IDE')}
          aria-label={t('Как пользоваться IDE')}
          onClick={() => onGuide()}
        >
          <HelpCircle size={18} />
        </button>
        {showSynthesis &&
          (busy ? (
            <button className="sh-btn danger" disabled={submitting} onClick={onCancel}>
              <Square size={13} fill="currentColor" />
              {t('Остановить')}
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
              {t('Синтезировать')}<kbd>Ctrl ↵</kbd>
            </button>
          ))}
      </div>
    </header>
  );
}
