import { useEffect, useMemo, useState } from 'react';
import { Code2, Cpu, ExternalLink } from 'lucide-react';
import type { YosysCell } from '../../shared/types';
import {
  getLutInputCount,
  getLutTruthTable,
  getSourceLocations,
  type TruthValue,
} from '../lib/netlist';
import { HelpTrigger } from './HelpCard';
import { formatParameterValue } from '../lib/help';
import './schematic.css';
import './inspector.css';

export interface LutInspectorProps {
  cell: YosysCell | null;
  cellName?: string | null;
  onSourceNavigate?: (file: string, line: number) => void;
  canNavigateSource?: (file: string) => boolean;
}

function outputLabel(value: TruthValue): string {
  return value === 'x'
    ? 'X — неопределено'
    : value === 'z'
      ? 'Z — высокое сопротивление'
      : value === '?'
        ? '? — значение отсутствует'
        : value;
}

function portDirection(direction?: string): string {
  return direction === 'input'
    ? 'вход'
    : direction === 'output'
      ? 'выход'
      : direction === 'inout'
        ? 'вход/выход'
        : '?';
}

function connectionLabels(bits: YosysCell['connections'][string]): string[] {
  return bits.map((bit) => (typeof bit === 'number' ? `#${bit}` : bit.toUpperCase()));
}

