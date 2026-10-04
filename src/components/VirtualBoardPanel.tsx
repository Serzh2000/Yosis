import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowRight,
  CircuitBoard,
  Download,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
} from 'lucide-react';
import type { Project, SimulationConfig, SimulationResult, YosysNetlist } from '../../shared/types';
import {
  bitLevel,
  boardPorts,
  inputValuesAtTime,
  mergeInputEvent,
  nextStep,
  stepTimes,
  topSignal,
  truthTableScenario,
  type LogicLevel,
} from '../lib/virtual-board';
import {
  boardSimulationSetup,
  deriveWiring,
  hasStateElements,
  inputKey,
  ledState,
  levelOfBinary,
  manualLeds,
  readInputBit,
  releaseCycle,
  writeInputBit,
  type ButtonId,
  type LedBinding,
} from '../lib/board-wiring';
import { parseVcd, type VcdTrace } from '../lib/vcd';
import { formatWaveTime, formatWaveValue, valueAt } from '../lib/waveform';
import { runSimulation } from '../lib/simulation-client';
import { getProjectSnapshot } from '../lib/projects';
import './virtual-board.css';

/** Pressing and releasing in quick succession is sent to the server as one job. */
const DEBOUNCE_MS = 140;
const MAX_TRUTH_TABLE_BITS = 8;
type PressMode = 'hold' | 'latch';
type LiveOutputs = Record<string, string>;

function levelText(level: LogicLevel): string {
  return level === 'x' || level === 'z' ? level.toUpperCase() : level;
}

