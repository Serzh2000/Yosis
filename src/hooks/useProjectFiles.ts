import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { Project, SourceFile } from '../../shared/types';
import { starterCircuit } from '../../shared/schematic';
import { planSchematicAddition } from '../lib/circuit-add';
import { canDeleteFile, newFileContent, workTabForFile } from '../lib/file-templates';
import { cloneProject, validateProject } from '../lib/projects';
import type { WorkTab } from '../lib/studio-tabs';

export type FileDialogState = {
  kind: 'add' | 'rename';
  value: string;
  target?: string;
} | null;

const HDL_FILE = /\.(v|sv|vh|svh)$/;

/**
 * Файлы открытого проекта: активный файл и его согласование с вкладкой, диалог создания и
 * переименования, удаление с отменой, добавление схемы.
 */
export function useProjectFiles({
  project,
  setProject,
  ready,
  workTab,
  setWorkTab,
  onError,
  closeProjectHub,
}: {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  ready: boolean;
  workTab: WorkTab;
  setWorkTab: (tab: WorkTab) => void;
  onError: (message: string) => void;
  closeProjectHub: () => void;
}) {
  const [activeFile, setActiveFile] = useState(() => project.files[0].name);
  // The file list opens only when the pupil asks for it.
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [fileDialog, setFileDialog] = useState<FileDialogState>(null);
  const [fileError, setFileError] = useState('');
  const [deletedFile, setDeletedFile] = useState<SourceFile | null>(null);

  const activeSource = project.files.find((file) => file.name === activeFile) || project.files[0];
  const constraintsFiles = project.files.filter((file) => file.name.endsWith('.cst'));
  const constraintsSource =
    constraintsFiles.find((file) => file.name === activeFile) || constraintsFiles[0];
  const circuitSource =
    project.files.find((file) => file.name === activeFile && file.name.endsWith('.ysch')) ??
    project.files.find((file) => file.name.endsWith('.ysch'));
  const hdlSource = project.files.find((file) => HDL_FILE.test(file.name));
  const usesProjectFiles = workTab === 'code' || workTab === 'constraints';
  const schematicPlan = useMemo(() => planSchematicAddition(project), [project]);

  useEffect(() => {
    if (ready && !project.files.some((file) => file.name === activeFile))
      setActiveFile(project.files[0].name);
  }, [ready, project.files, activeFile]);

  // Вкладка и активный файл согласованы: у каждой вкладки свой тип файла.
  useEffect(() => {
    if (workTab === 'constraints' && constraintsSource && activeFile !== constraintsSource.name)
      setActiveFile(constraintsSource.name);
    if (workTab === 'code' && !HDL_FILE.test(activeSource.name) && hdlSource)
      setActiveFile(hdlSource.name);
    if (workTab === 'design' && circuitSource && activeFile !== circuitSource.name)
      setActiveFile(circuitSource.name);
  }, [
    workTab,
    activeFile,
    constraintsSource,
    activeSource.name,
    project.files,
    hdlSource,
    circuitSource,
  ]);

  const openFile = (file: SourceFile) => {
    setActiveFile(file.name);
    setWorkTab(workTabForFile(file.name));
    if (window.matchMedia('(max-width: 900px)').matches) setFileManagerOpen(false);
  };

  const openAddDialog = () => {
    setFileDialog({ kind: 'add', value: 'module.v' });
    setFileError('');
  };
  const openRenameDialog = (file: SourceFile) => {
    setFileDialog({ kind: 'rename', value: file.name, target: file.name });
    setFileError('');
  };
  const closeFileDialog = useCallback(() => setFileDialog(null), []);
  const changeFileDialogValue = (value: string) =>
    setFileDialog((current) => (current ? { ...current, value } : current));

  const submitFile = (event: FormEvent) => {
    event.preventDefault();
    if (!fileDialog) return;
    const name = fileDialog.value.trim();
    const next = cloneProject(project);
    if (fileDialog.kind === 'rename')
      next.files = next.files.map((file) =>
        file.name === fileDialog.target ? { ...file, name } : file,
      );
    else next.files.push({ name, content: newFileContent(name) });
    try {
      validateProject(next);
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : 'Некорректное имя файла.');
      return;
    }
    setProject(next);
    setActiveFile(name);
    setWorkTab(workTabForFile(name));
    setFileDialog(null);
    setFileError('');
  };

  const addSchematic = () => {
    const plan = planSchematicAddition(project);
    if (!plan.ok) return;
    const next = cloneProject(project);
    next.files.push({ name: plan.fileName, content: JSON.stringify(starterCircuit(), null, 2) });
    try {
      validateProject(next);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Не удалось добавить схему.');
      return;
    }
    setProject(next);
    setActiveFile(plan.fileName);
    setWorkTab('design');
  };

  const deleteFile = (target = activeSource) => {
    if (!canDeleteFile(project.files, target)) return;
    setDeletedFile(target);
    const files = project.files.filter((file) => file.name !== target.name);
    setProject({ ...project, files });
    if (target.name === activeFile) {
      const replacement = files[Math.min(project.files.indexOf(target), files.length - 1)];
      setActiveFile(replacement.name);
      if (
        (workTab === 'code' || workTab === 'constraints' || workTab === 'design') &&
        !(workTab === 'constraints' && !files.some((file) => file.name.endsWith('.cst')))
      )
        setWorkTab(workTabForFile(replacement.name));
    }
  };

  const restoreDeletedFile = () => {
    if (!deletedFile) return;
    try {
      const restored = validateProject({ ...project, files: [...project.files, deletedFile] });
      setProject(restored);
      openFile(deletedFile);
      closeProjectHub();
      setDeletedFile(null);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Не удалось восстановить файл.');
    }
  };

  return {
    activeFile,
    setActiveFile,
    activeSource,
    constraintsFiles,
    constraintsSource,
    circuitSource,
    hdlSource,
    usesProjectFiles,
    schematicPlan,
    fileManagerOpen,
    setFileManagerOpen,
    fileDialog,
    fileError,
    deletedFile,
    clearDeletedFile: () => setDeletedFile(null),
    openFile,
    openAddDialog,
    openRenameDialog,
    closeFileDialog,
    changeFileDialogValue,
    submitFile,
    addSchematic,
    deleteFile,
    restoreDeletedFile,
  };
}
