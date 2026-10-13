import { useCallback, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Project } from '../../shared/types';
import { identifyProject } from '../lib/projects';

export type OpenProject = (next: Project, savePrevious?: boolean) => Promise<void>;

/**
 * Единственный путь смены открытого проекта: сохраняет прежний, сбрасывает сборку и вызывает
 * `onOpened`, где студия сбрасывает свои выборы. Во время синтеза проект не меняется.
 */
export function useProjectSwitch({
  busyRef,
  flushSave,
  resetBuild,
  setProject,
  invalidatePendingImports,
  onOpened,
  onError,
}: {
  busyRef: RefObject<boolean>;
  flushSave: () => Promise<unknown>;
  resetBuild: () => void;
  setProject: Dispatch<SetStateAction<Project>>;
  invalidatePendingImports: () => void;
  /** Вызывается после установки нового проекта; должна быть стабильной (useCallback). */
  onOpened: (project: Project) => void;
  onError: (message: string) => void;
}) {
  /** Растёт при каждой смене проекта: панели диаграмм начинают с чистого листа. */
  const [projectSession, setProjectSession] = useState(0);
  const openProject = useCallback<OpenProject>(
    async (next, savePrevious = true) => {
      if (busyRef.current) return;
      invalidatePendingImports();
      if (savePrevious) {
        try {
          await flushSave();
        } catch (cause) {
          onError(
            cause instanceof Error ? cause.message : 'Сохранение текущего проекта недоступно.',
          );
          return;
        }
      }
      const identified = identifyProject(next);
      resetBuild();
      setProject(identified);
      setProjectSession((value) => value + 1);
      onOpened(identified);
      onError('');
    },
    [busyRef, invalidatePendingImports, flushSave, resetBuild, setProject, onOpened, onError],
  );
  return { openProject, projectSession };
}