export function VirtualBoardPanel({
  project,
  rtl,
  onSynthesize,
  synthesisBusy,
  available,
}: {
  project: Project;
  rtl?: YosysNetlist;
  onSynthesize: () => void;
  synthesisBusy: boolean;
  available: boolean;
}) {
  const ports = useMemo(() => boardPorts(project, rtl), [project, rtl]);
  const wiring = useMemo(() => deriveWiring(project, ports), [project, ports]);
  const setup = useMemo(() => boardSimulationSetup(ports, wiring), [ports, wiring]);
  const clocked = setup.clock !== null;
  const outputs = useMemo(() => ports.filter((port) => port.direction === 'output'), [ports]);
  const combinational = useMemo(() => !hasStateElements(rtl, project.top), [rtl, project.top]);
  const signature = `${project.id ?? project.name}:${project.top}:${ports.map((port) => `${port.name}:${port.width}:${port.direction}`).join('|')}:${setup.clock}:${setup.resetOnButton}`;
  const configuredSignature = useRef('');

  // Pad levels, as decimal strings per port, as the pupil currently sees them on the board.
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [trace, setTrace] = useState<VcdTrace | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [liveOutputs, setLiveOutputs] = useState<LiveOutputs | null>(null);
  const [pressMode, setPressMode] = useState<PressMode>('hold');
  const [manualEnabled, setManualEnabled] = useState(false);
  const [manualOutput, setManualOutput] = useState('');
  const [manualBit, setManualBit] = useState(0);
  const [manualActiveLow, setManualActiveLow] = useState(false);

  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const flushTimer = useRef<number | undefined>(undefined);
  const events = useRef<NonNullable<SimulationConfig['stimuli']>>([]);
  const initialInputs = useRef<Record<string, string>>({});
  const pressedAt = useRef<Record<string, number>>({});
  const resumeAfter = useRef(false);
  const liveCache = useRef(new Map<string, LiveOutputs>());
  const liveSnapshot = useRef('');
  const autoLoaded = useRef('');
  const timeRef = useRef(0);
  timeRef.current = time;

  const projectSnapshot = getProjectSnapshot(project);
  const stale = !!snapshot && snapshot !== projectSnapshot;
  const period = setup.config.periodNs;
  const steps = useMemo(() => (trace ? stepTimes(trace, setup.clock) : []), [trace, setup.clock]);

  const ledsFromConstraints = wiring.leds.some((led) => led.ref);
  const manualActive = manualEnabled || !ledsFromConstraints;
  const leds: LedBinding[] = useMemo(
    () =>
      manualActive
        ? manualLeds(ports, manualOutput || outputs[0]?.name || '', manualBit, manualActiveLow)
        : wiring.leds,
    [manualActive, ports, manualOutput, outputs, manualBit, manualActiveLow, wiring.leds],
  );

  /** Binary string of an output port as it is shown right now. */
  const outputBinary = useCallback(
    (name: string): string | undefined => {
      if (!clocked) return liveOutputs?.[name];
      const signal = trace ? topSignal(trace, name) : undefined;
      return signal && trace ? valueAt(signal, time) : undefined;
    },
    [clocked, liveOutputs, trace, time],
  );
  const hasData = clocked ? !!trace : !!liveOutputs;

  const abortAll = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    window.clearTimeout(flushTimer.current);
    flushTimer.current = undefined;
  }, []);

  useEffect(() => {
    if (configuredSignature.current === signature) return;
    configuredSignature.current = signature;
    abortAll();
    setBusy(false);
    setPlaying(false);
    setTrace(null);
    setResult(null);
    setSnapshot('');
    setError('');
    setTime(0);
    setLiveOutputs(null);
    setLevels(setup.config.inputs);
    initialInputs.current = setup.config.inputs;
    events.current = setup.seedStimuli;
    pressedAt.current = {};
    liveCache.current.clear();
    liveSnapshot.current = '';
    autoLoaded.current = '';
    setManualOutput(outputs[0]?.name ?? '');
    setManualBit(0);
  }, [signature, setup, outputs, abortAll]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      window.clearTimeout(flushTimer.current);
      // A remount (React StrictMode in development) must load the board again.
      autoLoaded.current = '';
    },
    [],
  );

  const setBusyState = useCallback((value: boolean) => setBusy(value), []);
  /** Run one job; returns the parsed trace, or null when it was superseded or failed. */
  const runJob = useCallback(
    async (config: SimulationConfig): Promise<VcdTrace | null> => {
      const run = ++generation.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      setBusyState(true);
      setError('');
      try {
        const next = await runSimulation(project, config, abort.signal, (progress) => {
          if (run === generation.current) setResult(progress);
        });
        if (run !== generation.current) return null;
        setResult(next);
        return parseVcd(next.vcd!);
      } catch (failure) {
        if (run === generation.current && !abort.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : 'Не удалось запустить виртуальную плату.',
          );
        return null;
      } finally {
        if (run === generation.current) setBusyState(false);
      }
    },
    [project, setBusyState],
  );

  /** Clocked designs: run the whole timeline with the scheduled button presses. */
  const runTimeline = useCallback(
    async (keepTime: boolean) => {
      const captured = getProjectSnapshot(project);
      const resume = resumeAfter.current;
      resumeAfter.current = false;
      setPlaying(false);
      const scenario = events.current;
      const parsed = await runJob({
        ...setup.config,
        inputs: initialInputs.current,
        stimuli: scenario,
      });
      if (!parsed) return;
      setTrace(parsed);
      setSnapshot(captured);
      setTime(keepTime ? Math.min(timeRef.current, parsed.endTime) : parsed.startTime);
      if (resume) setPlaying(true);
    },
    [project, runJob, setup.config],
  );

  /** Clockless designs: remember every answer, so toggling back and forth is instant. */
  const runLive = useCallback(
    async (values: Record<string, string>) => {
      const key = inputKey(values);
      const captured = getProjectSnapshot(project);
      if (liveSnapshot.current !== captured) {
        liveCache.current.clear();
        liveSnapshot.current = captured;
      }
      const cached = liveCache.current.get(key);
      if (cached) {
        setLiveOutputs(cached);
        return;
      }
      const inputPorts = ports.filter((port) => port.direction === 'input');
      const bits = inputPorts.reduce((sum, port) => sum + port.width, 0);
      const table =
        combinational && !liveCache.current.size && bits <= MAX_TRUTH_TABLE_BITS
          ? truthTableScenario(inputPorts, MAX_TRUTH_TABLE_BITS)
          : null;
      const parsed = await runJob(
        table
          ? { ...setup.config, inputs: table.inputs, stimuli: table.stimuli, cycles: table.cycles }
          : { ...setup.config, inputs: values },
      );
      if (!parsed) return;
      setSnapshot(captured);
      const read = (at: number): LiveOutputs =>
        Object.fromEntries(
          outputs.flatMap((port) => {
            const signal = topSignal(parsed, port.name);
            return signal ? [[port.name, valueAt(signal, at)]] : [];
          }),
        );
      if (table) {
        // One job answers every combination of the inputs: later presses need no server round trip.
        for (let row = 0; row < table.cycles; row++) {
          const at = ((row + 0.75) * period * 1e6) / parsed.timescaleFs;
          liveCache.current.set(
            inputKey(inputValuesAtTime(parsed, at, setup.config.inputs)),
            read(at),
          );
        }
      } else liveCache.current.set(key, read(parsed.endTime));
      setLiveOutputs(liveCache.current.get(key) ?? read(parsed.endTime));
    },
    [combinational, outputs, period, ports, project, runJob, setup.config],
  );

  // Clockless designs follow the pad levels directly (debounced).
  const liveLevels = clocked ? null : levels;
  useEffect(() => {
    if (!liveLevels || !available || !ports.length || synthesisBusy) return;
    if (!Object.keys(liveLevels).length && Object.keys(setup.config.inputs).length) return;
    const key = inputKey(liveLevels);
    const cached = liveSnapshot.current === projectSnapshot && liveCache.current.get(key);
    if (cached) {
      setLiveOutputs(cached);
      return;
    }
    const timer = window.setTimeout(() => void runLive(liveLevels), liveOutputs ? DEBOUNCE_MS : 0);
    return () => window.clearTimeout(timer);
    // The snapshot is read through projectSnapshot: editing the code invalidates the cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLevels, available, ports.length, synthesisBusy, runLive]);

  // Clocked designs load once automatically; later edits are applied by the pressed buttons.
  useEffect(() => {
    if (
      clocked &&
      available &&
      ports.length &&
      !synthesisBusy &&
      autoLoaded.current !== signature
    ) {
      autoLoaded.current = signature;
      void runTimeline(false);
    }
  }, [clocked, available, ports.length, synthesisBusy, signature, runTimeline]);

  useEffect(() => {
    if (!playing || !trace) return;
    const timer = window.setInterval(
      () =>
        setTime((current) => {
          const next = nextStep(steps, current);
          if (next >= trace.endTime) setPlaying(false);
          return next;
        }),
      180,
    );
    return () => window.clearInterval(timer);
  }, [playing, steps, trace]);
  useEffect(() => {
    if (stale) setPlaying(false);
  }, [stale]);
  // Rewinding or playing shows the pad levels that the committed trace had at that moment.
  useEffect(() => {
    if (clocked && trace && !flushTimer.current)
      setLevels(inputValuesAtTime(trace, time, setup.config.inputs));
  }, [clocked, time, trace, setup.config.inputs]);

  const currentCycle = useCallback(
    () =>
      trace
        ? Math.max(
            0,
            Math.min(
              setup.config.cycles - 1,
              Math.floor((timeRef.current * trace.timescaleFs) / (period * 1e6)),
            ),
          )
        : 0,
    [trace, setup.config.cycles, period],
  );

  /** Change one input port. On a clocked board the change happens at the current clock cycle. */
  const changeInput = useCallback(
    (port: string, value: string, hold?: { pressed: boolean }) => {
      setError('');
      setLevels((previous) => ({ ...previous, [port]: value }));
      if (!clocked) return;
      resumeAfter.current = resumeAfter.current || playing;
      setPlaying(false);
      if (!trace || stale) {
        initialInputs.current = { ...initialInputs.current, [port]: value };
      } else {
        let cycle = currentCycle();
        const key = port;
        if (hold?.pressed === true) pressedAt.current[key] = cycle;
        else if (hold?.pressed === false) {
          cycle = releaseCycle(pressedAt.current[key], cycle);
          delete pressedAt.current[key];
        }
        events.current = mergeInputEvent(events.current, cycle, { [port]: value });
      }
      window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = undefined;
        void runTimeline(!!trace && !stale);
      }, DEBOUNCE_MS);
    },
    [clocked, currentCycle, playing, runTimeline, stale, trace],
  );

  function setButton(id: ButtonId, pressed: boolean) {
    const ref = wiring.buttons[id];
    if (!ref) return;
    const next = writeInputBit(levels[ref.port], ref.bit, pressed ? 1 : 0);
    changeInput(ref.port, next, clocked ? { pressed } : undefined);
  }
  const isPressed = (id: ButtonId) => {
    const ref = wiring.buttons[id];
    return !!ref && readInputBit(levels[ref.port], ref.bit) === 1;
  };

  function reload() {
    abortAll();
    setPlaying(false);
    liveCache.current.clear();
    if (clocked) {
      events.current = setup.seedStimuli;
      initialInputs.current = setup.config.inputs;
      pressedAt.current = {};
      setLevels(setup.config.inputs);
      void runTimeline(false);
    } else {
      setLiveOutputs(null);
      void runLive(levels);
    }
  }
  function cancel() {
    abortAll();
    setBusy(false);
    setResult((current) =>
      current ? { ...current, status: 'cancelled', stage: 'Симуляция отменена' } : current,
    );
    setError(
      `Симуляция отменена.${hasData ? ' Плата показывает предыдущую успешную загрузку.' : ''}`,
    );
  }
  function setCursor(next: number) {
    setPlaying(false);
    setTime(next);
  }

  const switchPorts = ports.filter(
    (port) =>
      port.direction === 'input' &&
      port.name !== setup.clock &&
      !(
        port.width === 1 &&
        ([wiring.buttons.S1, wiring.buttons.S2] as const).some((ref) => ref?.port === port.name)
      ),
  );
  const clockLevel =
    clocked && trace && setup.clock ? bitLevel(topSignal(trace, setup.clock), time, 0) : null;
  const ready = hasData && !stale;
  const status = busy
    ? (result?.stage ?? 'Подготовка')
    : stale
      ? 'Код изменился'
      : ready
        ? clocked
          ? 'RTL загружен'
          : 'Реагирует сразу'
        : 'Ожидает проект';
  const wiringLines = [
    wiring.fromConstraints
      ? 'Выводы взяты из файла .cst: светодиоды, кнопки и часы подключены так же, как на настоящей плате.'
      : 'В проекте нет назначений для светодиодов и кнопок платы. Выберите выход для светодиодов ниже.',
  ];

  return (
    <section className="virtual-workspace">
      <header className="virtual-heading">
        <div className="virtual-heading-label">
          <CircuitBoard size={18} />
          <div>
            <strong>Tang Nano 20K</strong>
            <span>
              {clocked
                ? 'Нажимайте кнопки мышью: схема реагирует по тактам'
                : 'Нажимайте кнопки мышью: светодиоды меняются сразу'}
            </span>
          </div>
        </div>
        <button
          className="virtual-primary"
          disabled={busy || synthesisBusy || !available || !ports.length}
          onClick={reload}
        >
          {busy ? <LoaderCircle size={16} className="spinning" /> : <Download size={16} />}{' '}
          {busy ? 'Симуляция…' : ready ? 'Перезапустить' : 'Загрузить RTL'}
        </button>
      </header>
      {!available && (
        <div className="virtual-notice">
          Для работы нужен Icarus Verilog. Выполните <code>npm run setup:iverilog</code> и
          перезапустите сервер.
        </div>
      )}
      {!ports.length && (
        <div className="virtual-notice">
          Сначала синтезируйте проект, чтобы определить его входы и выходы.{' '}
          <button disabled={synthesisBusy} onClick={onSynthesize}>
            Синтезировать <ArrowRight size={14} />
          </button>
        </div>
      )}
      {stale && (
        <div className="virtual-notice">
          Код изменился. Загрузите новую версию проекта в виртуальную плату.
        </div>
      )}
      {error && (
        <div className="virtual-error" role="alert">
          {error}
        </div>
      )}
      <div className="virtual-columns">
        <div className="virtual-lab-card">
          <div className="virtual-card-top">
            <span>
              <code>{project.top}</code>
              <small>
                {clocked ? `такт ${setup.clock}` : 'без тактового сигнала'} · {period} нс
              </small>
            </span>
            <span className={`virtual-status ${ready ? 'ready' : ''}`}>{status}</span>
          </div>
          <div className="vb-scroll">
            <div
              className="vb-board"
              role="group"
              aria-label="Виртуальная плата Tang Nano 20K: шесть светодиодов, кнопки S1 и S2"
            >
              <div className="vb-header vb-header-top" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <div className="vb-usb" aria-hidden="true">
                <span />
                <b>USB-C</b>
              </div>
              <div className="vb-bl616" aria-hidden="true">
                BL616
              </div>
              <div className="vb-fpga" aria-hidden="true">
                <i />
                <strong>GOWIN</strong>
                <span>GW2AR-18</span>
                <small>{project.top}</small>
              </div>
              <div
                className="vb-crystal"
                role="img"
                aria-label={`Генератор 27 МГц: ${clockLevel === null ? 'нет данных' : levelText(clockLevel)}`}
              >
                <span>27 МГц</span>
                <b className={clockLevel === '1' ? 'high' : ''}>
                  {clockLevel === null ? '—' : levelText(clockLevel)}
                </b>
              </div>
              <div className="vb-leds">
                {leds.map((led) => {
                  const level =
                    led.ref && hasData
                      ? levelOfBinary(outputBinary(led.ref.port), led.ref.bit)
                      : null;
                  const state = led.ref && hasData ? ledState(level, led.activeLow) : 'off';
                  const mapped = !!led.ref;
                  const known = mapped && hasData;
                  return (
                    <div className={`vb-led-slot ${mapped ? '' : 'free'}`} key={led.index}>
                      <span
                        className={`vb-led ${known ? state : 'idle'}`}
                        role="img"
                        aria-label={`LED${led.index}: ${
                          !mapped
                            ? 'не подключён'
                            : !known
                              ? 'нет данных'
                              : state === 'on'
                                ? 'горит'
                                : state === 'off'
                                  ? 'не горит'
                                  : `неизвестно (${levelText(level ?? 'x')})`
                        }`}
                        title={
                          mapped
                            ? `${led.ref!.signal} = ${known ? levelText(level ?? 'x') : '?'}${led.activeLow ? ' · горит при 0' : ' · горит при 1'}`
                            : 'К этому светодиоду ничего не подключено'
                        }
                      >
                        {known && state === 'unknown' ? levelText(level ?? 'x') : ''}
                      </span>
                      <b>LED{led.index}</b>
                      <small title={led.ref?.signal}>{led.ref?.signal ?? 'свободен'}</small>
                    </div>
                  );
                })}
              </div>
              <div className="vb-silk" aria-hidden="true">
                <strong>Tang Nano 20K</strong>
                <span>Виртуальная плата Yosis</span>
              </div>
              <div className="vb-buttons">
                {(['S1', 'S2'] as const).map((id) => {
                  const ref = wiring.buttons[id];
                  const pressed = isPressed(id);
                  const pin = id === 'S1' ? 88 : 87;
                  return (
                    <div className="vb-button-slot" key={id}>
                      <button
                        type="button"
                        className={`vb-button ${pressed ? 'pressed' : ''} ${ref ? '' : 'unwired'}`}
                        aria-pressed={pressed}
                        aria-label={`Кнопка ${id}${ref ? `, подключена к ${ref.signal}` : ', не подключена к проекту'}`}
                        title={
                          ref
                            ? pressMode === 'hold'
                              ? `${id}: удерживайте, чтобы держать 1; отпустите, чтобы вернуть 0`
                              : `${id}: нажмите, чтобы зафиксировать 1; нажмите ещё раз, чтобы отпустить`
                            : `Кнопка ${id} не подключена: в .cst нет порта на выводе ${pin}`
                        }
                        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                          if (event.button !== 0 || pressMode !== 'hold' || !ref) return;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setButton(id, true);
                        }}
                        onPointerUp={() => {
                          if (pressMode === 'hold' && ref && isPressed(id)) setButton(id, false);
                        }}
                        onPointerCancel={() => {
                          if (pressMode === 'hold' && ref && isPressed(id)) setButton(id, false);
                        }}
                        onKeyDown={(event) => {
                          if (pressMode !== 'hold' || !ref || event.repeat) return;
                          if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault();
                            setButton(id, true);
                          }
                        }}
                        onKeyUp={(event) => {
                          if (pressMode !== 'hold' || !ref) return;
                          if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault();
                            setButton(id, false);
                          }
                        }}
                        onBlur={() => {
                          if (pressMode === 'hold' && ref && isPressed(id)) setButton(id, false);
                        }}
                        onClick={() => {
                          if (pressMode === 'latch' && ref) setButton(id, !pressed);
                        }}
                      >
                        <span>{id}</span>
                        <b>{ref ? (pressed ? '1' : '0') : '–'}</b>
                      </button>
                      <small>вывод {pin}</small>
                      <small title={ref?.signal}>{ref ? ref.signal : 'нет порта'}</small>
                    </div>
                  );
                })}
              </div>
              <div className="vb-header vb-header-bottom" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            </div>
          </div>
          <div className="vb-legend" aria-label="Обозначения состояний светодиода">
            <span>
              <i className="vb-led on" /> горит
            </span>
            <span>
              <i className="vb-led off" /> не горит
            </span>
            <span>
              <i className="vb-led unknown" /> неизвестно (X или Z)
            </span>
            <span className="vb-press-mode" role="group" aria-label="Как работают кнопки">
              Кнопка:
              {(
                [
                  ['hold', 'держится, пока нажата'],
                  ['latch', 'залипает по клику'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  aria-pressed={pressMode === mode}
                  className={pressMode === mode ? 'active' : ''}
                  onClick={() => {
                    for (const id of ['S1', 'S2'] as const) if (isPressed(id)) setButton(id, false);
                    setPressMode(mode);
                  }}
                >
                  {label}
                </button>
              ))}
            </span>
          </div>
          {clocked && (
            <div className="virtual-playback">
              <button
                title={playing ? 'Пауза' : 'Воспроизвести'}
                aria-label={playing ? 'Пауза' : 'Воспроизвести'}
                disabled={!trace || busy || stale}
                onClick={() => {
                  if (trace && time >= trace.endTime) setTime(trace.startTime);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                title="Следующий такт"
                aria-label="Следующий такт"
                disabled={!trace || busy || stale}
                onClick={() => setCursor(nextStep(steps, time))}
              >
                <SkipForward size={17} />
              </button>
              <button
                title="К началу"
                aria-label="К началу"
                disabled={!trace || busy}
                onClick={() => setCursor(trace?.startTime ?? 0)}
              >
                <RotateCcw size={16} />
              </button>
              <input
                type="range"
                aria-label="Время на виртуальной плате"
                min={trace?.startTime ?? 0}
                max={trace?.endTime || 1}
                step="any"
                value={time}
                disabled={!trace || busy}
                onChange={(event) => setCursor(Number(event.target.value))}
              />
              <code>
                {trace
                  ? formatWaveTime(time, trace.timescaleFs, trace.endTime - trace.startTime)
                  : '0 нс'}
              </code>
            </div>
          )}
          <p className="vb-wiring-note">
            {wiringLines[0]}
            {setup.resetOnButton && !!trace && (
              <>
                {' '}
                Кнопка со сбросом <code>{setup.resetOnButton}</code> удерживается автоматически в
                первые такты.
              </>
            )}
          </p>
          <details className="virtual-footnote" open={!ledsFromConstraints}>
            <summary>Другие выводы: выбрать выход для светодиодов вручную</summary>
            <div className="virtual-mapping">
              <label className="virtual-check">
                <input
                  type="checkbox"
                  checked={manualActive}
                  disabled={!ledsFromConstraints}
                  onChange={(event) => setManualEnabled(event.target.checked)}
                />{' '}
                Не использовать .cst
              </label>
              <label>
                Выход для LED
                <select
                  value={manualOutput}
                  disabled={!manualActive || !outputs.length}
                  onChange={(event) => {
                    setManualOutput(event.target.value);
                    setManualBit(0);
                  }}
                >
                  {!outputs.length && <option value="">Нет выходов</option>}
                  {outputs.map((port) => (
                    <option value={port.name} key={port.name}>
                      {port.name} · {port.width} бит
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Первый бит
                <input
                  type="number"
                  aria-label="Первый бит LED"
                  min="0"
                  disabled={!manualActive}
                  max={Math.max(
                    0,
                    (outputs.find((port) => port.name === manualOutput)?.width ?? 1) - 1,
                  )}
                  value={manualBit}
                  onChange={(event) => setManualBit(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
              <label className="virtual-check">
                <input
                  type="checkbox"
                  checked={manualActiveLow}
                  disabled={!manualActive}
                  onChange={(event) => setManualActiveLow(event.target.checked)}
                />{' '}
                LED горят при 0
              </label>
            </div>
            <p>
              X и Z показаны буквой на светодиоде: уровень ещё не определён. Это функциональная
              модель, без задержек кристалла и аналоговых эффектов.
            </p>
          </details>
        </div>
        <aside className="virtual-controls">
          <div className="virtual-control-card">
            <h3>Другие входы проекта</h3>
            <p>Входы, которые не подключены к кнопкам S1 и S2.</p>
            {!switchPorts.length && (
              <div className="virtual-empty">
                {ports.length
                  ? 'Все входы управляются кнопками платы.'
                  : 'Входы появятся после синтеза.'}
              </div>
            )}
            {switchPorts.map((port) => (
              <div className="virtual-input-row" key={port.name}>
                <label htmlFor={`virtual-${port.name}`}>
                  <code>{port.name}</code>
                  <small>{port.width} бит</small>
                </label>
                {port.width === 1 ? (
                  <button
                    id={`virtual-${port.name}`}
                    role="switch"
                    aria-label={`Вход ${port.name}`}
                    aria-checked={levels[port.name] === '1'}
                    className={`virtual-switch ${levels[port.name] === '1' ? 'on' : ''}`}
                    disabled={stale}
                    onClick={() => changeInput(port.name, levels[port.name] === '1' ? '0' : '1')}
                  >
                    <span />
                    <b>{levels[port.name] === '1' ? '1' : '0'}</b>
                  </button>
                ) : (
                  <input
                    id={`virtual-${port.name}`}
                    aria-label={`Вход ${port.name}`}
                    defaultValue={levels[port.name] ?? '0'}
                    key={`${port.name}:${levels[port.name]}`}
                    disabled={stale}
                    placeholder="0x00"
                    onBlur={(event) => {
                      const text = event.target.value.trim();
                      if (/^(?:\d+|0x[\da-f]+|0b[01]+)$/i.test(text))
                        changeInput(port.name, BigInt(text).toString());
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                  />
                )}
              </div>
            ))}
            {setup.clock && (
              <div className="virtual-automatic">
                <span>Тактирование</span>
                <code>
                  {setup.clock} · {period} нс
                </code>
              </div>
            )}
            {setup.config.reset && (
              <div className="virtual-automatic">
                <span>Сброс в начале</span>
                <code>
                  {setup.config.reset} · {setup.config.resetCycles} такта
                </code>
              </div>
            )}
          </div>
          <div className="virtual-control-card">
            <h3>Значения выходов</h3>
            {outputs.map((port) => {
              const binary = outputBinary(port.name);
              return (
                <div className="virtual-readout" key={port.name}>
                  <code>{port.name}</code>
                  <strong>{binary ? formatWaveValue(binary, port.width, 'hex') : '—'}</strong>
                </div>
              );
            })}
            {!outputs.length && <p>Выходы появятся после синтеза.</p>}
          </div>
          <details className="virtual-control-card virtual-explanation">
            <summary>Как работает модель?</summary>
            <ol>
              <li>Ваш RTL компилируется в Icarus Verilog.</li>
              <li>Симулятор считает значения сигналов и создаёт VCD.</li>
              <li>
                {clocked
                  ? 'Плата воспроизводит их по тактам. Нажатие кнопки добавляет в сценарий изменение входа на текущем такте и пересчитывает его.'
                  : 'В схеме нет тактов, поэтому при каждом нажатии выходы пересчитываются сразу. Ответы запоминаются, повторные нажатия мгновенны.'}
              </li>
            </ol>
          </details>
        </aside>
      </div>
      {busy && (
        <button className="virtual-cancel" onClick={cancel}>
          <Square size={13} /> Отменить симуляцию
        </button>
      )}
      {result && (
        <div className="virtual-run-summary">
          <span>
            {result.engine} {result.toolVersion ? `· ${result.toolVersion}` : ''}
            {result.elapsedMs !== undefined ? ` · ${(result.elapsedMs / 1000).toFixed(1)} с` : ''}
          </span>
          <button onClick={() => setShowLog(!showLog)}>
            {showLog ? 'Скрыть журнал' : 'Журнал симуляции'}
          </button>
        </div>
      )}
      {showLog && result && <pre className="virtual-log">{result.logs}</pre>}
    </section>
  );
}
