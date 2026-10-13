import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '../../shared/types';
import {
  deleteProject,
  duplicateProject,
  getProjectSnapshot,
  identifyProject,
  listProjects,
  loadProject,
  renameProject,
  saveProject,
} from '../lib/projects';
import type { ProjectSummary } from '../lib/projects';
import { starterProject } from '../lib/starter-project';

export function useProjectStore(initialId?: string) {
  const initialProjectId = useRef(initialId).current;
  const [project, setProject] = useState<Project>(() => identifyProject(starterProject(), true));
  const [savedProjects, setSavedProjects] = useState<ProjectSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved');
  const [storageError, setStorageError] = useState('');
  const projectRef = useRef(project);
  const writeQueue = useRef(Promise.resolve());
  projectRef.current = project;
  // The same snapshot is used by synthesis, missions and physical build freshness.
  const projectSnapshot = useMemo(() => getProjectSnapshot(project), [project]);

  useEffect(() => {
    let disposed = false;
    void Promise.all([loadProject(initialProjectId), listProjects()])
      .then(([current, library]) => {
        if (disposed) return;
        setProject(current);
        setSavedProjects(library);
        setStorageError('');
        setReady(true);
      })
      .catch(async (cause) => {
        if (disposed) return;
        setStorageError(
          cause instanceof Error ? cause.message : 'Не удалось открыть сохранённые проекты.',
        );
        // A link may refer to another browser. Preserve this browser's selected project.
        if (initialProjectId) {
          try {
            const current = await loadProject();
            if (!disposed) setProject(current);
          } catch {
            /* The editor still opens with a fresh example. */
          }
        }
        if (!disposed) {
          setSaveState('error');
          setReady(true);
        }
      });
    return () => {
      disposed = true;
    };
  }, [initialProjectId]);

  const flushSave = useCallback((value = projectRef.current): Promise<Project> => {
    setSaveState('saving');
    const write = writeQueue.current.catch(() => {}).then(() => saveProject(value));
    writeQueue.current = write.then(
      () => {},
      () => {},
    );
    return write
      .then((saved) => {
        setSavedProjects((previous) => [
          {
            id: saved.id!,
            name: saved.name,
            top: saved.top,
            fileCount: saved.files.length,
            updatedAt: Date.now(),
          },
          ...previous.filter((item) => item.id !== saved.id),
        ]);
        if (projectRef.current === value) {
          setSaveState('saved');
          setStorageError('');
        }
        return saved;
      })
      .catch((cause) => {
        if (projectRef.current === value) {
          setSaveState('error');
          setStorageError(cause instanceof Error ? cause.message : 'Не удалось сохранить проект.');
        }
        throw cause;
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      void flushSave(project).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [project, ready, flushSave]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      void flushSave().catch(() => {});
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [ready, flushSave]);

  const remove = useCallback(async (id: string) => {
    await writeQueue.current;
    await deleteProject(id);
    setSavedProjects((previous) => previous.filter((item) => item.id !== id));
  }, []);
  const duplicate = useCallback(async (id: string, name: string) => {
    await writeQueue.current;
    const copy = await duplicateProject(id, name);
    setSavedProjects(await listProjects());
    return copy;
  }, []);
  const rename = useCallback(async (id: string, name: string) => {
    await writeQueue.current;
    const renamed = await renameProject(id, name);
    setSavedProjects((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, name: renamed.name, updatedAt: Date.now() } : item,
      ),
    );
  }, []);
  return {
    project,
    setProject,
    projectRef,
    projectSnapshot,
    savedProjects,
    ready,
    saveState,
    storageError,
    flushSave,
    remove,
    duplicate,
    rename,
  };
}