export function LutInspector({
  cell,
  cellName,
  onSourceNavigate,
  canNavigateSource,
}: LutInspectorProps) {
  const [address, setAddress] = useState(0);
  const rows = useMemo(() => (cell ? getLutTruthTable(cell) : null), [cell]);
  const inputCount = cell ? getLutInputCount(cell) : null;
  const source = getSourceLocations(cell?.attributes);
  useEffect(() => {
    setAddress(0);
  }, [cell]);

  if (!cell)
    return (
      <div className="lut-inspector inspector-empty">
        <Cpu size={28} />
        <strong>Выберите элемент схемы</strong>
        <span>Здесь появятся его порты, параметры и таблица истинности LUT.</span>
      </div>
    );

  const orderedInputs =
    inputCount !== null
      ? Array.from({ length: inputCount }, (_, index) => inputCount - index - 1)
      : [];
  const inputName = (index: number) => (cell.type === '$lut' ? `A[${index}]` : `I${index}`);
  const binaryInit = rows
    ?.map((row) => row.output)
    .reverse()
    .join('');
  const initHex =
    binaryInit && /^[01]+$/.test(binaryInit)
      ? `0x${BigInt(`0b${binaryInit}`)
          .toString(16)
          .toUpperCase()
          .padStart(Math.ceil(binaryInit.length / 4), '0')}`
      : null;
  const output = rows?.[address]?.output ?? '?';

  return (
    <div className="lut-inspector">
      <div className="inspector-cell-heading">
        <HelpTrigger topic={{ kind: 'primitive', type: cell.type }} className="inspector-type">
          {cell.type}
        </HelpTrigger>
        <h3 title={cellName ?? ''}>{cellName ?? 'Выбранный элемент'}</h3>
      </div>
      {rows && inputCount !== null && (
        <>
          <div className="inspector-section-title">Таблица конфигурации</div>
          <div className="lut-init">
            <span>{cell.type === '$lut' ? 'LUT' : 'INIT'}</span>
            <code title={String(cell.parameters.INIT ?? cell.parameters.LUT ?? 'Нет параметра')}>
              {initHex ?? binaryInit}
            </code>
            <small>
              {rows.length} бит · {inputCount} входа
            </small>
          </div>
          <details className="inspector-details lut-reading-help">
            <summary>Как читать LUT</summary>
            <p className="lut-explanation">
              Каждая строка хранит один выходной бит. {inputName(0)} — младший бит адреса: его
              переключение выбирает соседнюю строку.
            </p>
          </details>
          <div className="lut-simulator">
            <div className="lut-input-toggles">
              {orderedInputs.map((index) => (
                <button
                  type="button"
                  key={index}
                  className={(address >> index) & 1 ? 'is-one' : ''}
                  aria-pressed={!!((address >> index) & 1)}
                  onClick={() => setAddress((previous) => previous ^ (1 << index))}
                >
                  <span>{inputName(index)}</span>
                  <strong>{(address >> index) & 1}</strong>
                </button>
              ))}
            </div>
            <div className={`lut-live-output output-${output}`}>
              <span>Выход</span>
              <strong>{output.toUpperCase()}</strong>
            </div>
          </div>
          <div className="lut-address">
            Адрес {address} → <strong>{outputLabel(output)}</strong>
          </div>
          <details className="inspector-details inspector-lut-table">
            <summary>Таблица истинности · {rows.length} строк</summary>
            <div className="lut-table-scroll">
              <table className="lut-truth-table">
                <thead>
                  <tr>
                    <th>Адрес</th>
                    {orderedInputs.map((index) => (
                      <th key={index}>{inputName(index)}</th>
                    ))}
                    <th>Выход</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.index}
                      className={row.index === address ? 'is-active' : ''}
                      onClick={() => setAddress(row.index)}
                    >
                      <td>
                        <button
                          type="button"
                          onClick={() => setAddress(row.index)}
                          aria-label={`Выбрать адрес ${row.index}`}
                        >
                          {row.index}
                        </button>
                      </td>
                      {orderedInputs.map((index) => (
                        <td key={index}>{row.inputs[index]}</td>
                      ))}
                      <td className={`output-${row.output}`} title={outputLabel(row.output)}>
                        {row.output.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <div className="inspector-section-title">Порты</div>
      <div className="inspector-ports">
        {Object.entries(cell.connections).map(([name, bits]) => {
          const labels = connectionLabels(bits);
          const direction = portDirection(cell.port_directions?.[name]);
          return (
            <div className="inspector-port-row" key={name}>
              <strong title={name}>{name}</strong>
              <small
                className="inspector-port-direction"
                title={direction === '?' ? 'Направление не указано в нетлисте' : direction}
              >
                {direction}
              </small>
              <small className="inspector-port-width">{bits.length} бит</small>
              <code title={`Подключения ${name}: ${labels.join(', ')}`}>
                {labels.slice(0, 2).join(', ')}
                {labels.length > 2 ? ' …' : ''}
              </code>
            </div>
          );
        })}
      </div>
      <details className="inspector-details inspector-connections">
        <summary>Все подключения</summary>
        <p>
          Числа после # — внутренние номера цепей. 0, 1, X и Z обозначают постоянные значения.
          Разряды перечислены от младшего к старшему.
        </p>
        <dl>
          {Object.entries(cell.connections).map(([name, bits]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{connectionLabels(bits).join(', ') || 'Нет подключений'}</dd>
            </div>
          ))}
        </dl>
      </details>
      {Object.keys(cell.parameters).length > 0 && (
        <>
          <div
            className="inspector-section-title"
            title="Нажмите на название параметра, чтобы увидеть объяснение и исходную запись."
          >
            Параметры
          </div>
          <dl className="inspector-parameters">
            {Object.entries(cell.parameters).map(([name, value]) => {
              const formatted = formatParameterValue(name, value, cell.type);
              return (
                <div key={name}>
                  <dt>
                    <HelpTrigger topic={{ kind: 'parameter', name, value, cellType: cell.type }}>
                      {name}
                    </HelpTrigger>
                  </dt>
                  <dd title={`${formatted.display}\nИсходная запись: ${formatted.raw}`}>
                    {formatted.display}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      <div className="inspector-section-title">
        <Code2 size={13} /> Исходный код
      </div>
      {source.length > 0 ? (
        <>
          <div className="inspector-sources">
            {source.map((item, index) => (
              <button
                key={index}
                type="button"
                disabled={
                  !onSourceNavigate || (!!canNavigateSource && !canNavigateSource(item.file))
                }
                onClick={() => onSourceNavigate?.(item.file, item.line)}
                title={`${item.file}:${item.line}`}
              >
                <span>
                  {item.file}:{item.line}
                  {item.endLine && item.endLine !== item.line ? `–${item.endLine}` : ''}
                </span>
                <ExternalLink size={12} />
              </button>
            ))}
          </div>
          {canNavigateSource && source.every((item) => !canNavigateSource(item.file)) && (
            <p className="inspector-no-source">
              Указан источник в библиотеке Yosys. Ссылка на Verilog проекта для этого элемента не
              сохранилась.
            </p>
          )}
        </>
      ) : (
        <p className="inspector-no-source">
          Синтез не сохранил ссылку на исходный код для этого элемента.
        </p>
      )}
    </div>
  );
}

export default LutInspector;
