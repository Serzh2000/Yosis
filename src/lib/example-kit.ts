import type { Example } from './examples';

export type ExampleCategory = 'logic' | 'memory' | 'systems';
export type ExamplePin = [signal: string, pin: number, explanation: string];
export const clockPin: ExamplePin = [
  'clk',
  4,
  'Генератор платы 27 МГц; для диаграмм задайте период в настройках.',
];
export const resetPin: ExamplePin = ['reset', 88, 'Кнопка сброса S1: нажата = 1, отпущена = 0.'];
export function ledPins(signal = 'led_n', count = 6): ExamplePin[] {
  return Array.from({ length: count }, (_, bit) => [
    `${signal}[${bit}]`,
    15 + bit,
    `LED${bit}: 0 включает свет, 1 выключает.`,
  ]);
}

export function learningExample(
  id: string,
  title: string,
  description: string,
  source: string,
  pins: ExamplePin[],
  category: ExampleCategory = 'logic',
): Example {
  const cst =
    `// Tang Nano 20K, GW2AR-LV18QN88C8/I7, семейство GW2A-18C.
// IO_LOC использует номер вывода корпуса FPGA, не позицию на разъёме.
// LVCMOS33 задаёт логические уровни 3,3 В. Каждый бит получает свой вывод.
// Кнопки 87/88 и LED 15–20 уже находятся на плате: внешние провода не нужны.
// Кнопка даёт 1 при нажатии и 0 в покое; LED светится при 0 на выводе.
// UART 69/70 соединён со встроенным USB-UART и не является кнопкой.
// Распиновка: https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst
\n` +
    pins
      .map(
        ([signal, pin, explanation]) => `// ${signal}: ${explanation}
IO_LOC "${signal}" ${pin};
IO_PORT "${signal}" IO_TYPE=LVCMOS33${pin === 87 || pin === 88 ? ' PULL_MODE=DOWN' : ' PULL_MODE=NONE'};
${signal === 'clk' ? 'CLOCK_LOC "clk" BUFG;\n' : ''}`,
      )
      .join('\n');
  return {
    id,
    title,
    description,
    category,
    project: {
      name: `${id}-lab`,
      top: 'top',
      board: 'tangnano20k',
      files: [
        { name: 'top.v', content: source },
        { name: 'board.cst', content: cst },
      ],
    },
  };
}
