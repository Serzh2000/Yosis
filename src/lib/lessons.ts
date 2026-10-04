import type { Project, SimulationConfig } from '../../shared/types';
import type { VcdTrace } from './vcd';
import { topSignal } from './virtual-board';
import { valueAt } from './waveform';

export interface LessonCase {
  title: string;
  cycle: number;
  inputs: Record<string, string>;
  expected: string;
}
export interface Lesson {
  id: string;
  number: string;
  title: string;
  description: string;
  concept: string;
  minutes: number;
  level: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  objective: string;
  hint: string;
  output: string;
  cases: LessonCase[];
  project: Project;
  config: SimulationConfig;
}
export interface LessonVerdict {
  title: string;
  inputs: Record<string, string>;
  expected: string;
  actual: string;
  passed: boolean;
}

const baseConfig: SimulationConfig = {
  clock: null,
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 10,
  periodNs: 10,
  inputs: {},
};
function project(name: string, content: string): Project {
  return { name, top: 'top', board: 'tangnano20k', files: [{ name: 'top.v', content }] };
}
function combinationalCases(inputs: Record<string, string>[], expected: string[]): LessonCase[] {
  return inputs.map((values, cycle) => ({
    title: `Случай ${cycle + 1}`,
    cycle,
    inputs: values,
    expected: expected[cycle],
  }));
}
function config(cases: LessonCase[]): SimulationConfig {
  return {
    ...baseConfig,
    cycles: cases.length + 1,
    inputs: cases[0]?.inputs ?? {},
    stimuli: cases.map((item) => ({ cycle: item.cycle, inputs: item.inputs })),
  };
}
const notCases = combinationalCases([{ a: '0' }, { a: '1' }], ['1', '0']);
const andCases = combinationalCases(
  [
    { a: '0', b: '0' },
    { a: '0', b: '1' },
    { a: '1', b: '0' },
    { a: '1', b: '1' },
  ],
  ['0', '0', '0', '1'],
);
const muxInputs = Array.from({ length: 8 }, (_, value) => ({
  a: String(value & 1),
  b: String((value >> 1) & 1),
  select: String((value >> 2) & 1),
}));
const muxCases = combinationalCases(
  muxInputs,
  muxInputs.map((input) => (input.select === '1' ? input.b : input.a)),
);
const counterCases: LessonCase[] = [
  { title: 'Сброс · такт 0', cycle: 0, inputs: { reset: '1', enable: '1' }, expected: '0000' },
  { title: 'Сброс · такт 1', cycle: 1, inputs: { reset: '1', enable: '1' }, expected: '0000' },
  { title: 'Первый шаг', cycle: 2, inputs: { reset: '0', enable: '1' }, expected: '0001' },
  { title: 'Второй шаг', cycle: 3, inputs: { reset: '0', enable: '1' }, expected: '0010' },
  { title: 'Пауза', cycle: 4, inputs: { reset: '0', enable: '0' }, expected: '0010' },
  { title: 'Ещё один такт паузы', cycle: 5, inputs: { reset: '0', enable: '0' }, expected: '0010' },
  { title: 'Продолжение', cycle: 6, inputs: { reset: '0', enable: '1' }, expected: '0011' },
  { title: 'Следующий шаг', cycle: 7, inputs: { reset: '0', enable: '1' }, expected: '0100' },
];

