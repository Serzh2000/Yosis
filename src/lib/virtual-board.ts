import type { Project, SimulationConfig, YosysNetlist } from '../../shared/types';
import { examples } from './examples';
import type { VcdSignal, VcdTrace } from './vcd';
import { valueAt } from './waveform';

export type LogicLevel = '0' | '1' | 'x' | 'z';
export interface BoardPort {
  name: string;
  width: number;
  direction: 'input' | 'output' | 'inout';
  offset?: number;
  upto?: number;
}

export function boardPorts(project: Project, rtl?: YosysNetlist): BoardPort[] {
  return Object.entries(rtl?.modules[project.top]?.ports ?? {}).map(([name, port]) => ({
    name,
    width: port.bits.length,
    direction: port.direction,
    offset: port.offset,
    upto: port.upto,
  }));
}

export function portBitName(port: BoardPort, bit: number): string {
  if (port.width === 1 && !port.offset) return port.name;
  const index = (port.offset ?? 0) + (port.upto ? port.width - 1 - bit : bit);
  return `${port.name}[${index}]`;
}

/** Only use the root DUT scope: a child's port cannot stand in for a missing top-level port. */
export function topSignal(trace: VcdTrace, name: string): VcdSignal | undefined {
  const dutDepths = trace.signals
    .map((signal) => signal.scope.indexOf('dut'))
    .filter((index) => index >= 0);
  const depth = dutDepths.length
    ? Math.min(...dutDepths) + 1
    : Math.min(...trace.signals.map((signal) => signal.scope.length));
  return trace.signals.find(
    (signal) =>
      signal.scope.length === depth &&
      (!dutDepths.length || signal.scope.at(-1) === 'dut') &&
      signal.name.replace(/\[[^\]]+\]$/, '').trim() === name,
  );
}

/** Read the switches from the committed simulation, including when the user rewinds. */
export function inputValuesAtTime(
  trace: VcdTrace,
  time: number,
  fallback: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fallback).map(([name, initial]) => {
      const signal = topSignal(trace, name);
      const binary = signal ? valueAt(signal, time) : '';
      return [name, /^[01]+$/.test(binary) ? BigInt(`0b${binary}`).toString() : initial];
    }),
  );
}

/** A switch changes only its own input; existing changes at the same period are retained. */
export function mergeInputEvent(
  events: NonNullable<SimulationConfig['stimuli']>,
  cycle: number,
  changes: Record<string, string>,
): NonNullable<SimulationConfig['stimuli']> {
  const existing = events.find((event) => event.cycle === cycle);
  return [
    ...events.filter((event) => event.cycle !== cycle),
    { cycle, inputs: { ...existing?.inputs, ...changes } },
  ].sort((a, b) => a.cycle - b.cycle);
}

export function bitLevel(signal: VcdSignal | undefined, time: number, bit: number): LogicLevel {
  if (!signal || bit < 0 || bit >= signal.width) return 'x';
  const value = valueAt(signal, time).toLowerCase();
  const result = value.at(-(bit + 1));
  return result === '0' || result === '1' || result === 'z' ? result : 'x';
}

export function simulationDefaults(ports: BoardPort[]): SimulationConfig {
  const singles = ports.filter((port) => port.direction === 'input' && port.width === 1);
  const clock = singles.find((port) => /^(clk|clock)$/i.test(port.name))?.name ?? null;
  const reset = singles.find((port) => /^(reset|rst)(?:_?n)?$/i.test(port.name))?.name ?? null;
  return {
    clock,
    reset,
    resetActiveLow: /(?:_n|rstn|resetn)$/i.test(reset ?? ''),
    resetCycles: reset ? 2 : 0,
    cycles: 64,
    periodNs: 10,
    inputs: Object.fromEntries(
      ports
        .filter((port) => port.direction === 'input' && port.name !== clock && port.name !== reset)
        .map((port) => [port.name, /^(enable|en|ce)$/i.test(port.name) ? '1' : '0']),
    ),
  };
}

export interface InputScenario {
  inputs: Record<string, string>;
  stimuli: NonNullable<SimulationConfig['stimuli']>;
  cycles: number;
}

/** First listed input occupies the most significant bits of each truth-table row. */
export function truthTableScenario(
  ports: BoardPort[],
  maxBits = 8,
  startCycle = 0,
): InputScenario | null {
  const inputs = ports.filter((port) => port.direction === 'input');
  const bits = inputs.reduce((sum, port) => sum + port.width, 0);
  if (
    !inputs.length ||
    !Number.isInteger(maxBits) ||
    maxBits < 1 ||
    maxBits > 8 ||
    bits > maxBits ||
    !Number.isInteger(startCycle) ||
    startCycle < 0 ||
    2 ** bits + startCycle > 10000 ||
    inputs.some((port) => !Number.isInteger(port.width) || port.width < 1)
  )
    return null;
  const cycles = 2 ** bits;
  const rows = Array.from({ length: cycles }, (_, cycle) => {
    let remaining = bits;
    return {
      cycle,
      inputs: Object.fromEntries(
        inputs.map((port) => {
          remaining -= port.width;
          const value = (cycle >> remaining) & ((1 << port.width) - 1);
          return [port.name, String(value)];
        }),
      ),
    };
  });
  return {
    inputs: rows[0].inputs,
    stimuli: rows.slice(1).map((event) => ({ ...event, cycle: event.cycle + startCycle })),
    cycles: cycles + startCycle,
  };
}

/** Prepared scenarios belong to untouched teaching sources, never to arbitrary user HDL. */
export function builtinTruthTableScenario(
  project: Project,
  ports: BoardPort[],
): InputScenario | null {
  const defaults = simulationDefaults(ports);
  if (defaults.clock || defaults.reset) return null;
  const sources = project.files.filter((file) => /\.(v|sv|vh|svh)$/.test(file.name));
  const builtin = examples.some(
    (example) =>
      example.project.top === project.top &&
      (() => {
        const original = example.project.files.filter((file) => /\.(v|sv|vh|svh)$/.test(file.name));
        return (
          original.length === sources.length &&
          original.every((file) =>
            sources.some(
              (candidate) => candidate.name === file.name && candidate.content === file.content,
            ),
          )
        );
      })(),
  );
  return builtin ? truthTableScenario(ports) : null;
}

export function stepTimes(trace: VcdTrace, clock: string | null): number[] {
  const signal = clock ? topSignal(trace, clock) : undefined;
  const times = signal
    ? signal.changes
        .filter(
          (change, index) =>
            change.value === '1' && (index === 0 || signal.changes[index - 1].value !== '1'),
        )
        .map((change) => change.time)
    : [...new Set(trace.signals.flatMap((item) => item.changes.map((change) => change.time)))].sort(
        (a, b) => a - b,
      );
  return [...new Set([trace.startTime, ...times, trace.endTime])];
}

export function nextStep(times: number[], time: number): number {
  return times.find((item) => item > time) ?? times.at(-1) ?? time;
}
