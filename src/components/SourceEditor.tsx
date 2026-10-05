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
    { token: 'keyword', foreground: 'C9A8F0' },
    { token: 'number', foreground: 'F2A75E' },
    { token: 'comment', foreground: '8FA79B' },
    { token: 'identifier', foreground: 'EBF3ED' },
    { token: 'operator', foreground: '57C9A0' },
    { token: 'string', foreground: 'E8B93A' },
  ],
  colors: {
    'editor.background': '#0e211b',
    'editor.foreground': '#ebf3ed',
    'editorLineNumber.foreground': '#7d968a',
    'editorLineNumber.activeForeground': '#e8b93a',
    'editor.lineHighlightBackground': '#16312a',
    'editor.selectionBackground': '#2f5b4c',
    'editorCursor.foreground': '#e8b93a',
    'editorIndentGuide.background1': '#22463b',
    'editorGutter.background': '#0e211b',
    'editorWidget.background': '#14302a',
  },
});
monaco.editor.defineTheme('yosis-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '6B3FA0' },
    { token: 'number', foreground: '9A4F00' },
    { token: 'comment', foreground: '5C6F66' },
    { token: 'identifier', foreground: '12241D' },
    { token: 'operator', foreground: '0E6B4E' },
    { token: 'string', foreground: '7A5A00' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#12241d',
    'editorLineNumber.foreground': '#6c7f76',
    'editorLineNumber.activeForeground': '#0e6b4e',
    'editor.lineHighlightBackground': '#f1f5f2',
    'editor.selectionBackground': '#cfe6da',
    'editorCursor.foreground': '#0e6b4e',
    'editorIndentGuide.background1': '#e1e8e3',
    'editorGutter.background': '#ffffff',
    'editorWidget.background': '#f8faf8',
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
            fontFamily:
              '"JetBrains Mono Variable", "JetBrains Mono", "Cascadia Code", Consolas, monospace',
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
