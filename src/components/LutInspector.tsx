import { useEffect, useMemo, useState } from 'react';
import { Code2, Cpu, ExternalLink } from 'lucide-react';
import type { YosysCell, YosysModule } from '../../shared/types';
import { cellTitle, describeBits, parameterLabel } from '../lib/cell-names';
import { friendlyCellName } from '../lib/schematic-labels';
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
import { t } from '../lib/i18n';

export interface LutInspectorProps {
  cell: YosysCell | null;
  cellName?: string | null;
  /** Имена цепей модуля: по ним порты описываются словами ученика, а не номерами Yosys. */
  netnames?: YosysModule['netnames'];
  onSourceNavigate?: (file: string, line: number) => void;
  canNavigateSource?: (file: string) => boolean;
}

function outputLabel(value: TruthValue): string {
  return value === 'x'
    ? t('X — неопределено')
    : value === 'z'
      ? t('Z — высокое сопротивление')
      : value === '?'
        ? t('? — значение отсутствует')
        : value;
}

function portDirection(direction?: string): string {
  return direction === 'input'
    ? t('вход')
    : direction === 'output'
      ? t('выход')
      : direction === 'inout'
        ? t('вход/выход')
        : '?';
}

function connectionLabels(bits: YosysCell['connections'][string]): string[] {
  return bits.map((bit) => (typeof bit === 'number' ? `#${bit}` : bit.toUpperCase()));
}

export function LutInspector({
  cell,
  cellName,
  netnames,
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
        <strong>{t('Выберите элемент схемы')}</strong>
        <span>{t('Здесь появятся его порты, параметры и таблица истинности LUT.')}</span>
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
          {cellTitle(cell.type)}
        </HelpTrigger>
        <h3 title={cellName ?? ''}>
          {friendlyCellName(cellName ?? '') || (cellName?.startsWith('$') ? '' : (cellName ?? ''))}
        </h3>
        {cellTitle(cell.type) !== cell.type && (
          <small
            className="inspector-technical"
            title={t('Так этот элемент называется внутри Yosys')}
          >
            {t('Тип в Yosys: {type}', { type: cell.type })}
          </small>
        )}
      </div>
      {rows && inputCount !== null && (
        <>
          <div className="inspector-section-title">{t('Таблица конфигурации')}</div>
          <div className="lut-init">
            <span>{cell.type === '$lut' ? 'LUT' : 'INIT'}</span>
            <code title={String(cell.parameters.INIT ?? cell.parameters.LUT ?? t('Нет параметра'))}>
              {initHex ?? binaryInit}
            </code>
            <small>
              {t('{bits} бит · {inputs} входа', { bits: rows.length, inputs: inputCount })}
            </small>
          </div>
          <details className="inspector-details lut-reading-help">
            <summary>{t('Как читать LUT')}</summary>
            <p className="lut-explanation">
              {t(
                t(
                  'Каждая строка хранит один выходной бит. {name} — младший бит адреса: его переключение выбирает соседнюю строку.',
                ),
                { name: inputName(0) },
              )}
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
              <span>{t('Выход')}</span>
              <strong>{output.toUpperCase()}</strong>
            </div>
          </div>
          <div className="lut-address">
            {t('Адрес')} {address} → <strong>{outputLabel(output)}</strong>
          </div>
          <details className="inspector-details inspector-lut-table">
            <summary>{t('Таблица истинности · {count} строк', { count: rows.length })}</summary>
            <div className="lut-table-scroll">
              <table className="lut-truth-table">
                <thead>
                  <tr>
                    <th>{t('Адрес')}</th>
                    {orderedInputs.map((index) => (
                      <th key={index}>{inputName(index)}</th>
                    ))}
                    <th>{t('Выход')}</th>
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
                          aria-label={t('Выбрать адрес {index}', { index: row.index })}
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
      <div className="inspector-section-title">{t('Порты')}</div>
      <div className="inspector-ports">
        {Object.entries(cell.connections).map(([name, bits]) => {
          const labels = connectionLabels(bits);
          const direction = portDirection(cell.port_directions?.[name]);
          return (
            <div className="inspector-port-row" key={name}>
              <strong title={name}>{name}</strong>
              <small
                className="inspector-port-direction"
                title={direction === '?' ? t('Направление не указано в нетлисте') : direction}
              >
                {direction}
              </small>
              <small className="inspector-port-width">
                {t('{count} бит', { count: bits.length })}
              </small>
              <code
                title={`${describeBits(bits, netnames)}
${t('Внутренние номера: {numbers}', { numbers: labels.join(', ') })}`}
              >
                {describeBits(bits, netnames)}
              </code>
            </div>
          );
        })}
      </div>
      <details className="inspector-details inspector-connections">
        <summary>{t('Все подключения')}</summary>
        <p>
          {t(
            t(
              'Сначала имя сигнала из вашего кода, затем внутренние номера цепей Yosys (после #). Константы показаны как «константа 0/1». Разряды перечислены от старшего к младшему.',
            ),
          )}
        </p>
        <dl>
          {Object.entries(cell.connections).map(([name, bits]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>
                {describeBits(bits, netnames)}
                <small> · {connectionLabels(bits).join(', ')}</small>
              </dd>
            </div>
          ))}
        </dl>
      </details>
      {Object.keys(cell.parameters).length > 0 && (
        <>
          <div
            className="inspector-section-title"
            title={t('Нажмите на название параметра, чтобы увидеть объяснение и исходную запись.')}
          >
            {t('Параметры')}
          </div>
          <dl className="inspector-parameters">
            {Object.entries(cell.parameters).map(([name, value]) => {
              const formatted = formatParameterValue(name, value, cell.type);
              return (
                <div key={name}>
                  <dt>
                    <HelpTrigger topic={{ kind: 'parameter', name, value, cellType: cell.type }}>
                      {parameterLabel(name)}
                    </HelpTrigger>
                  </dt>
                  <dd
                    title={`${formatted.display}\n${t('Исходная запись: {raw}', { raw: formatted.raw })}`}
                  >
                    {formatted.display}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      <div className="inspector-section-title">
        <Code2 size={13} /> {t('Исходный код')}
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
              {t(
                t(
                  'Указан источник в библиотеке Yosys. Ссылка на Verilog проекта для этого элемента не сохранилась.',
                ),
              )}
            </p>
          )}
        </>
      ) : (
        <p className="inspector-no-source">
          {t('Синтез не сохранил ссылку на исходный код для этого элемента.')}
        </p>
      )}
    </div>
  );
}

export default LutInspector;
