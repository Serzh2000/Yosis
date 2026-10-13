import { Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type * as monaco from 'monaco-editor/editor/editor.api.js';
import type { Diagnostic, Project, SourceFile } from '../../../shared/types';
import type { Theme } from '../../hooks/useTheme';
import { SourceEditor } from './lazy-panels';

/** Всё, что редактору исходника нужно от студии, кроме самого файла. */
export interface EditorBindings {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  syntaxAvailable: boolean;
  synthesisBusy: boolean;
  theme: Theme;
  saveState: 'saving' | 'saved' | 'error';
  diagnostics: Diagnostic[];
  onSelectLine: (file: string, line: number) => void;
  onMount: (sourceName: string, editor: monaco.editor.IStandaloneCodeEditor) => void;
}

/** Редактор одного файла проекта; его используют вкладки «Код» и «Выводы». */
export function ProjectSourceEditor({
  source,
  project,
  setProject,
  syntaxAvailable,
  synthesisBusy,
  theme,
  saveState,
  diagnostics,
  onSelectLine,
  onMount,
}: { source: SourceFile } & EditorBindings) {
  return (
    <Suspense
      fallback={
        <div className="editor-loading" role="status">
          Загрузка редактора…
        </div>
      }
    >
      <SourceEditor
        source={source}
        project={project}
        syntaxAvailable={syntaxAvailable}
        synthesisBusy={synthesisBusy}
        projectId={project.id!}
        theme={theme}
        saveState={saveState}
        diagnostics={diagnostics}
        onChange={(value) =>
          setProject((previous) => ({
            ...previous,
            files: previous.files.map((file) =>
              file.name === source.name ? { ...file, content: value } : file,
            ),
          }))
        }
        onSelectLine={(line) => onSelectLine(source.name, line)}
        onMount={(editor) => onMount(source.name, editor)}
      />
    </Suspense>
  );
}
