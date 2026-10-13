import { Suspense } from 'react';
import type { Project } from '../../../shared/types';
import type { useServerSession } from '../../hooks/useServerSession';
import { identifyProject } from '../../lib/projects';
import { ServerLoginDialog } from '../ServerLoginDialog';
import { ServerSyncDialog } from './lazy-panels';

type Session = ReturnType<typeof useServerSession>;

/** Вход на сервер и окно синхронизации проектов и прогресса курса. */
export function ServerDialogs({
  loginOpen,
  syncOpen,
  server,
  project,
  busy,
  onCloseLogin,
  onCloseSync,
  onLoggedIn,
  onCourseRestore,
  openProject,
}: {
  loginOpen: boolean;
  syncOpen: boolean;
  server: Pick<Session, 'session' | 'login' | 'logout'>;
  project: Project;
  busy: boolean;
  onCloseLogin: () => void;
  onCloseSync: () => void;
  onLoggedIn: () => Promise<unknown>;
  onCourseRestore: () => void;
  openProject: (project: Project) => Promise<void>;
}) {
  const { session, login, logout } = server;
  return (
    <>
      {loginOpen && (
        <ServerLoginDialog
          onClose={onCloseLogin}
          onLogin={async (token) => {
            await login(token);
            await onLoggedIn();
          }}
        />
      )}
      {syncOpen && session && (
        <Suspense fallback={null}>
          <ServerSyncDialog
            project={project}
            user={session.guest ? 'Гость этого браузера' : session.user}
            canLogout={!session.local && !session.guest && !busy}
            onClose={onCloseSync}
            onLogout={logout}
            onCourseRestore={onCourseRestore}
            onOpenCopy={(next) => openProject(identifyProject(next, true))}
          />
        </Suspense>
      )}
    </>
  );
}
