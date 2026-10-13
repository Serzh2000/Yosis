import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type * as monaco from 'monaco-editor/editor/editor.api.js';
import type { Project } from '../../shared/types';
import type { WorkTab } from '../lib/studio-tabs';

export type HighlightedSource = { file: string; line: number };

/**
 * Имя файла проекта, которому соответствует путь из журнала или схемы. Пути могут быть полными
 * (`/work/rtl/alu.v`) или с обратными слэшами; файлы вне проекта (`/share/…`) не открываются.
 */
export function resolveSourceName(
  files: readonly { name: string }[],
  file: string,
): string | undefined {
  const normalized = file.replaceAll('\\', '/');
  return files.find((source) => source.name === file || normalized.endsWith(`/${source.name}`))
    ?.name;
}
export function canNavigateTo(files: readonly { name: string }[], file: string): boolean {
  const normalized = file.replaceAll('\\', '/');
  return (
    !normalized.startsWith('/share/') &&
    files.some((source) => source.name === normalized || normalized.endsWith(`/${source.name}`))
  );
}

/**
 * Переход «элемент схемы или строка журнала -> строка кода»: открывает вкладку и файл, подсвечивает
 * строку и прокручивает редактор. Если редактор ещё не смонтирован, строка запоминается и
 * показывается при монтировании.
 */
export function useSourceNavigation({
  projectRef,
  setWorkTab,
  setActiveFile,
  onError,
}: {
  projectRef: RefObject<Project>;
  setWorkTab: (tab: WorkTab) => void;
  setActiveFile: (name: string) => void;
  onError: (message: string) => void;
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pendingNavigation = useRef<HighlightedSource | null>(null);
  const [highlightedSource, setHighlightedSource] = useState<HighlightedSource>();

  const canNavigateSource = useCallback(
    (file: string) => canNavigateTo(projectRef.current.files, file),
    [projectRef],
  );

  const navigateSource = useCallback(
    (file: string, line: number) => {
      const sourceName = resolveSourceName(projectRef.current.files, file);
      if (!sourceName) {
        onError(`Исходник ${file} отсутствует в текущем проекте.`);
        return;
      }
      pendingNavigation.current = { file: sourceName, line };
      setWorkTab(sourceName.endsWith('.cst') ? 'constraints' : 'code');
      setActiveFile(sourceName);
      setHighlightedSource({ file: sourceName, line });
      window.setTimeout(() => {
        editorRef.current?.revealLineInCenter(line);
        editorRef.current?.setPosition({ lineNumber: line, column: 1 });
        editorRef.current?.focus();
      }, 50);
    },
    [projectRef, setWorkTab, setActiveFile, onError],
  );

  /** Редактор файла смонтирован: показать отложенную строку, если она относится к этому файлу. */
  const mountEditor = useCallback(
    (sourceName: string, editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      if (pendingNavigation.current?.file === sourceName) {
        const line = pendingNavigation.current.line;
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.revealLineInCenter(line);
        pendingNavigation.current = null;
      }
    },
    [],
  );
  const selectLine = useCallback(
    (file: string, line: number) => setHighlightedSource({ file, line }),
    [],
  );
  const clearHighlight = useCallback(() => setHighlightedSource(undefined), []);

  return {
    highlightedSource,
    canNavigateSource,
    navigateSource,
    mountEditor,
    selectLine,
    clearHighlight,
  };
}
