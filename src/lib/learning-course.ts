import type { Project, SimulationConfig } from '../../shared/types';
import { lessons, type Lesson, type LessonCase, type LessonVerdict } from './lessons';

export interface CourseLevel {
  id: string;
  title: string;
  description: string;
}
export interface CourseQuizOption {
  id: string;
  label: string;
  feedback: string;
}
export interface CourseQuiz {
  question: string;
  options: CourseQuizOption[];
  correctOptionId: string;
}
export interface CourseStep {
  id: string;
  title: string;
  kind: 'welcome' | 'explain' | 'quiz' | 'practice';
  text: string;
  code?: string;
  workspace?: 'code' | 'rtl' | 'simulation' | 'board' | 'pins';
  quiz?: CourseQuiz;
}
export interface GuidedLesson {
  id: string;
  title: string;
  levelId: string;
  minutes: number;
  summary: string;
  steps: CourseStep[];
  exercise: Lesson | null;
  hints: string[];
}
export interface CourseLessonProgress {
  stepId: string;
  answers: Record<string, string>;
  passedQuizIds: string[];
  hintsShown: number;
  exercise: { passed: true; projectHash: string } | null;
  completed: boolean;
}
export interface CourseProgress {
  version: 1;
  activeLessonId: string;
  lessons: Record<string, CourseLessonProgress>;
}
export interface CourseAnswerResult {
  progress: CourseProgress;
  correct: boolean;
  feedback: string;
}

export const courseLevels: CourseLevel[] = [
  {
    id: 'orientation',
    title: '1. Осмотр мастерской',
    description: 'Что такое ПЛИС, где писать схему и как проверить её без платы.',
  },
  {
    id: 'logic',
    title: '2. Логика и данные',
    description: 'Входы, выходы, логические элементы, шины и выбор сигналов.',
  },
  {
    id: 'memory',
    title: '3. Время и память',
    description: 'Тактовый фронт, регистр, сброс, разрешение и счётчик.',
  },
  {
    id: 'systems',
    title: '4. Устройство из блоков',
    description: 'Автомат состояний и проверка небольшого законченного устройства.',
  },
];
export const courseRoadmap = [
  {
    title: 'Свои testbench',
    description: 'Произвольные задержки, проверки assert и самостоятельный поиск ошибок.',
  },
  {
    title: 'Реальная плата',
    description:
      'Частота 27 МГц, .cst, активные низкие LED, дребезг кнопок и безопасное подключение.',
  },
  {
    title: 'Память и интерфейсы',
    description: 'BRAM, UART, SPI, передача между тактовыми доменами и ограничения по времени.',
  },
  {
    title: 'Процессор и SoC',
    description: 'RISC-V, программная память, периферия и контроллер SDRAM.',
  },
];

const baseConfig: SimulationConfig = {
  clock: null,
  reset: null,
  resetActiveLow: false,
  resetCycles: 0,
  cycles: 10,
  periodNs: 10,
  inputs: {},
};
function combinationCases(inputs: Record<string, string>[], expected: string[]): LessonCase[] {
  return inputs.map((values, cycle) => ({
    title: `Комбинация ${cycle + 1}`,
    cycle,
    inputs: values,
    expected: expected[cycle],
  }));
}
function combinationConfig(cases: LessonCase[]): SimulationConfig {
  return {
    ...baseConfig,
    cycles: cases.length + 1,
    inputs: cases[0].inputs,
    stimuli: cases.slice(1).map((item) => ({ cycle: item.cycle, inputs: item.inputs })),
  };
}
function exerciseProject(name: string, content: string, cst?: string): Project {
  const notes =
    '// Учебная лаборатория: входы и такты для проверки подаёт симулятор.\n' +
    (cst
      ? '// Назначение реальных контактов описано в pins.cst; изучите его перед загрузкой.\n'
      : '// Проект для симуляции: перед сборкой для платы нужны внешние входы и свои назначения .cst.\n// Логическая 1 означает высокий уровень; физические LED Tang Nano 20K включаются уровнем 0.\n');
  return {
    name,
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: notes + content },
      ...(cst ? [{ name: 'pins.cst', content: cst }] : []),
    ],
  };
}
const buttonCst =
  '// Tang Nano 20K: штатная кнопка S1 и LED0.\n// Кнопка даёт 1 при нажатии и 0 в покое; LED светится при 0.\nIO_LOC "button" 88;\nIO_PORT "button" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\nIO_LOC "led_n" 15;\nIO_PORT "led_n" IO_TYPE=LVCMOS33;\n';
