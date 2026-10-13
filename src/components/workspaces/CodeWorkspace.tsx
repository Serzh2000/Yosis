import type { Project, SourceFile } from '../../../shared/types';
import { PanelBoundary } from '../PanelBoundary';
import { ProjectSourceEditor, type EditorBindings } from './ProjectSourceEditor';

const HDL_FILE = /\.(v|sv|vh|svh)$/;

/** Вкладка «Код»: редактор HDL-файла или приглашение в конструктор для проекта-схемы. */
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
            <div className="empty-workspace">
              <h2>Этот проект описан схемой</h2>
              <p>Verilog создаётся автоматически из .ysch при сборке.</p>
              <button className="button primary" onClick={onOpenDesigner}>
                Открыть конструктор
              </button>
            </div>
          )}
        </PanelBoundary>
      </div>
    </div>
  );
}
