import type { Dispatch, SetStateAction } from 'react';
import type { BuildResult, Project, ToolchainStatus } from '../../../shared/types';
import type { PhysicalResult } from '../../../shared/physical';
import type { JtagIdentity } from '../../lib/gowin-jtag';
import type { LearningGuide, LearningWorkspace } from '../../lib/learning-types';
import { linkVcdSignal } from '../../lib/signal-link';
import type { WorkTab } from '../../lib/studio-tabs';
import type { VcdSignal } from '../../lib/vcd';
import { PanelSlot } from './PanelSlot';
import { BoardPanel, ChipPanel, LabPanel, LearningPanel, SimulationPanel } from './lazy-panels';

/** Курс «Обучение»: что нужно панели от студии. */
export interface LearningBindings {
  /** Меняется при восстановлении прогресса с сервера и заново монтирует панель. */
  session: number;
  lessonId: string | undefined;
  onLessonChange: (id: string) => void;
  onLoadProject: (project: Project) => void;
  onExplore: (workspace: LearningWorkspace, guide: LearningGuide) => void;
  onStartMission: () => void;
}
/** Подключение платы и размещение на кристалле. */
export interface HardwareBindings {
  physical: { result: PhysicalResult | null; snapshot: string };
  onPhysicalResult: (result: PhysicalResult | null, snapshot: string) => void;
  onIdentity: (identity: JtagIdentity | null) => void;
  onProgrammed: (snapshot: string) => void;
}

/**
 * Панели, которые остаются смонтированными после первого открытия: диаграммы, лаборатория,
 * кристалл, обучение и подключение платы. Остальные вкладки отрисовываются по месту.
 */
export function PersistentPanels({
  visited,
  workTab,
  project,
  setProject,
  projectSession,
  build,
  stale,
  busy,
  health,
  guidedPreview,
  learning,
  hardware,
  setWorkTab,
  onSynthesize,
  onRevealSignal,
}: {
  visited: ReadonlySet<WorkTab>;
  workTab: WorkTab;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  projectSession: number;
  build: BuildResult | null;
  stale: boolean;
  busy: boolean;
  health: ToolchainStatus | null;
  guidedPreview: { id: string; vcd: string; snapshot: string; name: string } | null;
  learning: LearningBindings;
  hardware: HardwareBindings;
  setWorkTab: (tab: WorkTab) => void;
  onSynthesize: () => void;
  onRevealSignal: (signal: VcdSignal) => void;
}) {
  return (
    <>
      {visited.has('simulation') && (
        <PanelSlot
          tab="simulation"
          active={workTab === 'simulation'}
          label="Рабочая область временных диаграмм"
          resetKey={project.id}
        >
          <SimulationPanel
            guidedPreview={guidedPreview}
            project={project}
            projectSession={projectSession}
            rtl={build?.rtl}
            onSynthesize={onSynthesize}
            synthesisBusy={busy}
            available={!!health?.capabilities.simulation}
            canRevealSignal={(signal) =>
              !stale && !!build?.rtl && !!linkVcdSignal(build.rtl, project.top, signal)
            }
            onRevealSignal={onRevealSignal}
          />
        </PanelSlot>
      )}
      {visited.has('virtual') && (
        <PanelSlot
          tab="virtual"
          active={workTab === 'virtual'}
          label="Лаборатория"
          resetKey={project.id}
        >
          <LabPanel
            project={project}
            active={workTab === 'virtual'}
            onChange={setProject}
            onOpenPins={() => setWorkTab('constraints')}
          />
        </PanelSlot>
      )}
      {visited.has('chip') && (
        <PanelSlot
          tab="chip"
          active={workTab === 'chip'}
          label="Рабочая область кристалла"
          resetKey={project.id}
        >
          <ChipPanel
            project={project}
            technology={build?.technology}
            buildId={build?.status === 'success' && !stale ? build.id : undefined}
            onSynthesize={onSynthesize}
            synthesisBusy={busy}
            onResult={hardware.onPhysicalResult}
          />
        </PanelSlot>
      )}
      {visited.has('lessons') && (
        <PanelSlot
          tab="lessons"
          active={workTab === 'lessons'}
          label="Интерактивное обучение"
          resetKey={project.id}
        >
          <LearningPanel
            key={learning.session}
            lessonId={learning.lessonId}
            onLessonChange={learning.onLessonChange}
            project={project}
            available={!!health?.capabilities.simulation}
            projectBusy={busy}
            onLoadProject={learning.onLoadProject}
            onExplore={learning.onExplore}
            onStartMission={learning.onStartMission}
          />
        </PanelSlot>
      )}
      {visited.has('board') && (
        <PanelSlot
          tab="board"
          active={workTab === 'board'}
          label="Подключение платы"
          resetKey={project.id}
        >
          <BoardPanel
            project={project}
            physical={hardware.physical.result}
            physicalSnapshot={hardware.physical.snapshot}
            onOpenChip={() => setWorkTab('chip')}
            onIdentity={hardware.onIdentity}
            onProgrammed={hardware.onProgrammed}
          />
        </PanelSlot>
      )}
    </>
  );
}
