import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Code2,
  Flag,
  GitBranch,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  Square,
  Waves,
} from 'lucide-react';
import { getProjectSnapshot } from '../lib/projects';
import type { Project, SimulationResult } from '../../shared/types';
import {
  advanceCourseStep,
  answerCourseQuiz,
  canAdvanceCourseStep,
  courseLevels,
  courseRoadmap,
  createCourseProgress,
  getCourseLessonState,
  getCourseStep,
  guidedLessons,
  invalidateCourseExercise,
  isCourseLessonUnlocked,
  LEARNING_PROGRESS_KEY,
  parseCourseProgress,
  previousCourseStep,
  recordCourseExerciseResult,
  resetCourseLesson,
  revealCourseHint,
  selectCourseLesson,
} from '../lib/learning-course';
import type { CourseProgress, CourseStep } from '../lib/learning-course';
import {
  explainLearningFailure,
  explainLearningVerdicts,
  learningProject,
  LEARNING_DRAFTS_KEY,
  parseLearningDrafts,
} from '../lib/learning-session';
import type { LearningDrafts } from '../lib/learning-session';
import { checkLessonTrace, type LessonVerdict } from '../lib/lessons';
import { sha256Text } from '../lib/programming-client';
import { runSimulation } from '../lib/simulation-client';
import { parseVcd, type VcdTrace } from '../lib/vcd';
import { LessonsPanel } from './LessonsPanel';
import { WaveformViewer } from './WaveformViewer';
import { GlossaryButton, GlossaryDialog, GlossaryText } from './GlossaryText';
import './learning.css';

