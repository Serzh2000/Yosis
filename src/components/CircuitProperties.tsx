import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import {
  blocks,
  dividerPlan,
  formatHz,
  formatSeconds,
  type CircuitNode,
  type ParamSpec,
  type Params,
} from '../../shared/schematic';
import { normalizeParams } from '../../shared/circuit-edit';

/** Что сделает блок с такими настройками: показывается сразу, до применения. */
export function previewText(node: Pick<CircuitNode, 'kind' | 'params'>): string[] {
  const def = blocks[node.kind],
    lines = [def.describe(node.params)];
  if (node.kind === 'divider') {
    const plan = dividerPlan(node.params);
    if (plan.error) lines.push(plan.error);
    else
      lines.push(
        `Счёт до ${plan.cycles.toLocaleString('ru-RU')}: ${node.params.mode === 'square' ? 'смена уровня каждые' : 'импульс каждые'} ${
          node.params.mode === 'square'
            ? plan.cycles.toLocaleString('ru-RU') + ' тактов'
            : formatSeconds(plan.periodSeconds)
        }.`,
        `Точная частота: ${formatHz(plan.actualHz)}, период ${formatSeconds(plan.periodSeconds)}.`,
      );
  }
  if (node.kind === 'debounce') {
    const cycles = Math.max(
      1,
      Math.round(((node.params.ms as number) / 1000) * (node.params.clockHz as number)),
    );
    lines.push(`Выход меняется, когда вход устойчив ${cycles.toLocaleString('ru-RU')} тактов.`);
  }
  if (node.kind === 'counter' && node.params.modulus)
    lines.push(`Считает 0…${(node.params.modulus as number) - 1} и начинает заново.`);
  return lines;
}

