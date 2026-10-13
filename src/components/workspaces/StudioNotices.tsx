import { ArrowRight, Circle, GraduationCap, RotateCcw, X } from 'lucide-react';
import type { SourceFile } from '../../../shared/types';
import type { StaleExampleCopy } from '../../lib/example-origin';
import type { LearningGuide } from '../../lib/learning-types';
import type { WorkTab } from '../../lib/studio-tabs';

/** Сообщения под навигацией: ошибки, информация, устаревший пример, отмена удаления, наставник. */
export function StudioNotices({
  workTab,
  error,
  healthError,
  pollError,
  saveFailed,
  storageError,
  onCloseError,
  onReconnect,
  info,
  onCloseInfo,
  staleExample,
  onOpenFreshExample,
  onDismissStaleExample,
  deletedFile,
  onRestoreFile,
  onCloseDeletedFile,
  learningGuide,
  onBackToLesson,
  onHideGuide,
}: {
  workTab: WorkTab;
  error: string;
  healthError: string;
  pollError: string;
  saveFailed: boolean;
  storageError: string;
  onCloseError: () => void;
  onReconnect: () => void;
  info: string;
  onCloseInfo: () => void;
  staleExample: StaleExampleCopy | null;
  onOpenFreshExample: () => void;
  onDismissStaleExample: () => void;
  deletedFile: SourceFile | null;
  onRestoreFile: () => void;
  onCloseDeletedFile: () => void;
  learningGuide: LearningGuide | null;
  onBackToLesson: () => void;
  onHideGuide: () => void;
}) {
  return (
    <>
      {(error || healthError || pollError || saveFailed) && (
        <div className="notice error-notice" role="alert">
          <Circle size={12} />
          <span>
            {error ||
              (healthError
                ? `Сервис сборки недоступен: ${healthError}`
                : pollError
                  ? `Связь со сборкой прервана: ${pollError} Повторяем подключение…`
                  : storageError || 'Не удалось сохранить проект в браузере.')}
          </span>
          {healthError && (
            <button onClick={onReconnect}>
              <RotateCcw size={13} />
              Подключиться
            </button>
          )}
          {error && (
            <button className="notice-close" aria-label="Закрыть сообщение" onClick={onCloseError}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {info && (
        <div className="notice" role="status">
          <span>{info}</span>
          <button className="notice-close" aria-label="Закрыть сообщение" onClick={onCloseInfo}>
            <X size={14} />
          </button>
        </div>
      )}
      {staleExample && (
        <div className="notice" role="status" data-testid="stale-example-notice">
          <span>
            {staleExample.certainty === 'guess' ? 'Похоже, это копия' : 'Это копия'} примера «
            {staleExample.example.title}», а в библиотеке пример с тех пор исправлен. Ваш проект не
            изменён.
          </span>
          <button onClick={onOpenFreshExample}>Открыть свежую копию</button>
          <button
            className="notice-close"
            aria-label="Скрыть напоминание об обновлении примера"
            onClick={onDismissStaleExample}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {deletedFile && (
        <div className="notice undo-notice">
          <span>Файл {deletedFile.name} удалён.</span>
          <button onClick={onRestoreFile}>
            <RotateCcw size={13} />
            Восстановить
          </button>
          <button
            className="notice-close"
            aria-label="Закрыть сообщение об удалении"
            onClick={onCloseDeletedFile}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {learningGuide && workTab !== 'lessons' && (
        <aside className="learning-tutor-dock" aria-label="Наставник">
          <GraduationCap size={18} />
          <div>
            <strong>{learningGuide.title}</strong>
            <span title={learningGuide.tip}>{learningGuide.tip}</span>
          </div>
          <button className="button subtle" onClick={onBackToLesson}>
            Вернуться к уроку
            <ArrowRight size={13} />
          </button>
          <button className="icon-button" aria-label="Скрыть наставника" onClick={onHideGuide}>
            <X size={13} />
          </button>
        </aside>
      )}
    </>
  );
}
