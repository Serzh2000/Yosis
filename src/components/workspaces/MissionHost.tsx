import { Suspense } from 'react';
import type { BuildResult, Project, ToolchainStatus } from '../../../shared/types';
import type { useHardwareState } from '../../hooks/useHardwareState';
import type { ProjectSummary } from '../../lib/projects';
import type { WorkTab } from '../../lib/studio-tabs';
import { MissionTour } from './lazy-panels';

type Hardware = ReturnType<typeof useHardwareState>;

/** Первая миссия: подсказки поверх студии, которые следят за состоянием проекта. */
export function MissionHost({
  project,
  projectSnapshot,
  workTab,
  busy,
  health,
  build,
  buildSnapshot,
  stale,
  selectedCell,
  hardware,
  existingNames,
  savedProjects,
  onPreview,
  onClose,
  onNavigate,
  onLoad,
  onRestore,
  onError,
}: {
  project: Project;
  projectSnapshot: string;
  workTab: WorkTab;
  busy: boolean;
  health: ToolchainStatus | null;
  build: BuildResult | null;
  buildSnapshot: string;
  stale: boolean;
  selectedCell: string | null;
  hardware: Pick<Hardware, 'physical' | 'boardIdentified' | 'programmedSnapshot'>;
  existingNames: string[];
  savedProjects: ProjectSummary[];
  onPreview: (preview: { id: string; vcd: string; snapshot: string; name: string }) => void;
  onClose: () => void;
  onNavigate: (tab: WorkTab) => void;
  onLoad: (project: Project) => void;
  /** Открывает сохранённый проект миссии по идентификатору. */
  onRestore: (id: string) => void;
  onError: (message: string) => void;
}) {
  const { physical } = hardware;
  return (
    <Suspense fallback={null}>
      <MissionTour
        open
        project={project}
        tab={workTab}
        busy={busy}
        simulationAvailable={!!health?.capabilities.simulation}
        synthesisFresh={build?.status === 'success' && !stale && buildSnapshot === projectSnapshot}
        selectedCell={selectedCell}
        physicalFresh={
          physical.result?.status === 'success' &&
          physical.result.bitstreamAvailable &&
          physical.snapshot === projectSnapshot
        }
        boardIdentified={hardware.boardIdentified}
        programmedSnapshot={hardware.programmedSnapshot}
        onPreview={onPreview}
        existingNames={existingNames}
        onClose={onClose}
        onLoad={onLoad}
        onNavigate={onNavigate}
        onRestore={(name) => {
          const saved = savedProjects.find((item) => item.name === name);
          if (saved) onRestore(saved.id);
          else onError('Проект миссии не найден в библиотеке.');
        }}
      />
    </Suspense>
  );
}
