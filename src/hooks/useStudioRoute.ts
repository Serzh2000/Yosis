import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Project } from '../../shared/types';
import { loadProject } from '../lib/projects';
import { readStudioRoute, studioUrl } from '../lib/studio-route';
import type { WorkTab } from '../lib/studio-tabs';

type StudioRoute = ReturnType<typeof readStudioRoute>;

/**
 * Вкладка, урок и проект в адресной строке: `replaceState` при смене вкладки и `popstate` при
 * переходах «назад»/«вперёд». `visited` запоминает открытые вкладки, чтобы тяжёлые панели
 * монтировались при первом посещении и не выгружались потом.
 */
export function useStudioRoute({
  initialRoute,
  ready,
  projectId,
  projectRef,
  openProject,
  onError,
}: {
  initialRoute: StudioRoute;
  ready: boolean;
  projectId: string | undefined;
  projectRef: RefObject<Project>;
  /** Переход «назад» к другому проекту открывает его через общий путь смены проекта. */
  openProject: (project: Project) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [workTab, setWorkTab] = useState<WorkTab>(initialRoute.tab);
  const [lessonId, setLessonId] = useState(initialRoute.lessonId);
  const [visited, setVisited] = useState<Set<WorkTab>>(() => new Set([initialRoute.tab]));
  useEffect(() => {
    setVisited((previous) => (previous.has(workTab) ? previous : new Set([...previous, workTab])));
    if (ready)
      window.history.replaceState(
        null,
        '',
        studioUrl(window.location.href, workTab, projectId, lessonId),
      );
  }, [workTab, projectId, ready, lessonId]);
  useEffect(() => {
    const restore = () => {
      const route = readStudioRoute(window.location.href);
      setLessonId(route.lessonId);
      if (route.projectId && route.projectId !== projectRef.current.id) {
        void loadProject(route.projectId)
          .then((next) => openProject(next))
          .then(() => setWorkTab(route.tab))
          .catch((cause) => onError(cause.message));
      } else setWorkTab(route.tab);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [ready, openProject, projectRef, onError]);
  return { workTab, setWorkTab, lessonId, setLessonId, visited };
}
