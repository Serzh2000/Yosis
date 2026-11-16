import { t } from '../lib/i18n';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { Project } from '../../shared/types';
import { localStore } from '../lib/storage';
import type { CircuitExercise } from './content/schema';
import { useExerciseRun, type RunResult } from './useExerciseRun';
import { Verdicts } from './Verdicts';

const CircuitEditor = lazy(() =>
  import('../components/CircuitEditor').then((module) => ({ default: module.CircuitEditor })),
);

const draftKey = (pageId: string) => `yosis.learn.v1.circuit.${pageId}`;
const CODE_LIMIT = 200_000;

const isSchematic = (name: string) => name.endsWith('.ysch');

/**
 * The schematic task: the learner draws the circuit from blocks in the same editor as the
 * studio, and «Проверить» turns it into Verilog and runs it in the simulator against the cases.
 */
export function SchematicTask({
  pageId,
  exercise,
  solved,
  onResult,
}: {
  pageId: string;
  exercise: CircuitExercise;
  solved: boolean;
  onResult: (result: RunResult) => void;
}) {
  const starter = useMemo<Project>(
    () => ({ ...exercise.project, id: '00000000-0000-4000-8000-00000000c001' }),
    [exercise],
  );
  const [project, setProject] = useState<Project>(starter);
  const run = useExerciseRun(onResult);
  const { reset } = run;

  // A page keeps the circuit the learner drew on it; a saved one that does not fit is dropped.
  useEffect(() => {
    reset();
    const saved = localStore.getItem(draftKey(pageId));
    const name = starter.files.find((file) => isSchematic(file.name))?.name;
    setProject(
      typeof saved === 'string' && saved.length <= CODE_LIMIT && name
        ? {
            ...starter,
            files: starter.files.map((file) =>
              file.name === name ? { ...file, content: saved } : file,
            ),
          }
        : starter,
    );
  }, [pageId, starter, reset]);

  const source = project.files.find((file) => isSchematic(file.name));
  if (!source) return <p className="learn-note">{t('В этом задании нет схемы.')}</p>;
  const change = (next: Project) => {
    reset();
    setProject(next);
    const content = next.files.find((file) => isSchematic(file.name))?.content;
    if (content) localStore.setItem(draftKey(pageId), content.slice(0, CODE_LIMIT));
  };
  return (
    <div className="learn-sim">
      <div className="learn-circuit">
        <Suspense fallback={<p className="learn-note">{t('Открываем конструктор…')}</p>}>
          <CircuitEditor
            key={`${pageId}:${source.name}`}
            project={project}
            source={source}
            busy={run.busy}
            onChange={change}
            onPins={() => undefined}
          />
        </Suspense>
      </div>
      <div className="learn-sim-bar">
        <button
          type="button"
          className="button primary"
          disabled={run.busy}
          onClick={() => void run.check(project, exercise, source.content)}
        >
          <Play size={14} /> {run.busy ? t('Проверяем…') : t('Проверить')}
        </button>
        <button
          type="button"
          className="button subtle"
          disabled={run.busy}
          onClick={() => {
            localStore.removeItem(draftKey(pageId));
            reset();
            setProject(starter);
          }}
        >
          {t('Начать схему заново')}
        </button>
        {solved && !run.verdicts ? (
          <span className="learn-ok">{t('Задание уже выполнено')}</span>
        ) : null}
      </div>
      <Verdicts verdicts={run.verdicts} error={run.error} />
    </div>
  );
}
