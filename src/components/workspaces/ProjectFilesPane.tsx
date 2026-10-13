import type { Dispatch, SetStateAction } from 'react';
import type { Project } from '../../../shared/types';
import type { useProjectFiles } from '../../hooks/useProjectFiles';
import { ProjectFiles } from '../ProjectFiles';

/** Дерево файлов на вкладках «Код» и «Выводы» и затемнение под ним на узких экранах. */
export function ProjectFilesPane({
  project,
  setProject,
  files,
}: {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  files: ReturnType<typeof useProjectFiles>;
}) {
  return (
    <>
      <button
        className="files-overlay-backdrop"
        aria-label="Закрыть дерево файлов"
        onClick={() => files.setFileManagerOpen(false)}
      />
      <ProjectFiles
        project={project}
        activeFile={files.activeFile}
        onOpen={files.openFile}
        onAdd={files.openAddDialog}
        onRename={files.openRenameDialog}
        onDelete={files.deleteFile}
        onTopChange={(top) => setProject((previous) => ({ ...previous, top }))}
        onClose={() => files.setFileManagerOpen(false)}
      />
    </>
  );
}
