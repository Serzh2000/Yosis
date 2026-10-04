import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  LoaderCircle,
  Play,
  SlidersHorizontal,
  Square,
  Upload,
  X,
} from 'lucide-react';
import type { Project, SimulationConfig, SimulationResult, YosysNetlist } from '../../shared/types';
import { downloadText, getProjectSnapshot, validateProject } from '../lib/projects';
import { parseVcd, type VcdTrace, type VcdSignal } from '../lib/vcd';
import { runSimulation } from '../lib/simulation-client';
import {
  boardPorts,
  builtinTruthTableScenario,
  simulationDefaults,
  truthTableScenario,
} from '../lib/virtual-board';
import { WaveformViewer } from './WaveformViewer';
import './simulation.css';

const pluralRules = new Intl.PluralRules('ru');
function countLabel(value: number, words: [string, string, string]) {
  const form = pluralRules.select(value);
  return `${value} ${words[form === 'one' ? 0 : form === 'few' ? 1 : 2]}`;
}

export function SimulationPanel({
  project,
  projectSession = 0,
  rtl,
  onSynthesize,
  synthesisBusy,
  available,
  guidedPreview,
  onRevealSignal,
  canRevealSignal,
}: {
  project: Project;
  projectSession?: number;
  rtl?: YosysNetlist;
  onSynthesize: () => void;
  synthesisBusy: boolean;
  available: boolean;
  guidedPreview?: { id: string; vcd: string; snapshot: string; name: string } | null;
  onRevealSignal?: (signal: VcdSignal) => void;
  canRevealSignal?: (signal: VcdSignal) => boolean;
}) {
  const inputPorts = useMemo(
    () =>
      Object.entries(rtl?.modules[project.top]?.ports ?? {}).filter(
        ([, port]) => port.direction === 'input',
      ),
    [rtl, project.top],
  );
  const portSignature = inputPorts.map(([name, port]) => `${name}:${port.bits.length}`).join('|');
  const [clock, setClock] = useState('');
  const [reset, setReset] = useState('');
  const [resetActiveLow, setResetActiveLow] = useState(false);
  const [cycles, setCycles] = useState(32);
  const [periodNs, setPeriodNs] = useState(10);
  const [resetCycles, setResetCycles] = useState(2);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [stimuli, setStimuli] = useState<Array<{ cycle: number; inputs: Record<string, string> }>>(
    [],
  );
  const [scenario, setScenario] = useState<'prepared' | 'truth-table' | 'constant' | 'manual'>(
    'constant',
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [trace, setTrace] = useState<VcdTrace | null>(null);
  const [vcd, setVcd] = useState('');
  const [traceName, setTraceName] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'run' | 'inputs' | 'sequence'>('inputs');
  const settingsId = useId();
  const [showLogs, setShowLogs] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const runController = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const configuredPorts = useRef('');
  const busy = submitting;
  const stale = !!snapshot && snapshot !== getProjectSnapshot(project);

  useEffect(
    () => () => {
      generation.current++;
      runController.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!guidedPreview || guidedPreview.snapshot !== getProjectSnapshot(project)) return;
    generation.current++;
    runController.current?.abort();
    inFlight.current = false;
    setSubmitting(false);
    setResult(null);
    setTrace(parseVcd(guidedPreview.vcd));
    setVcd(guidedPreview.vcd);
    setTraceName(guidedPreview.name);
    setSnapshot(guidedPreview.snapshot);
    setError('');
    setShowSettings(false);
  }, [guidedPreview, project]);

  useEffect(() => {
    generation.current++;
    runController.current?.abort();
    inFlight.current = false;
    configuredPorts.current = '';
    setSubmitting(false);
    setResult(null);
    setTrace(null);
    setVcd('');
    setTraceName('');
    setSnapshot('');
    setError('');
    setClock('');
    setReset('');
    setInputs({});
    setStimuli([]);
    setScenario('constant');
    setCycles(32);
    setPeriodNs(10);
    setResetCycles(2);
    setShowSettings(false);
    setSettingsTab('inputs');
    setShowLogs(false);
  }, [projectSession]);

  useEffect(() => {
    if (!portSignature || portSignature === configuredPorts.current) return;
    const firstConfiguration = !configuredPorts.current;
    configuredPorts.current = portSignature;
    const ports = boardPorts(project, rtl);
    const defaults = simulationDefaults(ports);
    if (firstConfiguration) {
      const prepared = builtinTruthTableScenario(project, ports);
      setClock(defaults.clock ?? '');
      setReset(defaults.reset ?? '');
      setResetActiveLow(defaults.resetActiveLow);
      setResetCycles(defaults.resetCycles);
      setInputs(prepared?.inputs ?? defaults.inputs);
      setStimuli(prepared?.stimuli ?? []);
      setCycles(prepared?.cycles ?? 32);
      setScenario(prepared ? 'prepared' : 'constant');
    } else {
      // Keep the user's values and sequence when editing adds or removes ports.
      const names = new Set(inputPorts.map(([name]) => name));
      setClock((current) => (names.has(current) ? current : ''));
      setReset((current) => (names.has(current) ? current : ''));
      setInputs((previous) =>
        Object.fromEntries(
          inputPorts.map(([name]) => [name, previous[name] ?? defaults.inputs[name] ?? '0']),
        ),
      );
      setStimuli((previous) =>
        previous.map((event) => ({
          ...event,
          inputs: Object.fromEntries(
            Object.entries(event.inputs).filter(([name]) => names.has(name)),
          ),
        })),
      );
      setScenario('manual');
    }
    // Keep settings while a new build temporarily has no netlist.
  }, [portSignature, projectSession, project, rtl, inputPorts]);

  function editScenario() {
    setScenario('manual');
  }

  function enumerateInputs() {
    const next = truthTableScenario(
      boardPorts(project, rtl).filter((port) => port.name !== clock && port.name !== reset),
      8,
      reset ? resetCycles : 0,
    );
    if (!next || busy) return;
    setInputs(next.inputs);
    setStimuli(next.stimuli);
    setCycles(next.cycles);
    setScenario('truth-table');
    setShowSettings(true);
    setError('');
  }

  async function start() {
    if (busy || inFlight.current || !rtl || !available) return;
    const run = ++generation.current;
    runController.current?.abort();
    const controller = new AbortController();
    runController.current = controller;
    const sourceSnapshot = getProjectSnapshot(project);
    setError('');
    try {
      const validated = validateProject(project);
      const config: SimulationConfig = {
        clock: clock || null,
        reset: reset || null,
        resetActiveLow,
        cycles,
        periodNs,
        resetCycles,
        inputs: Object.fromEntries(
          inputPorts
            .filter(([name]) => name !== clock && name !== reset)
            .map(([name]) => [name, inputs[name] || '0']),
        ),
        stimuli: stimuli.map((event) => ({
          cycle: event.cycle,
          inputs: Object.fromEntries(
            inputPorts
              .filter(([name]) => name !== clock && name !== reset)
              .map(([name]) => [name, event.inputs[name] ?? inputs[name] ?? '0']),
          ),
        })),
      };
      inFlight.current = true;
      setSubmitting(true);
      let accepted = false;
      const next = await runSimulation(validated, config, controller.signal, (progress) => {
        if (run !== generation.current || controller.signal.aborted) return;
        if (!accepted) {
          accepted = true;
          setSnapshot(sourceSnapshot);
          setTrace(null);
          setVcd('');
          setTraceName(`${validated.top} · RTL`);
        }
        setResult(progress);
      });
      if (run !== generation.current) return;
      setTrace(parseVcd(next.vcd!));
      setVcd(next.vcd!);
      setTraceName(`${next.top} · RTL`);
      setShowSettings(false);
    } catch (cause) {
      if (run === generation.current && !controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Не удалось запустить симуляцию.');
    } finally {
      if (run === generation.current) {
        inFlight.current = false;
        setSubmitting(false);
      }
    }
  }

  function cancel() {
    runController.current?.abort();
    generation.current++;
    inFlight.current = false;
    setSubmitting(false);
    setResult((current) =>
      current ? { ...current, status: 'cancelled', stage: 'Симуляция отменена' } : current,
    );
    setError('Симуляция отменена.');
  }

  async function importVcd(file?: File) {
    if (!file || busy || inFlight.current) return;
    const run = ++generation.current;
    runController.current?.abort();
    if (importRef.current) importRef.current.value = '';
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('Размер VCD превышает 16 МБ.');
      const text = await file.text();
      if (run !== generation.current) return;
      const parsed = parseVcd(text);
      setResult(null);
      setSnapshot('');
      setTrace(parsed);
      setVcd(text);
      setTraceName(file.name);
      setError('');
      setShowSettings(false);
    } catch (cause) {
      if (run === generation.current)
        setError(cause instanceof Error ? cause.message : 'Не удалось открыть VCD.');
    }
  }

  const singlePorts = inputPorts.filter(([, port]) => port.bits.length === 1);
  const controlledPorts = inputPorts.filter(([name]) => name !== clock && name !== reset);
  const canEnumerate = !!truthTableScenario(
    controlledPorts.map(([name, port]) => ({ name, width: port.bits.length, direction: 'input' })),
    8,
    reset ? resetCycles : 0,
  );
  const combinationsLabel = countLabel(stimuli.length + 1, [
    'комбинация',
    'комбинации',
    'комбинаций',
  ]);
  const periodsLabel = countLabel(cycles, ['период', 'периода', 'периодов']);
  const scenarioLabel =
    scenario === 'prepared' || scenario === 'truth-table'
      ? `Перебор · ${combinationsLabel}`
      : scenario === 'constant'
        ? 'Постоянные входы'
        : `Свои шаги · ${stimuli.length}`;
  const settingsTabs = [
    ['run', 'Запуск'],
    ['inputs', 'Входы'],
    ['sequence', `Последовательность ${stimuli.length}`],
  ] as const;
  return (
    <div className="simulation-panel">
      <div className="simulation-toolbar">
        <div className="simulation-title">
          <strong>{traceName || `${project.top} · RTL`}</strong>
          <span>
            {busy
              ? 'Симуляция выполняется…'
              : result?.status === 'error'
                ? 'Ошибка симуляции'
                : result?.status === 'cancelled'
                  ? 'Симуляция отменена'
                  : trace
                    ? `${trace.signals.length} сигналов`
                    : 'Готов к запуску'}
          </span>
        </div>
        <div className="simulation-actions">
          <button
            type="button"
            className={`button subtle simulation-scenario-button${showSettings ? ' is-active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Параметры симуляции"
            aria-expanded={showSettings}
            aria-controls={settingsId}
            title="Настроить запуск, начальные входы и последовательность"
          >
            <SlidersHorizontal size={13} />
            <span>{inputPorts.length ? scenarioLabel : 'Параметры'}</span>
          </button>
          <button
            type="button"
            className="button subtle"
            disabled={busy}
            onClick={() => importRef.current?.click()}
          >
            <Upload size={13} />
            Открыть VCD
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".vcd,text/plain"
            hidden
            onChange={(event) => void importVcd(event.target.files?.[0])}
          />
          <button
            type="button"
            className="icon-button"
            disabled={!vcd}
            aria-label="Скачать VCD"
            onClick={() => downloadText('wave.vcd', vcd, 'text/plain')}
          >
            <ArrowDownToLine size={15} />
          </button>
          {busy ? (
            <button type="button" className="button stop" onClick={cancel}>
              <Square size={12} />
              Остановить симуляцию
            </button>
          ) : (
            <button
              type="button"
              className="button primary"
              disabled={!rtl || !available}
              title={
                available
                  ? 'Запустить функциональную симуляцию'
                  : 'Для запуска нужен локальный Icarus Verilog'
              }
              onClick={() => void start()}
            >
              <Play size={13} fill="currentColor" />
              Симулировать
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="simulation-error" role="alert">
          {error}
        </div>
      )}
      {result?.status === 'error' && (
        <div className="simulation-error" role="alert">
          {result.error || 'Подробности ошибки доступны в журнале симуляции.'}
        </div>
      )}
      {stale && trace && (
        <div className="simulation-stale">
          Исходники изменены. Диаграмма относится к предыдущему запуску.
        </div>
      )}
      <div className="simulation-workspace">
        <div className="simulation-view">
          {trace ? (
            <WaveformViewer
              trace={trace}
              onRevealSignal={onRevealSignal}
              canRevealSignal={(signal) => !!snapshot && !stale && !!canRevealSignal?.(signal)}
            />
          ) : (
            <div className="simulation-empty">
              {busy ? (
                <>
                  <LoaderCircle size={20} className="spin" />
                  <strong>Моделируем RTL…</strong>
                  <span>{result?.stage || 'Подготовка проекта'}</span>
                </>
              ) : (
                <>
                  <strong>Посмотрите, как меняются сигналы</strong>
                  <span>
                    {available
                      ? inputPorts.length
                        ? `${scenarioLabel}. ${periodsLabel} по ${periodNs} нс. Запустите симуляцию или настройте входы.`
                        : 'Синтезируйте проект, чтобы получить его входы. Можно также открыть готовый VCD.'
                      : 'Для запуска нужен Icarus Verilog. Готовый VCD можно открыть сразу.'}
                  </span>
                  {!rtl ? (
                    <button
                      type="button"
                      className="button subtle"
                      disabled={synthesisBusy}
                      onClick={onSynthesize}
                    >
                      Сначала синтезировать проект
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button subtle"
                      onClick={() => setShowSettings(true)}
                    >
                      Настроить сценарий
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {showSettings && (
          <aside
            className="simulation-configuration"
            id={settingsId}
            aria-label="Сценарий симуляции"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setShowSettings(false);
                document
                  .querySelector<HTMLButtonElement>(`[aria-controls="${settingsId}"]`)
                  ?.focus();
              }
            }}
          >
            <div className="simulation-configuration-heading">
              <strong>Сценарий</strong>
              <span>
                {periodsLabel} · {periodNs} нс
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="Закрыть параметры симуляции"
                onClick={() => setShowSettings(false)}
              >
                <X size={15} />
              </button>
            </div>
            <div
              className="simulation-settings-tabs"
              role="tablist"
              aria-label="Разделы настроек симуляции"
            >
              {settingsTabs.map(([id, label], index) => (
                <button
                  type="button"
                  key={id}
                  id={`${settingsId}-${id}`}
                  role="tab"
                  aria-selected={settingsTab === id}
                  aria-controls={`${settingsId}-content`}
                  tabIndex={settingsTab === id ? 0 : -1}
                  onClick={() => setSettingsTab(id)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === 'ArrowRight'
                        ? (index + 1) % settingsTabs.length
                        : event.key === 'ArrowLeft'
                          ? (index + settingsTabs.length - 1) % settingsTabs.length
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? settingsTabs.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      setSettingsTab(settingsTabs[next][0]);
                      const tabButtons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        );
                      tabButtons?.[next]?.focus();
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="simulation-settings-content"
              id={`${settingsId}-content`}
              role="tabpanel"
              aria-labelledby={`${settingsId}-${settingsTab}`}
            >
              {settingsTab === 'run' && (
                <div className="simulation-settings">
                  <label>
                    Тактовый вход
                    <select
                      aria-label="Тактовый вход"
                      value={clock}
                      disabled={busy}
                      onChange={(event) => {
                        editScenario();
                        setClock(event.target.value);
                        if (event.target.value === reset) setReset('');
                      }}
                    >
                      <option value="">Без тактового входа</option>
                      {singlePorts.map(([name]) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Сброс
                    <select
                      aria-label="Сигнал сброса"
                      value={reset}
                      disabled={busy}
                      onChange={(event) => {
                        editScenario();
                        setReset(event.target.value);
                        setResetActiveLow(/(?:_n|rstn|resetn)$/i.test(event.target.value));
                      }}
                    >
                      <option value="">Без сброса</option>
                      {singlePorts
                        .filter(([name]) => name !== clock)
                        .map(([name]) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Период, нс
                    <input
                      aria-label="Период тактового сигнала, нс"
                      type="number"
                      min="1"
                      max="1000000"
                      value={periodNs}
                      disabled={busy}
                      onChange={(event) => {
                        editScenario();
                        setPeriodNs(Number(event.target.value));
                      }}
                    />
                  </label>
                  <label>
                    Циклов
                    <input
                      aria-label="Число циклов"
                      type="number"
                      min="1"
                      max="10000"
                      value={cycles}
                      disabled={busy}
                      onChange={(event) => {
                        editScenario();
                        setCycles(Number(event.target.value));
                      }}
                    />
                  </label>
                  {reset && (
                    <>
                      <label>
                        Циклов сброса
                        <input
                          aria-label="Циклов сброса"
                          type="number"
                          min="0"
                          max="10000"
                          value={resetCycles}
                          disabled={busy}
                          onChange={(event) => setResetCycles(Number(event.target.value))}
                        />
                      </label>
                      <label className="simulation-checkbox">
                        <input
                          type="checkbox"
                          checked={resetActiveLow}
                          disabled={busy}
                          onChange={(event) => setResetActiveLow(event.target.checked)}
                        />
                        Активный 0
                      </label>
                    </>
                  )}
                  <p className="simulation-settings-note">
                    {clock
                      ? 'Период задаёт полный цикл тактового сигнала. Входы меняются в начале периода.'
                      : 'Без тактового входа период задаёт интервал между изменениями входов.'}
                  </p>
                </div>
              )}
              {settingsTab === 'inputs' && (
                <>
                  <div
                    className="simulation-input-modes"
                    role="group"
                    aria-label="Режим входных воздействий"
                  >
                    <button
                      type="button"
                      className="button subtle"
                      aria-pressed={scenario === 'prepared' || scenario === 'truth-table'}
                      disabled={busy || !canEnumerate}
                      title={
                        canEnumerate
                          ? 'Все комбинации, по одной за период. Заменяет текущую последовательность.'
                          : 'Перебор доступен для 1–8 битов входных данных.'
                      }
                      onClick={enumerateInputs}
                    >
                      Перебрать входы
                    </button>
                    <button
                      type="button"
                      className="button subtle"
                      aria-pressed={scenario === 'constant'}
                      disabled={busy}
                      onClick={() => {
                        setStimuli([]);
                        setScenario('constant');
                      }}
                    >
                      Постоянные входы
                    </button>
                  </div>
                  <p className="simulation-settings-note">
                    {scenario === 'prepared' || scenario === 'truth-table'
                      ? `Все сочетания от нулей до единиц: ${combinationsLabel}.${reset && resetCycles ? ' После периодов сброса.' : ''} Каждый шаг можно изменить в «Последовательности».`
                      : !stimuli.length
                        ? 'Эти уровни сохраняются весь запуск. Для изменений добавьте шаги в «Последовательности».'
                        : 'Начальные уровни действуют до первого изменения в «Последовательности».'}
                  </p>
                  <div className="simulation-input-values">
                    {controlledPorts.map(([name, port]) => (
                      <label key={name}>
                        <span>
                          <strong>{name}</strong>
                          <small>{port.bits.length} бит</small>
                        </span>
                        <input
                          aria-label={`Значение входа ${name}`}
                          value={inputs[name] ?? '0'}
                          placeholder="0, 0xFF, 0b10"
                          disabled={busy}
                          onChange={(event) => {
                            editScenario();
                            setInputs((previous) => ({ ...previous, [name]: event.target.value }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {!controlledPorts.length && (
                    <p className="simulation-settings-note">
                      Свободных входов нет. Такт и сброс задаются в «Запуске».
                    </p>
                  )}
                </>
              )}
              {settingsTab === 'sequence' && (
                <>
                  <p className="simulation-settings-note">
                    Изменение в начале периода. Первый период — 0. Начальные уровни заданы во
                    «Входах».
                  </p>
                  <div className="simulation-stimuli-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Период</th>
                          {controlledPorts.map(([name]) => (
                            <th key={name}>{name}</th>
                          ))}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {stimuli.map((event, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                aria-label={`Период шага ${index + 1}`}
                                type="number"
                                min="0"
                                max={cycles - 1}
                                value={event.cycle}
                                disabled={busy}
                                onChange={(e) => {
                                  editScenario();
                                  setStimuli((previous) =>
                                    previous.map((row, i) =>
                                      i === index ? { ...row, cycle: Number(e.target.value) } : row,
                                    ),
                                  );
                                }}
                              />
                            </td>
                            {controlledPorts.map(([name]) => (
                              <td key={name}>
                                <input
                                  aria-label={`${name}, шаг ${index + 1}`}
                                  value={event.inputs[name] ?? inputs[name] ?? '0'}
                                  disabled={busy}
                                  onChange={(e) => {
                                    editScenario();
                                    setStimuli((previous) =>
                                      previous.map((row, i) =>
                                        i === index
                                          ? {
                                              ...row,
                                              inputs: { ...row.inputs, [name]: e.target.value },
                                            }
                                          : row,
                                      ),
                                    );
                                  }}
                                />
                              </td>
                            ))}
                            <td>
                              <button
                                type="button"
                                className="icon-button"
                                disabled={busy}
                                aria-label={`Удалить шаг ${index + 1}`}
                                onClick={() => {
                                  editScenario();
                                  setStimuli((previous) => previous.filter((_, i) => i !== index));
                                }}
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!stimuli.length && (
                    <p className="simulation-settings-note">Изменений пока нет.</p>
                  )}
                  <button
                    type="button"
                    className="button subtle"
                    disabled={busy || !controlledPorts.length || stimuli.length >= 2048}
                    onClick={() => {
                      editScenario();
                      const cycle = stimuli.length ? stimuli[stimuli.length - 1].cycle + 1 : 0;
                      setCycles((previous) => Math.max(previous, cycle + 1));
                      setStimuli((previous) => [
                        ...previous,
                        { cycle, inputs: { ...(previous[previous.length - 1]?.inputs ?? inputs) } },
                      ]);
                    }}
                  >
                    Добавить шаг
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      <div className="simulation-footer">
        <span>
          Функциональная RTL симуляция · изменения входов по периодам · без задержек распространения
        </span>
        {result && (
          <button type="button" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? 'Скрыть' : 'Показать'} журнал симуляции
          </button>
        )}
      </div>
      {showLogs && result && <pre className="simulation-log">{result.logs}</pre>}
    </div>
  );
}
