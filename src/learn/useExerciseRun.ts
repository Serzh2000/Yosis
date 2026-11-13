import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../../shared/types';
import type { LessonVerdict } from '../lib/lessons';
import { checkExercise, failureDetail, type ExerciseChecks } from './check';

/** What one run of «Проверить» came to: for the progress of the page and the teacher's view. */
export interface RunResult {
  total: number;
  failed: number;
  detail: string;
  code: string;
}

/**
 * One check at a time: a new run, an edit or leaving the page cancels the one in flight, and a
 * late answer of a cancelled run is thrown away.
 */
export function useExerciseRun(onResult: (result: RunResult) => void) {
  const [verdicts, setVerdicts] = useState<LessonVerdict[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const report = useRef(onResult);
  report.current = onResult;

  const reset = useCallback(() => {
    abort.current?.abort();
    run.current++;
    setBusy(false);
    setVerdicts(null);
    setError('');
  }, []);
  useEffect(() => () => abort.current?.abort(), []);

  const check = useCallback(async (project: Project, exercise: ExerciseChecks, code: string) => {
    const mine = ++run.current;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setBusy(true);
    setError('');
    setVerdicts(null);
    try {
      const checked = await checkExercise(project, exercise, controller.signal);
      if (mine !== run.current) return;
      setVerdicts(checked);
      report.current({
        total: checked.length,
        failed: checked.filter((item) => !item.passed).length,
        detail: failureDetail(checked),
        code,
      });
    } catch (failure) {
      if (mine === run.current && !controller.signal.aborted) {
        const message =
          failure instanceof Error ? failure.message : 'Не удалось запустить проверку.';
        setError(message);
        report.current({ total: 0, failed: 0, detail: message, code });
      }
    } finally {
      if (mine === run.current) setBusy(false);
    }
  }, []);
  return { verdicts, error, busy, reset, check };
}
