import type { Dispatch, SetStateAction } from 'react';
import type { BuildResult, Project, ToolchainStatus } from '../../../shared/types';
import type { useProjectFiles } from '../../hooks/useProjectFiles';
import type { WorkTab } from '../../lib/studio-tabs';
import { CodeWorkspace } from './CodeWorkspace';
import { DesignWorkspace } from './DesignWorkspace';
import { LogicWorkspace } from './LogicWorkspace';
import type { NetlistModel, NetlistSelection, SourceLinks } from './LogicWorkspace';
import { PinsWorkspace } from './PinsWorkspace';
import type { EditorBindings } from './ProjectSourceEditor';

type Files = ReturnType<typeof useProjectFiles>;

/**
 * Вкладки, которые строятся из исходников и результата синтеза: «Код», «Конструктор», «Выводы»,
 * «RTL» и «Gowin». Показывается только активная, остальные не монтируются.
 */
export function SourceWorkspaces({
  workTab,
  project,
  setProject,
  build,
  buildSnapshot,
  stale,
  busy,
  health,
  files,
  editor,
  model,
  selection,
  links,
  plannerSignal,
  setWorkTab,
  onPins,
  onNewFromElements,
  onSynthesize,
}: {
  workTab: WorkTab;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  build: BuildResult | null;
  buildSnapshot: string;
  stale: boolean;
  busy: boolean;
  health: ToolchainStatus | null;
  files: Pick<
    Files,
    | 'hdlSource'
    | 'activeSource'
    | 'circuitSource'
    | 'constraintsSource'
    | 'schematicPlan'
    | 'addSchematic'
  >;
  editor: EditorBindings;
  model: NetlistModel;
  selection: NetlistSelection;
  links: SourceLinks;
  plannerSignal: string;
  setWorkTab: (tab: WorkTab) => void;
  onPins: (signal: string) => void;
  onNewFromElements: () => void;
  onSynthesize: () => void;
}) {
  if (workTab === 'code')
    return (
      <CodeWorkspace
        project={project}
        hdlSource={files.hdlSource}
        activeSource={files.activeSource}
        editor={editor}
        onOpenDesigner={() => setWorkTab('design')}
      />
    );
  if (workTab === 'design')
    return (
      <DesignWorkspace
        project={project}
        circuitSource={files.circuitSource}
        busy={busy}
        setProject={setProject}
        schematicPlan={files.schematicPlan}
        onAddSchematic={files.addSchematic}
        onPins={onPins}
        onNewFromElements={onNewFromElements}
      />
    );
  if (workTab === 'constraints')
    return (
      <PinsWorkspace
        project={project}
        setProject={setProject}
        build={build}
        buildSnapshot={buildSnapshot}
        busy={busy}
        onSynthesize={onSynthesize}
        constraintsSource={files.constraintsSource}
        plannerSignal={plannerSignal}
        editor={editor}
      />
    );
  if (workTab === 'rtl' || workTab === 'technology')
    return (
      <LogicWorkspace
        tab={workTab}
        project={project}
        build={build}
        model={model}
        selection={selection}
        links={links}
        stale={stale}
        busy={busy}
        synthesisAvailable={!!health?.capabilities.synthesis}
        onSynthesize={onSynthesize}
      />
    );
  return null;
}
