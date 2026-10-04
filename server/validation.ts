import { createHash } from 'node:crypto';
import type { Diagnostic, Project, SimulationConfig } from '../shared/types';

import { RequestError } from '../shared/errors';
export { RequestError } from '../shared/errors';
export { validateProject } from '../shared/project-validation';

export function projectHash(project: Project): string {
  // Source order matters to Verilog macro definitions, so keep it in the hash.
  return createHash('sha256').update(JSON.stringify(project)).digest('hex');
}

export function parseDiagnostics(logs: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  for (const line of logs.split(/\r?\n/)) {
    const match = line.match(/\b(error|warning):\s*(.*)/i);
    if (!match) continue;
    const severity = match[1].toLowerCase() === 'error' ? 'error' : 'warning';
    const location = line.match(
      /(?:^|\s)([A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:sv|v|svh|vh)):(\d+)(?:\.\d+)?/,
    );
    const diagnostic: Diagnostic = { severity, message: match[2].trim() || line.trim() };
    if (location) {
      diagnostic.file = location[1];
      diagnostic.line = Number(location[2]);
    }
    const key = JSON.stringify(diagnostic);
    if (!seen.has(key)) {
      diagnostics.push(diagnostic);
      seen.add(key);
    }
  }
  return diagnostics;
}

export function validateSimulationConfig(value: unknown): SimulationConfig {
  if (!value || typeof value !== 'object')
    throw new RequestError('Параметры симуляции не переданы.');
  const config = value as Record<string, unknown>;
  for (const key of ['clock', 'reset']) {
    if (
      config[key] !== null &&
      (typeof config[key] !== 'string' || !/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(config[key]))
    )
      throw new RequestError(`Некорректное имя входа ${key}.`);
  }
  if (config.clock !== null && config.clock === config.reset)
    throw new RequestError('Тактовый вход и сброс должны различаться.');
  if (typeof config.resetActiveLow !== 'boolean')
    throw new RequestError('Укажите полярность сброса.');
  if (
    !Number.isInteger(config.cycles) ||
    Number(config.cycles) < 1 ||
    Number(config.cycles) > 10_000
  )
    throw new RequestError('Количество циклов должно быть целым числом от 1 до 10000.');
  if (
    !Number.isInteger(config.resetCycles) ||
    Number(config.resetCycles) < 0 ||
    Number(config.resetCycles) > Number(config.cycles)
  )
    throw new RequestError('Число циклов сброса должно быть от 0 до общего числа циклов.');
  if (
    !Number.isInteger(config.periodNs) ||
    Number(config.periodNs) < 1 ||
    Number(config.periodNs) > 1_000_000
  )
    throw new RequestError('Период должен быть целым числом от 1 до 1000000 нс.');
  if (!config.inputs || typeof config.inputs !== 'object' || Array.isArray(config.inputs))
    throw new RequestError('Некорректные постоянные значения входов.');
  function validateInputs(values: Record<string, unknown>): Record<string, string> {
    const inputs: Record<string, string> = Object.create(null);
    if (Object.keys(values).length > 256)
      throw new RequestError('Слишком много входов для симуляции.');
    for (const [name, value] of Object.entries(values)) {
      if (
        !/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(name) ||
        typeof value !== 'string' ||
        value.length > 1024 ||
        !/^(?:\d+|0x[\da-f]+|0b[01]+)$/i.test(value)
      )
        throw new RequestError(
          `Значение входа ${name}: ожидается неотрицательное число в десятичном, 0x или 0b формате.`,
        );
      if (name === config.clock || name === config.reset)
        throw new RequestError(`Вход ${name} уже управляется генератором такта или сброса.`);
      inputs[name] = value;
    }
    return inputs;
  }
  const inputs = validateInputs(config.inputs as Record<string, unknown>);
  let stimuli: SimulationConfig['stimuli'];
  if (config.stimuli !== undefined) {
    if (!Array.isArray(config.stimuli) || config.stimuli.length > 2048)
      throw new RequestError('Последовательность входов должна содержать до 2048 шагов.');
    let previous = -1;
    stimuli = config.stimuli.map((event: unknown) => {
      if (!event || typeof event !== 'object')
        throw new RequestError('Некорректный шаг последовательности входов.');
      const entry = event as Record<string, unknown>;
      if (
        !Number.isInteger(entry.cycle) ||
        Number(entry.cycle) <= previous ||
        Number(entry.cycle) >= Number(config.cycles)
      )
        throw new RequestError('Номера шагов должны возрастать от 0 до числа циклов минус один.');
      if (!entry.inputs || typeof entry.inputs !== 'object' || Array.isArray(entry.inputs))
        throw new RequestError('Укажите значения входов для шага.');
      previous = Number(entry.cycle);
      return { cycle: previous, inputs: validateInputs(entry.inputs as Record<string, unknown>) };
    });
  }
  return {
    clock: config.clock as string | null,
    reset: config.reset as string | null,
    resetActiveLow: config.resetActiveLow,
    resetCycles: Number(config.resetCycles),
    cycles: Number(config.cycles),
    periodNs: Number(config.periodNs),
    inputs,
    ...(stimuli ? { stimuli } : {}),
  };
}
