import { useEffect, useMemo, useRef, useState } from 'react';
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
  boardPorts,
  bitLevel,
  inputValuesAtTime,
  mergeInputEvent,
  nextStep,
  portBitName,
  simulationDefaults,
  stepTimes,
  topSignal,
} from '../lib/virtual-board';
import { parseVcd, type VcdTrace } from '../lib/vcd';
import { formatWaveTime, formatWaveValue, valueAt } from '../lib/waveform';
import { runSimulation } from '../lib/simulation-client';
import { getProjectSnapshot } from '../lib/projects';
import './virtual-board.css';

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
  const defaults = useMemo(() => simulationDefaults(ports), [ports]);
  const signature = `${project.id ?? project.name}:${project.top}:${ports.map((port) => `${port.name}:${port.width}:${port.direction}`).join('|')}`;
  const configuredSignature = useRef('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [trace, setTrace] = useState<VcdTrace | null>(null);
  const [traceConfig, setTraceConfig] = useState<SimulationConfig | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [initialInputs, setInitialInputs] = useState<Record<string, string>>({});
  const [stimuli, setStimuli] = useState<NonNullable<SimulationConfig['stimuli']>>([]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const [activeLow, setActiveLow] = useState(false);
  const [bitOffset, setBitOffset] = useState(0);
  const [applyCycle, setApplyCycle] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const outputs = useMemo(() => ports.filter((port) => port.direction === 'output'), [ports]);
  const controls = ports.filter(
    (port) =>
      port.direction === 'input' && port.name !== defaults.clock && port.name !== defaults.reset,
  );
  const outputPort = outputs.find((port) => port.name === output);
  const outputSignal = trace && output ? topSignal(trace, output) : undefined;
  const stale = !!snapshot && snapshot !== getProjectSnapshot(project);
  const steps = useMemo(
    () => (trace ? stepTimes(trace, traceConfig?.clock ?? null) : []),
    [trace, traceConfig?.clock],
  );

  useEffect(() => {
    if (configuredSignature.current === signature) return;
    configuredSignature.current = signature;
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setPlaying(false);
    setTrace(null);
    setTraceConfig(null);
    setResult(null);
    setSnapshot('');
    setError('');
    setInputs(defaults.inputs);
    setInitialInputs(defaults.inputs);
    setStimuli([]);
    setTime(0);
    setApplyCycle(0);
    setOutput(outputs[0]?.name ?? '');
    setBitOffset(0);
    setActiveLow(false);
  }, [signature, defaults, outputs]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
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
  useEffect(() => {
    if (!trace || !traceConfig) return;
    setApplyCycle(
      Math.min(
        traceConfig.cycles - 1,
        Math.floor((time * trace.timescaleFs) / (traceConfig.periodNs * 1e6)),
      ),
    );
    setInputs(inputValuesAtTime(trace, time, traceConfig.inputs));
  }, [time, trace, traceConfig]);

  async function simulate(
    base: Record<string, string>,
    events: NonNullable<SimulationConfig['stimuli']>,
    focusCycle?: number,
  ) {
    const run = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const captured = getProjectSnapshot(project);
    setBusy(true);
    setPlaying(false);
    setError('');
    try {
      const next = await runSimulation(
        project,
        { ...defaults, inputs: base, stimuli: events },
        abort.signal,
        (progress) => {
          if (run === generation.current) setResult(progress);
        },
      );
      if (run !== generation.current) return;
      const parsed = parseVcd(next.vcd!);
      setTrace(parsed);
      setTraceConfig(next.config);
      setSnapshot(captured);
      setInitialInputs(base);
      setStimuli(events);
      setTime(
        focusCycle === undefined
          ? parsed.startTime
          : Math.min(
              parsed.endTime,
              ((focusCycle + 0.75) * defaults.periodNs * 1e6) / parsed.timescaleFs,
            ),
      );
    } catch (failure) {
      if (run === generation.current && !abort.signal.aborted) {
        setError(
          `${failure instanceof Error ? failure.message : 'Не удалось запустить виртуальную плату.'}${trace ? ' Плата показывает предыдущую успешную загрузку.' : ''}`,
        );
        if (trace && traceConfig) setInputs(inputValuesAtTime(trace, time, traceConfig.inputs));
      }
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }

  function apply(nextInputs = inputs, changedInput?: string) {
    if (!trace || stale) {
      void simulate(nextInputs, []);
      return;
    }
    const cycle = Math.max(0, Math.min(defaults.cycles - 1, applyCycle));
    const current = inputValuesAtTime(
      trace,
      ((cycle + 0.75) * defaults.periodNs * 1e6) / trace.timescaleFs,
      initialInputs,
    );
    const changes = changedInput
      ? { [changedInput]: nextInputs[changedInput] }
      : Object.fromEntries(
          Object.entries(nextInputs).filter(([name, value]) => value !== current[name]),
        );
    if (!Object.keys(changes).length) return;
    const events = mergeInputEvent(stimuli, cycle, changes);
    void simulate(initialInputs, events, cycle);
  }

  function setCursor(next: number) {
    setTime(next);
    if (trace)
      setApplyCycle(
        Math.min(
          defaults.cycles - 1,
          Math.floor((next * trace.timescaleFs) / (defaults.periodNs * 1e6)),
        ),
      );
  }

  function cancel() {
    controller.current?.abort();
    generation.current++;
    setBusy(false);
    setResult((current) =>
      current ? { ...current, status: 'cancelled', stage: 'Симуляция отменена' } : current,
    );
    setError(
      `Симуляция отменена.${trace ? ' Плата показывает предыдущую успешную загрузку.' : ''}`,
    );
    if (trace && traceConfig) setInputs(inputValuesAtTime(trace, time, traceConfig.inputs));
  }

  return (
    <section className="virtual-workspace">
      <header className="virtual-heading">
        <div className="virtual-heading-label">
          <CircuitBoard size={18} />
          <div>
            <strong>Tang Nano 20K</strong>
            <span>Переключайте входы и наблюдайте выходы по тактам</span>
          </div>
        </div>
        <button
          className="virtual-primary"
          disabled={busy || synthesisBusy || !available || !ports.length}
          onClick={() => void simulate(inputs, [])}
        >
          {busy ? <LoaderCircle size={16} className="spinning" /> : <Download size={16} />}{' '}
          {busy ? 'Симуляция…' : 'Загрузить RTL'}
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
              <small>6 индикаторов</small>
            </span>
            <span className={`virtual-status ${trace && !stale ? 'ready' : ''}`}>
              {busy
                ? (result?.stage ?? 'Подготовка')
                : trace && !stale
                  ? 'RTL загружен'
                  : 'Ожидает проект'}
            </span>
          </div>
          <div className="virtual-pcb" aria-label="Виртуальная FPGA и шесть индикаторов">
            <div className="virtual-pcb-hole hole-a" />
            <div className="virtual-pcb-hole hole-b" />
            <div className="virtual-pcb-hole hole-c" />
            <div className="virtual-pcb-hole hole-d" />
            <div className="virtual-usb">
              <span />
            </div>
            <div className="virtual-connector top-connector">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <div className="virtual-chip">
              <div className="virtual-chip-mark" />
              <strong>GOWIN</strong>
              <span>GW2AR · 18K LUT</span>
              <small>{project.top}</small>
            </div>
            <div className="virtual-crystal">
              <span>CLK</span>
              <strong>
                {defaults.clock && trace
                  ? bitLevel(topSignal(trace, defaults.clock), time, 0).toUpperCase()
                  : '—'}
              </strong>
            </div>
            <div className="virtual-led-bank">
              {Array.from({ length: 6 }, (_, index) => {
                const bit = bitOffset + index;
                const mapped = !!outputPort && bit < outputPort.width;
                const level = mapped && trace ? bitLevel(outputSignal, time, bit) : 'x';
                const lit = mapped && trace && (activeLow ? level === '0' : level === '1');
                const unknown = mapped && trace && (level === 'x' || level === 'z');
                const label = mapped ? portBitName(outputPort, bit) : '—';
                return (
                  <div className="virtual-led-slot" key={index}>
                    <span
                      className={`virtual-led ${lit ? 'lit' : ''} ${unknown ? 'unknown' : ''}`}
                      role="img"
                      aria-label={`LED ${index + 1}: ${mapped ? `${label}, ${trace ? level.toUpperCase() : 'нет данных'}` : 'не назначен'}`}
                    />
                    <b>D{index + 1}</b>
                    <small>{label}</small>
                  </div>
                );
              })}
            </div>
            <div className="virtual-silk">
              YOSIS · VIRTUAL LAB <span>FUNCTIONAL RTL</span>
            </div>
            <div className="virtual-connector bottom-connector">
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
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
              onClick={() => {
                setPlaying(false);
                setCursor(nextStep(steps, time));
              }}
            >
              <SkipForward size={17} />
            </button>
            <button
              title="К началу"
              aria-label="К началу"
              disabled={!trace || busy}
              onClick={() => {
                setPlaying(false);
                setCursor(trace?.startTime ?? 0);
              }}
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
              onChange={(event) => {
                setPlaying(false);
                setCursor(Number(event.target.value));
              }}
            />
            <code>
              {trace
                ? formatWaveTime(time, trace.timescaleFs, trace.endTime - trace.startTime)
                : '0 нс'}
            </code>
          </div>
          <div className="virtual-mapping">
            <label>
              Выход для LED
              <select
                value={output}
                onChange={(event) => {
                  setOutput(event.target.value);
                  setBitOffset(0);
                }}
                disabled={!outputs.length}
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
                max={Math.max(0, (outputPort?.width ?? 1) - 1)}
                value={bitOffset}
                onChange={(event) =>
                  setBitOffset(
                    Math.max(0, Math.min((outputPort?.width ?? 1) - 1, Number(event.target.value))),
                  )
                }
              />
            </label>
            <label className="virtual-check">
              <input
                type="checkbox"
                checked={activeLow}
                onChange={(event) => setActiveLow(event.target.checked)}
              />{' '}
              LED активны при 0
            </label>
          </div>
          <details className="virtual-footnote">
            <summary>Что показывают индикаторы?</summary>
            <p>
              Индикаторы показывают выбранные биты портов проекта. X и Z отмечены янтарным. Это
              функциональная модель, без задержек кристалла и аналоговых эффектов.
            </p>
          </details>
        </div>
        <aside className="virtual-controls">
          <div className="virtual-control-card">
            <h3>Входы проекта</h3>
            <p>Переключатель меняет уровень на выбранном такте.</p>
            {!controls.length && (
              <div className="virtual-empty">
                {ports.length
                  ? 'У проекта нет управляемых входов.'
                  : 'Входы появятся после синтеза.'}
              </div>
            )}
            {controls.map((port) => (
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
                    aria-checked={inputs[port.name] === '1'}
                    className={`virtual-switch ${inputs[port.name] === '1' ? 'on' : ''}`}
                    disabled={busy || stale}
                    onClick={() => {
                      const next = {
                        ...inputs,
                        [port.name]: inputs[port.name] === '1' ? '0' : '1',
                      };
                      setInputs(next);
                      if (trace) apply(next, port.name);
                    }}
                  >
                    <span />
                    <b>{inputs[port.name] === '1' ? '1' : '0'}</b>
                  </button>
                ) : (
                  <input
                    id={`virtual-${port.name}`}
                    aria-label={`Вход ${port.name}`}
                    value={inputs[port.name] ?? '0'}
                    disabled={busy || stale}
                    onChange={(event) => setInputs({ ...inputs, [port.name]: event.target.value })}
                    placeholder="0x00"
                  />
                )}
              </div>
            ))}
            <div className="virtual-apply">
              <label>
                Применить на такте
                <input
                  type="number"
                  min="0"
                  max={defaults.cycles - 1}
                  value={applyCycle}
                  onChange={(event) => {
                    const cycle = Math.max(
                      0,
                      Math.min(defaults.cycles - 1, Number(event.target.value)),
                    );
                    setPlaying(false);
                    if (trace)
                      setCursor(
                        Math.min(
                          trace.endTime,
                          ((cycle + 0.75) * defaults.periodNs * 1e6) / trace.timescaleFs,
                        ),
                      );
                    else setApplyCycle(cycle);
                  }}
                />
              </label>
              <button
                disabled={!trace || busy || stale || !controls.length}
                onClick={() => apply()}
              >
                Применить входы
              </button>
            </div>
            {defaults.clock && (
              <div className="virtual-automatic">
                <span>Тактирование</span>
                <code>
                  {defaults.clock} · {defaults.periodNs} нс
                </code>
              </div>
            )}
            {defaults.reset && (
              <div className="virtual-automatic">
                <span>Сброс в начале</span>
                <code>
                  {defaults.reset} · {defaults.resetCycles} такта
                </code>
              </div>
            )}
          </div>
          <div className="virtual-control-card">
            <h3>Значения выходов</h3>
            {outputs.map((port) => {
              const signal = trace ? topSignal(trace, port.name) : undefined;
              return (
                <div className="virtual-readout" key={port.name}>
                  <code>{port.name}</code>
                  <strong>
                    {signal ? formatWaveValue(valueAt(signal, time), signal.width, 'hex') : '—'}
                  </strong>
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
                Плата воспроизводит эти значения по тактам. Изменение входов повторно вычисляет
                сценарий.
              </li>
            </ol>
            <span>
              {stimuli.length
                ? `Изменений входов в сценарии: ${stimuli.length}`
                : 'Входы постоянны до первого изменения.'}
            </span>
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
