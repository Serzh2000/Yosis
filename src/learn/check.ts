import { t } from '../lib/i18n';
import type { Project, SimulationConfig } from '../../shared/types';
import { checkLessonTrace, type LessonCase, type LessonVerdict } from '../lib/lessons';
import { runSimulation } from '../lib/simulation-client';
import { parseVcd } from '../lib/vcd';

/** The checks a design is judged by: the output port and the cases it must meet. */
export interface ExerciseChecks {
  config: SimulationConfig;
  cases: LessonCase[];
  output: string;
}

/** Runs the project in the simulator and compares the output with the cases, one by one. */
export async function checkExercise(
  project: Project,
  exercise: ExerciseChecks,
  signal: AbortSignal,
): Promise<LessonVerdict[]> {
  const result = await runSimulation(project, exercise.config, signal);
  return checkLessonTrace(exercise, parseVcd(result.vcd!));
}

/** The first failed check in words, for the teacher's view of an attempt. */
export function failureDetail(verdicts: LessonVerdict[]): string {
  const failed = verdicts.find((item) => !item.passed);
  return failed ? t('{title}: ждали {expected}, получили {actual}', { title: failed.title, expected: failed.expected, actual: failed.actual }) : '';
}
