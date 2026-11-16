import { t } from '../lib/i18n';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { Project } from '../../shared/types';
import { useTheme } from '../hooks/useTheme';
import { guidedLessons } from '../lib/learning-course';
import { localStore } from '../lib/storage';
import { useExerciseRun, type RunResult } from './useExerciseRun';
import type { Exercise } from './content/schema';
import { Verdicts } from './Verdicts';

const SourceEditor = lazy(() =>
  import('../components/SourceEditor').then((module) => ({ default: module.SourceEditor })),
);

const draftKey = (lessonId: string) => `yosis.learn.v1.draft.${lessonId}`;
const CODE_LIMIT = 100_000;
export type { RunResult as SimResult };

/**
 * The Verilog task: the lesson's own starter is the learner's file; «Проверить» runs it in the
 * simulator and compares the output with the lesson's cases, one by one.
 */
export function VerilogTask({
  pageId,
  lessonId,
  given,
  solved,
  insert,
  onResult,
}: {
  /** The page: its draft is kept under this id. */
  pageId: string;
  /** A lesson of the guided course whose exercise this is… */
  lessonId?: string;
  /** …or an exercise written in the book itself. */
  given?: Exercise;
  solved: boolean;
  /** Code from a page that a button asked to put into the editor. */
  insert?: { code: string; stamp: number } | null;
  onResult: (result: RunResult) => void;
}) {
  const exercise = useMemo(
    () => given ?? guidedLessons.find((lesson) => lesson.id === lessonId)?.exercise ?? null,
    [given, lessonId],
  );
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const run = useExerciseRun(onResult);
  const { reset } = run;

  useEffect(() => {
    reset();
    const saved = localStore.getItem(draftKey(pageId));
    setCode(
      typeof saved === 'string' && saved.length <= CODE_LIMIT
        ? saved
        : (exercise?.project.files[0]?.content ?? ''),
    );
  }, [pageId, exercise, reset]);
  useEffect(() => {
    if (insert) setCode(insert.code);
  }, [insert]);

  const project = useMemo<Project | null>(
    () =>
      exercise
        ? {
            ...exercise.project,
            id: '00000000-0000-4000-8000-00000000a001',
            files: exercise.project.files.map((file, index) =>
              index === 0 ? { ...file, content: code } : file,
            ),
          }
        : null,
    [exercise, code],
  );
  if (!exercise || !project)
    return <p className="learn-note">{t('Для этого задания нет проверки.')}</p>;

  const edit = (value: string) => {
    reset();
    setCode(value);
    localStore.setItem(draftKey(pageId), value.slice(0, CODE_LIMIT));
  };
  return (
    <div className="learn-sim">
      <div className="learn-sim-editor">
        <Suspense fallback={<p className="learn-note">{t('Загружаем редактор…')}</p>}>
          <SourceEditor
            source={project.files[0]!}
            project={project}
            syntaxAvailable
            synthesisBusy={false}
            projectId={project.id!}
            theme={theme}
            saveState="saved"
            diagnostics={[]}
            onChange={edit}
            onMount={() => undefined}
            onSelectLine={() => undefined}
          />
        </Suspense>
      </div>
      <div className="learn-sim-bar">
        <button
          type="button"
          className="button primary"
          disabled={run.busy}
          onClick={() => void run.check(project, exercise, code)}
        >
          <Play size={14} /> {run.busy ? t('Проверяем…') : t('Проверить')}
        </button>
        <button
          type="button"
          className="button subtle"
          disabled={run.busy}
          onClick={() => edit(exercise.project.files[0]?.content ?? '')}
        >
          {t('Вернуть заготовку')}
        </button>
        {solved && !run.verdicts ? (
          <span className="learn-ok">{t('Задание уже выполнено')}</span>
        ) : null}
      </div>
      <Verdicts verdicts={run.verdicts} error={run.error} />
    </div>
  );
}
