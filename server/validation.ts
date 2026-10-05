import { createHash } from 'node:crypto';
import type { Diagnostic, Project, SimulationConfig } from '../shared/types';
import { expectedValueBits, simulationTimePs } from '../shared/simulation-scenario';

import { RequestError } from '../shared/errors';
export { RequestError } from '../shared/errors';
export { validateProject } from '../shared/project-validation';

export function projectHash(project: Project): string {
  // Source order matters to Verilog macro definitions, so keep it in the hash.
  // Only what is built goes in, in the same shape as the client's getProjectSnapshot: the
  // browser compares this hash with its own. `origin` (which example a project came from)
  // is not a source; hashing it made every build of an example look stale.
  const sources = {
    ...(project.id ? { id: project.id } : {}),
    name: project.name.trim(),
    top: project.top,
    board: project.board,
    files: project.files.map((file) => ({ name: file.name, content: file.content })),
  };
  return createHash('sha256').update(JSON.stringify(sources)).digest('hex');
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
  const durationPs = Number(config.cycles) * Number(config.periodNs) * 1000;
  let timedStimuli: SimulationConfig['timedStimuli'];
  if (config.timedStimuli !== undefined) {
    if (!Array.isArray(config.timedStimuli) || config.timedStimuli.length > 2048)
      throw new RequestError('Последовательность входов должна содержать до 2048 событий.');
    if (stimuli?.length && config.timedStimuli.length)
      throw new RequestError('Выберите одну шкалу событий: периоды или наносекунды.');
    let previous = -1;
    timedStimuli = config.timedStimuli.map((event: unknown) => {
      if (!event || typeof event !== 'object') throw new RequestError('Некорректное событие.');
      const entry = event as Record<string, unknown>;
      const ps = simulationTimePs(entry.timeNs);
      if (ps <= previous || ps >= durationPs)
        throw new RequestError(
          'Время событий должно возрастать и быть меньше длительности запуска.',
        );
      if (!entry.inputs || typeof entry.inputs !== 'object' || Array.isArray(entry.inputs))
        throw new RequestError('Укажите значения входов для события.');
      previous = ps;
      return { timeNs: ps / 1000, inputs: validateInputs(entry.inputs as Record<string, unknown>) };
    });
  }
  let expectations: SimulationConfig['expectations'];
  if (config.expectations !== undefined) {
    if (!Array.isArray(config.expectations) || config.expectations.length > 2048)
      throw new RequestError('Разрешено до 2048 проверок за запуск.');
    expectations = config.expectations.map((event: unknown) => {
      if (!event || typeof event !== 'object') throw new RequestError('Некорректная проверка.');
      const entry = event as Record<string, unknown>;
      const ps = simulationTimePs(entry.timeNs);
      if (ps > durationPs) throw new RequestError('Проверка выходит за длительность запуска.');
      if (typeof entry.signal !== 'string' || !/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(entry.signal))
        throw new RequestError('Укажите имя проверяемого порта.');
      if (typeof entry.value !== 'string' || entry.value.length > 1024)
        throw new RequestError('Некорректное ожидаемое значение.');
      expectedValueBits(entry.value, 4096);
      return { timeNs: ps / 1000, signal: entry.signal, value: entry.value };
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
    ...(timedStimuli ? { timedStimuli } : {}),
    ...(expectations ? { expectations } : {}),
  };
}
