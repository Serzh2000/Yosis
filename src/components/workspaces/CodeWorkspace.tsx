import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import type { Project, SourceFile } from '../../../shared/types';
import { materializeCircuitProject } from '../../../shared/schematic';
import { PanelBoundary } from '../PanelBoundary';
import { ProjectSourceEditor, type EditorBindings } from './ProjectSourceEditor';
import { t } from '../../lib/i18n';

const HDL_FILE = /\.(v|sv|vh|svh)$/;

/** The Verilog that the designer's schematic turns into, or why it cannot be made yet. */
function generatedVerilog(project: Project): { name: string; text: string } | { message: string } {
  try {
    const file = materializeCircuitProject(project).files.find(
      (item) => item.name.endsWith('.v') && !project.files.some((own) => own.name === item.name),
    );
    return file ? { name: file.name, text: file.content } : { message: t('В проекте нет схемы.') };
  } catch (cause) {
    return { message: cause instanceof Error ? cause.message : t('Схему пока нельзя превратить в Verilog.') };
  }
}

/** Вкладка «Код»: редактор HDL-файла или Verilog, который конструктор собрал из схемы. */
export function CodeWorkspace({
  project,
  hdlSource,
  activeSource,
  editor,
  onOpenDesigner,
}: {
  project: Project;
  hdlSource: SourceFile | undefined;
  activeSource: SourceFile;
  editor: EditorBindings;
  onOpenDesigner: () => void;
}) {
  const generated = useMemo(() => (hdlSource ? null : generatedVerilog(project)), [hdlSource, project]);
  const [copied, setCopied] = useState(false);
  return (
    <div id="panel-code" role="tabpanel" aria-labelledby="tab-code" className="code-workspace">
      <div className="code-main">
        <PanelBoundary name="редактор" resetKey={project.id}>
          {hdlSource ? (
            <ProjectSourceEditor
              source={HDL_FILE.test(activeSource.name) ? activeSource : hdlSource}
              {...editor}
            />
          ) : (
            <div className="generated-verilog">
              <div className="generated-verilog-head">
                <div>
                  <h2>{t('Verilog из вашей схемы')}</h2>
                  <p>
                    {t('Только для чтения: он пересобирается при каждом изменении схемы. Чтобы изменить логику, правьте схему в конструкторе.')}
                  </p>
                </div>
                <div className="generated-verilog-actions">
                  {generated && 'text' in generated && (
                    <button
                      className="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(generated.text).then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1500);
                        });
                      }}
                    >
                      <Copy size={14} />
                      {copied ? t('Скопировано') : t('Копировать')}
                    </button>
                  )}
                  <button className="button primary" onClick={onOpenDesigner}>
                    {t('Открыть конструктор')}
                  </button>
                </div>
              </div>
              {generated && 'text' in generated ? (
                <pre className="generated-verilog-text" aria-label={`Сгенерированный ${generated.name}`}>
                  {generated.text}
                </pre>
              ) : (
                <p className="generated-verilog-empty">
                  {generated && 'message' in generated ? generated.message : ''}
                </p>
              )}
            </div>
          )}
        </PanelBoundary>
      </div>
    </div>
  );
}
