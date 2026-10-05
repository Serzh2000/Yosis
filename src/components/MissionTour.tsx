import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Flag, Lightbulb, LoaderCircle, Minimize2, Play, X } from 'lucide-react';
import type { Project } from '../../shared/types';
import {
  createMissionProject,
  emptyMission,
  MISSION_KEY,
  missionConfig,
  missionExercise,
  missionSimulationProject,
  missionSteps,
  parseMission,
} from '../lib/first-mission';
import type { MissionTab } from '../lib/first-mission';
import { checkLessonTrace } from '../lib/lessons';
import { explainLearningFailure, explainLearningVerdicts } from '../lib/learning-session';
import { runSimulation } from '../lib/simulation-client';
import { getProjectSnapshot } from '../lib/projects';
import { parseVcd, type VcdTrace } from '../lib/vcd';
import './mission-tour.css';

interface Props {
  open: boolean;
  project: Project;
  tab: string;
  busy: boolean;
  simulationAvailable: boolean;
  synthesisFresh: boolean;
  selectedCell: string | null;
  physicalFresh: boolean;
  boardIdentified: boolean;
  programmedSnapshot: string;
  existingNames: string[];
  onClose: () => void;
  onLoad: (project: Project) => void;
  onNavigate: (tab: MissionTab | 'lessons') => void;
  onRestore: (name: string) => void;
  onPreview: (preview: { id: string; vcd: string; snapshot: string; name: string }) => void;
}
function savedMission() {
  try {
    return parseMission(localStorage.getItem(MISSION_KEY));
  } catch {
    return emptyMission();
  }
}
export function MissionTour(props: Props) {
  const [progress, setProgress] = useState(savedMission);
  const [minimized, setMinimized] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [trace, setTrace] = useState<VcdTrace | null>(null);
  const [pinAnswer, setPinAnswer] = useState<number | null>(null);
  const [virtualFinish, setVirtualFinish] = useState(false);
  const [spotlight, setSpotlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const snapshot = getProjectSnapshot(props.project);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const previousSnapshot = useRef(snapshot);
  const step = missionSteps[progress.step];
  const ours = props.project.name === progress.projectName;
  const checked = ours && progress.verifiedSnapshot === snapshot;
  const passed =
    progress.step === 1
      ? ours && props.project.files[0]?.content !== createMissionProject([]).files[0].content
      : progress.step === 2
        ? checked
        : progress.step === 3
          ? checked && props.synthesisFresh
          : progress.step === 4
            ? checked && props.synthesisFresh && props.tab === 'rtl' && !!props.selectedCell
            : progress.step === 5
              ? checked && props.tab === 'constraints' && pinAnswer === 0
              : progress.step === 6
                ? checked && props.physicalFresh
                : progress.step === 7
                  ? checked && props.physicalFresh && props.boardIdentified
                  : progress.step === 8
                    ? checked && props.programmedSnapshot === snapshot
                    : false;

  useEffect(() => {
    try {
      localStorage.setItem(MISSION_KEY, JSON.stringify(progress));
    } catch {
      /* The current session can continue. */
    }
  }, [progress]);
  useEffect(() => {
    if (previousSnapshot.current === snapshot) return;
    previousSnapshot.current = snapshot;
    generation.current++;
    abort.current?.abort();
    setChecking(false);
    setTrace(null);
    setFeedback('');
    if (progress.step > 2 && ours && progress.verifiedSnapshot && !checked)
      setProgress((current) => ({ ...current, step: 1, verifiedSnapshot: '', finished: false }));
  }, [snapshot, progress.step, progress.verifiedSnapshot, ours, checked]);
  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
    },
    [],
  );
  useEffect(() => {
    setMinimized(false);
    setFeedback('');
    setPinAnswer(null);
  }, [progress.step]);
  useEffect(() => {
    if (!props.open || virtualFinish || !step) {
      setSpotlight(null);
      return;
    }
    const element = document.querySelector<HTMLElement>(step.target);
    if (!element) {
      setSpotlight(null);
      return;
    }
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const update = () => {
      const box = element.getBoundingClientRect();
      const next =
        box.width && box.height
          ? { top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }
          : null;
      setSpotlight((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [props.open, props.tab, step, virtualFinish, minimized]);

  function start() {
    if (props.busy) return;
    const project = createMissionProject([...props.existingNames, props.project.name]);
    props.onLoad(project);
    setProgress({
      version: 1,
      projectName: project.name,
      step: 1,
      verifiedSnapshot: '',
      finished: false,
    });
    setVirtualFinish(false);
    props.onNavigate('code');
  }
  function advance() {
    if (!passed) return;
    const next = progress.step + 1;
    setProgress((current) => ({ ...current, step: next }));
    const nextTab = missionSteps[next].tab;
    if (nextTab) props.onNavigate(nextTab);
  }
  async function check() {
    if (checking || !ours || !props.simulationAvailable) return;
    const id = ++generation.current,
      captured = snapshot;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setChecking(true);
    setFeedback('');
    setTrace(null);
    try {
      const copy = missionSimulationProject(props.project);
      const result = await runSimulation(copy, missionConfig, controller.signal);
      if (id !== generation.current || captured !== snapshotRef.current) return;
      const wave = parseVcd(result.vcd!);
      const verdicts = checkLessonTrace(missionExercise, wave);
      setTrace(wave);
      setFeedback(explainLearningVerdicts(verdicts, 'led_n'));
      props.onPreview({
        id: result.id,
        vcd: result.vcd!,
        snapshot: captured,
        name: 'Миссия · маяк · HALF_PERIOD = 4 (копия для симуляции)',
      });
      setProgress((current) => ({
        ...current,
        verifiedSnapshot:
          verdicts.length > 0 && verdicts.every((item) => item.passed) ? captured : '',
      }));
    } catch (cause) {
      if (id === generation.current && !controller.signal.aborted)
        setFeedback(
          explainLearningFailure(String(cause)) +
            ' ' +
            (cause instanceof Error ? cause.message : String(cause)),
        );
    } finally {
      if (id === generation.current) setChecking(false);
    }
  }
  if (!props.open) return null;
  return (
    <>
      {spotlight && !virtualFinish && (
        <div className="mission-spotlight" style={spotlight} aria-hidden="true" />
      )}
      <aside
        className={`mission-guide ${minimized ? 'minimized' : ''}`}
        aria-label="Гид: первая миссия в IDE"
      >
        <header>
          <Flag size={17} />
          <strong>МИССИЯ 01 · МАЯК</strong>
          <span>{progress.step ? `${Math.min(progress.step, 10)} / 10` : 'Старт'}</span>
          <button
            aria-label={minimized ? 'Развернуть задание' : 'Свернуть задание'}
            onClick={() => setMinimized(!minimized)}
          >
            <Minimize2 size={14} />
          </button>
          <button aria-label="Приостановить гид" onClick={props.onClose}>
            <X size={14} />
          </button>
        </header>
        {!minimized && (
          <div className="mission-guide-body">
            {virtualFinish ? (
              <>
                <h2>Виртуальная часть пройдена</h2>
                <p>
                  Твой код прошёл симуляцию, синтез и размещение. Запись на реальную плату ещё не
                  засчитана. Её можно продолжить, когда доступ к отладчику будет готов.
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    setVirtualFinish(false);
                    props.onNavigate('board');
                  }}
                >
                  Вернуться к плате
                </button>
                <button
                  className="mission-link"
                  onClick={() => {
                    props.onClose();
                    props.onNavigate('lessons');
                  }}
                >
                  Продолжить курс Verilog
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="mission-guide-progress">
                  <progress max={10} value={progress.step} />
                  <small>
                    {step.id === 'complete'
                      ? 'Устройство проверено на плате'
                      : step.id === 'brief'
                        ? 'Действуй в самой IDE — подсветка покажет куда'
                        : checked && progress.step >= 2
                          ? 'Код прошёл настоящую симуляцию'
                          : 'Проверяем результат каждого действия'}
                  </small>
                </div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <div className="mission-objective">
                  <Flag size={15} />
                  <span>{step.task}</span>
                </div>
                {progress.step > 0 && !ours ? (
                  <div className="mission-feedback">
                    <span>
                      Сейчас открыт другой проект. Вернись к {progress.projectName}, чтобы
                      продолжить.
                    </span>
                    <button
                      className="button subtle"
                      disabled={props.busy}
                      onClick={() => props.onRestore(progress.projectName)}
                    >
                      Вернуть миссию
                    </button>
                  </div>
                ) : (
                  <>
                    {step.id === 'simulate' && (
                      <button
                        data-tour="mission-check"
                        className="button primary"
                        disabled={checking || !props.simulationAvailable}
                        onClick={() => void check()}
                      >
                        {checking ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : (
                          <Play size={14} />
                        )}{' '}
                        {checking ? 'Проверяем маяк…' : 'Проверить маяк'}
                      </button>
                    )}
                    {feedback && (
                      <p className={`mission-feedback ${checked ? 'success' : ''}`} role="status">
                        <Lightbulb size={14} />
                        {feedback}
                      </p>
                    )}
                    {trace && step.id === 'simulate' && (
                      <p>
                        Диаграммы открыты в рабочей области. Сравни phase и led_n: после смены phase
                        меняется выбранная группа.
                      </p>
                    )}
                    {step.id === 'pins' && (
                      <div
                        className="mission-choices"
                        role="group"
                        aria-label="Уровень включения LED"
                      >
                        {[0, 1].map((value) => (
                          <button
                            key={value}
                            aria-pressed={pinAnswer === value}
                            onClick={() => setPinAnswer(value)}
                          >
                            Уровень {value}
                            {pinAnswer === value && value === 0 && <Check size={14} />}
                          </button>
                        ))}
                        {pinAnswer === 1 && (
                          <small>
                            У LED активный низкий уровень: ток идёт, когда FPGA выдаёт 0. Суффикс _n
                            напоминает об этом.
                          </small>
                        )}
                      </div>
                    )}
                    {step.id === 'observe' && (
                      <div className="mission-observe">
                        <button
                          className="button primary"
                          disabled={props.programmedSnapshot !== snapshot || !checked}
                          onClick={() =>
                            setProgress((current) => ({ ...current, step: 10, finished: true }))
                          }
                        >
                          <Check size={14} />
                          Чередуются две группы по три
                        </button>
                        <button
                          className="mission-link"
                          onClick={() => {
                            setProgress((current) => ({ ...current, step: 7 }));
                            props.onNavigate('board');
                          }}
                        >
                          Результат отличается — проверить загрузку
                        </button>
                      </div>
                    )}
                    {step.id === 'complete' ? (
                      <>
                        <button
                          className="button primary"
                          onClick={() => {
                            props.onClose();
                            props.onNavigate('lessons');
                          }}
                        >
                          Начать курс Verilog
                          <ArrowRight size={14} />
                        </button>
                        <p>
                          Дальше — 11 уроков с задачами, подсказками и проверками. Маяк сохранён в
                          библиотеке проектов.
                        </p>
                      </>
                    ) : (
                      <footer>
                        {step.id === 'brief' ? (
                          <button className="button primary" disabled={props.busy} onClick={start}>
                            Начать миссию
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          step.id !== 'observe' && (
                            <button
                              className="button primary"
                              disabled={!passed || checking}
                              onClick={advance}
                            >
                              {passed ? 'Шаг выполнен. Дальше' : 'Сначала выполни действие'}
                              <ArrowRight size={14} />
                            </button>
                          )
                        )}
                        {step.tab && props.tab !== step.tab && (
                          <button
                            className="mission-link"
                            onClick={() => props.onNavigate(step.tab!)}
                          >
                            К нужной вкладке
                          </button>
                        )}
                      </footer>
                    )}
                    {step.id === 'connect' && (
                      <button
                        className="mission-link"
                        disabled={!checked || !props.physicalFresh}
                        onClick={() => setVirtualFinish(true)}
                      >
                        Продолжить обучение без платы
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
