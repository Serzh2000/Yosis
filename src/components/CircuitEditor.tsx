import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Code2, GitBranch, Redo2, Trash2, Undo2 } from 'lucide-react';
import type { Project, SourceFile } from '../../shared/types';
import {
  blockCatalog,
  circuitIssues,
  circuitPins,
  compileCircuit,
  connectCircuit,
  newCircuitNode,
  parseCircuit,
  removeCircuitNode,
  type CircuitDocument,
  type CircuitNode,
  type Endpoint,
} from '../../shared/schematic';
import { circuitGeometry } from '../lib/circuit-geometry';
import { RtlSymbol } from './RtlSymbol';
import { CanvasViewport } from './CanvasViewport';
import './circuit-editor.css';
import './schematic.css';

function NodeProperties({
  node,
  onApply,
  onDelete,
  onPins,
  disabled,
}: {
  node: CircuitNode;
  onApply: (node: CircuitNode) => void;
  onDelete: () => void;
  onPins: () => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(node),
    [error, setError] = useState('');
  const numeric = (
    field: 'width' | 'inputWidth' | 'lo' | 'hi',
    title: string,
    min: number,
    max: number,
  ) => (
    <label>
      {title}
      <input
        aria-label={title}
        type="number"
        min={min}
        max={max}
        required
        value={draft[field]}
        onChange={(event) => setDraft({ ...draft, [field]: Number(event.target.value) })}
      />
    </label>
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onApply(draft);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Проверьте свойства.');
    }
  }
  return (
    <form className="circuit-properties" onSubmit={submit}>
      <strong>{blockCatalog.find(([kind]) => kind === node.kind)?.[1]}</strong>
      <p>{blockCatalog.find(([kind]) => kind === node.kind)?.[2]}</p>
      <label>
        Имя
        <input
          aria-label="Имя элемента"
          required
          maxLength={128}
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      {numeric('width', node.kind === 'concat' ? 'Ширина A, бит' : 'Ширина, бит', 1, 64)}
      {['slice', 'concat', 'extend'].includes(node.kind) &&
        numeric(
          'inputWidth',
          node.kind === 'concat' ? 'Ширина B, бит' : 'Ширина входа, бит',
          1,
          64,
        )}
      {node.kind === 'slice' && (
        <>
          {numeric('lo', 'Младший бит', 0, 63)}
          {numeric('hi', 'Старший бит', 0, 63)}
        </>
      )}
      {['constant', 'register'].includes(node.kind) && (
        <label>
          {node.kind === 'constant' ? 'Значение' : 'Значение при сбросе'}
          <input
            aria-label="Значение константы или сброса"
            required
            pattern="[0-9]+"
            maxLength={20}
            value={draft.value}
            onChange={(event) => setDraft({ ...draft, value: event.target.value })}
          />
        </label>
      )}
      {node.kind === 'register' && (
        <>
          <label className="circuit-check">
            <input
              type="checkbox"
              checked={draft.reset}
              onChange={(event) => setDraft({ ...draft, reset: event.target.checked })}
            />
            Синхронный сброс при 1
          </label>
          <label className="circuit-check">
            <input
              type="checkbox"
              checked={draft.enable}
              onChange={(event) => setDraft({ ...draft, enable: event.target.checked })}
            />
            Разрешение записи при 1
          </label>
          <p>Без сброса начальное состояние в симуляции неизвестно (X).</p>
        </>
      )}
      <button className="button primary" disabled={disabled}>
        Применить свойства
      </button>
      {['input', 'output'].includes(node.kind) && (
        <button className="button subtle" type="button" onClick={onPins}>
          Назначить вывод платы
        </button>
      )}
      <button className="button subtle" type="button" disabled={disabled} onClick={onDelete}>
        <Trash2 size={14} />
        Удалить элемент
      </button>
      {error && (
        <p role="alert" className="circuit-error">
          {error}
        </p>
      )}
    </form>
  );
}

