import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircuitBoard,
  FileCode2,
  Plus,
  X,
} from 'lucide-react';
import type { Project } from '../../shared/types';
import {
  createWizardProject,
  suggestWizardName,
  validateWizardFields,
  wizardStartingPoints,
} from '../lib/project-wizard';
import type { WizardErrors } from '../lib/project-wizard';
import { parseCstPins } from '../lib/physical';
import {
  compareCurriculumExamples,
  curriculumLevels,
  getExampleLesson,
} from '../lib/example-curriculum';
import { Dialog } from './Dialog';
import './project-wizard.css';

export interface ProjectWizardProps {
  onCreate: (project: Project) => void | Promise<void>;
  onClose: () => void;
  existingNames: readonly string[];
  initialName?: string;
  disabled?: boolean;
  error?: string;
  embedded?: boolean;
  initialStart?: string;
  initialStep?: number;
  onBusyChange?: (busy: boolean) => void;
}

const steps = ['Начало', 'Проект и плата', 'Проверка'];
const beginnerIds = ['button', 'logic', 'counter', 'blank'];
const pinLabels: Record<string, string> = {
  '4': 'Генератор 27 МГц',
  '87': 'Кнопка на выводе 87 · нажата = 1',
  '88': 'Кнопка на выводе 88 · нажата = 1',
  '70': 'UART_RX от USB-UART',
};
function pinLabel(pin: string): string {
  return (
    pinLabels[pin] ||
    (Number(pin) >= 15 && Number(pin) <= 20
      ? `LED${Number(pin) - 15} · светится при 0`
      : 'Вывод FPGA')
  );
}

