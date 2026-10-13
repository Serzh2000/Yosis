import type { Project } from '../../shared/types';
import { examples } from './examples';
import {
  simulationDefaults,
  truthTableScenario,
  type BoardPort,
  type InputScenario,
} from './virtual-board';

/** Prepared scenarios belong to untouched teaching sources, never to arbitrary user HDL. */
export function builtinTruthTableScenario(
  project: Project,
  ports: BoardPort[],
): InputScenario | null {
  const defaults = simulationDefaults(ports);
  if (defaults.clock || defaults.reset) return null;
  const sources = project.files.filter((file) => /\.(v|sv|vh|svh)$/.test(file.name));
  const builtin = examples.some(
    (example) =>
      example.project.top === project.top &&
      (() => {
        const original = example.project.files.filter((file) => /\.(v|sv|vh|svh)$/.test(file.name));
        return (
          original.length === sources.length &&
          original.every((file) =>
            sources.some(
              (candidate) => candidate.name === file.name && candidate.content === file.content,
            ),
          )
        );
      })(),
  );
  return builtin ? truthTableScenario(ports) : null;
}