export const lessons: Lesson[] = [
  {
    id: 'not',
    number: '01',
    title: 'Наоборот',
    description: 'Один переключатель, один светодиод. Заставьте их работать противоположно.',
    concept: 'НЕ · инвертор',
    minutes: 5,
    level: 'Первый шаг',
    question: 'Переключатель a поднят: a = 1. Чему равен выход инвертора?',
    choices: ['y = 0', 'y = 1', 'Зависит от тактового сигнала'],
    answer: 0,
    explanation: 'Инвертор меняет уровень на противоположный: 0 превращается в 1, а 1 — в 0.',
    objective:
      'Опишите устройство, у которого y = 1 при a = 0 и y = 0 при a = 1. Замените выражение справа от assign.',
    hint: 'В Verilog побитовое НЕ обозначается символом ~. Запись assign непрерывно связывает выход с выражением.',
    output: 'y',
    cases: notCases,
    config: config(notCases),
    project: project(
      'school-01-not',
      `// Задание 01: инвертор\n// Замените 1'b0 на выражение для противоположного уровня.\nmodule top (\n    input wire a,\n    output wire y\n);\n    assign y = 1'b0; // TODO\nendmodule\n`,
    ),
  },
  {
    id: 'and',
    number: '02',
    title: 'Два условия',
    description: 'Свет горит, только когда включены оба переключателя.',
    concept: 'И · таблица истинности',
    minutes: 7,
    level: 'Логические элементы',
    question: 'У элемента И входы a = 1 и b = 0. Загорится ли светодиод?',
    choices: ['Нет, y = 0', 'Да, y = 1', 'Светодиод будет мигать'],
    answer: 0,
    explanation:
      'Для И нужны оба условия одновременно. Если хотя бы один вход равен 0, выход тоже равен 0.',
    objective:
      'Светодиод y должен гореть только при a = 1 и b = 1. Проверьте все четыре сочетания входов.',
    hint: 'Побитовое И в Verilog — &. Два входа по одному биту дают четыре строки таблицы истинности.',
    output: 'y',
    cases: andCases,
    config: config(andCases),
    project: project(
      'school-02-and',
      `// Задание 02: светодиод горит при двух включённых входах\nmodule top (\n    input wire a,\n    input wire b,\n    output wire y\n);\n    assign y = 1'b0; // TODO: объедините a и b\nendmodule\n`,
    ),
  },
  {
    id: 'mux',
    number: '03',
    title: 'Выбери сигнал',
    description: 'Один управляющий вход выбирает, какой переключатель связан со светодиодом.',
    concept: 'MUX · выбор данных',
    minutes: 10,
    level: 'Комбинационная схема',
    question: 'select = 1, a = 0, b = 1. Какой уровень должен попасть на y?',
    choices: [
      '1, потому что выбран b',
      '0, потому что выбран a',
      '0, потому что a и b различаются',
    ],
    answer: 0,
    explanation: 'Управляющий вход select выбирает источник: при 0 берём a, при 1 берём b.',
    objective:
      'При select = 0 выход y повторяет a. При select = 1 выход y повторяет b. Пройдите все восемь сочетаний.',
    hint: 'Условное выражение выглядит так: условие ? значение_если_1 : значение_если_0. В RTL появится мультиплексор.',
    output: 'y',
    cases: muxCases,
    config: config(muxCases),
    project: project(
      'school-03-mux',
      `// Задание 03: select выбирает a или b\nmodule top (\n    input wire a,\n    input wire b,\n    input wire select,\n    output wire y\n);\n    assign y = 1'b0; // TODO\nendmodule\n`,
    ),
  },
  {
    id: 'counter',
    number: '04',
    title: 'Считай такты',
    description: 'Добавьте память: счётчик с паузой и синхронным сбросом.',
    concept: 'Регистр · фронт clock',
    minutes: 15,
    level: 'Последовательная схема',
    question: 'enable = 0, reset = 0. Что произойдёт со счётчиком на следующем фронте clk?',
    choices: ['Он сохранит значение', 'Он увеличится на один', 'Он сбросится в ноль'],
    answer: 0,
    explanation:
      'Регистр хранит прошлое значение. Когда enable равен 0, нового присваивания нет, и счётчик остаётся прежним.',
    objective:
      'На положительном фронте clk: reset сбрасывает count в 0; иначе enable разрешает прибавить 1. При enable = 0 сохраняйте count. Сброс важнее разрешения.',
    hint: "Для регистра используйте always @(posedge clk) и неблокирующее присваивание <=. Прибавление единицы: count + 4'd1.",
    output: 'count',
    cases: counterCases,
    config: {
      ...baseConfig,
      clock: 'clk',
      reset: 'reset',
      resetCycles: 2,
      cycles: 9,
      inputs: { enable: '1' },
      stimuli: [
        { cycle: 4, inputs: { enable: '0' } },
        { cycle: 6, inputs: { enable: '1' } },
      ],
    },
    project: project(
      'school-04-counter',
      `// Задание 04: счётчик с паузой\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire enable,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else if (enable)\n            count <= count; // TODO: прибавьте единицу\n    end\nendmodule\n`,
    ),
  },
];

/** Check settled outputs after the positive clock edge, using the VCD's own time unit. */
export function checkLessonTrace(
  lesson: Pick<Lesson, 'output' | 'cases' | 'config'>,
  trace: VcdTrace,
): LessonVerdict[] {
  const signal = topSignal(trace, lesson.output);
  return lesson.cases.map((item) => {
    const sample = ((item.cycle + 0.75) * lesson.config.periodNs * 1e6) / trace.timescaleFs;
    const actual = signal && sample <= trace.endTime ? valueAt(signal, sample) : 'нет сигнала';
    const expected = signal ? item.expected.padStart(signal.width, '0') : item.expected;
    return {
      title: item.title,
      inputs: item.inputs,
      expected: item.expected,
      actual,
      passed:
        !!signal &&
        signal.width === item.expected.length &&
        sample <= trace.endTime &&
        actual === expected,
    };
  });
}