export function ProjectWizard({
  onCreate,
  onClose,
  existingNames,
  initialName,
  disabled = false,
  error,
  embedded = false,
  initialStart = 'button',
  initialStep = 0,
  onBusyChange,
}: ProjectWizardProps) {
  const [step, setStep] = useState(initialStep);
  const [start, setStart] = useState(initialStart);
  const [name, setName] = useState(() => suggestWizardName(existingNames, initialName));
  const [top, setTop] = useState('top');
  const [fieldErrors, setFieldErrors] = useState<WizardErrors>({});
  const [creationError, setCreationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busy = submitting || disabled;
  const settings = { start, name, top };
  const selected = wizardStartingPoints.find((item) => item.id === start)!;
  const preview = useMemo(() => {
    try {
      return { project: createWizardProject({ start, name, top }, existingNames), error: '' };
    } catch (value) {
      return {
        project: null,
        error: value instanceof Error ? value.message : 'Проверьте настройки проекта.',
      };
    }
  }, [start, name, top, existingNames]);
  const pins = preview.project ? parseCstPins(preview.project.files) : [];
  const hasClock = pins.some((pin) => pin.signal === 'clk' && pin.pin === '4');

  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);
  useEffect(() => {
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);

  async function next() {
    if (busy) return;
    setCreationError('');
    if (step === 0) {
      setStep(1);
      return;
    }
    const errors = validateWizardFields(settings, existingNames);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const id = errors.name ? 'wizard-project-name' : 'wizard-top-name';
      dialogRef.current?.querySelector<HTMLInputElement>(`#${id}`)?.focus();
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(createWizardProject(settings, existingNames));
    } catch (value) {
      setCreationError(
        value instanceof Error ? value.message : 'Не удалось создать проект. Попробуйте ещё раз.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      embedded={embedded}
      className="project-wizard"
      backdropClassName="wizard-backdrop"
      labelledBy="wizard-title"
      descriptionId="wizard-intro"
      busy={submitting}
      closeDisabled={submitting}
      initialFocus="[aria-pressed='true']"
      onClose={onClose}
    >
      <form
        className="wizard-form"
        ref={dialogRef}
        onSubmit={(event) => {
          event.preventDefault();
          void next();
        }}
      >
        <header className="wizard-heading">
          <div className="wizard-heading-icon">
            <CircuitBoard size={23} />
          </div>
          <div>
            <h2 id="wizard-title">Новый проект</h2>
            <p id="wizard-intro">От идеи к схеме и выводам платы</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть мастер проекта"
            onClick={onClose}
            disabled={submitting}
          >
            <X size={18} />
          </button>
        </header>
        <ol className="wizard-steps" aria-label="Шаги создания проекта">
          {steps.slice(initialStep).map((title, displayIndex) => {
            const index = displayIndex + initialStep;
            return (
              <li
                key={title}
                className={step === index ? 'current' : step > index ? 'complete' : ''}
                aria-current={step === index ? 'step' : undefined}
              >
                <span>{step > index ? <Check size={13} /> : displayIndex + 1}</span>
                {title}
              </li>
            );
          })}
        </ol>
        <section className="wizard-body" aria-labelledby="wizard-step-title">
          <h3 id="wizard-step-title" ref={headingRef} tabIndex={-1}>
            {
              ['С чего начнём?', 'Как назовём устройство?', 'Всё готово для первого эксперимента'][
                step
              ]
            }
          </h3>
          {step === 0 && (
            <>
              <p className="wizard-description">
                Выберите небольшую схему с объяснениями или заготовку для своей идеи. Каждый вариант
                содержит Verilog и файл выводов .cst.
              </p>
              <div className="wizard-starts" role="group" aria-label="Начальная схема">
                {beginnerIds.map((id) => {
                  const item = wizardStartingPoints.find((value) => value.id === id)!;
                  const Icon =
                    id === 'counter' ? Activity : id === 'blank' ? FileCode2 : CircuitBoard;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={start === id}
                      disabled={busy}
                      className={start === id ? 'selected' : ''}
                      onClick={() => setStart(id)}
                    >
                      <Icon size={23} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                        {id === 'button' && <em>Для первого знакомства</em>}
                      </span>
                      <span className="wizard-selection">
                        {start === id && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="wizard-field-label" htmlFor="wizard-example">
                <BookOpen size={14} />
                Ещё примеры
              </label>
              <select
                id="wizard-example"
                value={beginnerIds.includes(start) ? '' : start}
                disabled={busy}
                onChange={(event) => {
                  if (event.target.value) setStart(event.target.value);
                }}
              >
                <option value="">Выберите пример по уровню сложности…</option>
                {curriculumLevels.map((level) => (
                  <optgroup key={level.id} label={`${level.id}. ${level.title}`}>
                    {wizardStartingPoints
                      .filter(
                        (item) =>
                          !beginnerIds.includes(item.id) &&
                          getExampleLesson(item.id)?.level === level.id,
                      )
                      .sort(compareCurriculumExamples)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} — {item.description}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <div className="wizard-choice-note">
                <Check size={15} />
                <span>
                  Выбрано: <strong>{selected.title}</strong>
                </span>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="wizard-description">
                Название видно в списке проектов. Верхний модуль — точка входа вашей схемы; обычно
                его называют top.
              </p>
              <div className="wizard-fields">
                <div>
                  <label htmlFor="wizard-project-name">Название проекта</label>
                  <input
                    id="wizard-project-name"
                    value={name}
                    maxLength={100}
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby="wizard-name-hint wizard-name-error"
                    onChange={(event) => {
                      setName(event.target.value);
                      setFieldErrors((current) => ({ ...current, name: undefined }));
                    }}
                  />
                  <small id="wizard-name-hint">Любое понятное название, например «Светофор».</small>
                  {fieldErrors.name && (
                    <span id="wizard-name-error" className="wizard-field-error" role="alert">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>
                <div>
                  <label htmlFor="wizard-top-name">Верхний модуль Verilog</label>
                  <input
                    id="wizard-top-name"
                    value={top}
                    maxLength={128}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.top)}
                    aria-describedby="wizard-top-hint wizard-top-error"
                    onChange={(event) => {
                      setTop(event.target.value);
                      setFieldErrors((current) => ({ ...current, top: undefined }));
                    }}
                  />
                  <small id="wizard-top-hint">
                    Имя модуля устройства. Оно используется при сборке схемы.
                  </small>
                  {fieldErrors.top && (
                    <span id="wizard-top-error" className="wizard-field-error" role="alert">
                      {fieldErrors.top}
                    </span>
                  )}
                </div>
              </div>
              <label className="wizard-field-label" htmlFor="wizard-board">
                Плата
              </label>
              <select id="wizard-board" value="tangnano20k" disabled={busy} onChange={() => {}}>
                <option value="tangnano20k">Sipeed Tang Nano 20K</option>
              </select>
              <div className="wizard-board-info">
                <CircuitBoard size={25} />
                <div>
                  <strong>GW2AR-LV18QN88C8/I7</strong>
                  <span>27 МГц · 6 LED · 2 кнопки · логические уровни 3,3 В</span>
                  <small>
                    В этой версии мастер настроен на Tang Nano 20K. Для неё подготовлены выводы и
                    параметры сборки.
                  </small>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              {preview.project ? (
                <>
                  <div className="wizard-review-title">
                    <div>
                      <span>Проект</span>
                      <strong>{preview.project.name}</strong>
                    </div>
                    <div>
                      <span>Верхний модуль</span>
                      <code>{preview.project.top}</code>
                    </div>
                    <div>
                      <span>Старт</span>
                      <strong>{selected.title}</strong>
                    </div>
                  </div>
                  <div className="wizard-review-grid">
                    <div>
                      <h4>Файлы проекта</h4>
                      <ul className="wizard-file-list">
                        {preview.project.files.map((file) => (
                          <li key={file.name}>
                            <FileCode2 size={15} />
                            <code>{file.name}</code>
                            <small>
                              {file.name.endsWith('.cst')
                                ? 'Выводы и электрические уровни'
                                : 'Схема с комментариями'}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="wizard-clock-note">
                      <Activity size={19} />
                      <strong>
                        {hasClock ? 'Такт 27 МГц → clk' : 'Схема без тактового сигнала'}
                      </strong>
                      <p>
                        {hasClock
                          ? 'Генератор платы подключён к выводу 4. В .cst задан глобальный буфер BUFG.'
                          : 'Выход меняется вслед за входами. Такт для этого примера не нужен.'}
                      </p>
                      <small>Уровни LVCMOS33 · 3,3 В</small>
                    </div>
                  </div>
                  <h4>Порты → физические выводы</h4>
                  <p className="wizard-pin-help">
                    Номера ниже относятся к корпусу FPGA. Мастер уже включит эти назначения в .cst.
                  </p>
                  <div className="wizard-pin-table-wrap">
                    <table className="wizard-pin-table">
                      <thead>
                        <tr>
                          <th scope="col">Порт схемы</th>
                          <th scope="col">Вывод</th>
                          <th scope="col">На плате</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pins.map((pin) => (
                          <tr key={pin.signal}>
                            <td>
                              <code>{pin.signal}</code>
                            </td>
                            <td>{pin.pin}</td>
                            <td>{pinLabel(pin.pin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="wizard-final-note">
                    После создания откроется {start === 'schematic' ? 'конструктор' : 'код'}. Затем
                    можно синтезировать схему, запустить диаграммы или виртуальную плату.
                  </p>
                </>
              ) : (
                <div className="wizard-alert" role="alert">
                  {preview.error}
                </div>
              )}
            </>
          )}
        </section>
        {(creationError || error) && (
          <div className="wizard-alert" role="alert">
            {creationError || error}
          </div>
        )}
        <footer className="wizard-footer">
          <span>
            Шаг {step - initialStep + 1} из {steps.length - initialStep}
          </span>
          <div>
            <button
              type="button"
              className="button subtle"
              disabled={submitting}
              onClick={() => {
                if (step > initialStep) {
                  setStep((value) => value - 1);
                  setCreationError('');
                } else onClose();
              }}
            >
              {step > initialStep ? (
                <>
                  <ArrowLeft size={14} />
                  Назад
                </>
              ) : (
                'Отмена'
              )}
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={busy || (step === 2 && !preview.project)}
            >
              {submitting ? (
                'Создаём…'
              ) : step === 2 ? (
                <>
                  <Plus size={15} />
                  Создать проект
                </>
              ) : (
                <>
                  Далее
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
