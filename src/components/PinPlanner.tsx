import { useMemo, useState, type ReactNode } from 'react';
import { Check, Code2, MapPin, Play, Search, X } from 'lucide-react';
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
import './pin-planner.css';
import { CanvasViewport } from './CanvasViewport';

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
  const signals = useMemo(() => plannerSignals(project, rtl), [project, rtl]);
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
  const conflict =
    current && selectedPin
      ? (pinCompatibility(current, selectedPin) ??
        (() => {
          const occupant = assigned.find(
            (value) =>
              value.signal !== current.name && assignedPins([value]).includes(selectedPin.number),
          );
          return occupant ? `Занят: ${occupant.signal}. Сначала освободите этот вывод.` : null;
        })())
      : null;
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
      onChange(
        applyPinEdit(project, signals, {
          signal: current.name,
          pin: unassign ? null : pin,
          file: fileName,
          pull,
        }),
      );
      setMessage(
        unassign
          ? `${current.name}: вывод освобождён.`
          : `${current.name} → ${pin}. Назначение записано в ${fileName}.`,
      );
      setError('');
      if (unassign) setPin(null);
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
          <div className="pin-workflow-note">
            Выберите сигнал слева → контакт корпуса → «Назначить». Команды IO_LOC и IO_PORT
            сохранятся в .cst.
          </div>
          {!rtl && (
            <div className="pin-analysis-needed">
              <span>Прочитайте порты текущего Verilog, чтобы связать их с платой.</span>
              <button className="button primary" disabled={busy} onClick={onSynthesize}>
                <Play size={13} />
                {busy ? 'Анализируем…' : 'Обновить порты'}
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
                      return (
                        <tr
                          key={signal.name}
                          className={current?.name === signal.name ? 'selected' : ''}
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
                          <td>{locations.map((value) => value.value).join(', ') || '—'}</td>
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
              <section className="pin-edit-card" aria-label="Назначение выбранного порта">
                {current ? (
                  <>
                    <div className="pin-edit-title">
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
                    {selectedPin && (
                      <p className="pin-board-label">
                        {selectedPin.label}.{' '}
                        {selectedPin.number >= 15 && selectedPin.number <= 20
                          ? 'Инверсию LED опишите в Verilog.'
                          : [87, 88].includes(selectedPin.number)
                            ? 'Штатная кнопка работает с подтяжкой DOWN.'
                            : ''}
                      </p>
                    )}
                    {conflict && (
                      <p className="pin-error" role="alert">
                        {conflict}
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
                  <p className="pin-message" role="status">
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
                  width={700}
                  height={700}
                  label="Назначение портов на корпус QN88, вид сверху"
                >
                  {() => (
                    <>
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
                          );
                        const disabled = value.reserved,
                          faded = bank !== null && value.bank !== bank;
                        const width =
                            position.side === 'left' || position.side === 'right' ? 34 : 15,
                          height = position.side === 'left' || position.side === 'right' ? 15 : 34;
                        const label = `Вывод ${value.number}${value.bank !== undefined ? ` · Bank ${value.bank}` : ''} · ${value.label}${assignments.length ? ` · ${assignments.map((command) => command.signal).join(', ')}` : ''}`;
                        return (
                          <g
                            key={value.number}
                            data-no-pan
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            aria-disabled={disabled}
                            aria-label={label}
                            aria-pressed={pin === value.number}
                            className={`package-pin bank-${value.bank ?? 'none'} ${disabled ? 'unavailable' : ''} ${faded ? 'faded' : ''} ${assignments.length ? 'assigned' : ''} ${pin === value.number ? 'chosen' : ''}`}
                            onClick={() => {
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
                            <text
                              x={
                                position.x +
                                (position.side === 'left'
                                  ? -31
                                  : position.side === 'right'
                                    ? 31
                                    : 0)
                              }
                              y={
                                position.y +
                                (position.side === 'top'
                                  ? -25
                                  : position.side === 'bottom'
                                    ? 34
                                    : 4)
                              }
                              textAnchor="middle"
                            >
                              {value.number}
                            </text>
                            {!!assignments.length && (
                              <circle cx={position.x} cy={position.y} r="3" />
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}
                </CanvasViewport>
              </div>
              <div className="pin-legend">
                <span>
                  <i className="pin-legend-free" />
                  Свободный I/O
                </span>
                <span>
                  <i className="pin-legend-assigned" />
                  Назначен
                </span>
                <span>
                  <i className="pin-legend-reserved" />
                  Служебный
                </span>
              </div>
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