function Field({
  spec,
  params,
  setParams,
}: {
  spec: ParamSpec;
  params: Params;
  setParams: (changes: Params) => void;
}) {
  const value = params[spec.key];
  const id = `prop-${spec.key}`;
  const label = (control: ReactNode) => (
    <label className="prop-field" htmlFor={id}>
      <span>{spec.label}</span>
      {control}
      {spec.hint && <small>{spec.hint}</small>}
    </label>
  );
  switch (spec.type) {
    case 'int': {
      const max = typeof spec.max === 'function' ? spec.max(params) : spec.max;
      return label(
        <input
          id={id}
          type="number"
          min={spec.min}
          max={max}
          step={1}
          value={value as number}
          onChange={(event) => setParams({ [spec.key]: Number(event.target.value) })}
        />,
      );
    }
    case 'float':
      return label(
        <input
          id={id}
          type="number"
          min={spec.min}
          max={spec.max}
          step="any"
          value={value as number}
          onChange={(event) => setParams({ [spec.key]: Number(event.target.value) })}
        />,
      );
    case 'bool':
      return (
        <label className="prop-check" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value as boolean}
            onChange={(event) => setParams({ [spec.key]: event.target.checked })}
          />
          <span>{spec.label}</span>
          {spec.hint && <small>{spec.hint}</small>}
        </label>
      );
    case 'select':
      return label(
        <select
          id={id}
          value={String(value)}
          onChange={(event) => {
            const chosen = event.target.value;
            setParams({
              [spec.key]: typeof params[spec.key] === 'number' ? Number(chosen) : chosen,
            });
          }}
        >
          {spec.options.map(([key, title]) => (
            <option key={key} value={key}>
              {title}
            </option>
          ))}
        </select>,
      );
    case 'multi':
      return (
        <fieldset className="prop-multi">
          <legend>{spec.label}</legend>
          {spec.options.map(([key, title]) => (
            <label key={key} className="prop-check">
              <input
                type="checkbox"
                checked={(value as string[]).includes(key)}
                onChange={(event) =>
                  setParams({
                    [spec.key]: event.target.checked
                      ? [...(value as string[]), key]
                      : (value as string[]).filter((item) => item !== key),
                  })
                }
              />
              <span>{title}</span>
            </label>
          ))}
        </fieldset>
      );
    case 'mask': {
      const count = params[spec.countKey] as number;
      return (
        <fieldset className="prop-multi">
          <legend>{spec.label}</legend>
          {Array.from({ length: count }, (_, index) => (
            <label key={index} className="prop-check">
              <input
                type="checkbox"
                checked={(((value as number) >> index) & 1) === 1}
                onChange={(event) =>
                  setParams({
                    [spec.key]: event.target.checked
                      ? (value as number) | (1 << index)
                      : (value as number) & ~(1 << index),
                  })
                }
              />
              <span>Вход {spec.names[index]}</span>
            </label>
          ))}
        </fieldset>
      );
    }
    case 'big':
      return label(
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]+"
          maxLength={20}
          value={value as string}
          onChange={(event) => setParams({ [spec.key]: event.target.value.replace(/[^0-9]/g, '') })}
        />,
      );
    case 'text':
      return label(
        <textarea
          id={id}
          rows={4}
          maxLength={spec.maxLength}
          value={value as string}
          onChange={(event) => setParams({ [spec.key]: event.target.value })}
        />,
      );
    case 'table': {
      const words = value as string[];
      return (
        <fieldset className="prop-table">
          <legend>{spec.label}</legend>
          <div role="table" aria-label="Таблица значений">
            {words.map((word, index) => (
              <label key={index} role="row">
                <span role="cell">{index}</span>
                <input
                  role="cell"
                  aria-label={`Слово ${index}`}
                  inputMode="numeric"
                  value={word}
                  onChange={(event) =>
                    setParams({
                      [spec.key]: words.map((item, i) =>
                        i === index ? event.target.value.replace(/[^0-9]/g, '') : item,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
  }
}

export function CircuitProperties({
  node,
  disabled,
  problems,
  onApply,
  onDelete,
  onPins,
}: {
  node: CircuitNode;
  disabled: boolean;
  problems: string[];
  onApply: (changes: { name: string; params: Params }) => void;
  onDelete: () => void;
  onPins?: () => void;
}) {
  const def = blocks[node.kind];
  const [name, setName] = useState(node.name),
    [params, setParams] = useState<Params>(node.params),
    [error, setError] = useState('');
  const draft = useMemo(() => ({ kind: node.kind, params }), [node.kind, params]);
  const dirty = name !== node.name || JSON.stringify(params) !== JSON.stringify(node.params);
  function change(changes: Params) {
    setParams((previous) => normalizeParams({ kind: node.kind, params: previous }, changes));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onApply({ name, params });
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Проверьте свойства.');
    }
  }
  return (
    <form className="circuit-properties" onSubmit={submit} aria-label={`Свойства: ${def.title}`}>
      <strong>{def.title}</strong>
      <p>{def.help}</p>
      <label className="prop-field" htmlFor="prop-name">
        <span>Имя в схеме и в Verilog</span>
        <input
          id="prop-name"
          required
          maxLength={128}
          pattern="[A-Za-z_][A-Za-z0-9_$]*"
          title="Латинские буквы, цифры и подчёркивание; начинается с буквы"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {def.params
        .filter((spec) => !spec.when || spec.when(params))
        .map((spec) => (
          <Field key={spec.key} spec={spec} params={params} setParams={change} />
        ))}
      <div className="prop-preview" aria-live="polite">
        <b>Что получится</b>
        {previewText(draft).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {problems.map((line) => (
          <p key={line} className="prop-problem">
            {line}
          </p>
        ))}
      </div>
      <button className="button primary" disabled={disabled || !dirty}>
        Применить
      </button>
      {def.port?.board && onPins && (
        <p className="prop-note">
          Вывод платы назначается автоматически, вкладку «Выводы» трогать не нужно.
        </p>
      )}
      {(node.kind === 'input' || node.kind === 'output') && onPins && (
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
