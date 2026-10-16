import { useMemo, useState, type ReactNode } from 'react';
import { Check, Code2, Lightbulb, MapPin, Play, Search, X } from 'lucide-react';
import type { Project, SourceFile, YosysNetlist } from '../../shared/types';
import {
  applyPinEdit,
  assignedPins,
  packagePins,
  pinCompatibility,
  pinPosition,
  plannerIssues,
  plannerSignals,
  readCst,
  readPinProperties,
  type PlannerSignal,
} from '../lib/pin-planner';
import {
  applySuggestions,
  ledBusPlan,
  parsePortsFromSource,
  quickSuggestions,
} from '../lib/pin-hints';
import { partForPin } from '../lib/board-parts';
import './pin-planner.css';
import { CanvasViewport } from './CanvasViewport';
import { Dialog } from './Dialog';
import { explainPin } from '../lib/pin-glossary';

const directionLabels = { input: 'Вход', output: 'Выход', inout: 'I/O' };
export function PinPlanner({
  project,
  rtl,
  busy,
  activeFile,
  initialSignal,
  onChange,
  onSynthesize,
  renderEditor,
}: {
  project: Project;
  rtl?: YosysNetlist;
  busy: boolean;
  activeFile?: string;
  initialSignal?: string;
  onChange: (project: Project) => void;
  onSynthesize: () => void;
  renderEditor: (file: SourceFile) => ReactNode;
}) {
  const [view, setView] = useState<'planner' | 'text'>('planner');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(initialSignal ?? '');
  const [pin, setPin] = useState<number | null>(null);
  const [pull, setPull] = useState<'NONE' | 'UP' | 'DOWN'>('NONE');
  const [targetFile, setTargetFile] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bank, setBank] = useState<number | null>(null);
  const [hoverPin, setHoverPin] = useState<number | null>(null);
  const [hoverSignal, setHoverSignal] = useState<string | null>(null);
  // The pin whose printed names are being explained.
  const [explained, setExplained] = useState<{
    number: number;
    role: string;
    signal?: string;
  } | null>(null);
  // Before the first synthesis the ports are read from the Verilog text (marked as preliminary).
  const sourcePorts = useMemo(() => (rtl ? null : parsePortsFromSource(project)), [project, rtl]);
  const preliminary = !rtl && !!sourcePorts?.length;
  const signals = useMemo(
    () => (rtl ? plannerSignals(project, rtl) : (sourcePorts ?? [])),
    [project, rtl, sourcePorts],
  );
  const directives = useMemo(() => readCst(project), [project]);
  const issues = useMemo(
    () => (rtl ? plannerIssues(project, signals) : []),
    [project, signals, rtl],
  );
  const cstFiles = project.files.filter((file) => file.name.endsWith('.cst'));
  const fileName =
    cstFiles.find((file) => file.name === targetFile)?.name ??
    cstFiles.find((file) => file.name === activeFile)?.name ??
    cstFiles[0]?.name ??
    'board.cst';
  const file = cstFiles.find((value) => value.name === fileName);
  const current =
    signals.find((value) => value.name === selected) ??
    signals.find((value) => value.name.startsWith(`${selected}[`));
  const selectedPin = packagePins.find((value) => value.number === pin);
  const assigned = directives.filter((value) => value.kind === 'IO_LOC');
  const signalAssignments = (name: string) => assigned.filter((value) => value.signal === name);
  const matching = signals.filter((signal) =>
    signal.name.toLowerCase().includes(query.toLowerCase()),
  );
  const suggestions = useMemo(() => quickSuggestions(signals, directives), [signals, directives]);
  const ledPlan = useMemo(() => ledBusPlan(signals, directives), [signals, directives]);
  const hoverPinInfo = hoverPin ? packagePins.find((value) => value.number === hoverPin) : null;
  const signalOfPin = (number: number) =>
    assigned.find((value) => assignedPins([value]).includes(number))?.signal;
  function applyPlan(list: typeof suggestions, label: string) {
    try {
      onChange(applySuggestions(project, signals, list, fileName));
      setMessage(`${label}: назначено ${list.length}. Записано в ${fileName}.`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось применить подсказки.');
    }
  }
  const conflict =
    current && selectedPin
      ? (pinCompatibility(current, selectedPin) ??
        (() => {
          return null;
        })())
      : null;
  const occupantOf = (number: number, signal: string) =>
    assigned.find((value) => value.signal !== signal && assignedPins([value]).includes(number))
      ?.signal;
  const swapWith =
    current && selectedPin ? occupantOf(selectedPin.number, current.name) : undefined;
  /**
   * Put a signal on a pin, whoever holds that pin now. The previous holder moves to the pin
   * this signal leaves when it may stand there, and is left without a pin otherwise.
   */
  function place(signal: PlannerSignal, number: number | null, pullMode: typeof pull) {
    const pullOf = (name: string): typeof pull => {
      const mode = readPinProperties(directives, name).PULL_MODE;
      return mode === 'UP' ? 'UP' : mode === 'DOWN' ? 'DOWN' : 'NONE';
    };
    const before = signalAssignments(signal.name)[0];
    const old = before && /^\d+$/.test(before.value) ? Number(before.value) : null;
    const other = number === null ? undefined : occupantOf(number, signal.name);
    let next = project;
    let note = '';
    if (other)
      next = applyPinEdit(next, signals, {
        signal: other,
        pin: null,
        file: fileName,
        pull: 'NONE',
      });
    next = applyPinEdit(next, signals, {
      signal: signal.name,
      pin: number,
      file: fileName,
      pull: pullMode,
    });
    if (other) {
      note = ` Сигнал ${other} остался без вывода.`;
      if (old !== null)
        try {
          next = applyPinEdit(next, signals, {
            signal: other,
            pin: old,
            file: fileName,
            pull: pullOf(other),
          });
          note = ` Сигнал ${other} переехал на вывод ${old}.`;
        } catch {
          /* The freed pin does not suit the other signal: it stays unassigned. */
        }
    }
    onChange(next);
    return note;
  }
  function choose(signal: PlannerSignal) {
    setSelected(signal.name);
    const location = signalAssignments(signal.name)[0];
    setPin(location && /^\d+$/.test(location.value) ? Number(location.value) : null);
    const properties = readPinProperties(directives, signal.name);
    setPull(
      properties.PULL_MODE === 'UP' ? 'UP' : properties.PULL_MODE === 'DOWN' ? 'DOWN' : 'NONE',
    );
    setError('');
    setMessage('');
  }
  function selectPin(number: number) {
    setPin(number);
    setError('');
    setMessage('');
    const existing = current && readPinProperties(directives, current.name).PULL_MODE;
    if (!existing) setPull([87, 88].includes(number) ? 'DOWN' : 'NONE');
  }
  function commit(unassign = false) {
    if (!current) return;
    try {
      const note = place(current, unassign ? null : pin, pull);
      setMessage(
        unassign
          ? `${current.name}: вывод освобождён.`
          : `${current.name} → ${pin}. Назначение записано в ${fileName}.${note}`,
      );
      setError('');
      if (unassign) setPin(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить назначение.');
    }
  }
  function changeInTable(signal: PlannerSignal, value: string) {
    const number = value === '' ? null : Number(value);
    choose(signal);
    setPin(number);
    try {
      const mode = readPinProperties(directives, signal.name).PULL_MODE;
      const note = place(
        signal,
        number,
        mode === 'UP' ? 'UP' : mode === 'DOWN' || [87, 88].includes(number ?? 0) ? 'DOWN' : 'NONE',
      );
      setMessage(
        number === null
          ? `${signal.name}: вывод освобождён.`
          : `${signal.name} → ${number}. Назначение записано в ${fileName}.${note}`,
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить назначение.');
    }
  }
  function createFile() {
    if (file) return;
    onChange({
      ...project,
      files: [
        ...project.files,
        {
          name: fileName,
          content:
            '// Физические ограничения Tang Nano 20K.\n// Назначьте порты на рисунке корпуса или добавьте IO_LOC / IO_PORT вручную.\n',
        },
      ],
    });
  }
  // Where the pupil is in the three-step routine; the strip above the planner follows it.
  const stepState = [
    current ? 'done' : 'now',
    pin ? 'done' : current ? 'now' : '',
    current && pin ? 'now' : '',
  ];
  return (
    <section className="pin-planner">
      <header className="pin-toolbar">
        <div className="pin-view-switch" role="group" aria-label="Вид назначений">
          <button aria-pressed={view === 'planner'} onClick={() => setView('planner')}>
            <MapPin size={15} />
            Планировщик выводов
          </button>
          <button aria-pressed={view === 'text'} onClick={() => setView('text')}>
            <Code2 size={15} />
            Текст .cst
          </button>
        </div>
        <label className="pin-file">
          Файл
          <select
            aria-label="Файл назначений"
            value={fileName}
            onChange={(event) => setTargetFile(event.target.value)}
          >
            {cstFiles.length ? (
              cstFiles.map((value) => <option key={value.name}>{value.name}</option>)
            ) : (
              <option>board.cst</option>
            )}
          </select>
        </label>
      </header>
      {view === 'text' ? (
        <div className="pin-text-editor">
          {file ? (
            renderEditor(file)
          ) : (
            <div className="empty-workspace">
              <h2>Файл назначений ещё не создан</h2>
              <button className="button primary" onClick={createFile}>
                Создать {fileName}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <ol className="pin-steps" aria-label="Как назначить вывод">
            <li className={stepState[0]}>
              <b>{stepState[0] === 'done' ? <Check size={16} aria-label="готово" /> : 1}</b>
              <span>
                <strong>Выберите сигнал</strong>
                <em>Порт вашей схемы в таблице слева</em>
              </span>
            </li>
            <li className={stepState[1]}>
              <b>{stepState[1] === 'done' ? <Check size={16} aria-label="готово" /> : 2}</b>
              <span>
                <strong>Выберите контакт</strong>
                <em>Нажмите на рисунке микросхемы или в списке</em>
              </span>
            </li>
            <li className={stepState[2]}>
              <b>{stepState[2] === 'done' ? <Check size={16} aria-label="готово" /> : 3}</b>
              <span>
                <strong>Нажмите «Назначить»</strong>
                <em>Запись появится в файле .cst</em>
              </span>
            </li>
          </ol>
          {!rtl && (
            <div className="pin-analysis-needed">
              <span>
                {preliminary
                  ? 'Порты прочитаны из текста Verilog (предварительно). Нажмите «Прочитать порты», чтобы проверить их по настоящему синтезу.'
                  : 'Портов пока нет: проект ещё не проанализирован. Нажмите «Прочитать порты», и они появятся здесь, а после синтеза список обновляется сам.'}
              </span>
              <button className="button subtle" disabled={busy} onClick={onSynthesize}>
                <Play size={13} />
                {busy ? 'Читаем порты…' : 'Прочитать порты'}
              </button>
            </div>
          )}
          <div className="pin-columns">
            <section className="pin-signal-panel" aria-label="Порты верхнего модуля">
              <div className="pin-signal-heading">
                <strong>{project.top}</strong>
                <span>
                  {signals.length} бит портов · {assigned.length} назначений
                </span>
              </div>
              <label className="pin-search">
                <Search size={14} />
                <input
                  aria-label="Найти порт"
                  value={query}
                  placeholder="Найти порт…"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="pin-signal-scroll">
                <table className="pin-signal-table">
                  <thead>
                    <tr>
                      <th>Сигнал</th>
                      <th>Направление</th>
                      <th>Вывод</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matching.map((signal) => {
                      const locations = signalAssignments(signal.name);
                      const linked =
                        hoverPin !== null && assignedPins(locations).includes(hoverPin);
                      return (
                        <tr
                          key={signal.name}
                          className={`${current?.name === signal.name ? 'selected' : ''} ${linked || hoverSignal === signal.name ? 'linked' : ''}`}
                          onMouseEnter={() => setHoverSignal(signal.name)}
                          onMouseLeave={() => setHoverSignal(null)}
                          onClick={(event) => {
                            // The whole row picks the port; its own controls do their own job.
                            if (!(event.target as Element).closest('button, select'))
                              choose(signal);
                          }}
                        >
                          <td>
                            <button
                              aria-label={signal.name}
                              aria-pressed={current?.name === signal.name}
                              onClick={() => choose(signal)}
                            >
                              <code>{signal.name}</code>
                            </button>
                          </td>
                          <td>{directionLabels[signal.direction]}</td>
                          <td>
                            {locations.length <= 1 && file ? (
                              <select
                                className="pin-row-select"
                                aria-label={`Вывод для ${signal.name}`}
                                value={locations[0]?.value ?? ''}
                                disabled={busy}
                                onChange={(event) => changeInTable(signal, event.target.value)}
                              >
                                <option value="">— нет</option>
                                {packagePins
                                  .filter(
                                    (value) =>
                                      !value.reserved &&
                                      (!value.direction || value.direction === signal.direction),
                                  )
                                  .map((value) => {
                                    const holder = occupantOf(value.number, signal.name);
                                    return (
                                      <option value={value.number} key={value.number}>
                                        {value.number}
                                        {holder ? ` · занят: ${holder}` : ''}
                                      </option>
                                    );
                                  })}
                              </select>
                            ) : (
                              locations.map((value) => value.value).join(', ') || '—'
                            )}
                            {locations.length === 1 && partForPin(Number(locations[0].value)) && (
                              <small className="pin-part-tag">
                                {partForPin(Number(locations[0].value))!.caption}
                              </small>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!signals.length && (
                  <p className="pin-empty">
                    После анализа здесь появятся отдельные биты входов и выходов. Имена берутся из
                    настоящего нетлиста Yosys.
                  </p>
                )}
              </div>
              {(!!suggestions.length || !!ledPlan.length) && (
                <section className="pin-suggest" aria-label="Подсказки">
                  <div className="pin-suggest-title">
                    <Lightbulb size={14} />
                    <strong>Подсказки по именам портов</strong>
                  </div>
                  {!!ledPlan.length && (
                    <button
                      className="button subtle"
                      disabled={busy}
                      title={ledPlan.map((item) => `${item.signal} → ${item.pin}`).join('\n')}
                      onClick={() => applyPlan(ledPlan, 'Светодиоды по порядку')}
                    >
                      Назначить LED по порядку · {ledPlan.length}
                    </button>
                  )}
                  {suggestions.slice(0, 6).map((item) => (
                    <div className="pin-suggest-row" key={item.signal}>
                      <span>
                        <code>{item.signal}</code> → вывод {item.pin}
                        <small>{item.reason}</small>
                      </span>
                      <button
                        className="button subtle"
                        disabled={busy}
                        onClick={() => applyPlan([item], item.signal)}
                      >
                        Назначить
                      </button>
                    </div>
                  ))}
                  {suggestions.length > 1 && (
                    <button
                      className="button subtle"
                      disabled={busy}
                      onClick={() => applyPlan(suggestions, 'Все подсказки')}
                    >
                      Применить все подсказки · {suggestions.length}
                    </button>
                  )}
                </section>
              )}
              <section className="pin-edit-card" aria-label="Назначение выбранного порта">
                {current ? (
                  <>
                    <div className="pin-edit-title pin-arrive" key={current.name}>
                      <strong>{current.name}</strong>
                      <span>
                        {directionLabels[current.direction]}
                        {selectedPin
                          ? ` · ${selectedPin.io ?? 'служебный'} · Bank ${selectedPin.bank ?? '—'}`
                          : ''}
                      </span>
                    </div>
                    <div className="pin-edit-fields">
                      <label>
                        Вывод
                        <select
                          aria-label="Вывод выбранного порта"
                          value={pin ?? ''}
                          onChange={(event) => selectPin(Number(event.target.value))}
                        >
                          <option value="" disabled>
                            Выберите контакт
                          </option>
                          {packagePins
                            .filter((value) => !value.reserved)
                            .map((value) => (
                              <option value={value.number} key={value.number}>
                                {value.number} · {value.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Подтяжка
                        <select
                          aria-label="Подтяжка входа"
                          value={pull}
                          onChange={(event) => setPull(event.target.value as typeof pull)}
                        >
                          <option value="NONE">Нет</option>
                          <option value="UP">К 1 (UP)</option>
                          <option value="DOWN">К 0 (DOWN)</option>
                        </select>
                      </label>
                      <span className="pin-voltage">LVCMOS33 · 3,3 В</span>
                    </div>
                    {conflict && (
                      <p className="pin-error" role="alert">
                        {conflict}
                      </p>
                    )}
                    {!conflict && swapWith && (
                      <p className="pin-swap" role="status">
                        Вывод {pin} сейчас у сигнала {swapWith}. При назначении они поменяются
                        местами.
                      </p>
                    )}
                    <div className="pin-edit-actions">
                      <button
                        className="button primary"
                        disabled={!pin || !!conflict || busy}
                        onClick={() => commit()}
                      >
                        <Check size={14} />
                        Назначить
                      </button>
                      <button
                        className="button subtle"
                        disabled={!signalAssignments(current.name).length || busy}
                        onClick={() => commit(true)}
                      >
                        <X size={14} />
                        Освободить
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="pin-empty">
                    Выберите порт в таблице. Наведите на контакт, чтобы увидеть его банк, функцию и
                    текущее назначение.
                  </p>
                )}
                {error && (
                  <p className="pin-error" role="alert">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="pin-message pin-arrive" key={message} role="status">
                    <Check size={15} aria-hidden="true" />
                    {message}
                  </p>
                )}
              </section>
              {!!issues.length && (
                <details className="pin-issues" open>
                  <summary>Проверка назначений · {issues.length}</summary>
                  <ul>
                    {issues.slice(0, 24).map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
            <section className="pin-map-panel" aria-label="Корпус и назначение">
              <div className="pin-map-tools">
                <strong>GW2AR-18 · QN88</strong>
                <label>
                  Банк
                  <select
                    aria-label="Фильтр I/O банка"
                    value={bank ?? 'all'}
                    onChange={(event) =>
                      setBank(event.target.value === 'all' ? null : Number(event.target.value))
                    }
                  >
                    <option value="all">Все</option>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((value) => (
                      <option key={value} value={value}>
                        Bank {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pin-package-container">
                <CanvasViewport
                  className="pin-package"
                  width={1010}
                  height={850}
                  label="Назначение портов на корпус QN88, вид сверху"
                >
                  {() => (
                    <g transform="translate(172 82)">
                      <rect
                        x="138"
                        y="138"
                        width="424"
                        height="424"
                        rx="8"
                        className="pin-chip-body"
                      />
                      <circle cx="152" cy="152" r="5" className="pin-one-mark" />
                      <text x="350" y="265" textAnchor="middle" className="pin-chip-title">
                        Tang Nano 20K
                      </text>
                      <text x="350" y="295" textAnchor="middle" className="pin-chip-subtitle">
                        GW2AR-LV18QN88C8/I7
                      </text>
                      <text x="350" y="319" textAnchor="middle" className="pin-chip-subtitle">
                        Вид сверху · номера корпуса
                      </text>
                      {hoverPinInfo && (
                        <text x="350" y="520" textAnchor="middle" className="pin-chip-signal">
                          {`Вывод ${hoverPinInfo.number}${signalOfPin(hoverPinInfo.number) ? ` · ${signalOfPin(hoverPinInfo.number)}` : ''}`}
                        </text>
                      )}
                      {current && (
                        <>
                          <rect
                            x="215"
                            y="350"
                            width="270"
                            height="62"
                            rx="8"
                            className="pin-selected-signal"
                          />
                          <text x="350" y="376" textAnchor="middle" className="pin-chip-signal">
                            {current.name}
                          </text>
                          <text x="350" y="397" textAnchor="middle" className="pin-chip-subtitle">
                            {directionLabels[current.direction]}
                            {pin ? ` → вывод ${pin}` : ' · выберите контакт'}
                          </text>
                        </>
                      )}
                      {current &&
                        pin &&
                        (() => {
                          const position = pinPosition(pin);
                          return (
                            <path
                              d={`M 350 412 L 350 456 L ${position.x} ${position.y}`}
                              className="pin-connection"
                            />
                          );
                        })()}
                      {packagePins.map((value) => {
                        const position = pinPosition(value.number),
                          assignments = assigned.filter((command) =>
                            assignedPins([command]).includes(value.number),
                          ),
                          part = partForPin(value.number);
                        const disabled = value.reserved,
                          faded = bank !== null && value.bank !== bank;
                        const horizontal = position.side === 'left' || position.side === 'right';
                        const width = horizontal ? 34 : 15,
                          height = horizontal ? 15 : 34;
                        const signalName = assignments[0]?.signal;
                        const caption = part && !part.service ? part.caption : signalName ? '' : '';
                        const linked =
                          hoverPin === value.number ||
                          (!!hoverSignal &&
                            assignments.some((item) => item.signal === hoverSignal)) ||
                          (!!current && assignments.some((item) => item.signal === current.name));
                        const label = `Вывод ${value.number}${value.bank !== undefined ? ` · Bank ${value.bank}` : ''} · ${value.label}${assignments.length ? ` · ${assignments.map((command) => command.signal).join(', ')}` : ''}`;
                        // Datasheet naming: the FPGA pad and its special function, then what
                        // the board wires to it, then the project signal assigned here.
                        const padName = value.io
                          ? [value.io, ...value.functions].join('/')
                          : 'питание';
                        const role =
                          caption ||
                          (part?.service || (value.reserved && value.io) ? value.label : '');
                        const outward: { text: string; kind: string }[] = [
                          ...(signalName ? [{ text: signalName, kind: 'signal' }] : []),
                          ...(role ? [{ text: role, kind: 'role' }] : []),
                          { text: padName, kind: value.io ? 'pad' : 'power' },
                        ];
                        // Text that ends at the pin is written outermost-first.
                        const endsAtPin = position.side === 'left' || position.side === 'bottom';
                        const tokens = endsAtPin ? [...outward].reverse() : outward;
                        const tag = (
                          <>
                            {tokens.map((token, index) => (
                              <tspan key={token.kind} className={`pin-tag-${token.kind}`}>
                                {index > 0 ? '  ' : ''}
                                {token.text}
                              </tspan>
                            ))}
                          </>
                        );
                        const numberX =
                          position.x +
                          (position.side === 'left' ? -31 : position.side === 'right' ? 31 : 0);
                        const numberY =
                          position.y +
                          (position.side === 'top' ? -25 : position.side === 'bottom' ? 34 : 4);
                        return (
                          <g
                            key={value.number}
                            data-no-pan
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            aria-disabled={disabled}
                            aria-label={label}
                            aria-pressed={pin === value.number}
                            className={`package-pin bank-${value.bank ?? 'none'} ${part ? `part-${part.kind}` : ''} ${disabled ? 'unavailable' : ''} ${faded ? 'faded' : ''} ${assignments.length ? 'assigned' : ''} ${pin === value.number ? 'chosen' : ''} ${linked ? 'linked' : ''}`}
                            onMouseEnter={() => setHoverPin(value.number)}
                            onMouseLeave={() => setHoverPin(null)}
                            onFocus={() => setHoverPin(value.number)}
                            onBlur={() => setHoverPin(null)}
                            onClick={(event) => {
                              // The pad picks the contact; its printed names open the explanation.
                              if ((event.target as Element).closest('.pin-tag'))
                                setExplained({ number: value.number, role, signal: signalName });
                              if (!disabled) selectPin(value.number);
                            }}
                            onKeyDown={(event) => {
                              if (!disabled && ['Enter', ' '].includes(event.key)) {
                                event.preventDefault();
                                selectPin(value.number);
                              }
                            }}
                          >
                            <title>
                              {label}
                              {value.io ? ` · ${value.io} ${value.functions.join('/')}` : ''}
                            </title>
                            <rect
                              x={position.x - width / 2}
                              y={position.y - height / 2}
                              width={width}
                              height={height}
                              rx="2"
                            />
                            <text x={numberX} y={numberY} textAnchor="middle">
                              {value.number}
                            </text>
                            {!!assignments.length && (
                              <circle cx={position.x} cy={position.y} r="3" />
                            )}
                            {position.side === 'left' && (
                              <text
                                x={numberX - 16}
                                y={position.y + 4}
                                textAnchor="end"
                                className="pin-tag"
                              >
                                {tag}
                              </text>
                            )}
                            {position.side === 'right' && (
                              <text
                                x={numberX + 16}
                                y={position.y + 4}
                                textAnchor="start"
                                className="pin-tag"
                              >
                                {tag}
                              </text>
                            )}
                            {(position.side === 'top' || position.side === 'bottom') && (
                              <text
                                transform={`translate(${position.x + 4} ${
                                  position.side === 'top' ? numberY - 14 : numberY + 12
                                }) rotate(-90)`}
                                textAnchor={position.side === 'top' ? 'start' : 'end'}
                                className="pin-tag"
                              >
                                {tag}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}
                </CanvasViewport>
                {explained &&
                  (() => {
                    const target = packagePins.find((value) => value.number === explained.number)!;
                    return (
                      <Dialog
                        key={target.number}
                        className="dialog pin-explain-dialog"
                        onClose={() => setExplained(null)}
                      >
                        <div className="pin-explain-head">
                          <h2>Что написано у вывода {target.number}</h2>
                          <button
                            type="button"
                            className="mini-button"
                            aria-label="Закрыть пояснение"
                            onClick={() => setExplained(null)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <dl>
                          {explainPin(target, explained.role, explained.signal).map((item) => (
                            <div key={item.term}>
                              <dt>{item.term}</dt>
                              <dd>{item.text}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="pin-explain-actions">
                          <button
                            type="button"
                            className="button primary"
                            onClick={() => setExplained(null)}
                          >
                            Понятно
                          </button>
                        </div>
                      </Dialog>
                    );
                  })()}
              </div>
              <details className="pin-legend-fold">
                <summary>Цвета и обозначения</summary>
                <div className="pin-legend" aria-label="Условные обозначения">
                  <div>
                    <strong>Цвета контактов</strong>
                    <ul>
                      <li>
                        <i className="pin-legend-free" />
                        Свободный контакт: цвет показывает банк
                      </li>
                      <li>
                        <i className="pin-legend-assigned" />
                        Назначен: рядом подписан сигнал
                      </li>
                      <li>
                        <i className="pin-legend-part" />
                        Подключён к детали платы (LED, кнопка, генератор, UART)
                      </li>
                      <li>
                        <i className="pin-legend-reserved" />
                        Служебный: питание, JTAG, флеш. Назначать нельзя
                      </li>
                    </ul>
                    <div className="pin-bank-swatches" aria-label="Цвета банков">
                      {(
                        [
                          ['0–1', 'bank-a'],
                          ['2', 'bank-b'],
                          ['3', 'bank-c'],
                          ['4–5', 'bank-d'],
                          ['6–7', 'bank-e'],
                        ] as const
                      ).map(([name, tone]) => (
                        <span key={name}>
                          <i className={`pin-bank-chip ${tone}`} />
                          банк {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>Что это значит</strong>
                    <p>
                      <b>Банк</b> — группа соседних контактов, у которых одно общее питание для
                      сигналов.
                    </p>
                    <p>
                      <b>LVCMOS33</b> — обычный цифровой сигнал: 0 — это 0 В, 1 — это 3,3 В.
                    </p>
                  </div>
                </div>
              </details>
            </section>
          </div>
          <footer className="pin-footer">
            <span>
              Питание и JTAG недоступны для назначения. Дифференциальные пары редактируются в тексте
              .cst.
            </span>
            <a
              href="https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html#Pin-diagram"
              target="_blank"
              rel="noreferrer"
            >
              Схема платы
            </a>
          </footer>
        </>
      )}
    </section>
  );
}
