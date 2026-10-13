import { lazy } from 'react';

/** Тяжёлые панели грузятся по первому обращению: здесь собраны все точки разделения кода. */
export const Schematic = lazy(() =>
  import('../Schematic').then((module) => ({ default: module.Schematic })),
);
export const LutInspector = lazy(() =>
  import('../LutInspector').then((module) => ({ default: module.LutInspector })),
);
export const SimulationPanel = lazy(() =>
  import('../SimulationPanel').then((module) => ({ default: module.SimulationPanel })),
);
export const LabPanel = lazy(() =>
  import('../lab/LabPanel').then((module) => ({ default: module.LabPanel })),
);
export const LearningPanel = lazy(() =>
  import('../LearningPanel').then((module) => ({ default: module.LearningPanel })),
);
export const SourceEditor = lazy(() =>
  import('../SourceEditor').then((module) => ({ default: module.SourceEditor })),
);
export const MissionTour = lazy(() =>
  import('../MissionTour').then((module) => ({ default: module.MissionTour })),
);
export const ChipPanel = lazy(() =>
  import('../ChipPanel').then((module) => ({ default: module.ChipPanel })),
);
export const BoardPanel = lazy(() =>
  import('../BoardPanel').then((module) => ({ default: module.BoardPanel })),
);
export const ProjectHub = lazy(() =>
  import('../ProjectHub').then((module) => ({ default: module.ProjectHub })),
);
export const PinPlanner = lazy(() =>
  import('../PinPlanner').then((module) => ({ default: module.PinPlanner })),
);
export const CircuitEditor = lazy(() =>
  import('../CircuitEditor').then((module) => ({ default: module.CircuitEditor })),
);
export const ServerSyncDialog = lazy(() =>
  import('../ServerSyncDialog').then((module) => ({ default: module.ServerSyncDialog })),
);
