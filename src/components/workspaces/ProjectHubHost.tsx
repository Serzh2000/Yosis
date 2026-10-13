import { Suspense } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { BuildResult, Project } from '../../../shared/types';
import type { useProjectStore } from '../../hooks/useProjectStore';
import { identifyProject, loadProject, validateProject } from '../../lib/projects';
import { starterProject } from '../../lib/starter-project';
import { ProjectHub } from './lazy-panels';

type Store = ReturnType<typeof useProjectStore>;

/** Окно проектов: создание, открытие, переименование, копия и удаление проектов библиотеки. */
export function ProjectHubHost({
  store,
  setProject,
  busyRef,
  build,
  buildFresh,
  initialStart,
  serverLabel,
  openProject,
  onServer,
  onClose,
  onImport,
  onImportFolder,
}: {
  store: Pick<
    Store,
    'project' | 'projectRef' | 'savedProjects' | 'flushSave' | 'remove' | 'duplicate' | 'rename'
  >;
  setProject: Dispatch<SetStateAction<Project>>;
  busyRef: RefObject<boolean>;
  build: BuildResult | null;
  buildFresh: boolean;
  initialStart: string | undefined;
  serverLabel: string;
  openProject: (project: Project, savePrevious?: boolean) => Promise<void>;
  onServer: () => void;
  onClose: () => void;
  onImport: () => void;
  onImportFolder: () => void;
}) {
  const { project, projectRef, savedProjects, flushSave, remove, duplicate, rename } = store;
  return (
    <Suspense fallback={null}>
      <ProjectHub
        project={project}
        projects={savedProjects}
        build={build}
        buildFresh={buildFresh}
        initialStart={initialStart}
        serverLabel={serverLabel}
        onServer={onServer}
        onClose={onClose}
        onCreate={async (next) => {
          if (busyRef.current) throw new Error('Дождитесь окончания синтеза.');
          await flushSave();
          const identified = identifyProject(next, true);
          await flushSave(identified);
          await openProject(identified, false);
        }}
        onOpen={async (id) => {
          await openProject(await loadProject(id));
        }}
        onImport={onImport}
        onImportFolder={onImportFolder}
        onSave={async () => {
          await flushSave();
        }}
        onRename={async (id, name) => {
          if (id === projectRef.current.id) {
            const next = validateProject({ ...projectRef.current, name });
            await flushSave(next);
            setProject(next);
          } else {
            await rename(id, name);
          }
        }}
        onDuplicate={async (id, name) => {
          await flushSave();
          await openProject(await duplicate(id, name), false);
        }}
        onDelete={async (id) => {
          await flushSave();
          await remove(id);
          if (projectRef.current.id === id)
            await openProject(identifyProject(starterProject(), true), false);
        }}
      />
    </Suspense>
  );
}
