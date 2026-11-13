import type { LessonCase } from '../../../lib/lessons';
import type { VerilogLessonSpec } from './types';

/** One check: the output read at the end of clock period `cycle`. */
const row = (
  cycle: number,
  expected: string,
  title: string,
  inputs: Record<string, string> = {},
): LessonCase => ({ title, cycle, inputs, expected });

export const specs: VerilogLessonSpec[] = [
  {
    id: 'decade-counter',
    chapter: 'counters',
    title: 'Десятичный счётчик 0…9',
    minutes: 8,
    theory: [
      {
        title: 'Счётчик не обязан считать до 15',
        md: 'Четыре бита умеют считать от 0 до 15, а потом сами возвращаются в 0. Но человеку удобнее десять цифр: 0, 1, … 9. Часы, секундомер и индикатор на плате показывают именно такие цифры.\n\nПоэтому счётчик нужно **подрезать**: когда он дошёл до 9, следующим значением должен стать 0, а не 10.',
        code: 'такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncount:  0 1 2 3 4 5 6 7 8 9  0  1',
      },
      {
        title: 'Сравнение внутри always',
        md: 'На каждом фронте такта мы смотрим на **текущее** значение `count`. Если оно равно 9, записываем 0, иначе прибавляем единицу. Сравнение — это знак `==`, а присваивание в регистр — `<=`.\n\nСброс, как и раньше, проверяем первым: он важнее всего остального.',
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (count == 4'd9)\n        count <= 4'd0;\n    else\n        count <= count + 4'd1;\nend",
      },
    ],
    quiz: {
      question:
        'Счётчик сейчас показывает 9. Что он покажет после следующего фронта, если в коде есть проверка count == 9?',
      options: ['10', '0', '15'],
      answer: 1,
      explain:
        'Условие count == 9 выполняется, и в регистр записывается 0. Значение 10 никогда не появится на выходе.',
    },
    practice: {
      text: 'Сделай счётчик по модулю 10: после сброса он считает 0, 1, … 9, затем снова 0, 1, … Значение 10 появляться не должно.',
      starter:
        "// Урок: счётчик 0…9\nmodule top (\n    input wire clk,\n    input wire reset,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else\n            count <= count + 4'd1; // TODO: после 9 нужен 0\n    end\nendmodule\n",
      solution:
        "// Урок: счётчик 0…9\nmodule top (\n    input wire clk,\n    input wire reset,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else if (count == 4'd9)\n            count <= 4'd0;\n        else\n            count <= count + 4'd1;\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 23,
        inputs: {},
      },
      cases: [
        row(0, '0000', 'Сброс'),
        row(1, '0001', 'Первый шаг'),
        row(5, '0101', 'Пять'),
        row(9, '1001', 'Девять'),
        row(10, '0000', 'После девяти снова ноль'),
        row(11, '0001', 'Второй круг начался'),
        row(19, '1001', 'Девять во втором круге'),
        row(20, '0000', 'Второй возврат в ноль'),
      ],
      hints: [
        'Добавь ещё одну ветку в if: что делать, когда счётчик уже равен 9.',
        "Проверка записывается так: else if (count == 4'd9). В этой ветке в count нужно записать 0.",
        "else if (count == 4'd9) count <= 4'd0; — поставь эту ветку между сбросом и прибавлением единицы.",
      ],
    },
  },
  {
    id: 'down-counter',
    chapter: 'counters',
    title: 'Обратный отсчёт до нуля',
    minutes: 8,
    theory: [
      {
        title: 'Счёт вниз и остановка',
        md: 'Обратный отсчёт знаком по запуску ракеты: 9, 8, 7, … 0. Для счётчика это вычитание единицы вместо прибавления. Начинать отсчёт нужно с какого-то числа, поэтому по сбросу мы записываем не 0, а **стартовое значение**, например 9.\n\nЕсть и вторая тонкость. Если вычесть единицу из 0, четырёхбитное число «провалится» в 15. Нам это не нужно: дойдя до 0, счётчик должен **остановиться** и остаться нулём.',
        code: 'такт:   0 1 2 3 ... 9 10 11 12\ncount:  9 9 8 7 ... 1  0  0  0',
      },
      {
        title: 'Пауза по входу en',
        md: 'Вход `en` (от английского enable, «разрешить») работает как кнопка паузы: пока он 0, значение не меняется. Считаем вниз только когда `en = 1` и счётчик ещё не дошёл до нуля.',
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd9;\n    else if (en && count != 4'd0)\n        count <= count - 4'd1;\nend",
      },
    ],
    quiz: {
      question:
        'Счётчик показывает 0, en = 1, а в коде нет проверки на ноль. Что произойдёт на следующем фронте?',
      options: ['Останется 0', 'Станет 15', 'Станет 1'],
      answer: 1,
      explain:
        'У четырёх бит нет отрицательных чисел: 0 минус 1 даёт 1111, то есть 15. Поэтому остановку на нуле приходится писать явно.',
    },
    practice: {
      text: 'Сделай обратный счётчик: по сбросу в нём 9, при en = 1 он уменьшается на единицу, дойдя до 0 останавливается, при en = 0 стоит на месте.',
      starter:
        "// Урок: обратный отсчёт\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd9;\n        else if (en)\n            count <= count + 4'd1; // TODO: вычитать, и не уходить ниже нуля\n    end\nendmodule\n",
      solution:
        "// Урок: обратный отсчёт\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd9;\n        else if (en && count != 4'd0)\n            count <= count - 4'd1;\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 2,
        periodNs: 10,
        cycles: 16,
        inputs: { en: '1' },
        stimuli: [
          { cycle: 4, inputs: { en: '0' } },
          { cycle: 6, inputs: { en: '1' } },
        ],
      },
      cases: [
        row(0, '1001', 'Сброс: в счётчике 9', { en: '1' }),
        row(1, '1001', 'Сброс держится', { en: '1' }),
        row(2, '1000', 'Первый шаг вниз', { en: '1' }),
        row(3, '0111', 'Второй шаг', { en: '1' }),
        row(4, '0111', 'Пауза', { en: '0' }),
        row(5, '0111', 'Пауза продолжается', { en: '0' }),
        row(6, '0110', 'Отсчёт продолжился', { en: '1' }),
        row(11, '0001', 'Единица', { en: '1' }),
        row(12, '0000', 'Дошли до нуля', { en: '1' }),
        row(13, '0000', 'Остановка на нуле', { en: '1' }),
        row(15, '0000', 'Остаётся нулём', { en: '1' }),
      ],
      hints: [
        "Вычитание в Verilog — обычный минус: count - 4'd1. Ещё нужно запретить шаг, когда count уже 0.",
        "Условие шага: en && count != 4'd0. Если оно ложно, регистр ничего не получает и хранит значение.",
        "else if (en && count != 4'd0) count <= count - 4'd1;",
      ],
    },
  },
  {
    id: 'up-down-counter',
    chapter: 'counters',
    title: 'Счётчик вверх и вниз',
    minutes: 8,
    theory: [
      {
        title: 'Направление задаёт вход',
        md: 'Иногда одного счётчика хватает и для «плюс», и для «минус»: например, выбор пункта меню кнопками «вверх» и «вниз». Для этого у него появляется вход, который выбирает направление. Назовём его `up`: при `up = 1` считаем вверх, при `up = 0` вниз.\n\nСам регистр остаётся один, меняется лишь то, что мы в него записываем.',
        code: 'up=1:  0 -> 1 -> 2 -> 3\nup=0:  3 -> 2 -> 1 -> 0',
      },
      {
        title: 'Переход через границу',
        md: 'Что будет на краях? Четыре бита ведут себя по кругу. Если вычесть единицу из 0, получится 15. А если прибавить единицу к 15, получится 0. Такое «закольцовывание» называется **переполнением**, и в этом уроке оно нас устраивает: мы его просто не запрещаем.',
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (up)\n        count <= count + 4'd1;\n    else\n        count <= count - 4'd1;\nend",
      },
    ],
    quiz: {
      question: 'Четырёхбитный счётчик стоит на 0 и получает такт с up = 0. Что на выходе?',
      options: ['0000', '1111', '0001'],
      answer: 1,
      explain:
        'Вычитание единицы из 0 в четырёх битах даёт 1111, то есть 15: счётчик «ходит по кругу» и вниз.',
    },
    practice: {
      text: 'Сделай счётчик, который при up = 1 прибавляет единицу, а при up = 0 вычитает. Сброс обнуляет его. Границы не защищай: 0 вниз даёт 15, а 15 вверх даёт 0.',
      starter:
        "// Урок: счётчик вверх и вниз\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire up,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else\n            count <= count + 4'd1; // TODO: при up = 0 вычитать\n    end\nendmodule\n",
      solution:
        "// Урок: счётчик вверх и вниз\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire up,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else if (up)\n            count <= count + 4'd1;\n        else\n            count <= count - 4'd1;\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 13,
        inputs: { up: '1' },
        stimuli: [
          { cycle: 4, inputs: { up: '0' } },
          { cycle: 9, inputs: { up: '1' } },
        ],
      },
      cases: [
        row(0, '0000', 'Сброс', { up: '1' }),
        row(1, '0001', 'Вверх', { up: '1' }),
        row(3, '0011', 'Вверх до трёх', { up: '1' }),
        row(4, '0010', 'Развернулись вниз', { up: '0' }),
        row(6, '0000', 'Спустились в ноль', { up: '0' }),
        row(7, '1111', 'Ноль вниз даёт 15', { up: '0' }),
        row(8, '1110', 'Дальше вниз', { up: '0' }),
        row(9, '1111', 'Снова вверх', { up: '1' }),
        row(10, '0000', '15 вверх даёт 0', { up: '1' }),
        row(11, '0001', 'И дальше вверх', { up: '1' }),
      ],
      hints: [
        'Нужна ещё одна ветка: что делать, когда up равен 0.',
        'Структура: if (reset) ... else if (up) прибавить ... else вычесть.',
        "else if (up) count <= count + 4'd1; else count <= count - 4'd1;",
      ],
    },
  },
  {
    id: 'loadable-counter',
    chapter: 'counters',
    title: 'Счётчик с загрузкой',
    minutes: 9,
    theory: [
      {
        title: 'Начать не с нуля',
        md: 'Часто счёт нужно начать не с 0, а с заданного числа: таймер на 7 секунд, отсчёт от выбранной цифры. Для этого у счётчика делают **загрузку**: вход `load` («загрузить») и вход `data` с числом.\n\nКогда на фронте такта `load = 1`, в счётчик записывается `data`. Когда `load = 0`, счёт идёт как обычно. Само значение `data` в остальное время ни на что не влияет.',
        code: 'такт:   0  1  2  3  4  5\nload:   0  0  0  1  0  0\ndata:   -  -  -  9  3  3\ncount:  0  1  2  9 10 11',
      },
      {
        title: 'Кто главнее',
        md: 'В if-цепочке порядок решает всё. Сначала идёт сброс, затем загрузка, затем обычный счёт. Если `reset` и `load` пришли вместе, победит сброс, потому что его проверка стоит раньше.',
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (load)\n        count <= data;\n    else\n        count <= count + 4'd1;\nend",
      },
    ],
    quiz: {
      question: 'На фронте reset = 1 и load = 1 одновременно. Что окажется в счётчике?',
      options: [
        'Число с входа data',
        '0, потому что сброс проверяется первым',
        'Старое значение плюс один',
      ],
      answer: 1,
      explain:
        'В цепочке if ... else if выполняется только первая подошедшая ветка. Сброс стоит выше загрузки, поэтому он важнее.',
    },
    practice: {
      text: 'Сделай счётчик с загрузкой: при load = 1 в него записывается data, иначе он прибавляет единицу. Сброс главнее загрузки.',
      starter:
        "// Урок: счётчик с загрузкой\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire load,\n    input wire [3:0] data,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else\n            count <= count + 4'd1; // TODO: добавить загрузку data по load\n    end\nendmodule\n",
      solution:
        "// Урок: счётчик с загрузкой\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire load,\n    input wire [3:0] data,\n    output reg [3:0] count\n);\n    always @(posedge clk) begin\n        if (reset)\n            count <= 4'd0;\n        else if (load)\n            count <= data;\n        else\n            count <= count + 4'd1;\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 11,
        inputs: { load: '1', data: '5' },
        stimuli: [
          { cycle: 1, inputs: { load: '0', data: '0' } },
          { cycle: 3, inputs: { load: '1', data: '9' } },
          { cycle: 4, inputs: { load: '0', data: '3' } },
          { cycle: 6, inputs: { load: '1', data: '14' } },
          { cycle: 7, inputs: { load: '0', data: '0' } },
        ],
      },
      cases: [
        row(0, '0000', 'Сброс сильнее загрузки', { load: '1', data: '5' }),
        row(1, '0001', 'Обычный счёт', { load: '0', data: '0' }),
        row(2, '0010', 'Ещё шаг', { load: '0', data: '0' }),
        row(3, '1001', 'Загрузили 9', { load: '1', data: '9' }),
        row(4, '1010', 'data изменился, но load = 0: считаем дальше', { load: '0', data: '3' }),
        row(5, '1011', 'Счёт продолжается', { load: '0', data: '3' }),
        row(6, '1110', 'Загрузили 14', { load: '1', data: '14' }),
        row(7, '1111', 'Шаг после загрузки', { load: '0', data: '0' }),
        row(8, '0000', 'Переполнение 15 в 0', { load: '0', data: '0' }),
      ],
      hints: [
        'Между сбросом и обычным счётом нужна ещё одна ветка, которая смотрит на load.',
        'В этой ветке в регистр записывается не count + 1, а значение входа data.',
        'else if (load) count <= data;  — поставь эту строку сразу после ветки reset.',
      ],
    },
  },
  {
    id: 'mod-n-counter',
    chapter: 'counters',
    title: 'Счётчик по модулю N',
    minutes: 9,
    theory: [
      {
        title: 'Модуль — это длина круга',
        md: 'Счётчик «по модулю N» считает 0, 1, … N-1 и возвращается в 0. Всего у него N разных значений. Десятичный счётчик — частный случай при N = 10. Для N = 6 получится 0, 1, 2, 3, 4, 5, 0, 1, …\n\nДля чисел до 5 хватит трёх бит, они вмещают от 0 до 7.',
        code: 'N = 6\nтакт:   0 1 2 3 4 5 6 7\ncount:  0 1 2 3 4 5 0 1',
      },
      {
        title: 'Число N в одном месте',
        md: 'Цифру 6 не стоит прятать в нескольких местах кода. Лучше дать ей имя: `localparam N = 6;` («локальный параметр» — постоянная внутри модуля). Тогда чтобы сменить модуль, достаточно поправить одну строку.\n\nЧисло считается до **N-1**, и именно на нём счётчик возвращается в 0.',
        code: "localparam N = 6;\n\nalways @(posedge clk) begin\n    if (reset)\n        count <= 3'd0;\n    else if (en) begin\n        if (count == N - 1)\n            count <= 3'd0;\n        else\n            count <= count + 3'd1;\n    end\nend",
      },
    ],
    quiz: {
      question:
        'Счётчик по модулю 6 сейчас показывает 5. Что будет после следующего разрешённого такта?',
      options: ['6', '0', '5'],
      answer: 1,
      explain:
        'Модуль 6 означает шесть значений: от 0 до 5. После наибольшего значения N-1 = 5 счётчик возвращается в 0.',
    },
    practice: {
      text: 'Сделай счётчик по модулю 6 (используй localparam N = 6): значения 0…5, потом снова 0. При en = 0 он стоит на месте.',
      starter:
        "// Урок: счётчик по модулю N\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [2:0] count\n);\n    localparam N = 6;\n\n    always @(posedge clk) begin\n        if (reset)\n            count <= 3'd0;\n        else if (en)\n            count <= count + 3'd1; // TODO: после N-1 возвращаться в 0\n    end\nendmodule\n",
      solution:
        "// Урок: счётчик по модулю N\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [2:0] count\n);\n    localparam N = 6;\n\n    always @(posedge clk) begin\n        if (reset)\n            count <= 3'd0;\n        else if (en) begin\n            if (count == N - 1)\n                count <= 3'd0;\n            else\n                count <= count + 3'd1;\n        end\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 16,
        inputs: { en: '1' },
        stimuli: [
          { cycle: 3, inputs: { en: '0' } },
          { cycle: 4, inputs: { en: '1' } },
        ],
      },
      cases: [
        row(0, '000', 'Сброс', { en: '1' }),
        row(2, '010', 'Два', { en: '1' }),
        row(3, '010', 'Пауза', { en: '0' }),
        row(4, '011', 'Продолжили', { en: '1' }),
        row(6, '101', 'Пять: последнее значение', { en: '1' }),
        row(7, '000', 'После пяти снова ноль', { en: '1' }),
        row(8, '001', 'Новый круг', { en: '1' }),
        row(13, '000', 'Второй возврат в ноль', { en: '1' }),
        row(14, '001', 'И снова один', { en: '1' }),
      ],
      hints: [
        'Внутри ветки с en нужна ещё одна проверка: достиг ли счётчик последнего значения, N - 1.',
        "Условие: count == N - 1. Тогда count <= 3'd0, иначе прибавляем единицу.",
        "if (count == N - 1) count <= 3'd0; else count <= count + 3'd1; — внутри else if (en) begin ... end",
      ],
    },
  },
  {
    id: 'clock-divider-4',
    chapter: 'counters',
    title: 'Делитель частоты на 4',
    minutes: 8,
    theory: [
      {
        title: 'Зачем делить частоту',
        md: 'Такт платы очень быстрый, и мигающий светодиод на нём слился бы в ровное свечение. Чтобы получить медленный сигнал, частоту **делят**: выход меняется не на каждом такте, а, скажем, один раз в два такта.\n\nДелитель на 4 даёт сигнал, у которого один полный период (0 и 1) занимает 4 такта: два такта нуля и два такта единицы.',
        code: 'такт:  0 1 2 3 4 5 6 7 8\ndiv:   0 0 1 1 0 0 1 1 0',
      },
      {
        title: 'Делитель — это счётчик',
        md: 'Хитрость простая: берём двухбитный счётчик, он считает 0, 1, 2, 3, 0, … А на выход отдаём его **старший бит** `cnt[1]`. Старший бит равен 0 при значениях 0 и 1, и равен 1 при значениях 2 и 3: ровно то, что нужно.\n\nСтарший бит меняется один раз в два такта, значит частота в четыре раза меньше.',
        code: "reg [1:0] cnt;\nalways @(posedge clk) begin\n    if (reset)\n        cnt <= 2'd0;\n    else\n        cnt <= cnt + 2'd1;\nend\nassign div = cnt[1];",
      },
    ],
    quiz: {
      question: 'Какой бит двухбитного счётчика меняется реже всех?',
      options: ['Младший, cnt[0]', 'Старший, cnt[1]', 'Оба одинаково'],
      answer: 1,
      explain:
        'Младший бит меняется на каждом такте, а старший только когда младший переходит из 1 в 0: один раз в два такта.',
    },
    practice: {
      text: 'Сделай делитель частоты на 4: внутри двухбитный счётчик cnt, на выход div отдай его старший бит. После сброса выход равен 0.',
      starter:
        "// Урок: делитель частоты на 4\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire div\n);\n    reg [1:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 2'd0;\n        else\n            cnt <= cnt + 2'd1;\n    end\n\n    assign div = 1'b0; // TODO: старший бит счётчика\nendmodule\n",
      solution:
        "// Урок: делитель частоты на 4\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire div\n);\n    reg [1:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 2'd0;\n        else\n            cnt <= cnt + 2'd1;\n    end\n\n    assign div = cnt[1];\nendmodule\n",
      output: 'div',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 13,
        inputs: {},
      },
      cases: [
        row(0, '0', 'Сброс: выход 0'),
        row(1, '0', 'Первый такт: счётчик 1, выход 0'),
        row(2, '1', 'Счётчик 2: выход стал 1'),
        row(3, '1', 'Счётчик 3: выход держится'),
        row(4, '0', 'Счётчик снова 0: выход 0'),
        row(5, '0', 'Ещё один такт нуля'),
        row(6, '1', 'Второй период начался'),
        row(7, '1', 'Единица второго периода'),
        row(8, '0', 'Третий период'),
        row(10, '1', 'Периодичность сохраняется'),
      ],
      hints: [
        'Счётчик cnt уже написан. Остаётся выбрать, какой его бит отдать на выход.',
        'Нужен тот бит, который меняется реже всего: старший.',
        'assign div = cnt[1];',
      ],
    },
  },
  {
    id: 'pulse-every-n',
    chapter: 'counters',
    title: 'Короткий импульс раз в 4 такта',
    minutes: 8,
    theory: [
      {
        title: 'Импульс-«тик»',
        md: 'Делитель из прошлого урока даёт ровный меандр: половину времени 1, половину 0. А иногда нужен именно **короткий импульс**: единица ровно на один такт, а потом долгая пауза. Такой «тик» обычно разрешает что-то сделать: сдвинуть число, обновить индикатор.\n\nИмпульс раз в 4 такта выглядит так:',
        code: 'такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncnt:    0 1 2 3 0 1 2 3 0 1  2  3\npulse:  0 0 0 1 0 0 0 1 0 0  0  1',
      },
      {
        title: 'Сравнить счётчик с последним значением',
        md: 'Счётчик нам уже знаком: двухбитный, считает 0, 1, 2, 3 и сам возвращается в 0. А импульс — это просто **признак**, что счётчик сейчас равен 3. Признак делается одной строкой `assign`: результат сравнения `==` равен 1 или 0.',
        code: "assign pulse = (cnt == 2'd3);",
      },
    ],
    quiz: {
      question:
        'Импульс должен быть раз в 4 такта. Какое значение двухбитного счётчика ему соответствует?',
      options: ['Любое, подойдёт 0', 'Одно конкретное, например 3', 'Все четыре сразу'],
      answer: 1,
      explain:
        'Двухбитный счётчик проходит каждое значение один раз за 4 такта. Если выбрать одно из них, признак будет единицей только в этом такте, а остальные три такта будет нулём.',
    },
    practice: {
      text: 'Сделай «тик»: выход pulse равен 1 ровно в одном такте из четырёх, когда внутренний счётчик cnt равен 3. Счётчик уже написан, добавь признак.',
      starter:
        "// Урок: импульс раз в 4 такта\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire pulse\n);\n    reg [1:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 2'd0;\n        else\n            cnt <= cnt + 2'd1;\n    end\n\n    assign pulse = 1'b0; // TODO: единица, когда cnt равен 3\nendmodule\n",
      solution:
        "// Урок: импульс раз в 4 такта\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire pulse\n);\n    reg [1:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 2'd0;\n        else\n            cnt <= cnt + 2'd1;\n    end\n\n    assign pulse = (cnt == 2'd3);\nendmodule\n",
      output: 'pulse',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 14,
        inputs: {},
      },
      cases: [
        row(0, '0', 'Сброс: импульса нет'),
        row(1, '0', 'Счётчик 1'),
        row(2, '0', 'Счётчик 2'),
        row(3, '1', 'Счётчик 3: импульс'),
        row(4, '0', 'Импульс длится один такт'),
        row(5, '0', 'Пауза между импульсами'),
        row(6, '0', 'Ещё такт без импульса'),
        row(7, '1', 'Второй импульс'),
        row(8, '0', 'После второго импульса'),
        row(11, '1', 'Третий импульс'),
        row(12, '0', 'И снова тишина'),
      ],
      hints: [
        'Импульс нужен в тот момент, когда cnt равен последнему значению счёта, то есть 3.',
        "Сравнение пишется как cnt == 2'd3: оно само равно 1 или 0.",
        "assign pulse = (cnt == 2'd3);",
      ],
    },
  },
  {
    id: 'pwm-4bit',
    chapter: 'counters',
    title: 'ШИМ: яркость числом',
    minutes: 12,
    theory: [
      {
        title: 'Мигать так быстро, что не видно',
        md: 'Светодиод умеет только «горит» и «не горит». Но если включать и выключать его очень быстро, глаз видит промежуточную яркость: чем дольше горит в каждом периоде, тем ярче. Этот приём называется **ШИМ** — широтно-импульсная модуляция. «Широта» здесь — длительность единицы в периоде.\n\nДоля времени с единицей называется скважностью, а число, которое её задаёт, мы назовём `duty` («рабочая часть»).',
        code: 'период 16 тактов, duty = 4:\n\nсчётчик: 0 1 2 3 4 5 6 ... 15 0 1 2 3 4\npwm:     1 1 1 1 0 0 0 ...  0 1 1 1 1 0',
      },
      {
        title: 'Счётчик и сравнение',
        md: 'Схема очень проста. Свободный четырёхбитный счётчик бесконечно считает 0…15: это и есть период в 16 тактов. Выход равен 1, пока счётчик **меньше** `duty`.\n\nПри `duty = 0` единицы нет совсем, выход всегда 0. При `duty = 15` единица почти весь период, не хватает только одного такта, когда счётчик равен 15. Строго «меньше» (`<`) даёт именно такой результат.',
        code: "always @(posedge clk) begin\n    if (reset)\n        cnt <= 4'd0;\n    else\n        cnt <= cnt + 4'd1;\nend\nassign pwm = (cnt < duty);",
      },
    ],
    quiz: {
      question: 'Период 16 тактов, duty = 4. Сколько тактов из 16 выход pwm равен 1?',
      options: ['4', '12', '16'],
      answer: 0,
      explain:
        'Выход равен 1, пока cnt меньше 4: это значения 0, 1, 2, 3, то есть четыре такта. Остальные 12 тактов выход 0.',
    },
    practice: {
      text: 'Сделай ШИМ с периодом 16 тактов: выход pwm равен 1, пока свободный счётчик cnt меньше duty. Счётчик уже написан, добавь сравнение.',
      starter:
        "// Урок: ШИМ\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire [3:0] duty,\n    output wire pwm\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 4'd0;\n        else\n            cnt <= cnt + 4'd1;\n    end\n\n    assign pwm = 1'b0; // TODO: единица, пока cnt меньше duty\nendmodule\n",
      solution:
        "// Урок: ШИМ\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire [3:0] duty,\n    output wire pwm\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk) begin\n        if (reset)\n            cnt <= 4'd0;\n        else\n            cnt <= cnt + 4'd1;\n    end\n\n    assign pwm = (cnt < duty);\nendmodule\n",
      output: 'pwm',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 1,
        periodNs: 10,
        cycles: 50,
        inputs: { duty: '3' },
        stimuli: [
          { cycle: 20, inputs: { duty: '8' } },
          { cycle: 28, inputs: { duty: '0' } },
          { cycle: 33, inputs: { duty: '15' } },
        ],
      },
      cases: [
        row(0, '1', 'Начало периода, duty = 3', { duty: '3' }),
        row(2, '1', 'Счётчик 2 меньше 3', { duty: '3' }),
        row(3, '0', 'Счётчик 3 не меньше 3', { duty: '3' }),
        row(15, '0', 'Конец периода', { duty: '3' }),
        row(16, '1', 'Новый период', { duty: '3' }),
        row(19, '0', 'Второй период, после трёх тактов', { duty: '3' }),
        row(20, '1', 'duty стал 8, счётчик 4', { duty: '8' }),
        row(23, '1', 'Счётчик 7 меньше 8', { duty: '8' }),
        row(24, '0', 'Счётчик 8 не меньше 8', { duty: '8' }),
        row(32, '0', 'duty = 0: выход всегда 0', { duty: '0' }),
        row(33, '1', 'duty = 15, счётчик 1', { duty: '15' }),
        row(46, '1', 'Счётчик 14 меньше 15', { duty: '15' }),
        row(47, '0', 'Счётчик 15 не меньше 15', { duty: '15' }),
      ],
      hints: [
        'Выход определяется только сравнением двух чисел: счётчика и duty.',
        'В Verilog «меньше» пишется знаком <. Скобки вокруг сравнения помогают читать.',
        'assign pwm = (cnt < duty);',
      ],
    },
  },
  {
    id: 'ring-counter',
    chapter: 'counters',
    title: 'Кольцевой счётчик',
    minutes: 9,
    theory: [
      {
        title: 'Бегущая единица',
        md: 'Кольцевой счётчик устроен иначе, чем те, что мы делали. В нём нет чисел: это четыре бита, из которых **только один равен 1**, и эта единица бежит по кругу: 0001, 0010, 0100, 1000, и снова 0001.\n\nТакой код называют «one-hot» («одна горячая»). Он удобен, когда нужно по очереди включать четыре светодиода или четыре шага чего-то.',
        code: 'такт:  0    1    2    3    4    5\nring:  0001 0010 0100 1000 0001 0010',
      },
      {
        title: 'Сдвиг с замыканием',
        md: 'Чтобы сдвинуть биты влево, есть операция `<<`. Но обычный сдвиг выбрасывает старший бит и подставляет справа 0: после 1000 получилось бы 0000, и единица пропала бы навсегда.\n\nЗамкнуть кольцо можно, собрав новое значение из частей: три нижних бита идут наверх, а освободившийся младший бит берёт старший. Склеивание записывается фигурными скобками.',
        code: "if (reset)\n    ring <= 4'b0001;       // единица на старте\nelse if (en)\n    ring <= {ring[2:0], ring[3]};",
      },
    ],
    quiz: {
      question: 'Кольцо сейчас 1000. Каким оно станет после сдвига с замыканием?',
      options: ['0000', '0001', '0100'],
      answer: 1,
      explain:
        'Единица из старшего бита уходит в младший: получается 0001. Обычный сдвиг << дал бы 0000, и единица потерялась бы.',
    },
    practice: {
      text: 'Сделай кольцевой счётчик на 4 бита: по сбросу в нём 0001, при en = 1 единица сдвигается влево и после 1000 возвращается в 0001, при en = 0 кольцо стоит на месте.',
      starter:
        "// Урок: кольцевой счётчик\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [3:0] ring\n);\n    always @(posedge clk) begin\n        if (reset)\n            ring <= 4'b0001;\n        else if (en)\n            ring <= ring << 1; // TODO: единица не должна пропадать\n    end\nendmodule\n",
      solution:
        "// Урок: кольцевой счётчик\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire en,\n    output reg [3:0] ring\n);\n    always @(posedge clk) begin\n        if (reset)\n            ring <= 4'b0001;\n        else if (en)\n            ring <= {ring[2:0], ring[3]};\n    end\nendmodule\n",
      output: 'ring',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 2,
        periodNs: 10,
        cycles: 14,
        inputs: { en: '1' },
        stimuli: [
          { cycle: 3, inputs: { en: '0' } },
          { cycle: 5, inputs: { en: '1' } },
        ],
      },
      cases: [
        row(0, '0001', 'Сброс: единица в младшем бите', { en: '1' }),
        row(1, '0001', 'Сброс держится', { en: '1' }),
        row(2, '0010', 'Первый сдвиг', { en: '1' }),
        row(3, '0010', 'Пауза', { en: '0' }),
        row(4, '0010', 'Пауза продолжается', { en: '0' }),
        row(5, '0100', 'Сдвиг после паузы', { en: '1' }),
        row(6, '1000', 'Единица в старшем бите', { en: '1' }),
        row(7, '0001', 'Замыкание кольца', { en: '1' }),
        row(8, '0010', 'Второй круг', { en: '1' }),
        row(11, '0001', 'Ещё одно замыкание', { en: '1' }),
      ],
      hints: [
        'Обычный сдвиг << теряет старший бит. Нужно вернуть его в младший.',
        'Новое значение склеивается из двух частей: {ring[2:0], ring[3]}: три нижних бита идут вверх, а старший бит приходит вниз.',
        'ring <= {ring[2:0], ring[3]};',
      ],
    },
  },
];
