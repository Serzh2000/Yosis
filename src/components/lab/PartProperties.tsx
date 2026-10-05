import { memo, useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  partPins,
  sanitize,
  type PartDef,
  type PartProp,
  type PropValue,
} from '../../lib/lab/catalog';
import type { LabPart, LabWire, PinTarget } from '../../lib/lab/runtime';
import { Dialog } from '../Dialog';

interface Props {
  part: LabPart;
  def: PartDef;
  wires: readonly LabWire[];
  targets: ReadonlyMap<number, PinTarget> | undefined;
  /** Called for every change; the bench shows it at once. */
  onChange: (change: { opts?: Record<string, unknown>; label?: string }, key: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function NumberField({
  prop,
  value,
  onCommit,
}: {
  prop: PartProp;
  value: number;
  onCommit: (value: number) => void;
}) {
  // The text may be half typed; only a complete number is applied.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={prop.min}
      max={prop.max}
      value={draft ?? String(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (event.target.value !== '' && Number.isFinite(next)) onCommit(next);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function Field({
  prop,
  value,
  onChange,
}: {
  prop: PartProp;
  value: PropValue;
  onChange: (value: PropValue) => void;
}) {
  const id = useId();
  if (prop.type === 'bool')
    return (
      <div className="lab-field">
        <label className="lab-field-check">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(event) => onChange(event.target.checked)}
          />
          {prop.label}
        </label>
        {prop.hint && <small>{prop.hint}</small>}
      </div>
    );
  return (
    <div className="lab-field">
      {prop.type === 'color' ? (
        <>
          <span id={id}>{prop.label}</span>
          <div className="lab-swatches" role="radiogroup" aria-labelledby={id}>
            {prop.options!.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={option.value === value}
                aria-label={option.label}
                title={option.label}
                style={{ background: String(option.value) }}
                onClick={() => onChange(option.value)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <label htmlFor={id}>{prop.label}</label>
          {prop.type === 'select' ? (
            <select
              id={id}
              value={String(value)}
              onChange={(event) =>
                onChange(
                  prop.options!.find((option) => String(option.value) === event.target.value)!
                    .value,
                )
              }
            >
              {prop.options!.map((option) => (
                <option key={option.value} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <NumberField prop={prop} value={value as number} onCommit={onChange} />
          )}
        </>
      )}
      {prop.hint && <small>{prop.hint}</small>}
    </div>
  );
}

/** The «Свойства детали» window. It does not show anything that changes while the design runs. */
export const PartProperties = memo(function PartProperties({
  part,
  def,
  wires,
  targets,
  onChange,
  onRemove,
  onClose,
}: Props) {
  const nameId = useId();
  const pins = partPins(def, part.opts);
  return (
    <Dialog title="Свойства детали" className="dialog lab-props" onClose={onClose}>
      <p className="lab-props-note">
        <strong>{def.title}.</strong> {def.note}
      </p>
      <div className="lab-field">
        <label htmlFor={nameId}>Подпись</label>
        <input
          id={nameId}
          value={part.label ?? ''}
          maxLength={40}
          placeholder={def.title}
          onChange={(event) => onChange({ label: event.target.value }, 'label')}
        />
        <small>Она заменит название детали на столе.</small>
      </div>
      {def.props?.map((prop) => (
        <Field
          key={prop.key}
          prop={prop}
          value={sanitize(prop, part.opts[prop.key])}
          onChange={(value) => onChange({ opts: { [prop.key]: value } }, `prop:${prop.key}`)}
        />
      ))}
      <table className="lab-props-pins">
        <caption>Выводы</caption>
        <thead>
          <tr>
            <th scope="col">Вывод</th>
            <th scope="col">Направление</th>
            <th scope="col">Контакт платы</th>
            <th scope="col">Сигнал</th>
          </tr>
        </thead>
        <tbody>
          {pins.map((pin) => {
            const wire = wires.find((item) => item.pin === pin[0]);
            const target = wire ? targets?.get(wire.fpga) : undefined;
            return (
              <tr key={pin[0]}>
                <th scope="row">{pin[1]}</th>
                <td>{pin[2] === 'in' ? 'вход' : pin[2] === 'io' ? 'двунаправл.' : 'выход'}</td>
                <td>{wire ? wire.fpga : 'не подключён'}</td>
                <td>{wire ? (target?.signal ?? 'не назначен') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="dialog-actions lab-props-actions">
        <button type="button" className="button stop" onClick={onRemove}>
          <Trash2 size={14} /> Удалить деталь
        </button>
        <button type="button" className="button primary" onClick={onClose}>
          Готово
        </button>
      </div>
    </Dialog>
  );
});
