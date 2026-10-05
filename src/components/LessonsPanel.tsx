import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import type { Project, SimulationResult } from '../../shared/types';
import { lessons, checkLessonTrace, type LessonVerdict } from '../lib/lessons';
import { parseVcd } from '../lib/vcd';
import { runSimulation } from '../lib/simulation-client';
import { getProjectSnapshot } from '../lib/projects';
import './lessons.css';

const PROGRESS_KEY = 'yosis.lessons.v1';
function readProgress(): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
    return Array.isArray(data)
      ? data.filter(
          (item) => typeof item === 'string' && lessons.some((lesson) => lesson.id === item),
        )
      : [];
  } catch {
    return [];
  }
}
export function LessonsPanel({
  project,
  onLoadProject,
  onOpenEditor,
}: {
  project: Project;
  onLoadProject: (project: Project) => void;
  onOpenEditor?: () => void;
}) {
  const [selected, setSelected] = useState(lessons[0].id);
  const [completed, setCompleted] = useState(readProgress);
  const [hint, setHint] = useState(false);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [verdicts, setVerdicts] = useState<LessonVerdict[] | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const lesson = lessons.find((item) => item.id === selected)!;
  const stale = !!snapshot && snapshot !== getProjectSnapshot(project);
  const passed = !!verdicts?.length && verdicts.every((verdict) => verdict.passed);
  const loaded = project.name === lesson.project.name;

  useEffect(() => {
    setHint(false);
    setQuiz(null);
    setVerdicts(null);
    setResult(null);
    setError('');
    setSnapshot('');
    setShowLog(false);
    generation.current++;
    controller.current?.abort();
    setBusy(false);
  }, [selected]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
    } catch {
      /* Keep lesson progress for this session when local storage is unavailable. */
    }
  }, [completed]);

  async function verify() {
    const run = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const captured = getProjectSnapshot(project);
    setBusy(true);
    setError('');
    setVerdicts(null);
    setSnapshot(captured);
    try {
      const simulation = await runSimulation(project, lesson.config, abort.signal, (progress) => {
        if (run === generation.current) setResult(progress);
      });
      if (run !== generation.current) return;
      const checked = checkLessonTrace(lesson, parseVcd(simulation.vcd!));
      setVerdicts(checked);
      if (checked.length && checked.every((item) => item.passed))
        setCompleted((current) =>
          current.includes(lesson.id) ? current : [...current, lesson.id],
        );
    } catch (failure) {
      if (run === generation.current && !abort.signal.aborted)
        setError(failure instanceof Error ? failure.message : 'Не удалось проверить решение.');
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }

  return (
    <section className="lessons-workspace">
      <header className="lessons-heading">
        <div>
          <span>От первого вентиля к своей схеме</span>
          <h2>Маленькие задания</h2>
          <p>Предскажите результат, опишите устройство на Verilog и проверьте его симулятором.</p>
        </div>
        <div className="lessons-progress">
          <strong>
            {completed.length}
            <small> / {lessons.length}</small>
          </strong>
          <span>заданий пройдено</span>
          <div>
            <i style={{ width: `${(completed.length / lessons.length) * 100}%` }} />
          </div>
        </div>
      </header>
      <div className="lessons-columns">
        <nav className="lessons-list" aria-label="Учебные задания">
          {lessons.map((item) => (
            <button
              key={item.id}
              className={`lesson-card ${selected === item.id ? 'selected' : ''}`}
              onClick={() => setSelected(item.id)}
            >
              <span className={`lesson-number ${completed.includes(item.id) ? 'completed' : ''}`}>
                {completed.includes(item.id) ? <Check size={17} /> : item.number}
              </span>
              <div>
                <small>{item.level}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="lesson-meta">
                  {item.concept}
                  <b>·</b>
                  {item.minutes} мин
                </span>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
          <div className="lessons-route">
            <BookOpen size={18} />
            <span>
              Каждое задание открывает отдельный проект. Решения остаются в вашей библиотеке.
            </span>
          </div>
        </nav>
        <article className="lesson-detail">
          <div className="lesson-detail-title">
            <span>ЗАДАНИЕ {lesson.number}</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.objective}</p>
          </div>
          <section className="lesson-quiz">
            <h3>
              <span>1</span> Сначала подумайте
            </h3>
            <p>{lesson.question}</p>
            <div>
              {lesson.choices.map((choice, index) => (
                <button
                  key={choice}
                  className={`${quiz === index ? 'chosen' : ''} ${quiz === index && index === lesson.answer ? 'correct' : ''}`}
                  onClick={() => setQuiz(index)}
                >
                  {quiz === index && index === lesson.answer ? <Check size={14} /> : <i />}
                  {choice}
                </button>
              ))}
            </div>
            {quiz !== null && (
              <p className={`lesson-quiz-feedback ${quiz === lesson.answer ? 'correct' : ''}`}>
                {quiz === lesson.answer ? 'Верно. ' : 'Попробуйте ещё раз. '}
                {lesson.explanation}
              </p>
            )}
          </section>
          <section className="lesson-code-step">
            <h3>
              <span>2</span> Опишите устройство
            </h3>
            <div className="lesson-open-row">
              <button
                className="lesson-primary"
                onClick={() => {
                  onLoadProject(structuredClone(lesson.project));
                  onOpenEditor?.();
                }}
              >
                <Code2 size={15} />
                {loaded ? 'Открыть заготовку заново' : 'Открыть заготовку'}
                <ArrowRight size={14} />
              </button>
              {loaded && (
                <button className="lesson-secondary" onClick={onOpenEditor}>
                  Продолжить решение <ArrowRight size={14} />
                </button>
              )}
            </div>
            <small>
              {loaded
                ? 'Заготовка заново заменит код текущего учебного проекта.'
                : `Будет создан проект ${lesson.project.name} с файлом top.v.`}
            </small>
            <button className="lesson-hint-toggle" onClick={() => setHint(!hint)}>
              <Lightbulb size={14} />
              {hint ? 'Скрыть подсказку' : 'Нужна подсказка'}
            </button>
            {hint && <div className="lesson-hint">{lesson.hint}</div>}
          </section>
          <section className="lesson-verify">
            <h3>
              <span>3</span> Проверьте поведение
            </h3>
            <div className="lesson-check-intro">
              <p>
                Проверка запускает ваш текущий проект в Icarus Verilog и сравнивает выход{' '}
                <code>{lesson.output}</code> с ожидаемыми значениями.
              </p>
              <button
                className="lesson-primary"
                disabled={busy || !loaded}
                onClick={() => void verify()}
              >
                {busy ? <LoaderCircle size={15} className="spinning" /> : <Play size={15} />}
                {busy ? 'Проверяем…' : 'Проверить решение'}
              </button>
            </div>
            {!loaded && (
              <p className="lesson-load-note">
                Откройте заготовку задания, затем вернитесь сюда для проверки.
              </p>
            )}
            {busy && (
              <div className="lesson-progress-state">
                <span>{result?.stage ?? 'Подготовка симуляции'}</span>
                <button
                  onClick={() => {
                    controller.current?.abort();
                    generation.current++;
                    setBusy(false);
                  }}
                >
                  <Square size={12} /> Отменить
                </button>
              </div>
            )}
            {error && (
              <div className="lesson-error" role="alert">
                {error}
              </div>
            )}
            {stale && (
              <p className="lesson-stale">Код изменён после проверки. Запустите проверку снова.</p>
            )}
            {verdicts && (
              <div className={`lesson-verdict ${passed ? 'passed' : 'failed'}`} role="status">
                {passed ? <CheckCircle2 size={19} /> : <RotateCcw size={18} />}
                <div>
                  <strong>
                    {passed ? 'Устройство работает как задумано' : 'Есть над чем поработать'}
                  </strong>
                  <span>
                    {verdicts.filter((item) => item.passed).length} из {verdicts.length} проверок
                    прошли{passed ? '. Можно идти дальше.' : '. Сравните входы и выходы в таблице.'}
                  </span>
                </div>
              </div>
            )}
            <div className="lesson-table-wrap">
              <table className="lesson-truth-table">
                <thead>
                  <tr>
                    <th>Проверка</th>
                    <th>Входы</th>
                    <th>Ожидается</th>
                    {verdicts && (
                      <>
                        <th>Ваш выход</th>
                        <th />
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lesson.cases.map((item, index) => {
                    const verdict = verdicts?.[index];
                    return (
                      <tr
                        key={item.cycle}
                        className={verdict ? (verdict.passed ? 'passed' : 'failed') : ''}
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
                          <code>
                            {lesson.output}={item.expected}
                          </code>
                        </td>
                        {verdicts && (
                          <>
                            <td>
                              <code>{verdict?.actual}</code>
                            </td>
                            <td>{verdict?.passed ? <Check size={13} /> : '×'}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {result && (
            <footer className="lesson-simulation-footnote">
              <span>Проверка реальной RTL симуляцией · {result.engine}</span>
              <button onClick={() => setShowLog(!showLog)}>
                {showLog ? 'Скрыть журнал' : 'Журнал'}
              </button>
              {showLog && <pre>{result.logs}</pre>}
            </footer>
          )}
        </article>
      </div>
    </section>
  );
}