const portCases = combinationCases([{ button: '0' }, { button: '1' }], ['0', '1']);
const portExercise: Lesson = {
  id: 'ports',
  number: '01',
  title: 'Соедини вход и выход',
  description: 'Первый собственный провод в ПЛИС.',
  concept: 'Модуль · порты · непрерывная связь',
  minutes: 6,
  level: 'Логика и данные',
  question: 'Что объявляет input wire button?',
  choices: ['Вход модуля', 'Значение кнопки навсегда', 'Тактовый генератор'],
  answer: 0,
  explanation: 'input задаёт направление порта; wire описывает соединение.',
  objective:
    'Сделайте так, чтобы led_n всегда повторял button. На реальной плате LED горит, пока кнопка отпущена (уровень 0), и гаснет при нажатии.',
  hint: 'Справа от assign led_n = нужно имя входа.',
  output: 'led_n',
  cases: portCases,
  config: combinationConfig(portCases),
  project: exerciseProject(
    'learn-ports',
    "// Соедините штатную кнопку и LED. Суффикс _n означает активный низкий уровень.\nmodule top(input wire button, output wire led_n);\n    assign led_n = 1'b1; // TODO: выход должен повторять вход\nendmodule\n",
    buttonCst,
  ),
};
const xorInputs = [
  { a: '0', b: '0' },
  { a: '0', b: '1' },
  { a: '1', b: '0' },
  { a: '1', b: '1' },
];
const xorCases = combinationCases(xorInputs, ['0', '1', '1', '0']);
const xorExercise: Lesson = {
  id: 'xor',
  number: '04',
  title: 'Найди различие',
  description: 'Сигнал тревоги при разных входах.',
  concept: 'XOR · отличие от OR',
  minutes: 7,
  level: 'Логика и данные',
  question: 'a = 1, b = 1. Чему равен a ^ b?',
  choices: ['0', '1', '2'],
  answer: 0,
  explanation: 'XOR равен 1 только у разных однобитовых входов.',
  objective: 'Выход y равен 1, только если a и b различаются.',
  hint: 'Побитовое исключающее ИЛИ обозначается ^.',
  output: 'y',
  cases: xorCases,
  config: combinationConfig(xorCases),
  project: exerciseProject(
    'learn-xor',
    '// Сигнал y отмечает различие входов.\nmodule top(input wire a, input wire b, output wire y);\n    assign y = a | b; // TODO: OR ошибается при двух единицах\nendmodule\n',
  ),
};
const busCases = combinationCases(
  Array.from({ length: 16 }, (_, value) => ({ data: String(value) })),
  Array.from({ length: 16 }, (_, value) => ((value + 1) & 15).toString(2).padStart(4, '0')),
);
const busExercise: Lesson = {
  id: 'buses',
  number: '05',
  title: 'Четыре провода вместе',
  description: 'Комбинационный прибавитель с переполнением.',
  concept: 'Шина · размер константы',
  minutes: 9,
  level: 'Логика и данные',
  question: "Что получится в четырёхбитовом выходе после 4'd15 + 4'd1?",
  choices: ['0000', '10000', '1111'],
  answer: 0,
  explanation: 'В выходе четыре бита, старший бит суммы не помещается.',
  objective:
    'Сделайте четырёхбитовый y = data + 1. Проверьте все значения от 0 до 15 и переполнение.',
  hint: "Используйте data + 4'd1. Здесь нет памяти: выход меняется вместе со входом.",
  output: 'y',
  cases: busCases,
  config: combinationConfig(busCases),
  project: exerciseProject(
    'learn-buses',
    "// [3:0] — четыре отдельных провода; 4'd1 — четырёхбитовая десятичная единица.\nmodule top(input wire [3:0] data, output wire [3:0] y);\n    assign y = data; // TODO: прибавьте единицу\nendmodule\n",
  ),
};
const decoderCases = combinationCases(
  Array.from({ length: 4 }, (_, value) => ({ code: String(value) })),
  ['1110', '1101', '1011', '0111'],
);
const decoderExercise: Lesson = {
  id: 'decoder',
  number: '07',
  title: 'Один из четырёх',
  description: 'Кнопки выбирают один LED.',
  concept: 'case · комбинационный always · полное присваивание',
  minutes: 10,
  level: 'Логика и данные',
  question: 'Что происходит, если в комбинационном always не присвоить выход для части входов?',
  choices: ['Может появиться защёлка', 'Всегда получится ноль', 'Выход исчезнет'],
  answer: 0,
  explanation: 'Сохранение старого выхода требует памяти, которую здесь не планировали.',
  objective:
    'Для code = 2 включите LED2: в активном низком led_n это 1011. Остальные три случая уже описаны.',
  hint: "Добавьте ветку 2'd2: led_n = 4'b1011;",
  output: 'led_n',
  cases: decoderCases,
  config: combinationConfig(decoderCases),
  project: exerciseProject(
    'learn-decoder',
    "// Две кнопки задают code, ровно один LED включён нулём.\nmodule top(input wire [1:0] code, output reg [3:0] led_n);\n    always @* begin\n        case (code)\n            2'd0: led_n = 4'b1110;\n            2'd1: led_n = 4'b1101;\n            // TODO: добавьте случай code = 2\n            2'd3: led_n = 4'b0111;\n            default: led_n = 4'b1111;\n        endcase\n    end\nendmodule\n",
    '// Tang Nano 20K. Кнопки отпущены: оба бита code = 0; нажатие даёт 1.\n// LED активны низким уровнем: ровно один ноль включает одну лампу.\nIO_LOC "code[0]" 88;\nIO_PORT "code[0]" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\nIO_LOC "code[1]" 87;\nIO_PORT "code[1]" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;\nIO_LOC "led_n[0]" 15;\nIO_PORT "led_n[0]" IO_TYPE=LVCMOS33;\nIO_LOC "led_n[1]" 16;\nIO_PORT "led_n[1]" IO_TYPE=LVCMOS33;\nIO_LOC "led_n[2]" 17;\nIO_PORT "led_n[2]" IO_TYPE=LVCMOS33;\nIO_LOC "led_n[3]" 18;\nIO_PORT "led_n[3]" IO_TYPE=LVCMOS33;\n',
  ),
};
const registerCases: LessonCase[] = [
  {
    title: 'Сброс важнее загрузки',
    cycle: 0,
    inputs: { reset: '1', enable: '1', data: '1' },
    expected: '0',
  },
  {
    title: 'Ещё один фронт сброса',
    cycle: 1,
    inputs: { reset: '1', enable: '1', data: '1' },
    expected: '0',
  },
  {
    title: 'Загрузить единицу',
    cycle: 2,
    inputs: { reset: '0', enable: '1', data: '1' },
    expected: '1',
  },
  {
    title: 'Вход изменён на паузе',
    cycle: 3,
    inputs: { reset: '0', enable: '0', data: '0' },
    expected: '1',
  },
  {
    title: 'Сохранить значение',
    cycle: 4,
    inputs: { reset: '0', enable: '0', data: '0' },
    expected: '1',
  },
  {
    title: 'Загрузить ноль',
    cycle: 5,
    inputs: { reset: '0', enable: '1', data: '0' },
    expected: '0',
  },
  {
    title: 'Ноль на паузе',
    cycle: 6,
    inputs: { reset: '0', enable: '0', data: '1' },
    expected: '0',
  },
  {
    title: 'Повторная загрузка',
    cycle: 7,
    inputs: { reset: '0', enable: '1', data: '1' },
    expected: '1',
  },
];
const registerExercise: Lesson = {
  id: 'register',
  number: '07',
  title: 'Запомни один бит',
  description: 'Регистр с синхронным сбросом и разрешением.',
  concept: 'posedge · <= · сохранение',
  minutes: 12,
  level: 'Время и память',
  question: 'enable = 0, reset = 0, data изменился. Что произойдёт с q?',
  choices: ['Сохранит прошлое значение', 'Повторит data', 'Сбросится'],
  answer: 0,
  explanation: 'Без разрешения регистр хранит прежнее значение.',
  objective:
    'На posedge clk сбрасывайте q при reset; иначе при enable записывайте data. Во время паузы храните q.',
  hint: 'Используйте q <= data внутри else if (enable).',
  output: 'q',
  cases: registerCases,
  config: {
    ...baseConfig,
    clock: 'clk',
    reset: 'reset',
    resetCycles: 2,
    cycles: 9,
    inputs: { enable: '1', data: '1' },
    stimuli: [
      { cycle: 3, inputs: { enable: '0', data: '0' } },
      { cycle: 5, inputs: { enable: '1' } },
      { cycle: 6, inputs: { enable: '0', data: '1' } },
      { cycle: 7, inputs: { enable: '1' } },
    ],
  },
  project: exerciseProject(
    'learn-register',
    "// Регистр меняется на положительном фронте, а между фронтами хранит значение.\nmodule top(input wire clk, reset, enable, data, output reg q);\n    always @(posedge clk) begin\n        if (reset) q <= 1'b0;\n        else if (enable) q <= 1'b0; // TODO: запомните вход data\n    end\nendmodule\n",
  ),
};
const fsmCases: LessonCase[] = [
  { title: 'После сброса красный', cycle: 0, inputs: { reset: '1', enable: '1' }, expected: '001' },
  {
    title: 'Сброс удерживает красный',
    cycle: 1,
    inputs: { reset: '1', enable: '1' },
    expected: '001',
  },
  { title: 'Красный → зелёный', cycle: 2, inputs: { reset: '0', enable: '1' }, expected: '100' },
  { title: 'Зелёный → жёлтый', cycle: 3, inputs: { reset: '0', enable: '1' }, expected: '010' },
  { title: 'Пауза на жёлтом', cycle: 4, inputs: { reset: '0', enable: '0' }, expected: '010' },
  { title: 'Ещё один такт паузы', cycle: 5, inputs: { reset: '0', enable: '0' }, expected: '010' },
  { title: 'Жёлтый → красный', cycle: 6, inputs: { reset: '0', enable: '1' }, expected: '001' },
  { title: 'Следующий круг', cycle: 7, inputs: { reset: '0', enable: '1' }, expected: '100' },
  { title: 'Следующее состояние', cycle: 8, inputs: { reset: '0', enable: '1' }, expected: '010' },
  { title: 'Возврат на красный', cycle: 9, inputs: { reset: '0', enable: '1' }, expected: '001' },
];
const fsmExercise: Lesson = {
  id: 'traffic-fsm',
  number: '09',
  title: 'Светофор с памятью',
  description: 'Три состояния, пауза и безопасный сброс.',
  concept: 'FSM · состояние · декодирование',
  minutes: 18,
  level: 'Устройство из блоков',
  question: 'В каком порядке автомат должен менять состояния?',
  choices: [
    'Красный → зелёный → жёлтый → красный',
    'Красный → жёлтый → зелёный → красный',
    'Все выходы включены одновременно',
  ],
  answer: 0,
  explanation:
    'Состояние хранит выбранную фазу, комбинационная логика включает соответствующую лампу.',
  objective:
    'Допишите переход GREEN → YELLOW. При enable = 0 сохраняйте состояние. В lights[2:0] ровно одна единица: зелёный, жёлтый, красный.',
  hint: 'В ветке GREEN присвойте state <= YELLOW.',
  output: 'lights',
  cases: fsmCases,
  config: {
    ...baseConfig,
    clock: 'clk',
    reset: 'reset',
    resetCycles: 2,
    cycles: 11,
    inputs: { enable: '1' },
    stimuli: [
      { cycle: 4, inputs: { enable: '0' } },
      { cycle: 6, inputs: { enable: '1' } },
    ],
  },
  project: exerciseProject(
    'learn-traffic-fsm',
    "// Учебный светофор: один переход на один такт симуляции.\n// Это логические лампы; прямое подключение к активным низким LED потребует инвертора.\nmodule top(input wire clk, reset, enable, output reg [2:0] lights);\n    localparam RED = 2'd0, GREEN = 2'd1, YELLOW = 2'd2;\n    reg [1:0] state;\n    always @(posedge clk) begin\n        if (reset) state <= RED;\n        else if (enable) begin\n            case (state)\n                RED: state <= GREEN;\n                GREEN: state <= GREEN; // TODO: какой цвет следующий?\n                YELLOW: state <= RED;\n                default: state <= RED;\n            endcase\n        end\n    end\n    always @* begin\n        case (state)\n            RED: lights = 3'b001;\n            GREEN: lights = 3'b100;\n            YELLOW: lights = 3'b010;\n            default: lights = 3'b001;\n        endcase\n    end\nendmodule\n",
  ),
};

