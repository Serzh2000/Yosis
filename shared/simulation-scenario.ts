import type { SimulationCheck, SimulationConfig, YosysPort } from './types';
import { RequestError } from './errors';

export function simulationScenarioSnapshot(config: SimulationConfig): string {
  const inputs = (values: Record<string, string>) =>
    Object.entries(values).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([
    config.clock,
    config.reset,
    config.resetActiveLow,
    config.resetCycles,
    config.cycles,
    config.periodNs,
    inputs(config.inputs),
    (config.stimuli ?? []).map((entry) => [entry.cycle, inputs(entry.inputs)]),
    (config.timedStimuli ?? []).map((entry) => [entry.timeNs, inputs(entry.inputs)]),
    (config.expectations ?? []).map((entry) => [entry.timeNs, entry.signal, entry.value]),
  ]);
}

/** Integer picoseconds avoid drift when generating delays and comparing event times. */
export function simulationTimePs(timeNs: unknown): number {
  if (typeof timeNs !== 'number' || !Number.isFinite(timeNs) || timeNs < 0)
    throw new RequestError('Время должно быть неотрицательным числом в наносекундах.');
  const ps = Math.round(timeNs * 1000);
  if (!Number.isSafeInteger(ps) || Math.abs(timeNs - ps / 1000) > 1e-8)
    throw new RequestError('Укажите время с точностью до 0,001 нс (1 пс).');
  return ps;
}

export function expectedValueBits(value: string, width: number): string {
  if (!Number.isInteger(width) || width < 1 || width > 4096)
    throw new RequestError('Некорректная ширина проверяемого сигнала.');
  if (/^[xz]$/i.test(value)) return value.toLowerCase().repeat(width);
  if (/^0b[01xz]+$/i.test(value)) {
    const bits = value.slice(2).toLowerCase();
    if (bits.length > width)
      throw new RequestError(`Ожидаемое значение не помещается в ${width} бит.`);
    return bits.padStart(width, '0');
  }
  if (!/^(?:\d+|0x[\da-f]+)$/i.test(value))
    throw new RequestError('Ожидается число, 0b с битами 0/1/X/Z, X или Z.');
  const number = BigInt(value);
  if (number >= 1n << BigInt(width))
    throw new RequestError(`Ожидаемое значение не помещается в ${width} бит.`);
  return number.toString(2).padStart(width, '0');
}

/** Each generated check writes its own index; absent or duplicate samples never pass. */
export function readSimulationChecks(
  content: string,
  expectations: NonNullable<SimulationConfig['expectations']>,
  ports: Record<string, YosysPort>,
): SimulationCheck[] {
  const samples = new Map<number, string | null>();
  for (const line of content.split(/\r?\n/)) {
    const match = /^(\d+) ([01xz]+)$/i.exec(line.trim());
    if (!match) continue;
    const index = Number(match[1]);
    samples.set(index, samples.has(index) ? null : match[2].toLowerCase());
  }
  return expectations.map(({ timeNs, signal, value }, index) => {
    const width = ports[signal].bits.length;
    const expected = expectedValueBits(value, width);
    const sample = samples.get(index);
    const actual = sample?.length === width ? sample : null;
    return { timeNs, signal, expected, actual, passed: actual === expected };
  });
}
