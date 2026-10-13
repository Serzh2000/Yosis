import { RotateCw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { partPins, sanitize, type PartDef } from '../../lib/lab/catalog';
import type { Device } from '../../lib/lab/devices';
import type { LabLayout, LabPart, LabRuntime, LabWire } from '../../lib/lab/runtime';
import { AssignForm } from './AssignForm';
import { PartBody } from './PartView';
import type { Selection } from './useBenchGestures';

interface Props {
  layout: LabLayout;
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
          ? 'да'
          : 'нет'
        : (prop.options?.find((option) => option.value === value)?.label ?? String(value));
    return `${prop.label}: ${shown}`;
  });
}

/** What is selected on the bench: the wire or part, its pins, and what to do with it. */
export function SidePanel({
  layout,
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
      <section className="lab-card" aria-label="Выбранное">
        {wire ? (
          (() => {
            const state = runtime?.wireState(wire.id) ?? 'ok';
            const target = runtime?.targets.get(wire.fpga);
            const owner = layout.parts.find((item) => item.uid === wire.part);
            const wireDef = owner && partDef(owner);
            const input =
              wireDef && owner
                ? partPins(wireDef, owner.opts).find((pin) => pin[0] === wire.pin)?.[2] === 'in'
                : false;
            return (
              <>
                <h3>Провод</h3>
                <p>
                  Контакт платы <b>{wire.fpga}</b> ↔ {owner?.label || wireDef?.title}, вывод{' '}
                  <b>{wire.pin}</b>
                </p>
                {state === 'ok' && (
                  <p className="lab-ok">
                    Сигнал <code>{target?.signal}</code>{' '}
                    {input ? 'идёт из схемы в деталь.' : 'идёт от детали в схему.'}
                  </p>
                )}
                {state === 'direction' && (
                  <p className="lab-warn">
                    На контакте {wire.fpga} — {target?.direction === 'output' ? 'выход' : 'вход'}{' '}
                    схемы <code>{target?.signal}</code>, а этот вывод детали —{' '}
                    {input ? 'тоже вход' : 'тоже выход'}. Провод ничего не передаёт.
                  </p>
                )}
                {state === 'unassigned' && runtime && (
                  <>
                    <p className="lab-warn">
                      Контакт {wire.fpga} не назначен ни одному сигналу схемы.
                    </p>
                    <AssignForm
                      signals={freeSignals}
                      label="Сигнал схемы"
                      empty={`В схеме нет свободных ${input ? 'выходов' : 'входов'}: добавьте порт в верхний модуль.`}
                      error={assignError}
                      onAssign={(signal) => onAssign(signal, wire)}
                    />
                    <button type="button" className="lab-link" onClick={onOpenPins}>
                      Открыть «Выводы»
                    </button>
                  </>
                )}
                <button type="button" className="button subtle" onClick={onRemove}>
                  <Trash2 size={14} /> Убрать провод
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
                const wired = layout.wires.find(
                  (item) => item.part === part.uid && item.pin === pin[0],
                );
                const signal = wired && runtime?.targets.get(wired.fpga)?.signal;
                return (
                  <li key={pin[0]}>
                    <b>{pin[1]}</b>
                    <span>
                      {pin[2] === 'in' ? 'вход' : pin[2] === 'out' ? 'выход' : 'двунаправл.'}
                    </span>
                    <em>
                      {wired
                        ? `контакт ${wired.fpga}${signal ? ` · ${signal}` : ''}`
                        : 'не подключён'}
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
                <SlidersHorizontal size={14} /> Свойства…
              </button>
              <button type="button" className="button subtle" onClick={onRotate}>
                <RotateCw size={14} /> Повернуть
              </button>
              <button type="button" className="button subtle" onClick={onRemove}>
                <Trash2 size={14} /> Убрать деталь
              </button>
            </div>
          </>
        ) : parts.length > 1 ? (
          <>
            <h3>Выбрано деталей: {parts.length}</h3>
            <p>
              Перетаскивайте любую из них: переедут все. Стрелки сдвигают на шаг сетки, R
              поворачивает, Delete убирает.
            </p>
            <div className="lab-card-actions">
              <button type="button" className="button subtle" onClick={onRotate}>
                <RotateCw size={14} /> Повернуть
              </button>
              <button type="button" className="button subtle" onClick={onRemove}>
                <Trash2 size={14} /> Убрать выбранные
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Как пользоваться</h3>
            <ol className="lab-howto">
              <li>Нажмите деталь в списке слева — она появится на столе.</li>
              <li>
                Нажмите вывод детали и контакт на гребёнке платы, или потяните от вывода к контакту.
              </li>
              <li>
                Если контакт ещё не назначен сигналу, выберите сигнал: в этой панели или у места,
                куда упал провод.
              </li>
            </ol>
            <p>
              Деталь двигают за любое место, кроме кнопок на ней. Правая кнопка мыши открывает меню,
              двойной щелчок — свойства. Ctrl+колесо меняет масштаб, 0 показывает весь стол.
            </p>
          </>
        )}
      </section>
      <details className="lab-card lab-board-uart">
        <summary>USB-терминал платы</summary>
        <p>Выводы 69 (TX схемы) и 70 (RX схемы), как у настоящего USB-разъёма.</p>
        {terminal && (
          <PartBody
            device={terminal}
            version={terminal.viewVersion}
            title="USB-терминал платы"
            muted
            act={actTerminal}
          />
        )}
      </details>
      {!!layout.parts.length && (
        <button type="button" className="lab-link" onClick={onClear}>
          <X size={13} /> Убрать всё со стола
        </button>
      )}
    </aside>
  );
}
