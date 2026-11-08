import type { McuProject, SimulationFrame } from './mcu';
import { controlError, partCatalog, partValues } from './catalog';
export interface ScenarioStep {
  time: number;
  inputs?: { part: string; value: number; index?: number }[];
  checks?: {
    pin: string;
    level?: 0 | 1;
    duty?: number;
    tolerance?: number;
    serial?: string;
    /** Text that a module with a text screen (LCD) must show on one of its lines. */
    screen?: { part: string; text: string };
  }[];
}
export interface Scenario {
  name: string;
  steps: ScenarioStep[];
}
export interface CheckResult {
  time: number;
  label: string;
  passed: boolean;
  actual: string;
  expected: string;
}
export function defaultScenario(project: McuProject): Scenario {
  const prefix = project.board === 'uno' || project.board === 'nano' ? 'D' : 'IO',
    led = project.board === 'uno' || project.board === 'nano' ? 'D13' : 'IO2';
  if (project.parts.some((p) => p.id === 'button'))
    return {
      name: 'Кнопка → LED',
      steps: [
        { time: 0.15, checks: [{ pin: led, level: 0 }] },
        { time: 0.16, inputs: [{ part: 'button', value: 1 }] },
        { time: 0.35, checks: [{ pin: led, level: 1 }] },
        { time: 0.36, inputs: [{ part: 'button', value: 0 }] },
        { time: 0.55, checks: [{ pin: led, level: 0 }] },
      ],
    };
  if (project.parts.some((p) => p.id === 'pot'))
    return {
      name: 'ADC → PWM',
      steps: [
        {
          time: 0.15,
          checks: [{ pin: prefix + (prefix === 'D' ? 9 : 18), duty: 0.5, tolerance: 0.07 }],
        },
        { time: 0.16, inputs: [{ part: 'pot', value: 90 }] },
        {
          time: 0.35,
          checks: [{ pin: prefix + (prefix === 'D' ? 9 : 18), duty: 0.9, tolerance: 0.07 }],
        },
      ],
    };
  if (project.parts.some((p) => p.label === 'Красный')) {
    const pins =
      prefix === 'D' ? [11, 9, 10] : project.board === 'esp32' ? [23, 18, 22] : [16, 18, 17];
    return {
      name: 'Светофор',
      steps: pins.map((pin, i) => ({
        time: [0.15, 1.15, 2.15][i],
        checks: [{ pin: prefix + pin, level: 1 }],
      })),
    };
  }
  return {
    name: 'Blink',
    steps: [
      { time: 0.15, checks: [{ pin: led, level: 1 }] },
      { time: 0.65, checks: [{ pin: led, level: 0 }] },
    ],
  };
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export function validateScenario(input: unknown, project: McuProject): Scenario {
  if (!isObject(input)) throw new Error('Некорректный сценарий.');
  const v = input as unknown as Scenario;
  if (
    typeof v.name !== 'string' ||
    v.name.length > 80 ||
    !Array.isArray(v.steps) ||
    !v.steps.length ||
    v.steps.length > 100
  )
    throw new Error('До 100 шагов сценария.');
  let previous = 0;
  const steps = v.steps.map((step): ScenarioStep => {
    if (!isObject(step) || !Number.isFinite(step.time))
      throw new Error('Время сценария: 0–20 с по возрастанию.');
    const time = step.time as number;
    if (time < previous || time > 20) throw new Error('Время сценария: 0–20 с по возрастанию.');
    previous = time;
    const result: ScenarioStep = { time };
    if (step.inputs !== undefined && (!Array.isArray(step.inputs) || step.inputs.length > 64))
      throw new Error('Некорректные входы.');
    if (step.inputs !== undefined)
      result.inputs = (step.inputs as unknown[]).map((input) => {
        if (!isObject(input)) throw new Error('Некорректный вход сценария.');
        const part = project.parts.find((p) => p.id === input.part),
          value = input.value as number,
          index = input.index as number | undefined;
        const definition = part && partCatalog[part.kind],
          control =
            index === undefined
              ? definition?.control
              : Number.isInteger(index)
                ? definition?.extras?.[index]
                : undefined;
        if (!part || !control?.scenario || controlError(control, value) !== null)
          throw new Error('Некорректный вход сценария.');
        return { part: part.id, value, ...(index === undefined ? {} : { index }) };
      });
    if (step.checks !== undefined && (!Array.isArray(step.checks) || step.checks.length > 64))
      throw new Error('Некорректные проверки.');
    if (step.checks !== undefined)
      result.checks = (step.checks as unknown[]).map((c) => {
        if (!isObject(c)) throw new Error('Некорректная проверка сценария.');
        const check = c as unknown as NonNullable<ScenarioStep['checks']>[number];
        if (
          typeof check.pin !== 'string' ||
          !project.wires.some(
            (w) => w.from === 'board:' + check.pin || w.to === 'board:' + check.pin,
          ) ||
          (check.level !== undefined && check.level !== 0 && check.level !== 1) ||
          (check.duty !== undefined &&
            (!Number.isFinite(check.duty) || check.duty < 0 || check.duty > 1)) ||
          (check.tolerance !== undefined &&
            (!Number.isFinite(check.tolerance) || check.tolerance < 0 || check.tolerance > 1)) ||
          (check.serial !== undefined &&
            (typeof check.serial !== 'string' || check.serial.length > 200)) ||
          (check.screen !== undefined &&
            (!isObject(check.screen) ||
              !project.parts.some((p) => p.id === check.screen!.part) ||
              typeof check.screen.text !== 'string' ||
              check.screen.text.length > 80))
        )
          throw new Error('Некорректная проверка сценария.');
        return {
          pin: check.pin,
          ...(check.level === undefined ? {} : { level: check.level }),
          ...(check.duty === undefined ? {} : { duty: check.duty }),
          ...(check.tolerance === undefined ? {} : { tolerance: check.tolerance }),
          ...(check.serial === undefined ? {} : { serial: check.serial }),
          ...(check.screen === undefined
            ? {}
            : { screen: { part: check.screen.part, text: check.screen.text } }),
        };
      });
    return result;
  });
  return { name: v.name, steps };
}
export function checkStep(
  step: ScenarioStep,
  frame: SimulationFrame,
  serial: string,
): CheckResult[] {
  return (step.checks ?? []).map((c) => {
    const pin = frame.pins.find((p) => p.id === c.pin);
    let passed = Boolean(pin),
      actual = '',
      expected = '';
    if (c.level !== undefined) {
      passed &&= pin?.level === c.level;
      actual += 'level=' + pin?.level;
      expected += 'level=' + c.level;
    }
    if (c.duty !== undefined) {
      passed &&= Math.abs((pin?.duty ?? -1) - c.duty) <= (c.tolerance ?? 0.05);
      actual += ' duty=' + pin?.duty.toFixed(3);
      expected += ' duty=' + c.duty;
    }
    if (c.serial !== undefined) {
      passed &&= serial.includes(c.serial);
      actual += ' Serial=' + (serial.includes(c.serial) ? 'найден' : 'отсутствует');
      expected += ' ' + c.serial;
    }
    if (c.screen !== undefined) {
      const lines = frame.devices?.[c.screen.part]?.text ?? [];
      passed &&= lines.some((line) => line.includes(c.screen!.text));
      actual += ' экран=«' + lines.map((line) => line.trimEnd()).join(' / ') + '»';
      expected += ' экран: ' + c.screen.text;
    }
    return { time: step.time, label: c.pin, passed, actual, expected };
  });
}
export function applyScenarioInput(
  project: McuProject,
  input: NonNullable<ScenarioStep['inputs']>[number],
): McuProject {
  return {
    ...project,
    parts: project.parts.map((part) => {
      if (part.id !== input.part) return part;
      if (input.index === undefined) return { ...part, value: input.value };
      const values = [...partValues(part)];
      values[input.index] = input.value;
      return { ...part, values };
    }),
  };
}
