import { useEffect, useState } from 'react';
import type { Project } from '../../shared/types';
import { Dialog } from './Dialog';
import {
  downloadCourse,
  removeServerProject,
  restoreCourse,
  serverProject,
  serverProjects,
  uploadCourse,
  uploadProject,
} from '../lib/server-sync';
import type { CourseBackup, ServerProjectSummary } from '../lib/server-sync';
import { t } from '../lib/i18n';

export function ServerSyncDialog({
  project,
  user,
  onClose,
  onOpenCopy,
  onCourseRestore,
  onLogout,
  canLogout,
}: {
  project: Project;
  user: string;
  onClose: () => void;
  onOpenCopy: (project: Project) => Promise<void>;
  onCourseRestore: () => void;
  onLogout: () => Promise<void>;
  canLogout: boolean;
}) {
  const [projects, setProjects] = useState<ServerProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<'upload' | 'course-upload' | 'course-restore' | null>(
    null,
  );
  const [course, setCourse] = useState<CourseBackup | null>(null);
  const [deleting, setDeleting] = useState<ServerProjectSummary | null>(null);
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('Не удалось обменяться данными с сервером.'),
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let live = true;
    setBusy(true);
    void serverProjects()
      .then((value) => {
        if (live) setProjects(value);
      })
      .catch((cause) => {
        if (live) setError(cause.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [user]);
  const remote = projects.find((item) => item.id === project.id);
  return (
    <Dialog
      title={t('Проекты и прогресс на сервере')}
      className="dialog project-library-dialog"
      onClose={onClose}
      closeDisabled={busy}
      busy={busy}
    >
      <p>
        {t(
          t('Участник: {user}. Вы выбираете, что сохранить на сервере. Локальные проекты из этого браузера доступны отдельно.'),
          { user },
        )}
      </p>
      {confirm || deleting ? (
        <section>
          <h3>
            {deleting
              ? t('Удалить «{name}» с сервера?', { name: deleting.name })
              : confirm === 'upload'
                ? t('Обновить серверную версию «{name}»?', { name: remote?.name ?? '' })
                : confirm === 'course-upload'
                  ? t('Сохранить текущий прогресс курса?')
                  : t('Восстановить прогресс курса с сервера?')}
          </h3>
          <p>
            {confirm === 'course-restore'
              ? t('Текущий прогресс и черновики уроков в этом браузере будут заменены выбранной серверной копией.')
              : confirm === 'course-upload'
                ? t('Серверная копия прогресса будет заменена текущими результатами и черновиками этого браузера.')
                : deleting
                  ? t('Локальная копия останется в браузере.')
                  : t('На сервер будут записаны текущие исходники. Изменения других сеансов проверяются перед записью.')}
          </p>
          <div className="dialog-actions">
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => {
                setConfirm(null);
                setDeleting(null);
                setCourse(null);
              }}
            >
              {t('Отмена')}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (deleting) {
                    await removeServerProject(deleting.id);
                    setProjects((previous) => previous.filter((item) => item.id !== deleting.id));
                    setDeleting(null);
                  } else if (confirm === 'upload') {
                    await uploadProject(project, remote?.revision);
                    setProjects(await serverProjects());
                    setMessage(t('Проект сохранён на сервере.'));
                  } else if (confirm === 'course-upload') {
                    await uploadCourse();
                    setMessage(t('Прогресс курса сохранён на сервере.'));
                  } else if (course) {
                    restoreCourse(course);
                    onCourseRestore();
                    setMessage(t('Прогресс курса восстановлен.'));
                  }
                  setConfirm(null);
                  setCourse(null);
                })
              }
            >
              {deleting
                ? t('Удалить с сервера')
                : confirm === 'course-restore'
                  ? t('Восстановить')
                  : t('Сохранить')}
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="dialog-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                remote
                  ? setConfirm('upload')
                  : void run(async () => {
                      await uploadProject(project);
                      setProjects(await serverProjects());
                      setMessage(t('Проект сохранён на сервере.'));
                    })
              }
            >
              {t('Сохранить «{name}» на сервере', { name: project.name })}
            </button>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setProjects(await serverProjects());
                  setMessage(t('Список обновлён.'));
                })
              }
            >
              {t('Обновить список')}
            </button>
          </div>
          <div className="saved-project-list">
            {projects.map((item) => (
              <div className="saved-project-row" key={item.id}>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await onOpenCopy((await serverProject(item.id)).project);
                      onClose();
                    })
                  }
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{t('{top} · Открыть локальную копию', { top: item.top })}</small>
                  </span>
                </button>
                <button className="button subtle" disabled={busy} onClick={() => setDeleting(item)}>
                  {t('Удалить с сервера')}
                </button>
              </div>
            ))}
            {!projects.length && <p>{t('Серверная библиотека пока пуста.')}</p>}
          </div>
          <h3>{t('Обучение')}</h3>
          <div className="dialog-actions">
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => setConfirm('course-upload')}
            >
              {t('Сохранить прогресс курса')}
            </button>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setCourse(await downloadCourse());
                  setConfirm('course-restore');
                })
              }
            >
              {t('Восстановить прогресс курса')}
            </button>
          </div>
        </>
      )}
      {error && (
        <div className="dialog-error" role="alert">
          {error}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <div className="dialog-actions">
        {canLogout && (
          <button
            className="button subtle"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await onLogout();
                onClose();
              })
            }
          >
            {t('Завершить сеанс')}
          </button>
        )}
        <button className="button primary" disabled={busy} onClick={onClose}>
          {t('Закрыть')}
        </button>
      </div>
    </Dialog>
  );
}
