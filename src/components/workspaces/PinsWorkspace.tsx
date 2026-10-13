import { Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BuildResult, Project, SourceFile } from '../../../shared/types';
import { hasSameHdlSources } from '../../lib/pin-planner';
import { PanelBoundary } from '../PanelBoundary';
import { PinPlanner } from './lazy-panels';
import { ProjectSourceEditor, type EditorBindings } from './ProjectSourceEditor';

/** Вкладка «Выводы»: планировщик выводов; редактор .cst передаётся ему как render-prop. */
export function PinsWorkspace({
  project,
  setProject,
  build,
  buildSnapshot,
  busy,
  onSynthesize,
  constraintsSource,
  plannerSignal,
  editor,
}: {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  build: BuildResult | null;
  buildSnapshot: string;
  busy: boolean;
  onSynthesize: () => void;
  constraintsSource: SourceFile | undefined;
  plannerSignal: string;
  editor: EditorBindings;
}) {
  return (
    <div
      id="panel-constraints"
      role="tabpanel"
      aria-labelledby="tab-constraints"
      className="pin-workspace"
    >
      <PanelBoundary name="назначение выводов" resetKey={project.id}>
        <Suspense fallback={<div className="editor-loading">Открываем выводы…</div>}>
          <PinPlanner
            project={project}
            rtl={hasSameHdlSources(project, buildSnapshot) ? build?.rtl : undefined}
            busy={busy}
            onSynthesize={onSynthesize}
            activeFile={constraintsSource?.name}
            initialSignal={plannerSignal}
            onChange={setProject}
            renderEditor={(source) => <ProjectSourceEditor source={source} {...editor} />}
          />
        </Suspense>
      </PanelBoundary>
    </div>
  );
}
