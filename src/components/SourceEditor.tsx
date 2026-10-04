import { useEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/editor/browser/coreCommands.js';
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard.js';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2.js';
import 'monaco-editor/editor/contrib/find/browser/findController.js';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js';
import 'monaco-editor/editor/contrib/folding/browser/folding.js';
import 'monaco-editor/editor/contrib/comment/browser/comment.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { FileCode2, LoaderCircle } from 'lucide-react';
import type { Diagnostic, Project, SourceFile } from '../../shared/types';
import { registerEditorLanguages } from '../lib/editor-languages';
import { useSyntaxCheck } from '../hooks/useSyntaxCheck';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
registerEditorLanguages(monaco);
monaco.editor.defineTheme('yosis-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'D9B6E9' },
    { token: 'number', foreground: 'E7C88D' },
    { token: 'comment', foreground: 'A7AD9F' },
    { token: 'identifier', foreground: 'E8E9E1' },
    { token: 'operator', foreground: 'BDD68D' },
    { token: 'string', foreground: 'B9CA98' },
  ],
  colors: {
    'editor.background': '#1c1e1a',
    'editor.foreground': '#e8e9e1',
    'editorLineNumber.foreground': '#959D8B',
    'editorLineNumber.activeForeground': '#b9c0af',
    'editor.lineHighlightBackground': '#262a22',
    'editor.selectionBackground': '#444e31',
    'editorCursor.foreground': '#c6dd96',
    'editorIndentGuide.background1': '#34392e',
    'editorGutter.background': '#1c1e1a',
    'editorWidget.background': '#252821',
  },
});
monaco.editor.defineTheme('yosis-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '8052A0' },
    { token: 'number', foreground: 'A66A23' },
    { token: 'comment', foreground: '626958' },
    { token: 'identifier', foreground: '34372F' },
    { token: 'operator', foreground: '60803A' },
    { token: 'string', foreground: '537642' },
  ],
  colors: {
    'editor.background': '#fffefb',
    'editor.foreground': '#34372f',
    'editorLineNumber.foreground': '#69715F',
    'editorLineNumber.activeForeground': '#68725b',
    'editor.lineHighlightBackground': '#f4f5ef',
    'editor.selectionBackground': '#e0e8cb',
    'editorCursor.foreground': '#617d36',
    'editorIndentGuide.background1': '#e7e8df',
    'editorGutter.background': '#fffefb',
    'editorWidget.background': '#f9f9f3',
  },
});

export function SourceEditor({
  source,
  project,
  syntaxAvailable,
  synthesisBusy,
  projectId,
  theme,
  saveState,
  diagnostics,
  onChange,
  onMount,
  onSelectLine,
}: {
  source: SourceFile;
  project: Project;
  syntaxAvailable: boolean;
  synthesisBusy: boolean;
  projectId: string;
  theme: 'dark' | 'light';
  saveState: 'saving' | 'saved' | 'error';
  diagnostics: Diagnostic[];
  onChange: (value: string) => void;
  onMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onSelectLine: (line: number) => void;
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [modelRevision, setModelRevision] = useState(0);
  const [position, setPosition] = useState({ line: 1, column: 1 });
  const syntax = useSyntaxCheck(
    project,
    syntaxAvailable && !source.name.endsWith('.cst'),
    synthesisBusy,
  );
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(
      model,
      'yosis',
      diagnostics
        .filter(
          (diagnostic) =>
            diagnostic.file === source.name ||
            diagnostic.file?.replaceAll('\\', '/').endsWith(`/${source.name}`),
        )
        .map((diagnostic) => ({
          severity:
            diagnostic.severity === 'error'
              ? monaco.MarkerSeverity.Error
              : monaco.MarkerSeverity.Warning,
          message: diagnostic.message,
          startLineNumber: Math.min(diagnostic.line || 1, model.getLineCount()),
          startColumn: 1,
          endLineNumber: Math.min(diagnostic.line || 1, model.getLineCount()),
          endColumn: model.getLineMaxColumn(Math.min(diagnostic.line || 1, model.getLineCount())),
        })),
    );
    monaco.editor.setModelMarkers(
      model,
      'yosis-syntax',
      syntax.diagnostics
        .filter(
          (diagnostic) =>
            diagnostic.file === source.name ||
            diagnostic.file?.replaceAll('\\', '/').endsWith(`/${source.name}`),
        )
        .map((diagnostic) => ({
          severity:
            diagnostic.severity === 'error'
              ? monaco.MarkerSeverity.Error
              : monaco.MarkerSeverity.Warning,
          message: diagnostic.message,
          startLineNumber: Math.min(diagnostic.line || 1, model.getLineCount()),
          startColumn: 1,
          endLineNumber: Math.min(diagnostic.line || 1, model.getLineCount()),
          endColumn: model.getLineMaxColumn(Math.min(diagnostic.line || 1, model.getLineCount())),
        })),
    );
  }, [diagnostics, source.name, syntax.diagnostics, modelRevision]);
  return (
    <section className="editor-pane" data-tour="editor">
      <div className="editor-tabs">
        <span className="editor-file-name">
          <FileCode2 size={14} />
          {source.name}
        </span>
        <span className="editor-language">
          {source.name.endsWith('.cst')
            ? 'Gowin CST'
            : /\.(sv|svh)$/.test(source.name)
              ? 'SystemVerilog'
              : 'Verilog'}
        </span>
      </div>
      <div className="editor-container">
        <Editor
          height="100%"
          language={source.name.endsWith('.cst') ? 'gowin-cst' : 'verilog'}
          theme={`yosis-${theme}`}
          path={`inmemory://yosis/${projectId}/${source.name}`}
          value={source.content}
          onChange={(value) => onChange(value ?? '')}
          loading={
            <div className="editor-loading">
              <LoaderCircle size={18} className="spin" />
              Загрузка редактора…
            </div>
          }
          onMount={(editor) => {
            editorRef.current = editor;
            onMount(editor);
            setModelRevision((value) => value + 1);
            editor.onDidChangeModel(() => setModelRevision((value) => value + 1));
            editor.onDidChangeCursorPosition((event) =>
              setPosition({ line: event.position.lineNumber, column: event.position.column }),
            );
            editor.onMouseDown((event) => {
              if (event.target.position) onSelectLine(event.target.position.lineNumber);
            });
          }}
          options={{
            // Use the mature textarea input path for consistent undo/paste across Chromium versions.
            editContext: false,
            fontFamily: '"Cascadia Code", Consolas, monospace',
            fontSize: 14,
            lineHeight: 25,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            overviewRulerLanes: 0,
          }}
        />
      </div>
      <div className="editor-status">
        <span>
          <span className={`status-dot ${saveState === 'saved' ? 'online' : 'pending'}`} />
          {saveState === 'saved'
            ? 'Автосохранено'
            : saveState === 'saving'
              ? 'Сохраняем…'
              : 'Ошибка сохранения'}
        </span>
        {!source.name.endsWith('.cst') && (
          <span role="status">
            {syntax.state === 'checking'
              ? 'Проверяем синтаксис…'
              : syntax.state === 'checked'
                ? syntax.diagnostics.some((item) => item.severity === 'error')
                  ? 'Проверьте ошибки в коде'
                  : 'Синтаксис проверен'
                : syntax.state === 'unavailable'
                  ? 'Проверка синтаксиса недоступна'
                  : ''}
          </span>
        )}
        <span>
          Строка {position.line} · столбец {position.column} · UTF-8
        </span>
      </div>
    </section>
  );
}