export interface LearningGuide {
  title: string;
  tip: string;
}
export type LearningWorkspace = NonNullable<CourseStep['workspace']>;
const workspaceLabels: Record<LearningWorkspace, string> = {
  code: 'код проекта',
  rtl: 'RTL-схему',
  simulation: 'диаграммы',
  board: 'виртуальную плату',
  pins: 'назначения выводов (.cst)',
};
interface Props {
  project: Project;
  available: boolean;
  projectBusy: boolean;
  onLoadProject: (project: Project) => void;
  onExplore: (workspace: LearningWorkspace, guide: LearningGuide) => void;
  onStartMission?: () => void;
  lessonId?: string;
  onLessonChange?: (id: string) => void;
}
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function LogicPlayground() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [gate, setGate] = useState('AND');
  const y = gate === 'AND' ? a & b : gate === 'OR' ? a | b : gate === 'XOR' ? a ^ b : 1 - a;
  const expression =
    gate === 'AND' ? 'a & b' : gate === 'OR' ? 'a | b' : gate === 'XOR' ? 'a ^ b' : '~a';
  return (
    <section className="learning-sandbox" aria-label="Попробуй логический элемент">
      <div className="learning-sandbox-top">
        <span>ПОТРОГАЙ СХЕМУ</span>
        <div>
          {['AND', 'OR', 'XOR', 'NOT'].map((item) => (
            <button key={item} aria-pressed={gate === item} onClick={() => setGate(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="learning-gate-row">
        <div className="learning-bit-inputs">
          <button
            aria-label={`Вход a: ${a}. Переключить`}
            aria-pressed={a === 1}
            onClick={() => setA(1 - a)}
          >
            <span>a</span>
            <b>{a}</b>
          </button>
          {gate !== 'NOT' && (
            <button
              aria-label={`Вход b: ${b}. Переключить`}
              aria-pressed={b === 1}
              onClick={() => setB(1 - b)}
            >
              <span>b</span>
              <b>{b}</b>
            </button>
          )}
        </div>
        <svg viewBox="0 0 190 95" role="img" aria-label={`Элемент ${gate}`}>
          <path
            className="learning-wire"
            d={gate === 'NOT' ? 'M0 47H45M126 47H190' : 'M0 30H45M0 65H45M130 47H190'}
          />
          {gate === 'NOT' ? (
            <>
              <path className="learning-gate" d="M45 15L113 47L45 80Z" />
              <circle className="learning-gate" cx="119" cy="47" r="6" />
            </>
          ) : gate === 'AND' ? (
            <path className="learning-gate" d="M45 12H87A35 35 0 0 1 87 82H45Z" />
          ) : (
            <>
              <path className="learning-gate" d="M40 12Q86 47 40 82Q106 82 136 47Q106 12 40 12Z" />
              {gate === 'XOR' && <path className="learning-wire" d="M31 12Q77 47 31 82" />}
            </>
          )}
        </svg>
        <div className={`learning-lamp ${y ? 'lit' : ''}`}>
          <i />
          <span>
            y = <b>{y}</b>
          </span>
        </div>
      </div>
      <code>assign y = {expression};</code>
      <p>
        Нажми на 0 или 1. Выход сразу реагирует: это соединение, которое работает постоянно. Здесь 1
        включает виртуальную лампу.
      </p>
    </section>
  );
}

export function LearningPanel({
  project,
  available,
  projectBusy,
  onLoadProject,
  onExplore,
  onStartMission,
  lessonId: requestedLesson,
  onLessonChange,
}: Props) {
  const [mode, setMode] = useState<'course' | 'practice'>('course');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [progress, setProgress] = useState<CourseProgress>(() =>
    parseCourseProgress(stored(LEARNING_PROGRESS_KEY)),
  );
  const [drafts, setDrafts] = useState<LearningDrafts>(() =>
    parseLearningDrafts(stored(LEARNING_DRAFTS_KEY)),
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [verdicts, setVerdicts] = useState<LessonVerdict[] | null>(null);
  const [trace, setTrace] = useState<VcdTrace | null>(null);
  const [error, setError] = useState('');
  const [showWaves, setShowWaves] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mainRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const lesson = guidedLessons.find((item) => item.id === progress.activeLessonId)!;
  const state = getCourseLessonState(progress, lesson.id);
  const step = getCourseStep(progress);
  const stepIndex = lesson.steps.findIndex((item) => item.id === step.id);
  const lab = learningProject(lesson.id, drafts);
  const code = lab?.files[0].content ?? '';
  const completedCount = guidedLessons.filter(
    (item) => getCourseLessonState(progress, item.id).completed,
  ).length;
  const quizOption = step.quiz?.options.find((option) => option.id === state.answers[step.id]);
  const nextLesson = guidedLessons[guidedLessons.findIndex((item) => item.id === lesson.id) + 1];
  const canAdvance = ready && !busy && canAdvanceCourseStep(progress);
  const externalCode =
    project.name === lab?.name
      ? project.files.find((file) => file.name === lab.files[0].name)?.content
      : undefined;

  useEffect(() => {
    let live = true;
    // A saved success is valid only for the same persisted source, including CST.
    void (async () => {
      let restored = progressRef.current;
      for (const item of guidedLessons) {
        const saved = getCourseLessonState(restored, item.id).exercise;
        const candidate = learningProject(item.id, draftsRef.current);
        if (
          saved &&
          candidate &&
          (await sha256Text(getProjectSnapshot(candidate))) !== saved.projectHash
        ) {
          restored = invalidateCourseExercise(restored, item.id);
          restored = selectCourseLesson(restored, item.id);
          break;
        }
      }
      if (live) {
        setProgress(restored);
        setReady(true);
      }
    })().catch(() => {
      if (live) {
        setProgress(createCourseProgress());
        setReady(true);
        setStorageError(
          'Не удалось восстановить результаты проверок. Твой код сохранён в черновиках.',
        );
      }
    });
    function dispose() {
      live = false;
      generation.current++;
      controller.current?.abort();
    }
    return dispose;
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(progress));
      localStorage.setItem(LEARNING_DRAFTS_KEY, JSON.stringify(drafts));
      setStorageError('');
    } catch {
      setStorageError(
        'Браузер не сохранил прогресс. Оставь эту вкладку открытой, чтобы продолжить урок.',
      );
    }
  }, [progress, drafts, ready]);
  useEffect(() => {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setSimulation(null);
    setVerdicts(null);
    setTrace(null);
    setError('');
    setShowWaves(false);
    setResetConfirm(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [lesson.id, step.id]);

  useEffect(() => {
    setReviewing(false);
  }, [lesson.id]);
  useEffect(() => {
    if (
      ready &&
      requestedLesson &&
      requestedLesson !== progressRef.current.activeLessonId &&
      isCourseLessonUnlocked(progressRef.current, requestedLesson)
    )
      setProgress((current) => selectCourseLesson(current, requestedLesson));
  }, [requestedLesson, ready]);
  useEffect(() => {
    if (ready) onLessonChange?.(lesson.id);
  }, [lesson.id, ready, onLessonChange]);

  function editCode(value: string) {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setVerdicts(null);
    setTrace(null);
    setSimulation(null);
    setError('');
    const next = { ...draftsRef.current, [lesson.id]: value };
    draftsRef.current = next;
    setDrafts(next);
    setProgress((current) => invalidateCourseExercise(current, lesson.id));
  }
  async function verify() {
    if (!lab || !lesson.exercise || busy) return;
    const run = ++generation.current;
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    const captured = getProjectSnapshot(lab);
    const exercise = lesson.exercise;
    const lessonId = lesson.id;
    setBusy(true);
    setError('');
    setVerdicts(null);
    setTrace(null);
    setSimulation(null);
    try {
      const hash = await sha256Text(captured);
      if (run !== generation.current) return;
      const result = await runSimulation(lab, exercise.config, abort.signal, (value) => {
        if (run === generation.current) setSimulation(value);
      });
      if (
        run !== generation.current ||
        getProjectSnapshot(learningProject(lessonId, draftsRef.current)!) !== captured
      )
        return;
      const wave = parseVcd(result.vcd!);
      const checked = checkLessonTrace(exercise, wave);
      setTrace(wave);
      setVerdicts(checked);
      setProgress((current) => recordCourseExerciseResult(current, lessonId, checked, hash));
    } catch (failure) {
      if (run === generation.current && !abort.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Не удалось запустить проверку.');
        setProgress((current) => invalidateCourseExercise(current, lessonId));
      }
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  const explore = (workspace: LearningWorkspace, loadDraft = false) => {
    if (lab && (loadDraft || project.name !== lab.name)) onLoadProject(lab);
    onExplore(workspace, {
      title: lesson.title,
      tip: step.kind === 'practice' ? lesson.exercise!.objective : step.text,
    });
  };

  return (
    <div className="learning-workspace">
      <header className="learning-heading">
        <div>
          <GraduationCap size={19} />
          <strong>Твоя мастерская</strong>
          <span>От первого бита к своему устройству</span>
        </div>
        <GlossaryButton onClick={() => setGlossaryOpen(true)} />
        <div className="learning-mode" aria-label="Режим обучения">
          <button aria-pressed={mode === 'course'} onClick={() => setMode('course')}>
            С наставником
          </button>
          <button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>
            Свободные задания
          </button>
        </div>
      </header>
      {glossaryOpen && <GlossaryDialog onClose={() => setGlossaryOpen(false)} />}
      {storageError && (
        <div className="learning-storage-note" role="status">
          {storageError}
        </div>
      )}
      {mode === 'practice' ? (
        <LessonsPanel
          project={project}
          onLoadProject={onLoadProject}
          onOpenEditor={() =>
            onExplore('code', {
              title: 'Самостоятельная практика',
              tip: 'Исправь заготовку задания, затем вернись в обучение и проверь устройство.',
            })
          }
        />
      ) : (
        <div className="learning-layout">
          <aside className="learning-route">
            <div className="learning-route-summary">
              <span>ТВОЙ МАРШРУТ</span>
              <strong>
                {completedCount}
                <small> / {guidedLessons.length} уроков</small>
              </strong>
              <progress
                max={guidedLessons.length}
                value={completedCount}
                aria-label="Пройденные уроки"
              />
            </div>
            <label className="learning-route-picker">
              <span>Текущий урок</span>
              <select
                aria-label="Выбрать урок"
                value={lesson.id}
                disabled={!ready}
                onChange={(event) =>
                  setProgress((current) => selectCourseLesson(current, event.target.value))
                }
              >
                {courseLevels.map((level) => (
                  <optgroup key={level.id} label={level.title}>
                    {guidedLessons
                      .filter((item) => item.levelId === level.id)
                      .map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={!isCourseLessonUnlocked(progress, item.id)}
                        >
                          {getCourseLessonState(progress, item.id).completed ? '✓ ' : ''}
                          {item.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <nav aria-label="Маршрут обучения">
              {courseLevels.map((level) => (
                <div className="learning-level" key={level.id}>
                  <h3>{level.title}</h3>
                  {guidedLessons
                    .filter((item) => item.levelId === level.id)
                    .map((item) => {
                      const done = getCourseLessonState(progress, item.id).completed;
                      const unlocked = isCourseLessonUnlocked(progress, item.id);
                      return (
                        <button
                          key={item.id}
                          className={item.id === lesson.id ? 'active' : ''}
                          disabled={!ready || !unlocked}
                          aria-current={item.id === lesson.id ? 'step' : undefined}
                          title={
                            unlocked ? item.summary : 'Заверши предыдущий урок, чтобы открыть этот'
                          }
                          onClick={() =>
                            setProgress((current) => selectCourseLesson(current, item.id))
                          }
                        >
                          <span className={done ? 'done' : ''}>
                            {done ? (
                              <Check size={13} />
                            ) : unlocked ? (
                              <i />
                            ) : (
                              <LockKeyhole size={12} />
                            )}
                          </span>
                          <div>
                            {item.title}
                            <small>{item.minutes} мин</small>
                          </div>
                          {item.id === lesson.id && <ChevronRight size={13} />}
                        </button>
                      );
                    })}
                </div>
              ))}
            </nav>
            <p className="learning-route-note">
              <BookOpen size={14} />
              Прогресс и код остаются в этом браузере. Ошибка — повод исследовать схему.
            </p>
          </aside>
          <main className="learning-main" ref={mainRef}>
            <div className="learning-lesson-content">
              <div className="learning-lesson-meta">
                <span>{courseLevels.find((level) => level.id === lesson.levelId)?.title}</span>
                <span>
                  {lesson.minutes} мин · шаг {stepIndex + 1} из {lesson.steps.length}
                </span>
              </div>
              <div
                className="learning-step-dots"
                aria-label={`Шаг ${stepIndex + 1} из ${lesson.steps.length}`}
              >
                {lesson.steps.map((item, index) => (
                  <i key={item.id} className={index <= stepIndex ? 'reached' : ''} />
                ))}
              </div>
              {state.completed && !reviewing ? (
                <section className="learning-complete" role="status">
                  <span className="learning-complete-icon">
                    <Flag size={31} />
                  </span>
                  <span>УРОК ЗАВЕРШЁН</span>
                  <h1>{lesson.title}</h1>
                  <p>
                    {lesson.summary}{' '}
                    {lesson.exercise
                      ? 'Ты описал устройство и проверил его поведение на входных сценариях.'
                      : 'Теперь понятно, где писать код, смотреть схему и проверять сигналы.'}
                  </p>
                  <div>
                    <button
                      className="button primary"
                      onClick={() =>
                        nextLesson
                          ? setProgress((current) => selectCourseLesson(current, nextLesson.id))
                          : setMode('practice')
                      }
                    >
                      {nextLesson ? `Дальше: ${nextLesson.title}` : 'К самостоятельной практике'}
                      <ArrowRight size={15} />
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => {
                        setReviewing(true);
                        setProgress((current) => previousCourseStep(current));
                      }}
                    >
                      Повторить материал
                    </button>
                  </div>
                  {!nextLesson && (
                    <div className="learning-roadmap">
                      <h3>Основа пройдена. Что дальше</h3>
                      <p>
                        Следующие модули курса ещё готовятся. Уже сейчас можно исследовать эти темы
                        в библиотеке примеров.
                      </p>
                      {courseRoadmap.map((item) => (
                        <div key={item.title}>
                          <BookOpen size={16} />
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.description}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <div className="learning-step-title">
                    <span>
                      {step.kind === 'welcome'
                        ? 'ЗНАКОМСТВО'
                        : step.kind === 'quiz'
                          ? 'ПРЕДСКАЖИ РЕЗУЛЬТАТ'
                          : step.kind === 'practice'
                            ? 'ЛАБОРАТОРИЯ'
                            : 'РАЗБЕРЁМСЯ ВМЕСТЕ'}
                    </span>
                    <h1>{step.title}</h1>
                    <p>
                      <GlossaryText key={step.id} text={step.text} />
                    </p>
                  </div>
                  {step.kind === 'welcome' && (
                    <>
                      {onStartMission && (
                        <div className="learning-mission-callout">
                          <div>
                            <strong>Попробуй в настоящей IDE</strong>
                            <p>
                              Подключи кнопку к LED: наставник проведёт по редактору, схеме,
                              проверке и плате.
                            </p>
                          </div>
                          <button
                            className="button primary learning-mission-cta"
                            disabled={projectBusy}
                            onClick={onStartMission}
                          >
                            <Flag size={16} />
                            Первая миссия
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                      <LogicPlayground />
                      <div className="learning-journey">
                        <span>
                          <Code2 size={18} />
                          Код
                        </span>
                        <ArrowRight size={14} />
                        <span>
                          <GitBranch size={18} />
                          Схема
                        </span>
                        <ArrowRight size={14} />
                        <span>
                          <Waves size={18} />
                          Проверка
                        </span>
                        <ArrowRight size={14} />
                        <span>
                          <CircuitBoard size={18} />
                          Устройство
                        </span>
                      </div>
                    </>
                  )}
                  {step.code && (
                    <pre className="learning-example-code">
                      <code>{step.code}</code>
                    </pre>
                  )}
                  {step.kind === 'explain' && step.workspace && (
                    <button
                      className="learning-text-button"
                      onClick={() => explore(step.workspace!)}
                    >
                      <BookOpen size={14} />
                      Посмотреть {workspaceLabels[step.workspace]}
                      <ArrowRight size={13} />
                    </button>
                  )}
                  {step.quiz && (
                    <section className="learning-question">
                      <h2>
                        <GlossaryText key={step.id} text={step.quiz.question} />
                      </h2>
                      <div>
                        {step.quiz.options.map((option, index) => (
                          <button
                            key={option.id}
                            disabled={!ready}
                            aria-pressed={quizOption?.id === option.id}
                            className={
                              quizOption?.id === option.id
                                ? quizOption.id === step.quiz!.correctOptionId
                                  ? 'correct'
                                  : 'chosen'
                                : ''
                            }
                            onClick={() =>
                              setProgress(
                                (current) =>
                                  answerCourseQuiz(current, lesson.id, step.id, option.id).progress,
                              )
                            }
                          >
                            <span>
                              {quizOption?.id === option.id &&
                              option.id === step.quiz!.correctOptionId ? (
                                <Check size={14} />
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </span>
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {quizOption && (
                        <p
                          className={`learning-feedback ${quizOption.id === step.quiz.correctOptionId ? 'success' : ''}`}
                          role="status"
                        >
                          <Lightbulb size={17} />
                          <span>{quizOption.feedback}</span>
                        </p>
                      )}
                    </section>
                  )}
                  {step.kind === 'practice' && lab && lesson.exercise && (
                    <section className="learning-laboratory">
                      <div className="learning-objective">
                        <Flag size={17} />
                        <p>{lesson.exercise.objective}</p>
                      </div>
                      <div className="learning-editor-heading">
                        <code>{lab.files[0].name}</code>
                        <span>Verilog · твой черновик</span>
                        <button disabled={projectBusy} onClick={() => explore('code', true)}>
                          <Code2 size={13} />
                          Открыть в IDE
                        </button>
                      </div>
                      <div className="learning-editor">
                        <pre aria-hidden="true">
                          {code
                            .split('\n')
                            .map((_, index) => index + 1)
                            .join('\n')}
                        </pre>
                        <textarea
                          aria-label={`Код урока ${lesson.title}`}
                          value={code}
                          spellCheck={false}
                          maxLength={100_000}
                          onChange={(event) => editCode(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                              event.preventDefault();
                              event.stopPropagation();
                              if (available && ready) void verify();
                            }
                          }}
                        />
                      </div>
                      {externalCode !== undefined && externalCode !== code && (
                        <div className="learning-import-code">
                          <span>Код в IDE отличается от черновика урока.</span>
                          <button onClick={() => editCode(externalCode)}>Взять код из IDE</button>
                        </div>
                      )}
                      <div className="learning-lab-actions">
                        <button
                          className="button primary"
                          disabled={busy || !ready || !available}
                          onClick={() => void verify()}
                        >
                          {busy ? <LoaderCircle className="spin" size={15} /> : <Play size={15} />}{' '}
                          {busy ? 'Проверяем схему…' : 'Проверить устройство'}
                        </button>
                        {busy ? (
                          <button
                            className="button subtle"
                            onClick={() => {
                              controller.current?.abort();
                              generation.current++;
                              setBusy(false);
                            }}
                          >
                            <Square size={13} />
                            Отменить
                          </button>
                        ) : (
                          <span>
                            {available
                              ? 'Настоящая RTL симуляция · Ctrl ↵'
                              : 'Сервис симуляции недоступен'}
                          </span>
                        )}
                        <button
                          className="learning-text-button"
                          disabled={state.hintsShown >= lesson.hints.length}
                          onClick={() => setProgress((current) => revealCourseHint(current))}
                        >
                          <Lightbulb size={14} />
                          {state.hintsShown ? 'Ещё подсказка' : 'Нужна подсказка'}
                          <small>
                            {state.hintsShown}/{lesson.hints.length}
                          </small>
                        </button>
                      </div>
                      {state.hintsShown > 0 && (
                        <ol className="learning-hints">
                          {lesson.hints.slice(0, state.hintsShown).map((hint) => (
                            <li key={hint}>{hint}</li>
                          ))}
                        </ol>
                      )}
                      {busy && (
                        <p className="learning-run-stage" role="status">
                          {simulation?.stage ?? 'Подготовка проверки'}
                        </p>
                      )}
                      {error && (
                        <div className="learning-error" role="alert">
                          <strong>{explainLearningFailure(error)}</strong>
                          <pre>{error}</pre>
                        </div>
                      )}
                      {verdicts && (
                        <div
                          className={`learning-feedback ${verdicts.every((item) => item.passed) ? 'success' : ''}`}
                          role="status"
                        >
                          {verdicts.every((item) => item.passed) ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <Lightbulb size={18} />
                          )}
                          <span>{explainLearningVerdicts(verdicts, lesson.exercise.output)}</span>
                        </div>
                      )}
                      {!verdicts && state.exercise && (
                        <p className="learning-feedback success">
                          <CheckCircle2 size={18} />
                          <span>
                            Этот код уже прошёл проверку. Можно завершить урок или запустить
                            проверку снова.
                          </span>
                        </p>
                      )}
                      <details className="learning-cases" open={!!verdicts}>
                        <summary>
                          Что проверяем · сценариев: {lesson.exercise.cases.length}
                          {verdicts &&
                            ` · успешно: ${verdicts.filter((item) => item.passed).length}`}
                        </summary>
                        <div>
                          <table>
                            <thead>
                              <tr>
                                <th>Ситуация</th>
                                <th>Входы</th>
                                <th>Ожидается</th>
                                {verdicts && <th>Твой выход</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {lesson.exercise.cases.map((item, index) => (
                                <tr
                                  key={index}
                                  className={
                                    verdicts?.[index]
                                      ? verdicts[index].passed
                                        ? 'passed'
                                        : 'failed'
                                      : ''
                                  }
                                >
                                  <td>{item.title}</td>
                                  <td>
                                    <code>
                                      {Object.entries(item.inputs)
                                        .map(([name, value]) => `${name}=${value}`)
                                        .join(' · ')}
                                    </code>
                                  </td>
                                  <td>
                                    <code>{item.expected}</code>
                                  </td>
                                  {verdicts && (
                                    <td>
                                      <code>{verdicts[index]?.actual ?? '—'}</code>
                                      {verdicts[index]?.passed ? ' ✓' : ' ×'}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      {trace && (
                        <div className="learning-wave-section">
                          <button
                            className="learning-text-button"
                            aria-expanded={showWaves}
                            onClick={() => setShowWaves(!showWaves)}
                          >
                            <Waves size={15} />
                            {showWaves ? 'Скрыть диаграммы' : 'Исследовать временные диаграммы'}
                          </button>
                          {showWaves && (
                            <>
                              <p>
                                Каждая строка — сигнал. Время идёт слева направо.{' '}
                                {lesson.exercise.config.clock
                                  ? 'Сравни фронты clk и изменения выхода; между фронтами регистр хранит значение.'
                                  : 'Сравни изменения входов и выхода: комбинационная схема реагирует на входы без тактов.'}
                              </p>
                              <div className="learning-wave-view">
                                <WaveformViewer trace={trace} />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </section>
                  )}
                  <footer className="learning-step-footer">
                    <button
                      className="button subtle"
                      disabled={stepIndex === 0 || busy || !ready}
                      onClick={() => setProgress((current) => previousCourseStep(current))}
                    >
                      <ArrowLeft size={14} />
                      Назад
                    </button>
                    <span>
                      {step.kind === 'quiz' && !canAdvance
                        ? 'Сначала выбери верный ответ'
                        : step.kind === 'practice' && !canAdvance
                          ? 'Заверши проверку устройства'
                          : 'Можно двигаться дальше'}
                    </span>
                    <button
                      className="button primary"
                      disabled={!canAdvance}
                      onClick={() => {
                        setProgress((current) => advanceCourseStep(current));
                        if (stepIndex === lesson.steps.length - 1) setReviewing(false);
                      }}
                    >
                      {stepIndex === lesson.steps.length - 1
                        ? 'Завершить урок'
                        : step.kind === 'welcome'
                          ? 'Продолжить вводный урок'
                          : 'Дальше'}
                      <ArrowRight size={14} />
                    </button>
                  </footer>
                </>
              )}
              <div className="learning-reset">
                <button
                  className="learning-text-button"
                  onClick={() => setResetConfirm(!resetConfirm)}
                  aria-expanded={resetConfirm}
                >
                  <RotateCcw size={12} />
                  Начать урок заново
                </button>
                {resetConfirm && (
                  <div>
                    <p>
                      Прогресс этого и следующих уроков сбросится. Твои черновики кода сохранятся.
                    </p>
                    <button
                      className="button subtle"
                      onClick={() => {
                        generation.current++;
                        controller.current?.abort();
                        setProgress((current) => resetCourseLesson(current, lesson.id));
                        setResetConfirm(false);
                      }}
                    >
                      Сбросить прогресс
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