function explain(
  id: string,
  title: string,
  text: string,
  code?: string,
  workspace?: CourseStep['workspace'],
): CourseStep {
  return { id, title, kind: 'explain', text, code, workspace };
}
function quiz(
  id: string,
  title: string,
  question: string,
  options: Array<[string, string]>,
  correct = 0,
): CourseStep {
  return {
    id,
    title,
    kind: 'quiz',
    text: 'Выберите ответ. Если ошибётесь, разберём именно ваш вариант — можно попробовать снова.',
    quiz: {
      question,
      correctOptionId: String(correct),
      options: options.map(([label, feedback], index) => ({ id: String(index), label, feedback })),
    },
  };
}
function practice(text: string): CourseStep {
  return {
    id: 'practice',
    title: 'Проверь своими руками',
    kind: 'practice',
    text,
    workspace: 'code',
  };
}
function legacy(id: string): Lesson {
  const found = lessons.find((item) => item.id === id)!;
  return { ...found, project: exerciseProject(`learn-${id}`, found.project.files[0].content) };
}

export const guidedLessons: GuidedLesson[] = [
  {
    id: 'welcome',
    title: 'Ты в мастерской цифровых схем',
    levelId: 'orientation',
    minutes: 5,
    summary: 'Разберёмся, что здесь строят и как устроена работа.',
    exercise: null,
    hints: [],
    steps: [
      {
        id: 'arrival',
        title: 'Куда ты попал',
        kind: 'welcome',
        text: 'Yosis — мастерская для ПЛИС: микросхемы, внутри которой можно настроить свою цифровую схему. Здесь ты описываешь устройство на Verilog, видишь его схему и наблюдаешь сигналы во времени. Начнём без железа: симулятор подаст входы, а мы проверим результат.',
      },
      explain(
        'hardware',
        'Ты описываешь устройство',
        'Программа обычно выполняет команды последовательно. Verilog описывает соединения и память, которые работают одновременно. Два assign — это две параллельные связи, а не очередь действий.',
        'assign x = a & b;\nassign y = a | b;',
        'rtl',
      ),
      explain(
        'workspace',
        'Твой маршрут по вкладкам',
        '«Код» — текст устройства. «RTL» — логическая схема из этого текста. «Диаграммы» — проверка уровней и тактов во времени. «Виртуальная плата» — переключатели и лампы поверх симуляции. «Выводы .cst» связывают порты с физическими контактами. «Кристалл» показывает размещение после сборки для выбранной ПЛИС. В обучении будем открывать нужную вкладку по шагам.',
      ),
      quiz(
        'hardware-quiz',
        'Проверка понимания',
        'Что означают два независимых assign в Verilog?',
        [
          [
            'Две связи, работающие одновременно',
            'Верно. Из описания получается параллельная схема.',
          ],
          [
            'Второй выполняется после первого',
            'Это привычка из обычных программ. Здесь оба выражения непрерывно зависят от своих входов.',
          ],
          [
            'Две команды, которые выполняются один раз',
            'Связь assign действует всё время: изменится вход — пересчитается выход.',
          ],
        ],
      ),
      quiz(
        'bit-quiz',
        'Первое предсказание',
        'Переключатель сейчас задаёт a = 0, а провод соединяет y с a. Что увидим на y?',
        [
          ['0', 'Верно. Прямая связь повторяет вход. Скоро построишь её сам.'],
          ['1', 'Для противоположного уровня нужен инвертор. Прямой провод повторяет вход.'],
          [
            'Ничего, пока не запустим программу ещё раз',
            'В аппаратной схеме провод действует непрерывно. В нашей симуляции изменение входа пересчитывает выход.',
          ],
        ],
      ),
      explain(
        'workflow',
        'Как будем учиться',
        'Сначала короткое объяснение и вопрос. Затем откроешь небольшой проект, исправишь TODO и запустишь проверку. Мы проверяем реальные сигналы Icarus Verilog, а не наличие нужных слов в коде. Подсказки раскрываются постепенно. Этот маршрут даст основу; дальше нужны самостоятельные устройства и более сложные лаборатории.',
      ),
    ],
  },
  {
    id: 'ports',
    title: 'Первая связь',
    levelId: 'logic',
    minutes: 6,
    summary: 'module, input, output, wire и assign.',
    exercise: portExercise,
    hints: [
      'Посмотри имена входа и выхода в скобках после top.',
      'wire — соединение. assign led_n = выражение; задаёт его источник.',
      'Замените константу: assign led_n = button;',
    ],
    steps: [
      explain(
        'module',
        'Обозначь границы устройства',
        'module top (...) начинает описание блока. input — сигнал входит в блок; output — выходит. endmodule закрывает блок. Названия выбираешь ты: top — верхний модуль проекта.',
        'module top(input wire button, output wire led_n);\n    // Здесь будет схема\nendmodule',
      ),
      explain(
        'assign',
        'Проведи связь',
        'assign непрерывно связывает выход с выражением справа. У такого соединения нет памяти и ему не нужен тактовый сигнал. Суффикс _n напоминает: кнопка и LED платы активны уровнем 0. В .cst уже назначены S1 и LED0.',
        'assign led_n = button;',
        'pins',
      ),
      quiz(
        'port-quiz',
        'Куда идёт сигнал?',
        'В module top(input wire a, output wire y) какой сигнал получает блок извне?',
        [
          ['a', 'Верно: input a — вход блока.'],
          ['y', 'y объявлен как output: блок выдаёт этот сигнал наружу.'],
          ['wire', 'wire — тип соединения, а не имя сигнала.'],
        ],
      ),
      practice(
        'Открой лабораторию и замени постоянный выход связью со входом. Проверка подаст оба уровня кнопки. На диаграмме led_n должен повторять button.',
      ),
    ],
  },
  {
    id: 'not',
    title: 'Логический инвертор',
    levelId: 'logic',
    minutes: 6,
    summary: 'Преобразуй 0 в 1, а 1 в 0.',
    exercise: legacy('not'),
    hints: [
      'Проверь две строки: 0 → 1, 1 → 0.',
      'Побитовое НЕ в Verilog обозначается ~.',
      'Поставь справа от assign выражение ~a.',
    ],
    steps: [
      explain(
        'invert',
        'Переверни уровень',
        'Цифровой однобитовый сигнал принимает 0 или 1. Инвертор меняет уровень на противоположный. В RTL он выглядит как треугольник с кружком на выходе; кружок означает инверсию.',
        'assign y = ~a;',
        'rtl',
      ),
      explain(
        'table',
        'Предскажи оба случая',
        'a = 0 даёт y = 1; a = 1 даёт y = 0. Это вся таблица истинности одного входа. Проверить только один случай недостаточно: постоянная единица тоже пройдёт первую строку.',
      ),
      quiz('not-quiz', 'Поймай ошибку', 'a = 1. Чему равно ~a для однобитового входа?', [
        ['0', 'Верно. Инвертор меняет единицу на ноль.'],
        ['1', 'Это повторение входа. Инвертор должен сделать противоположный уровень.'],
        ['Зависит от clk', 'В этом устройстве нет регистра: результат зависит только от a.'],
      ]),
      practice(
        'Исправь TODO, затем проверь обе комбинации. Открой RTL и найди инвертор между a и y.',
      ),
    ],
  },
  {
    id: 'and',
    title: 'Два условия одновременно',
    levelId: 'logic',
    minutes: 7,
    summary: 'И, параллельные входы и таблица истинности.',
    exercise: legacy('and'),
    hints: [
      'Свет должен включаться только для 11.',
      'Для побитового И используй &; символ | означает ИЛИ.',
      'Нужное выражение: a & b.',
    ],
    steps: [
      explain(
        'both',
        'Разрешение из двух условий',
        'Представь дверь: нужен пропуск И разрешение охранника. Выход И равен 1 только тогда, когда оба входа равны 1. В Verilog это a & b.',
        'assign y = a & b;',
      ),
      explain(
        'coverage',
        'Не пропускай строки',
        'Два однобитовых входа дают четыре сочетания: 00, 01, 10, 11. Для И ответы 0, 0, 0, 1. Два входа существуют одновременно; никто не ждёт «своей очереди».',
        undefined,
        'simulation',
      ),
      quiz('and-quiz', 'Есть ли разрешение?', 'a = 1, b = 0. Чему равно a & b?', [
        ['0', 'Верно. Одного разрешения недостаточно.'],
        ['1', 'Так ответил бы OR: хотя бы одно условие. Для AND должны сработать оба.'],
        ['2', 'Однобитовый логический выход не считает число единиц.'],
      ]),
      practice(
        'Опиши И и пройди все четыре строки. Если проверка не прошла, сравни входы именно в строке с ошибкой.',
      ),
    ],
  },
  {
    id: 'xor',
    title: 'Одинаковые или разные?',
    levelId: 'logic',
    minutes: 7,
    summary: 'Различай OR и XOR.',
    exercise: xorExercise,
    hints: [
      'Обрати внимание на строку a = 1, b = 1.',
      'XOR даёт единицу только для 01 и 10.',
      'Замените | на ^: assign y = a ^ b;',
    ],
    steps: [
      explain(
        'different',
        'Сигнал различия',
        'OR (|) даёт 1, если хотя бы один вход равен 1. XOR (^) даёт 1, если однобитовые входы различаются. Их различает случай 11: OR = 1, XOR = 0.',
        'assign either = a | b;\nassign different = a ^ b;',
      ),
      explain(
        'debug',
        'Сломанный вариант полезен',
        'В лаборатории уже стоит OR. Он успешно проходит три строки из четырёх, поэтому легко обмануться. Исправление нужно проверить на всей таблице, особенно на двух единицах.',
      ),
      quiz('xor-quiz', 'Найди различие', 'Какой выход a ^ b при a = 1 и b = 1?', [
        ['0', 'Верно: уровни одинаковы, различия нет.'],
        ['1', 'Это результат OR. XOR отключён, когда однобитовые входы одинаковы.'],
        ['Нужен сброс', 'У комбинационного элемента нет прошлого состояния для сброса.'],
      ]),
      practice('Почини детектор различия. По отчёту проверь, что случай 11 больше не ошибается.'),
    ],
  },
  {
    id: 'buses',
    title: 'Число из нескольких битов',
    levelId: 'logic',
    minutes: 9,
    summary: 'Ширина, константы и переполнение.',
    exercise: busExercise,
    hints: [
      'На выходе четыре бита, поэтому допустимы числа 0…15.',
      "Запись 4'd1 означает ширина 4, десятичный формат, значение 1.",
      "Нужное выражение: data + 4'd1. При 15 результат обрежется до 0000.",
    ],
    steps: [
      explain(
        'width',
        'Шина — группа проводов',
        '[3:0] задаёт четыре бита: 3, 2, 1, 0. Бит 0 — младший. Четыре бита представляют 16 беззнаковых значений от 0 до 15. Это четыре параллельных провода, а не отдельный программный объект.',
        'input wire [3:0] data;\noutput wire [3:0] y;',
      ),
      explain(
        'literal',
        'Назови ширину явно',
        "В 4'b0011 число 4 — ширина, b — двоичный формат, 0011 — цифры. Та же тройка записывается 4'd3. После сложения результат в четырёхбитовом выходе тоже имеет четыре бита.",
        "4'b0011 == 4'd3",
      ),
      quiz(
        'overflow-quiz',
        'Число не помещается',
        'Какой четырёхбитовый выход получается при 15 + 1?',
        [
          ['0000', 'Верно: 10000 требует пяти битов, старший бит отбрасывается.'],
          [
            '10000',
            'Это полная пятибитовая сумма. Наш выход объявлен [3:0], поэтому пятый бит не сохранится.',
          ],
          [
            '1111',
            'Обычное сложение не ограничивает значение сверху: оно переполняется по ширине выхода.',
          ],
        ],
      ),
      practice(
        'Сделай прибавитель единицы без памяти. Проверка подаст все 16 значений, включая границу диапазона.',
      ),
    ],
  },
  {
    id: 'mux',
    title: 'Переключатель маршрута',
    levelId: 'logic',
    minutes: 10,
    summary: 'Выбери один из двух источников.',
    exercise: legacy('mux'),
    hints: [
      'При select = 0 нужно a; при select = 1 — b.',
      'Запись условие ? значение_при_1 : значение_при_0.',
      'Нужное выражение: select ? b : a.',
    ],
    steps: [
      explain(
        'select',
        'Данные и управление',
        'Мультиплексор передаёт один выбранный вход на выход. a и b — данные, select — управление. Управление не обязано быть тактом: это обычный вход комбинационной схемы.',
        'assign y = select ? b : a;',
        'rtl',
      ),
      explain(
        'eight',
        'Почему восемь проверок?',
        'У схемы три однобитовых входа: a, b, select. Всего 2 × 2 × 2 = 8 сочетаний. Если проверить только a = b, перепутанный выбор останется незаметным.',
      ),
      quiz('mux-quiz', 'Какой источник выбран?', 'select = 1, a = 0, b = 1. Какой выход?', [
        ['1', 'Верно: select = 1 выбирает b, а b равен 1.'],
        ['0', 'Так получилось бы при выборе a. Порядок у ?: — сначала ветка для единицы.'],
        ['select & a', 'Это AND, а здесь нужно передать целиком выбранный сигнал.'],
      ]),
      practice('Собери MUX и пройди восемь сочетаний. Найди вход выбора S на схеме RTL.'),
    ],
  },
  {
    id: 'decoder',
    title: 'Зажги выбранную лампу',
    levelId: 'logic',
    minutes: 10,
    summary: 'case, always @* и все варианты выхода.',
    exercise: decoderExercise,
    hints: [
      'У двухбитового code четыре значения: 0, 1, 2, 3.',
      'LED платы активны низким уровнем: для LED2 нужен ноль в бите 2.',
      "Добавьте ветку 2'd2: led_n = 4'b1011;",
    ],
    steps: [
      explain(
        'case',
        'Выбери по числу',
        'case сравнивает code с перечисленными значениями. Комбинационный always @* пересчитывает выход при изменении любого используемого входа. Внутри него используем =. output reg нужен для присваивания из always, но здесь не возникает фронтового регистра.',
        "always @* begin\n    case (code)\n        2'd0: led_n = 4'b1110;\n        // Остальные значения\n        default: led_n = 4'b1111;\n    endcase\nend",
      ),
      explain(
        'complete',
        'Опиши каждую дорогу',
        'Если для части входов не присвоить выход, схеме придётся хранить предыдущее значение: появится защёлка (latch). Это память без фронтового управления. Чтобы построить обычную комбинационную логику, присваиваем полный выход в каждой ветке, включая default. Здесь ровно один ноль включает выбранный физический LED.',
        undefined,
        'rtl',
      ),
      quiz(
        'decoder-quiz',
        'Где спряталась память?',
        'Что может появиться, если комбинационный always не задаёт выход для части входов?',
        [
          [
            'Защёлка, хранящая прошлое значение',
            'Верно. Неописанный путь оставляет старое значение и требует памяти.',
          ],
          [
            'Ноль во всех пропущенных случаях',
            'Verilog не подставляет ноль сам. Значение останется прежним; задавай его явно.',
          ],
          [
            'Обычный триггер с тактом',
            'Здесь нет posedge и тактового входа. Скрытая память будет защёлкой.',
          ],
        ],
      ),
      practice(
        'Допиши отсутствующую ветку case для code = 2. Проверка пройдёт четыре выбора. В .cst назначены две штатные кнопки и четыре LED.',
      ),
    ],
  },
  {
    id: 'register',
    title: 'Память на один бит',
    levelId: 'memory',
    minutes: 12,
    summary: 'always, posedge, <=, reset и enable.',
    exercise: registerExercise,
    hints: [
      'Вспомни: новый q нужен только при enable = 1.',
      'Внутри always @(posedge clk) используют неблокирующее присваивание <=.',
      'В ветке else if (enable) нужно q <= data; отсутствие ветки else сохраняет q.',
    ],
    steps: [
      explain(
        'edge',
        'Добавь время',
        'Регистр хранит значение между тактами. always @(posedge clk) описывает изменение на переходе clk из 0 в 1. output reg позволяет присваивать из always; именно фронтовый блок в этом примере создаёт память. Слово reg само по себе не гарантирует триггер.',
        'always @(posedge clk)\n    q <= data;',
        'simulation',
      ),
      explain(
        'nonblocking',
        'Все регистры видят старые значения',
        'Неблокирующее <= планирует обновление регистра после обработки фронта. При q1 <= data; q2 <= q1; второй регистр получает прежний q1. Это позволяет описать цепочку регистров. Для комбинационного always @* обычно используют =.',
      ),
      explain(
        'controls',
        'Сброс и разрешение',
        'Сначала if (reset) возвращает q в 0. Затем else if (enable) разрешает запись data. Сброс синхронный: действует на фронте clk. Если оба управления равны 0, присваивания нет и регистр хранит прошлое значение.',
      ),
      quiz(
        'register-quiz',
        'Изменился только вход',
        'reset = 0, enable = 0. data изменился с 1 на 0. Что делает q?',
        [
          ['Хранит прежнее значение', 'Верно. Без enable загрузки нет даже на следующем фронте.'],
          [
            'Сразу меняется на 0',
            'Так работал бы провод assign q = data. Здесь регистр и разрешение записи.',
          ],
          ['Сбросится на фронте', 'Сброс сработает при reset = 1. Сейчас он выключен.'],
        ],
      ),
      practice(
        'Почини запись data. Проверка специально меняет data на паузе: q должен сохранить значение. Изучи фронты clk и уровни q на диаграмме.',
      ),
    ],
  },
  {
    id: 'counter',
    title: 'Счётчик с паузой',
    levelId: 'memory',
    minutes: 15,
    summary: 'Соедини память и сложение.',
    exercise: legacy('counter'),
    hints: [
      'Сброс устанавливает 0; enable разрешает следующий шаг.',
      'Правая часть использует старый count.',
      "Замените count <= count; на count <= count + 4'd1;",
    ],
    steps: [
      explain(
        'feedback',
        'Посчитай события',
        'Счётчик — регистр, новое значение которого зависит от старого. На каждом разрешённом фронте он записывает count + 1. Пауза хранит count. В отличие от предыдущего прибавителя, результат теперь зависит от истории.',
        "always @(posedge clk)\n    if (reset) count <= 4'd0;\n    else if (enable) count <= count + 4'd1;",
        'rtl',
      ),
      explain(
        'frequency',
        'Такт симуляции и настоящая плата',
        'В лаборатории период равен 10 нс — удобно изучать несколько фронтов. На Tang Nano 20K кварц даёт 27 МГц. Младшие биты быстрого счётчика глазом не различить; для заметной индикации выбирают старшие биты или делят частоту. Переполнение четырёх битов возвращает значение к нулю.',
      ),
      quiz(
        'counter-quiz',
        'Сохрани значение',
        'count = 3, enable = 0, reset = 0. Что будет после следующего posedge clk?',
        [
          ['3', 'Верно. Счётчик стоит на паузе.'],
          ['4', 'Прибавление разрешено только при enable = 1.'],
          ['0', 'Сброс имеет приоритет, но сейчас reset равен 0.'],
        ],
      ),
      practice(
        'Допиши шаг счётчика. Проверь сброс, два шага, паузу и продолжение. Прохождение одних тактов без паузы ещё не доказывает правильность.',
      ),
    ],
  },
  {
    id: 'traffic-fsm',
    title: 'Собери светофор',
    levelId: 'systems',
    minutes: 18,
    summary: 'Первый автомат состояний и итоговая лаборатория.',
    exercise: fsmExercise,
    hints: [
      'Три состояния образуют круг: RED → GREEN → YELLOW → RED.',
      'Память state обновляется только на разрешённом фронте; lights вычисляется отдельно.',
      'В ветке GREEN замените state <= GREEN; на state <= YELLOW;',
    ],
    steps: [
      explain(
        'state',
        'Состояние хранит текущую фазу',
        'Автомат состояний (FSM) хранит состояние и выбирает следующее. У светофора три фазы: RED, GREEN, YELLOW. localparam даёт числам понятные имена. Регистр state — память фазы.',
        "localparam RED = 2'd0, GREEN = 2'd1, YELLOW = 2'd2;\nreg [1:0] state;",
      ),
      explain(
        'decode',
        'Отдели память от выходов',
        'Фронтовый always обновляет state. Комбинационный always @* по state выставляет lights: 001 — красный, 100 — зелёный, 010 — жёлтый. Каждая ветка присваивает весь выход, поэтому не нужна скрытая память. default задаёт безопасное поведение для неиспользованного кода.',
      ),
      quiz(
        'fsm-quiz',
        'Что нужно хранить?',
        'Какая часть этого светофора должна помнить прошлый такт?',
        [
          ['state — текущая фаза', 'Верно. По сохранённой фазе выбирается следующий переход.'],
          ['localparam RED', 'localparam — постоянное имя числа, оно не обновляется на тактах.'],
          [
            'Каждая строка assign',
            'Непрерывное присваивание не хранит историю. Здесь память нужна для состояния.',
          ],
        ],
      ),
      practice(
        'Почини переход GREEN → YELLOW. Проверка пройдёт два круга и паузу. Затем исследуй RTL и объясни себе, где память состояния и где логика ламп. Это учебная модель; настоящий дорожный светофор требует иных гарантий и проверки.',
      ),
    ],
  },
];

