import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Project } from '../../shared/types';
import {
  IMPORTED_FILE,
  gowinProjects,
  projectFromFolder,
  type FolderFile,
} from '../lib/gowin-import';
import { identifyProject, validateProject } from '../lib/projects';

export type FolderChoice = {
  files: FolderFile[];
  projects: { path: string; title: string }[];
};

const MAX_PROJECT_FILE_BYTES = 3 * 1024 * 1024;
const MAX_IMPORTED_FILE_BYTES = 512 * 1024;
const MAX_IMPORTED_FILES = 400;

/**
 * Импорт проекта из файла JSON и из папки проекта Gowin. Выбор проекта нумеруется: если за время
 * чтения файлов ученик открыл другой проект, устаревший импорт молча отбрасывается.
 */
export function useProjectImport({
  openProject,
  busyRef,
  onError,
}: {
  openProject: (project: Project) => Promise<void>;
  busyRef: RefObject<boolean>;
  onError: (message: string) => void;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement | null>(null);
  const [folderChoice, setFolderChoice] = useState<FolderChoice | null>(null);
  const selectionGeneration = useRef(0);

  /** Любой другой выбор проекта делает незавершённый импорт устаревшим. */
  const invalidatePendingImports = useCallback(() => {
    selectionGeneration.current += 1;
  }, []);

  const importProject = async (file: File | undefined) => {
    if (!file || busyRef.current) return;
    const generation = ++selectionGeneration.current;
    try {
      if (file.size > MAX_PROJECT_FILE_BYTES) throw new Error('Файл проекта превышает 3 МБ.');
      const next = validateProject(JSON.parse(await file.text()));
      if (generation !== selectionGeneration.current || busyRef.current) return;
      void openProject(identifyProject(next, true));
    } catch (cause) {
      if (generation === selectionGeneration.current)
        onError(cause instanceof Error ? cause.message : 'Не удалось открыть проект.');
    }
    if (importRef.current) importRef.current.value = '';
  };

  /** A folder with a project of the vendor's IDE (or just Verilog files) picked by the pupil. */
  const importFolder = async (list: FileList | null) => {
    if (!list?.length || busyRef.current) return;
    const generation = ++selectionGeneration.current;
    try {
      const wanted = [...list].filter(
        (file) => IMPORTED_FILE.test(file.name) && file.size <= MAX_IMPORTED_FILE_BYTES,
      );
      if (wanted.length > MAX_IMPORTED_FILES)
        throw new Error('В папке слишком много файлов. Выберите папку одного проекта.');
      const files = await Promise.all(
        wanted.map(async (file) => ({
          path: file.webkitRelativePath || file.name,
          text: await file.text(),
        })),
      );
      const found = gowinProjects(files);
      if (generation !== selectionGeneration.current || busyRef.current) return;
      // A folder of several projects: the pupil says which one.
      if (found.length > 1) setFolderChoice({ files, projects: found });
      else void openProject(identifyProject(validateProject(projectFromFolder(files)), true));
    } catch (cause) {
      if (generation === selectionGeneration.current)
        onError(cause instanceof Error ? cause.message : 'Не удалось открыть папку проекта.');
    }
    if (folderRef.current) folderRef.current.value = '';
  };

  /** Ученик выбрал один из нескольких проектов папки. */
  const chooseFolderProject = (path: string) => {
    if (!folderChoice) return;
    const { files } = folderChoice;
    setFolderChoice(null);
    try {
      void openProject(identifyProject(validateProject(projectFromFolder(files, path)), true));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Не удалось открыть проект.');
    }
  };

  return {
    importRef,
    folderRef,
    folderChoice,
    closeFolderChoice: () => setFolderChoice(null),
    importProject,
    importFolder,
    chooseFolderProject,
    invalidatePendingImports,
    pickProjectFile: () => importRef.current?.click(),
    pickProjectFolder: () => folderRef.current?.click(),
  };
}
