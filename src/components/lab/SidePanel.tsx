import { RotateCw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { Connections } from './reference/bridge';
import { pinLink, wireFpga, wirePins } from '../../lib/lab/wire-info';
import { headerByFpga } from '../../lib/lab/pads';
import { partPins, sanitize, type PartDef } from '../../lib/lab/catalog';
import type { Device } from '../../lib/lab/devices';
import type { LabLayout, LabPart, LabRuntime, LabWire } from '../../lib/lab/runtime';
import { AssignForm } from './AssignForm';
import { PartBody } from './PartView';
import type { Selection } from './selection';
import { t } from '../../lib/i18n';

interface Props {
  layout: LabLayout;
  connections: Connections;
  selection: Selection;
  runtime: LabRuntime | null;
  freeSignals: readonly string[];
  assignError: string;
  terminal: Device | undefined;
  actTerminal: (name: string, value?: unknown) => void;
  onAssign: (signal: string, wire: LabWire) => void;
  onOpenPins: () => void;
  onOpenProperties: (uid: string) => void;
  onRotate: () => void;
  onRemove: () => void;
  onClear: () => void;
  partDef: (part: LabPart) => PartDef;
}

/** The properties of a part, as one short line for the side panel. */
function summary(def: PartDef, part: LabPart): string[] {
  return (def.props ?? []).map((prop) => {
    const value = sanitize(prop, part.opts[prop.key]);
    const shown =
      prop.type === 'bool'
        ? value
          ? t('да')
          : t('нет')
        : (prop.options?.find((option) => option.value === value)?.label ?? String(value));
    return `${prop.label}: ${shown}`;
  });
}

/** A terminal of a wire as a person reads it. */
function terminalText(terminal: string, layout: LabLayout, partDef: (part: LabPart) => PartDef) {
  const at = terminal.indexOf(':');
  const owner = terminal.slice(0, at);
  const name = terminal.slice(at + 1);
  if (owner === 'board')
    return /^\d+$/.test(name) ? t('плата, контакт {name}', { name }) : t('плата, {name}', { name });
  const part = layout.parts.find((item) => item.uid === owner);
  if (!part) return terminal;
  const def = partDef(part);
  return def.kind === 'breadboard'
    ? t('макетка, {name}', { name })
    : `${part.label || def.title}, ${name}`;
}

/** What is selected on the bench: the wire or part, its pins, and what to do with it. */
export function SidePanel({
  layout,
  connections,
  selection,
  runtime,
  freeSignals,
  assignError,
  terminal,
  actTerminal,
  onAssign,
  onOpenPins,
  onOpenProperties,
  onRotate,
  onRemove,
  onClear,
  partDef,
}: Props) {
  const wire = selection.wire ? layout.wires.find((item) => item.id === selection.wire) : undefined;
  const parts = layout.parts.filter((part) => selection.parts.includes(part.uid));
  const part = parts.length === 1 ? parts[0] : undefined;
  const def = part && partDef(part);
  return (
    <aside className="lab-side">
      <section className="lab-card" aria-label={t('Выбранное')}>
        {wire ? (
          (() => {
            const state = runtime?.wireState(wire.id) ?? 'ok';
            const fpga = wireFpga(connections, wire);
            const target = fpga === undefined ? undefined : runtime?.targets.get(fpga);
            const joined = wirePins(connections, wire)[0];
            const owner = joined && layout.parts.find((item) => item.uid === joined.part);
            const ownerDef = owner && partDef(owner);
            const input = ownerDef
              ? partPins(ownerDef, owner.opts).find((pin) => pin[0] === joined.pin)?.[2] === 'in'
              : false;
            const rail = joined && headerByFpga.get(joined.fpga)?.rail;
            return (
              <>
                <h3>{t('Провод')}</h3>
                <p>
                  {terminalText(wire.from, layout, partDef)} ↔{' '}
                  {terminalText(wire.to, layout, partDef)}
                </p>
                {!joined && (
                  <p className="lab-warn">
                    {t('Провод пока не доходит до вывода детали: подключите второй конец.')}
                  </p>
                )}
                {joined && rail && (
                  <p className="lab-ok">
                    {t('Питание {rail}: вывод {pin} детали «{part}».', {
                      rail,
                      pin: joined.pin,
                      part: owner?.label || ownerDef?.title || '',
                    })}
                  </p>
                )}
                {joined && !rail && state === 'ok' && (
                  <p className="lab-ok">
                    {target ? (
                      <>
                        {t('Сигнал')} <code>{target.signal}</code>{' '}
                      </>
                    ) : (
                      `${t('Сигнал')} `
                    )}
                    {input ? t('идёт из схемы в деталь.') : t('идёт от детали в схему.')}
                  </p>
                )}
                {joined && state === 'direction' && (
                  <p className="lab-warn">
                    {t('На контакте {fpga} — {kind} схемы', {
                      fpga: fpga ?? '',
                      kind: target?.direction === 'output' ? t('выход') : t('вход'),
                    })}{' '}
                    <code>{target?.signal}</code>
                    {t(', а этот вывод детали — {kind}. Провод ничего не передаёт.', {
                      kind: input ? t('тоже вход') : t('тоже выход'),
                    })}
                  </p>
                )}
                {joined && !rail && state === 'unassigned' && runtime && (
                  <>
                    <p className="lab-warn">
                      {t('Контакт {fpga} не назначен ни одному сигналу схемы.', {
                        fpga: fpga ?? '',
                      })}
                    </p>
                    <AssignForm
                      signals={freeSignals}
                      label={t('Сигнал схемы')}
                      empty={
                        input
                          ? t('В схеме нет свободных выходов: добавьте порт в верхний модуль.')
                          : t('В схеме нет свободных входов: добавьте порт в верхний модуль.')
                      }
                      error={assignError}
                      onAssign={(signal) => onAssign(signal, wire)}
                    />
                    <button type="button" className="lab-link" onClick={onOpenPins}>
                      {t('Открыть «Выводы»')}
                    </button>
                  </>
                )}
                <button type="button" className="button subtle" onClick={onRemove}>
                  <Trash2 size={14} /> {t('Убрать провод')}
                </button>
              </>
            );
          })()
        ) : part && def ? (
          <>
            <h3>{part.label || def.title}</h3>
            <p>{def.note}</p>
            {summary(def, part).length > 0 && (
              <ul className="lab-summary">
                {summary(def, part).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <ul className="lab-pinlist">
              {partPins(def, part.opts).map((pin) => {
                const wired = pinLink(connections, part.uid, pin[0]);
                const rail = wired && headerByFpga.get(wired.fpga)?.rail;
                const signal =
                  wired && !rail ? runtime?.targets.get(wired.fpga)?.signal : undefined;
                return (
                  <li key={pin[0]}>
                    <b>{pin[1]}</b>
                    <span>
                      {pin[0] === 'VCC' || pin[0] === 'GND'
                        ? t('питание')
                        : pin[2] === 'in'
                          ? t('вход')
                          : pin[2] === 'out'
                            ? t('выход')
                            : t('двунаправл.')}
                    </span>
                    <em>
                      {wired
                        ? rail
                          ? t('питание {rail}', { rail })
                          : `${t('контакт {fpga}', { fpga: wired.fpga })}${signal ? ` · ${signal}` : ''}`
                        : t('не подключён')}
                    </em>
                  </li>
                );
              })}
            </ul>
            <div className="lab-card-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => onOpenProperties(part.uid)}
              >
                <SlidersHorizontal size={14} /> {t('Свойства…')}
              </button>
              <button type="button" className="button subtle" onClick={onRotate}>
                <RotateCw size={14} /> {t('Повернуть')}
              </button>
              <button type="button" className="button subtle" onClick={onRemove}>
                <Trash2 size={14} /> {t('Убрать деталь')}
              </button>
            </div>
          </>
        ) : parts.length > 1 ? (
          <>
            <h3>{t('Выбрано деталей: {n}', { n: parts.length })}</h3>
            <p>{t('R поворачивает, Delete убирает.')}</p>
            <div className="lab-card-actions">
              <button type="button" className="button subtle" onClick={onRotate}>
                <RotateCw size={14} /> {t('Повернуть')}
              </button>
              <button type="button" className="button subtle" onClick={onRemove}>
                <Trash2 size={14} /> {t('Убрать выбранные')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{t('Как пользоваться')}</h3>
            <ol className="lab-howto">
              <li>
                {t(
                  'Нажмите деталь в списке слева — она встанет на макетную плату, или перетащите её на стол.',
                )}
              </li>
              <li>
                {t(
                  'У каждой детали есть плюс и минус: соедините VCC с 3V3 (или 5V), а GND — с GND платы проводами. Без питания деталь не работает.',
                )}
              </li>
              <li>
                {t(
                  'Потяните от вывода детали, отверстия макетки или контакта платы к другому контакту — появится провод.',
                )}
              </li>
              <li>
                {t(
                  'Если контакт ещё не назначен сигналу, выберите сигнал: в этой панели или у места, куда упал провод.',
                )}
              </li>
            </ol>
            <p>
              {t(
                'Q и E поворачивают стол, колесо меняет масштаб, 0 показывает весь стол. Правая кнопка мыши открывает меню.',
              )}
            </p>
          </>
        )}
      </section>
      <details className="lab-card lab-board-uart">
        <summary>{t('USB-терминал платы')}</summary>
        <p>{t('Выводы 69 (TX схемы) и 70 (RX схемы), как у настоящего USB-разъёма.')}</p>
        {terminal && (
          <PartBody
            device={terminal}
            version={terminal.viewVersion}
            title={t('USB-терминал платы')}
            muted
            act={actTerminal}
          />
        )}
      </details>
      {!!layout.parts.length && (
        <button type="button" className="lab-link" onClick={onClear}>
          <X size={13} /> {t('Убрать всё со стола')}
        </button>
      )}
    </aside>
  );
}