export const LEARNING_PROGRESS_KEY = 'yosis.learning-course.v1';
function lessonById(id: string): GuidedLesson {
  const lesson = guidedLessons.find((item) => item.id === id);
  if (!lesson) throw new Error('Неизвестный урок.');
  return lesson;
}
function freshLesson(lesson: GuidedLesson): CourseLessonProgress {
  return {
    stepId: lesson.steps[0].id,
    answers: {},
    passedQuizIds: [],
    hintsShown: 0,
    exercise: null,
    completed: false,
  };
}
export function createCourseProgress(): CourseProgress {
  return {
    version: 1,
    activeLessonId: guidedLessons[0].id,
    lessons: Object.fromEntries(guidedLessons.map((lesson) => [lesson.id, freshLesson(lesson)])),
  };
}
export function getCourseLessonState(
  progress: CourseProgress,
  lessonId: string,
): CourseLessonProgress {
  return progress.lessons[lessonId] ?? freshLesson(lessonById(lessonId));
}
export function isCourseLessonUnlocked(progress: CourseProgress, lessonId: string): boolean {
  const index = guidedLessons.findIndex((item) => item.id === lessonId);
  return (
    index >= 0 &&
    guidedLessons
      .slice(0, index)
      .every((lesson) => getCourseLessonState(progress, lesson.id).completed)
  );
}
export function getCourseStep(
  progress: CourseProgress,
  lessonId = progress.activeLessonId,
): CourseStep {
  const lesson = lessonById(lessonId);
  return (
    lesson.steps.find((step) => step.id === getCourseLessonState(progress, lessonId).stepId) ??
    lesson.steps[0]
  );
}
function mutateLesson(
  progress: CourseProgress,
  id: string,
  change: (state: CourseLessonProgress) => CourseLessonProgress,
): CourseProgress {
  lessonById(id);
  if (!isCourseLessonUnlocked(progress, id)) throw new Error('Сначала завершите предыдущий урок.');
  return {
    ...progress,
    lessons: { ...progress.lessons, [id]: change(getCourseLessonState(progress, id)) },
  };
}
export function selectCourseLesson(progress: CourseProgress, id: string): CourseProgress {
  if (!isCourseLessonUnlocked(progress, id)) throw new Error('Сначала завершите предыдущий урок.');
  return { ...progress, activeLessonId: id };
}
export function answerCourseQuiz(
  progress: CourseProgress,
  lessonId: string,
  stepId: string,
  optionId: string,
): CourseAnswerResult {
  const step = lessonById(lessonId).steps.find((item) => item.id === stepId);
  const option = step?.quiz?.options.find((item) => item.id === optionId);
  if (!step?.quiz || !option || getCourseLessonState(progress, lessonId).stepId !== stepId)
    throw new Error('Этот ответ не относится к текущему вопросу.');
  const correct = option.id === step.quiz.correctOptionId;
  return {
    correct,
    feedback: option.feedback,
    progress: mutateLesson(progress, lessonId, (state) => ({
      ...state,
      answers: { ...state.answers, [stepId]: optionId },
      passedQuizIds: correct
        ? [...new Set([...state.passedQuizIds, stepId])]
        : state.passedQuizIds.filter((id) => id !== stepId),
      completed: correct ? state.completed : false,
    })),
  };
}
export function canAdvanceCourseStep(
  progress: CourseProgress,
  lessonId = progress.activeLessonId,
): boolean {
  if (!isCourseLessonUnlocked(progress, lessonId)) return false;
  const step = getCourseStep(progress, lessonId);
  const state = getCourseLessonState(progress, lessonId);
  return step.kind === 'quiz'
    ? state.passedQuizIds.includes(step.id)
    : step.kind === 'practice'
      ? state.exercise?.passed === true
      : true;
}
export function advanceCourseStep(
  progress: CourseProgress,
  lessonId = progress.activeLessonId,
): CourseProgress {
  if (!canAdvanceCourseStep(progress, lessonId))
    throw new Error('Пройдите текущий вопрос или проверку устройства.');
  const lesson = lessonById(lessonId);
  return mutateLesson(progress, lessonId, (state) => {
    const index = lesson.steps.findIndex((step) => step.id === state.stepId);
    if (index < lesson.steps.length - 1) return { ...state, stepId: lesson.steps[index + 1].id };
    const quizzesPassed = lesson.steps
      .filter((step) => step.kind === 'quiz')
      .every((step) => state.passedQuizIds.includes(step.id));
    if (!quizzesPassed || (lesson.exercise && !state.exercise?.passed))
      throw new Error('Для завершения нужны все вопросы и проверка устройства.');
    return { ...state, completed: true };
  });
}
export function previousCourseStep(
  progress: CourseProgress,
  lessonId = progress.activeLessonId,
): CourseProgress {
  const lesson = lessonById(lessonId);
  return mutateLesson(progress, lessonId, (state) => ({
    ...state,
    stepId:
      lesson.steps[Math.max(0, lesson.steps.findIndex((step) => step.id === state.stepId) - 1)].id,
  }));
}
export function revealCourseHint(
  progress: CourseProgress,
  lessonId = progress.activeLessonId,
): CourseProgress {
  const lesson = lessonById(lessonId);
  return mutateLesson(progress, lessonId, (state) => ({
    ...state,
    hintsShown: Math.min(lesson.hints.length, state.hintsShown + 1),
  }));
}
/** Accept only the complete verdict list produced for this exercise and a hash of the simulated project. */
export function recordCourseExerciseResult(
  progress: CourseProgress,
  lessonId: string,
  verdicts: LessonVerdict[],
  projectHash: string,
): CourseProgress {
  const lesson = lessonById(lessonId);
  if (!lesson.exercise || !/^[a-f0-9]{64}$/i.test(projectHash))
    throw new Error('Нужен результат симуляции учебного проекта.');
  const passed =
    verdicts.length === lesson.exercise.cases.length &&
    verdicts.every(
      (verdict, index) =>
        verdict.passed === true &&
        verdict.title === lesson.exercise!.cases[index].title &&
        verdict.expected === lesson.exercise!.cases[index].expected &&
        verdict.actual === verdict.expected &&
        JSON.stringify(verdict.inputs) === JSON.stringify(lesson.exercise!.cases[index].inputs),
    );
  return mutateLesson(progress, lessonId, (state) => ({
    ...state,
    exercise: passed ? { passed: true, projectHash: projectHash.toLowerCase() } : null,
    completed: passed ? state.completed : false,
  }));
}
export function isCourseExerciseCurrent(
  progress: CourseProgress,
  lessonId: string,
  projectHash: string,
): boolean {
  return (
    getCourseLessonState(progress, lessonId).exercise?.projectHash === projectHash.toLowerCase()
  );
}
/** Editing a passed laboratory clears its result and locks later lessons until it is checked again. */
export function invalidateCourseExercise(
  progress: CourseProgress,
  lessonId: string,
): CourseProgress {
  return mutateLesson(progress, lessonId, (state) => ({
    ...state,
    exercise: null,
    completed: false,
  }));
}
/** Restart this lesson and all later lessons because their prerequisites changed. */
export function resetCourseLesson(progress: CourseProgress, lessonId: string): CourseProgress {
  const index = guidedLessons.findIndex((item) => item.id === lessonId);
  if (index < 0) throw new Error('Неизвестный урок.');
  if (!isCourseLessonUnlocked(progress, lessonId))
    throw new Error('Сначала завершите предыдущий урок.');
  return {
    ...progress,
    activeLessonId: lessonId,
    lessons: {
      ...progress.lessons,
      ...Object.fromEntries(
        guidedLessons.slice(index).map((lesson) => [lesson.id, freshLesson(lesson)]),
      ),
    },
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** Malformed or outdated local storage is reduced to a valid course state, never used as executable lesson data. */
export function parseCourseProgress(input: unknown): CourseProgress {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return createCourseProgress();
    }
  }
  const progress = createCourseProgress();
  if (!record(value) || value.version !== 1 || !record(value.lessons)) return progress;
  for (const lesson of guidedLessons) {
    const saved = value.lessons[lesson.id];
    if (!record(saved) || !isCourseLessonUnlocked(progress, lesson.id)) continue;
    if (
      typeof saved.stepId !== 'string' ||
      !lesson.steps.some((step) => step.id === saved.stepId) ||
      !record(saved.answers) ||
      !Array.isArray(saved.passedQuizIds)
    )
      continue;
    const answers: Record<string, string> = {};
    const passedQuizIds: string[] = [];
    for (const step of lesson.steps.filter((item) => item.quiz)) {
      const answer = saved.answers[step.id];
      if (typeof answer === 'string' && step.quiz!.options.some((option) => option.id === answer))
        answers[step.id] = answer;
      if (saved.passedQuizIds.includes(step.id) && answer === step.quiz!.correctOptionId)
        passedQuizIds.push(step.id);
    }
    const exercise =
      lesson.exercise &&
      record(saved.exercise) &&
      saved.exercise.passed === true &&
      typeof saved.exercise.projectHash === 'string' &&
      /^[a-f0-9]{64}$/i.test(saved.exercise.projectHash)
        ? { passed: true as const, projectHash: saved.exercise.projectHash.toLowerCase() }
        : null;
    const completeGates =
      lesson.steps.filter((step) => step.quiz).every((step) => passedQuizIds.includes(step.id)) &&
      (!lesson.exercise || exercise !== null);
    const stepIndex = lesson.steps.findIndex((step) => step.id === saved.stepId);
    const firstUnpassed = lesson.steps.findIndex(
      (step, index) =>
        index < stepIndex &&
        ((step.kind === 'quiz' && !passedQuizIds.includes(step.id)) ||
          (step.kind === 'practice' && !exercise)),
    );
    progress.lessons[lesson.id] = {
      stepId: firstUnpassed >= 0 ? lesson.steps[firstUnpassed].id : saved.stepId,
      answers,
      passedQuizIds,
      hintsShown:
        typeof saved.hintsShown === 'number' && Number.isInteger(saved.hintsShown)
          ? Math.max(0, Math.min(lesson.hints.length, saved.hintsShown))
          : 0,
      exercise,
      completed: saved.completed === true && completeGates,
    };
  }
  if (
    typeof value.activeLessonId === 'string' &&
    isCourseLessonUnlocked(progress, value.activeLessonId)
  )
    progress.activeLessonId = value.activeLessonId;
  return progress;
}