export function CircuitEditor({
  project,
  source,
  busy,
  onChange,
  onPins,
}: {
  project: Project;
  source: SourceFile;
  busy: boolean;
  onChange: (project: Project) => void;
  onPins: (signal: string) => void;
}) {
  const doc = useMemo(() => parseCircuit(source.content), [source.content]);
  const [selected, setSelected] = useState(''),
    [pending, setPending] = useState<Endpoint | null>(null),
    [error, setError] = useState(''),
    [code, setCode] = useState(false),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [history, setHistory] = useState<{ undo: string[]; redo: string[] }>({
    undo: [],
    redo: [],
  });
  const [dragged, setDragged] = useState<{ id: string; x: number; y: number } | null>(null);
  const drag = useRef<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const issues = useMemo(() => circuitIssues(doc), [doc]);
  const geometry = useMemo(
    () => new Map(doc.nodes.map((node) => [node.id, circuitGeometry(node)])),
    [doc.nodes],
  );
  const selectedNode = doc.nodes.find((node) => node.id === selected);
  let generated = '';
  if (!issues.length) {
    try {
      generated = compileCircuit(doc, project.top);
    } catch (cause) {
      generated = cause instanceof Error ? cause.message : 'Проверьте имя верхнего модуля.';
    }
  }
  function save(next: CircuitDocument, track = true) {
    if (busy) return;
    const content = JSON.stringify(parseCircuit(JSON.stringify(next)), null, 2);
    if (content === source.content) return;
    if (track)
      setHistory((previous) => ({ undo: [...previous.undo.slice(-99), source.content], redo: [] }));
    onChange({
      ...project,
      files: project.files.map((file) => (file.name === source.name ? { ...file, content } : file)),
    });
    setError('');
  }
  function undo(redo = false) {
    if (busy) return;
    const stack = redo ? history.redo : history.undo,
      content = stack.at(-1);
    if (!content) return;
    save(parseCircuit(content), false);
    setPending(null);
    setHistory(
      redo
        ? { undo: [...history.undo, source.content], redo: history.redo.slice(0, -1) }
        : { undo: history.undo.slice(0, -1), redo: [...history.redo, source.content] },
    );
  }
  function connect(a: Endpoint, b: Endpoint) {
    try {
      save(connectCircuit(doc, a, b));
      setPending(null);
      setFrom('');
      setTo('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Соединение невозможно.');
    }
  }
  function pinClick(node: CircuitNode, pin: ReturnType<typeof circuitPins>[number]) {
    if (busy) return;
    if (pin.direction === 'output') {
      setPending({ node: node.id, pin: pin.name });
      setError('');
    } else if (pending) connect(pending, { node: node.id, pin: pin.name });
    else setError('Сначала выберите выходной контакт элемента.');
  }
  function endpoint(value: string): Endpoint {
    const [node, pin] = value.split('.');
    return { node, pin };
  }
  const displayNodes = doc.nodes.map((node) =>
    dragged?.id === node.id ? { ...node, x: dragged.x, y: dragged.y } : node,
  );
  const left = Math.min(...doc.nodes.map((node) => node.x)),
    top = Math.min(...doc.nodes.map((node) => node.y - 26));
  const bounds = doc.nodes.length
    ? {
        x: left,
        y: top,
        width: Math.max(...doc.nodes.map((node) => node.x + geometry.get(node.id)!.width)) - left,
        height:
          Math.max(...doc.nodes.map((node) => node.y + geometry.get(node.id)!.height + 26)) - top,
      }
    : undefined;
  function position(point: Endpoint) {
    const node = displayNodes.find((node) => node.id === point.node),
      pin = geometry.get(point.node)?.pins.find((pin) => pin.name === point.pin);
    return node && pin ? { x: node.x + pin.x, y: node.y + pin.y } : null;
  }
  return (
    <section
      className="circuit-workspace"
      onKeyDown={(event) => {
        if ((event.target as Element).closest('input,select,textarea')) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          undo(event.shiftKey);
        }
        if (event.key === 'Escape') {
          setPending(null);
          setError('');
        }
      }}
    >
      <header className="circuit-toolbar">
        <strong>{source.name}</strong>
        <span>
          {doc.nodes.length} элементов · {doc.wires.length} связей
        </span>
        <button
          className="icon-button"
          aria-label="Отменить изменение схемы"
          disabled={!history.undo.length || busy}
          onClick={() => undo()}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Повторить изменение схемы"
          disabled={!history.redo.length || busy}
          onClick={() => undo(true)}
        >
          <Redo2 size={16} />
        </button>
        <button className="button subtle" aria-pressed={code} onClick={() => setCode(!code)}>
          <Code2 size={14} />
          {code ? 'Вернуться к схеме' : 'Созданный Verilog'}
        </button>
      </header>
      <div className="circuit-instruction" role="status">
        {pending
          ? `Выбран ${doc.nodes.find((node) => node.id === pending.node)?.name}.${pending.pin}. Нажмите вход другого элемента. Esc отменяет соединение.`
          : 'Добавьте элемент → нажмите выходной контакт → входной контакт. Элементы можно перетаскивать.'}
      </div>
      {error && (
        <p className="circuit-error" role="alert">
          {error}
        </p>
      )}
      {code ? (
        <pre className="circuit-code" aria-label="Verilog из схемы">
          {generated ||
            `Сначала исправьте схему:\n${issues.map((issue) => issue.message).join('\n')}`}
        </pre>
      ) : (
        <div className="circuit-columns">
          <aside className="circuit-palette" aria-label="Логические элементы">
            <h3>Добавить элемент</h3>
            {blockCatalog.map(([kind, title, description]) => (
              <button
                disabled={busy || doc.nodes.length >= 200}
                key={kind}
                title={description}
                onClick={() => {
                  const node = newCircuitNode(doc, kind);
                  save({ ...doc, nodes: [...doc.nodes, node] });
                  setSelected(node.id);
                }}
              >
                <GitBranch size={14} />
                {title}
              </button>
            ))}
          </aside>
          <CanvasViewport
            label="Конструктор логической схемы"
            width={1000}
            height={680}
            bounds={bounds}
          >
            {(point) => (
              <>
                {doc.wires.map((wire) => {
                  const a = position(wire.from),
                    b = position(wire.to);
                  return a && b ? (
                    <g
                      key={wire.id}
                      data-no-pan
                      className="circuit-wire"
                      role="button"
                      tabIndex={0}
                      aria-label={`Удалить связь ${wire.id}: ${wire.from.node}.${wire.from.pin} → ${wire.to.node}.${wire.to.pin}`}
                      onClick={() => {
                        if (!busy)
                          save({
                            ...doc,
                            wires: doc.wires.filter((value) => value.id !== wire.id),
                          });
                      }}
                      onKeyDown={(event) => {
                        if (['Enter', 'Delete', 'Backspace'].includes(event.key)) {
                          event.preventDefault();
                          if (!busy)
                            save({
                              ...doc,
                              wires: doc.wires.filter((value) => value.id !== wire.id),
                            });
                        }
                      }}
                    >
                      <path
                        className="circuit-wire-hit"
                        d={`M${a.x},${a.y} H${(a.x + b.x) / 2} V${b.y} H${b.x}`}
                      />
                      <path d={`M${a.x},${a.y} H${(a.x + b.x) / 2} V${b.y} H${b.x}`} />
                    </g>
                  ) : null;
                })}
                {displayNodes.map((node) => {
                  const geo = geometry.get(node.id)!;
                  return (
                    <g
                      key={node.id}
                      data-no-pan
                      transform={`translate(${node.x} ${node.y})`}
                      className={`circuit-node ${selected === node.id ? 'selected' : ''}`}
                    >
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label={`Элемент ${node.name}: ${blockCatalog.find(([kind]) => kind === node.kind)?.[1]}`}
                        onClick={() => setSelected(node.id)}
                        onPointerDown={(event) => {
                          if (busy || event.button !== 0) return;
                          event.stopPropagation();
                          const p = point(event.clientX, event.clientY);
                          drag.current = {
                            id: node.id,
                            pointer: event.pointerId,
                            ...p,
                            startX: node.x,
                            startY: node.y,
                            moved: false,
                          };
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setSelected(node.id);
                        }}
                        onPointerMove={(event) => {
                          const current = drag.current;
                          if (
                            !current ||
                            current.id !== node.id ||
                            current.pointer !== event.pointerId
                          )
                            return;
                          const p = point(event.clientX, event.clientY);
                          const x = Math.round(
                              Math.max(-10000, Math.min(10000, current.startX + p.x - current.x)),
                            ),
                            y = Math.round(
                              Math.max(-10000, Math.min(10000, current.startY + p.y - current.y)),
                            );
                          current.moved ||=
                            Math.abs(x - current.startX) + Math.abs(y - current.startY) > 3;
                          if (current.moved) setDragged({ id: node.id, x, y });
                        }}
                        onPointerUp={(event) => {
                          const current = drag.current;
                          if (current?.id !== node.id) return;
                          if (current.moved && dragged)
                            save({
                              ...doc,
                              nodes: doc.nodes.map((value) =>
                                value.id === node.id
                                  ? { ...value, x: dragged.x, y: dragged.y }
                                  : value,
                              ),
                            });
                          setDragged(null);
                          drag.current = null;
                          if (event.currentTarget.hasPointerCapture(event.pointerId))
                            event.currentTarget.releasePointerCapture(event.pointerId);
                        }}
                        onPointerCancel={() => {
                          drag.current = null;
                          setDragged(null);
                        }}
                        onKeyDown={(event) => {
                          if (['Enter', ' '].includes(event.key)) {
                            event.preventDefault();
                            setSelected(node.id);
                          } else if (
                            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                              event.key,
                            ) &&
                            !busy
                          ) {
                            event.preventDefault();
                            save({
                              ...doc,
                              nodes: doc.nodes.map((value) =>
                                value.id === node.id
                                  ? {
                                      ...value,
                                      x:
                                        value.x +
                                        (event.key === 'ArrowLeft'
                                          ? -10
                                          : event.key === 'ArrowRight'
                                            ? 10
                                            : 0),
                                      y:
                                        value.y +
                                        (event.key === 'ArrowUp'
                                          ? -10
                                          : event.key === 'ArrowDown'
                                            ? 10
                                            : 0),
                                    }
                                  : value,
                              ),
                            });
                          }
                        }}
                      >
                        <rect
                          className="circuit-node-selection"
                          x={-12}
                          y={-25}
                          width={geo.width + 24}
                          height={geo.height + 35}
                          rx={8}
                        />
                        {geo.spec ? (
                          <RtlSymbol node={geo.graph} spec={geo.spec} />
                        ) : (
                          <>
                            <rect
                              x={12}
                              y={5}
                              width={geo.width - 24}
                              height={70}
                              rx={node.kind === 'input' || node.kind === 'output' ? 16 : 4}
                              className="circuit-generic-body"
                            />
                            <text
                              x={geo.width / 2}
                              y={35}
                              textAnchor="middle"
                              className="circuit-label"
                            >
                              {node.kind === 'constant' ? node.value : node.name}
                            </text>
                            <text
                              x={geo.width / 2}
                              y={56}
                              textAnchor="middle"
                              className="circuit-small-label"
                            >
                              {blockCatalog.find(([kind]) => kind === node.kind)?.[1]} ·{' '}
                              {node.width} бит
                            </text>
                          </>
                        )}
                        {!geo.spec && !['input', 'output'].includes(node.kind) && (
                          <text
                            x={geo.width / 2}
                            y={-10}
                            textAnchor="middle"
                            className="circuit-label"
                          >
                            {node.name}
                          </text>
                        )}
                      </g>
                      {geo.pins.map((pin) => (
                        <g
                          key={pin.name}
                          role="button"
                          tabIndex={0}
                          aria-label={`${node.name}.${pin.name}: ${pin.direction === 'input' ? 'вход' : 'выход'}, ${pin.width} бит`}
                          aria-pressed={pending?.node === node.id && pending.pin === pin.name}
                          className={`circuit-terminal ${pin.direction}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            pinClick(node, pin);
                          }}
                          onKeyDown={(event) => {
                            if (['Enter', ' '].includes(event.key)) {
                              event.preventDefault();
                              pinClick(node, pin);
                            }
                          }}
                        >
                          <circle className="circuit-terminal-hit" cx={pin.x} cy={pin.y} r={13} />
                          <circle cx={pin.x} cy={pin.y} r={5} />
                          {!geo.spec && (
                            <text
                              x={pin.x + (pin.direction === 'input' ? -8 : 8)}
                              y={pin.y - 12}
                              textAnchor="middle"
                              className="circuit-small-label"
                            >
                              {pin.name}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  );
                })}
              </>
            )}
          </CanvasViewport>
          <aside className="circuit-inspector" aria-label="Свойства и проверка схемы">
            {selectedNode ? (
              <NodeProperties
                key={JSON.stringify(selectedNode)}
                node={selectedNode}
                disabled={busy}
                onApply={(next) =>
                  save({
                    ...doc,
                    nodes: doc.nodes.map((node) => (node.id === next.id ? next : node)),
                  })
                }
                onDelete={() => {
                  save(removeCircuitNode(doc, selected));
                  setSelected('');
                  setPending(null);
                }}
                onPins={() => onPins(selectedNode.name)}
              />
            ) : (
              <p>Выберите элемент для изменения имени, ширины и свойств.</p>
            )}
            <details className="circuit-connect">
              <summary>Соединить из списка</summary>
              <label>
                Откуда
                <select
                  aria-label="Источник соединения"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                >
                  <option value="">Выход элемента</option>
                  {doc.nodes.flatMap((node) =>
                    circuitPins(node)
                      .filter((pin) => pin.direction === 'output')
                      .map((pin) => (
                        <option key={`${node.id}.${pin.name}`} value={`${node.id}.${pin.name}`}>
                          {node.name}.{pin.name} · {pin.width} бит
                        </option>
                      )),
                  )}
                </select>
              </label>
              <label>
                Куда
                <select
                  aria-label="Приёмник соединения"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                >
                  <option value="">Вход элемента</option>
                  {doc.nodes.flatMap((node) =>
                    circuitPins(node)
                      .filter((pin) => pin.direction === 'input')
                      .map((pin) => (
                        <option key={`${node.id}.${pin.name}`} value={`${node.id}.${pin.name}`}>
                          {node.name}.{pin.name} · {pin.width} бит
                        </option>
                      )),
                  )}
                </select>
              </label>
              <button
                className="button subtle"
                disabled={!from || !to || busy}
                onClick={() => connect(endpoint(from), endpoint(to))}
              >
                Соединить
              </button>
            </details>
            <details className="circuit-issues" open>
              <summary>
                {issues.length
                  ? `Исправьте перед сборкой · ${issues.length}`
                  : 'Схема готова к сборке'}
              </summary>
              {issues.length ? (
                <ul>
                  {issues.map((issue, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          if (issue.node) setSelected(issue.node);
                        }}
                      >
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Можно синтезировать и проверить диаграммы. Назначения платы редактируются во
                  вкладке «Выводы».
                </p>
              )}
            </details>
          </aside>
        </div>
      )}
    </section>
  );
}
