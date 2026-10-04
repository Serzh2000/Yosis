import type { SimulationConfig, YosysPort } from '../shared/types';
import { RequestError } from './validation';
import { expectedValueBits, simulationTimePs } from '../shared/simulation-scenario';

export const TESTBENCH_TOP = '__yosis_testbench';
export function generateTestbench(
  top: string,
  ports: Record<string, YosysPort>,
  config: SimulationConfig,
): string {
  const entries = Object.entries(ports);
  if (entries.length > 256) throw new RequestError('Симуляция поддерживает до 256 портов.');
  for (const name of [config.clock, config.reset]) {
    if (
      name &&
      (!ports[name] || ports[name].direction !== 'input' || ports[name].bits.length !== 1)
    )
      throw new RequestError(`Вход ${name} должен существовать и иметь ширину 1 бит.`);
  }
  for (const name of new Set([
    ...Object.keys(config.inputs),
    ...(config.stimuli ?? []).flatMap((event) => Object.keys(event.inputs)),
    ...(config.timedStimuli ?? []).flatMap((event) => Object.keys(event.inputs)),
  ])) {
    if (!ports[name] || ports[name].direction !== 'input')
      throw new RequestError(`Вход ${name} отсутствует в верхнем модуле.`);
    if (name === config.clock || name === config.reset)
      throw new RequestError(`Вход ${name} управляется генератором такта или сброса.`);
  }
  const declarations: string[] = [];
  const connections: string[] = [];
  const initialization: string[] = [];
  let clockSignal: string | undefined;
  let resetSignal: string | undefined;
  const inputSignals: Record<string, { signal: string; width: number }> = Object.create(null);
  const allSignals: Record<string, { signal: string; width: number }> = Object.create(null);
  function literal(name: string, value: string, width: number) {
    const number = BigInt(value);
    if (number >= 1n << BigInt(width))
      throw new RequestError(`Значение входа ${name} не помещается в ${width} бит.`);
    return `${width}'h${number.toString(16)}`;
  }
  for (const [index, [name, port]] of entries.entries()) {
    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name))
      throw new RequestError(`Имя порта ${name} пока не поддерживается в симуляции.`);
    if (port.direction === 'inout')
      throw new RequestError(
        `Двунаправленный порт ${name} требует отдельного testbench. В этом режиме поддерживаются input/output.`,
      );
    const width = port.bits.length;
    if (width < 1 || width > 4096)
      throw new RequestError(`Ширина порта ${name} выходит за пределы 1–4096 бит.`);
    const signal = `signal_${index}`;
    allSignals[name] = { signal, width };
    declarations.push(
      `  ${port.direction === 'input' ? 'reg' : 'wire'} ${width > 1 ? `[${width - 1}:0] ` : ''}${signal};`,
    );
    connections.push(`    .\\${name} (${signal})`);
    if (port.direction !== 'input') continue;
    inputSignals[name] = { signal, width };
    if (name === config.clock) {
      clockSignal = signal;
      initialization.push(`    ${signal} = 1'b0;`);
    } else if (name === config.reset) {
      resetSignal = signal;
      const asserted = config.resetActiveLow ? 0 : 1;
      initialization.push(`    ${signal} = 1'b${config.resetCycles ? asserted : 1 - asserted};`);
    } else {
      initialization.push(
        `    ${signal} = ${literal(name, config.inputs[name] ?? (/^(enable|en|ce)$/i.test(name) ? '1' : '0'), width)};`,
      );
    }
  }
  const halfPeriod = (config.periodNs / 2).toFixed(3);
  const stimulusLines: string[] = [];
  let previousCycle = 0;
  for (const event of config.stimuli ?? []) {
    if (event.cycle > previousCycle)
      stimulusLines.push(`    #${(event.cycle - previousCycle) * config.periodNs};`);
    for (const [name, value] of Object.entries(event.inputs)) {
      const { signal, width } = inputSignals[name];
      stimulusLines.push(`    ${signal} = ${literal(name, value, width)};`);
    }
    previousCycle = event.cycle;
  }
  const timedLines: string[] = [];
  let previousPs = 0;
  for (const event of config.timedStimuli ?? []) {
    const ps = simulationTimePs(event.timeNs);
    if (ps > previousPs) timedLines.push(`    #${((ps - previousPs) / 1000).toFixed(3)};`);
    for (const [name, value] of Object.entries(event.inputs)) {
      const { signal, width } = inputSignals[name];
      // NBA drives settle after registers have sampled the old input at a coincident edge.
      timedLines.push(`    ${signal} <= ${literal(name, value, width)};`);
    }
    previousPs = ps;
  }
  const expectations = config.expectations ?? [];
  for (const { signal, value } of expectations) {
    if (!allSignals[signal]) throw new RequestError(`Проверяемый порт ${signal} отсутствует.`);
    expectedValueBits(value, allSignals[signal].width);
  }
  return [
    '`timescale 1ns/1ps',
    `module ${TESTBENCH_TOP};`,
    ...declarations,
    '  integer cycle;',
    ...(expectations.length ? ['  integer checks_file;'] : []),
    `  \\${top} dut (`,
    connections.join(',\n'),
    '  );',
    '  initial begin',
    ...initialization,
    ...(expectations.length ? ['    checks_file = $fopen("checks.txt", "w");'] : []),
    '    $dumpfile("wave.vcd");',
    '    $dumpvars(0, dut);',
    `    for (cycle = 0; cycle < ${config.cycles}; cycle = cycle + 1) begin`,
    `      #${halfPeriod};`,
    ...(clockSignal ? [`      ${clockSignal} = 1'b1;`] : []),
    `      #${halfPeriod};`,
    ...(clockSignal ? [`      ${clockSignal} = 1'b0;`] : []),
    '    end',
    '    #0.002;',
    ...(expectations.length ? ['    $fclose(checks_file);'] : []),
    '    $finish;',
    '  end',
    ...(resetSignal && config.resetCycles
      ? [
          '  initial begin',
          `    #${config.resetCycles * config.periodNs};`,
          '    #0.001;',
          `    ${resetSignal} = 1'b${config.resetActiveLow ? 1 : 0};`,
          '  end',
        ]
      : []),
    ...(stimulusLines.length ? ['  initial begin', '    #0.001;', ...stimulusLines, '  end'] : []),
    ...(timedLines.length ? ['  initial begin', '    #0;', ...timedLines, '  end'] : []),
    ...expectations.flatMap((event, index) => [
      '  initial begin',
      `    #${((simulationTimePs(event.timeNs) + 1) / 1000).toFixed(3)};`,
      `    $fdisplay(checks_file, "${index} %b", ${allSignals[event.signal].signal});`,
      '  end',
    ]),
    'endmodule',
    '',
  ].join('\n');
}
