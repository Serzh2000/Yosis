import type { LessonCase } from '../../../lib/lessons';
import type { VerilogLessonSpec } from './types';
import { t } from '../../../lib/i18n';

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
    title: t('Десятичный счётчик 0…9'),
    minutes: 8,
    theory: [
      {
        title: t('Счётчик не обязан считать до 15'),
        md: t(
          'Четыре бита умеют считать от 0 до 15, а потом сами возвращаются в 0. Но человеку удобнее десять цифр: 0, 1, … 9. Часы, секундомер и индикатор на плате показывают именно такие цифры.\n\nПоэтому счётчик нужно **подрезать**: когда он дошёл до 9, следующим значением должен стать 0, а не 10.',
        ),
        code: t('такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncount:  0 1 2 3 4 5 6 7 8 9  0  1'),
      },
      {
        title: t('Сравнение внутри always'),
        md: t(
          'На каждом фронте такта мы смотрим на **текущее** значение `count`. Если оно равно 9, записываем 0, иначе прибавляем единицу. Сравнение — это знак `==`, а присваивание в регистр — `<=`.\n\nСброс, как и раньше, проверяем первым: он важнее всего остального.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (count == 4'd9)\n        count <= 4'd0;\n    else\n        count <= count + 4'd1;\nend",
      },
    ],
    quiz: {
      question: t(
        'Счётчик сейчас показывает 9. Что он покажет после следующего фронта, если в коде есть проверка count == 9?',
      ),
      options: ['10', '0', '15'],
      answer: 1,
      explain: t(
        'Условие count == 9 выполняется, и в регистр записывается 0. Значение 10 никогда не появится на выходе.',
      ),
    },
    practice: {
      text: t(
        'Сделай счётчик по модулю 10: после сброса он считает 0, 1, … 9, затем снова 0, 1, … Значение 10 появляться не должно.',
      ),
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
        row(0, '0000', t('Сброс')),
        row(1, '0001', t('Первый шаг')),
        row(5, '0101', t('Пять')),
        row(9, '1001', t('Девять')),
        row(10, '0000', t('После девяти снова ноль')),
        row(11, '0001', t('Второй круг начался')),
        row(19, '1001', t('Девять во втором круге')),
        row(20, '0000', t('Второй возврат в ноль')),
      ],
      hints: [
        t('Добавь ещё одну ветку в if: что делать, когда счётчик уже равен 9.'),
        t(
          "Проверка записывается так: else if (count == 4'd9). В этой ветке в count нужно записать 0.",
        ),
        t(
          "else if (count == 4'd9) count <= 4'd0; — поставь эту ветку между сбросом и прибавлением единицы.",
        ),
      ],
    },
  },
  {
    id: 'down-counter',
    chapter: 'counters',
    title: t('Обратный отсчёт до нуля'),
    minutes: 8,
    theory: [
      {
        title: t('Счёт вниз и остановка'),
        md: t(
          'Обратный отсчёт знаком по запуску ракеты: 9, 8, 7, … 0. Для счётчика это вычитание единицы вместо прибавления. Начинать отсчёт нужно с какого-то числа, поэтому по сбросу мы записываем не 0, а **стартовое значение**, например 9.\n\nЕсть и вторая тонкость. Если вычесть единицу из 0, четырёхбитное число «провалится» в 15. Нам это не нужно: дойдя до 0, счётчик должен **остановиться** и остаться нулём.',
        ),
        code: t('такт:   0 1 2 3 ... 9 10 11 12\ncount:  9 9 8 7 ... 1  0  0  0'),
      },
      {
        title: t('Пауза по входу en'),
        md: t(
          'Вход `en` (от английского enable, «разрешить») работает как кнопка паузы: пока он 0, значение не меняется. Считаем вниз только когда `en = 1` и счётчик ещё не дошёл до нуля.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd9;\n    else if (en && count != 4'd0)\n        count <= count - 4'd1;\nend",
      },
    ],
    quiz: {
      question: t(
        'Счётчик показывает 0, en = 1, а в коде нет проверки на ноль. Что произойдёт на следующем фронте?',
      ),
      options: [t('Останется 0'), t('Станет 15'), t('Станет 1')],
      answer: 1,
      explain: t(
        'У четырёх бит нет отрицательных чисел: 0 минус 1 даёт 1111, то есть 15. Поэтому остановку на нуле приходится писать явно.',
      ),
    },
    practice: {
      text: t(
        'Сделай обратный счётчик: по сбросу в нём 9, при en = 1 он уменьшается на единицу, дойдя до 0 останавливается, при en = 0 стоит на месте.',
      ),
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
        row(0, '1001', t('Сброс: в счётчике 9'), { en: '1' }),
        row(1, '1001', t('Сброс держится'), { en: '1' }),
        row(2, '1000', t('Первый шаг вниз'), { en: '1' }),
        row(3, '0111', t('Второй шаг'), { en: '1' }),
        row(4, '0111', t('Пауза'), { en: '0' }),
        row(5, '0111', t('Пауза продолжается'), { en: '0' }),
        row(6, '0110', t('Отсчёт продолжился'), { en: '1' }),
        row(11, '0001', t('Единица'), { en: '1' }),
        row(12, '0000', t('Дошли до нуля'), { en: '1' }),
        row(13, '0000', t('Остановка на нуле'), { en: '1' }),
        row(15, '0000', t('Остаётся нулём'), { en: '1' }),
      ],
      hints: [
        t(
          "Вычитание в Verilog — обычный минус: count - 4'd1. Ещё нужно запретить шаг, когда count уже 0.",
        ),
        t(
          "Условие шага: en && count != 4'd0. Если оно ложно, регистр ничего не получает и хранит значение.",
        ),
        "else if (en && count != 4'd0) count <= count - 4'd1;",
      ],
    },
  },
  {
    id: 'up-down-counter',
    chapter: 'counters',
    title: t('Счётчик вверх и вниз'),
    minutes: 8,
    theory: [
      {
        title: t('Направление задаёт вход'),
        md: t(
          'Иногда одного счётчика хватает и для «плюс», и для «минус»: например, выбор пункта меню кнопками «вверх» и «вниз». Для этого у него появляется вход, который выбирает направление. Назовём его `up`: при `up = 1` считаем вверх, при `up = 0` вниз.\n\nСам регистр остаётся один, меняется лишь то, что мы в него записываем.',
        ),
        code: 'up=1:  0 -> 1 -> 2 -> 3\nup=0:  3 -> 2 -> 1 -> 0',
      },
      {
        title: t('Переход через границу'),
        md: t(
          'Что будет на краях? Четыре бита ведут себя по кругу. Если вычесть единицу из 0, получится 15. А если прибавить единицу к 15, получится 0. Такое «закольцовывание» называется **переполнением**, и в этом уроке оно нас устраивает: мы его просто не запрещаем.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (up)\n        count <= count + 4'd1;\n    else\n        count <= count - 4'd1;\nend",
      },
    ],
    quiz: {
      question: t('Четырёхбитный счётчик стоит на 0 и получает такт с up = 0. Что на выходе?'),
      options: ['0000', '1111', '0001'],
      answer: 1,
      explain: t(
        'Вычитание единицы из 0 в четырёх битах даёт 1111, то есть 15: счётчик «ходит по кругу» и вниз.',
      ),
    },
    practice: {
      text: t(
        'Сделай счётчик, который при up = 1 прибавляет единицу, а при up = 0 вычитает. Сброс обнуляет его. Границы не защищай: 0 вниз даёт 15, а 15 вверх даёт 0.',
      ),
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
        row(0, '0000', t('Сброс'), { up: '1' }),
        row(1, '0001', t('Вверх'), { up: '1' }),
        row(3, '0011', t('Вверх до трёх'), { up: '1' }),
        row(4, '0010', t('Развернулись вниз'), { up: '0' }),
        row(6, '0000', t('Спустились в ноль'), { up: '0' }),
        row(7, '1111', t('Ноль вниз даёт 15'), { up: '0' }),
        row(8, '1110', t('Дальше вниз'), { up: '0' }),
        row(9, '1111', t('Снова вверх'), { up: '1' }),
        row(10, '0000', t('15 вверх даёт 0'), { up: '1' }),
        row(11, '0001', t('И дальше вверх'), { up: '1' }),
      ],
      hints: [
        t('Нужна ещё одна ветка: что делать, когда up равен 0.'),
        t('Структура: if (reset) ... else if (up) прибавить ... else вычесть.'),
        "else if (up) count <= count + 4'd1; else count <= count - 4'd1;",
      ],
    },
  },
  {
    id: 'loadable-counter',
    chapter: 'counters',
    title: t('Счётчик с загрузкой'),
    minutes: 9,
    theory: [
      {
        title: t('Начать не с нуля'),
        md: t(
          'Часто счёт нужно начать не с 0, а с заданного числа: таймер на 7 секунд, отсчёт от выбранной цифры. Для этого у счётчика делают **загрузку**: вход `load` («загрузить») и вход `data` с числом.\n\nКогда на фронте такта `load = 1`, в счётчик записывается `data`. Когда `load = 0`, счёт идёт как обычно. Само значение `data` в остальное время ни на что не влияет.',
        ),
        code: t(
          'такт:   0  1  2  3  4  5\nload:   0  0  0  1  0  0\ndata:   -  -  -  9  3  3\ncount:  0  1  2  9 10 11',
        ),
      },
      {
        title: t('Кто главнее'),
        md: t(
          'В if-цепочке порядок решает всё. Сначала идёт сброс, затем загрузка, затем обычный счёт. Если `reset` и `load` пришли вместе, победит сброс, потому что его проверка стоит раньше.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        count <= 4'd0;\n    else if (load)\n        count <= data;\n    else\n        count <= count + 4'd1;\nend",
      },
    ],
    quiz: {
      question: t('На фронте reset = 1 и load = 1 одновременно. Что окажется в счётчике?'),
      options: [
        t('Число с входа data'),
        t('0, потому что сброс проверяется первым'),
        t('Старое значение плюс один'),
      ],
      answer: 1,
      explain: t(
        'В цепочке if ... else if выполняется только первая подошедшая ветка. Сброс стоит выше загрузки, поэтому он важнее.',
      ),
    },
    practice: {
      text: t(
        'Сделай счётчик с загрузкой: при load = 1 в него записывается data, иначе он прибавляет единицу. Сброс главнее загрузки.',
      ),
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
        row(0, '0000', t('Сброс сильнее загрузки'), { load: '1', data: '5' }),
        row(1, '0001', t('Обычный счёт'), { load: '0', data: '0' }),
        row(2, '0010', t('Ещё шаг'), { load: '0', data: '0' }),
        row(3, '1001', t('Загрузили 9'), { load: '1', data: '9' }),
        row(4, '1010', t('data изменился, но load = 0: считаем дальше'), { load: '0', data: '3' }),
        row(5, '1011', t('Счёт продолжается'), { load: '0', data: '3' }),
        row(6, '1110', t('Загрузили 14'), { load: '1', data: '14' }),
        row(7, '1111', t('Шаг после загрузки'), { load: '0', data: '0' }),
        row(8, '0000', t('Переполнение 15 в 0'), { load: '0', data: '0' }),
      ],
      hints: [
        t('Между сбросом и обычным счётом нужна ещё одна ветка, которая смотрит на load.'),
        t('В этой ветке в регистр записывается не count + 1, а значение входа data.'),
        t('else if (load) count <= data;  — поставь эту строку сразу после ветки reset.'),
      ],
    },
  },
  {
    id: 'mod-n-counter',
    chapter: 'counters',
    title: t('Счётчик по модулю N'),
    minutes: 9,
    theory: [
      {
        title: t('Модуль — это длина круга'),
        md: t(
          'Счётчик «по модулю N» считает 0, 1, … N-1 и возвращается в 0. Всего у него N разных значений. Десятичный счётчик — частный случай при N = 10. Для N = 6 получится 0, 1, 2, 3, 4, 5, 0, 1, …\n\nДля чисел до 5 хватит трёх бит, они вмещают от 0 до 7.',
        ),
        code: t('N = 6\nтакт:   0 1 2 3 4 5 6 7\ncount:  0 1 2 3 4 5 0 1'),
      },
      {
        title: t('Число N в одном месте'),
        md: t(
          'Цифру 6 не стоит прятать в нескольких местах кода. Лучше дать ей имя: `localparam N = 6;` («локальный параметр» — постоянная внутри модуля). Тогда чтобы сменить модуль, достаточно поправить одну строку.\n\nЧисло считается до **N-1**, и именно на нём счётчик возвращается в 0.',
        ),
        code: "localparam N = 6;\n\nalways @(posedge clk) begin\n    if (reset)\n        count <= 3'd0;\n    else if (en) begin\n        if (count == N - 1)\n            count <= 3'd0;\n        else\n            count <= count + 3'd1;\n    end\nend",
      },
    ],
    quiz: {
      question: t(
        'Счётчик по модулю 6 сейчас показывает 5. Что будет после следующего разрешённого такта?',
      ),
      options: ['6', '0', '5'],
      answer: 1,
      explain: t(
        'Модуль 6 означает шесть значений: от 0 до 5. После наибольшего значения N-1 = 5 счётчик возвращается в 0.',
      ),
    },
    practice: {
      text: t(
        'Сделай счётчик по модулю 6 (используй localparam N = 6): значения 0…5, потом снова 0. При en = 0 он стоит на месте.',
      ),
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
        row(0, '000', t('Сброс'), { en: '1' }),
        row(2, '010', t('Два'), { en: '1' }),
        row(3, '010', t('Пауза'), { en: '0' }),
        row(4, '011', t('Продолжили'), { en: '1' }),
        row(6, '101', t('Пять: последнее значение'), { en: '1' }),
        row(7, '000', t('После пяти снова ноль'), { en: '1' }),
        row(8, '001', t('Новый круг'), { en: '1' }),
        row(13, '000', t('Второй возврат в ноль'), { en: '1' }),
        row(14, '001', t('И снова один'), { en: '1' }),
      ],
      hints: [
        t(
          'Внутри ветки с en нужна ещё одна проверка: достиг ли счётчик последнего значения, N - 1.',
        ),
        t("Условие: count == N - 1. Тогда count <= 3'd0, иначе прибавляем единицу."),
        t(
          "if (count == N - 1) count <= 3'd0; else count <= count + 3'd1; — внутри else if (en) begin ... end",
        ),
      ],
    },
  },
  {
    id: 'clock-divider-4',
    chapter: 'counters',
    title: t('Делитель частоты на 4'),
    minutes: 8,
    theory: [
      {
        title: t('Зачем делить частоту'),
        md: t(
          'Такт платы очень быстрый, и мигающий светодиод на нём слился бы в ровное свечение. Чтобы получить медленный сигнал, частоту **делят**: выход меняется не на каждом такте, а, скажем, один раз в два такта.\n\nДелитель на 4 даёт сигнал, у которого один полный период (0 и 1) занимает 4 такта: два такта нуля и два такта единицы.',
        ),
        code: t('такт:  0 1 2 3 4 5 6 7 8\ndiv:   0 0 1 1 0 0 1 1 0'),
      },
      {
        title: t('Делитель — это счётчик'),
        md: t(
          'Хитрость простая: берём двухбитный счётчик, он считает 0, 1, 2, 3, 0, … А на выход отдаём его **старший бит** `cnt[1]`. Старший бит равен 0 при значениях 0 и 1, и равен 1 при значениях 2 и 3: ровно то, что нужно.\n\nСтарший бит меняется один раз в два такта, значит частота в четыре раза меньше.',
        ),
        code: "reg [1:0] cnt;\nalways @(posedge clk) begin\n    if (reset)\n        cnt <= 2'd0;\n    else\n        cnt <= cnt + 2'd1;\nend\nassign div = cnt[1];",
      },
    ],
    quiz: {
      question: t('Какой бит двухбитного счётчика меняется реже всех?'),
      options: [t('Младший, cnt[0]'), t('Старший, cnt[1]'), t('Оба одинаково')],
      answer: 1,
      explain: t(
        'Младший бит меняется на каждом такте, а старший только когда младший переходит из 1 в 0: один раз в два такта.',
      ),
    },
    practice: {
      text: t(
        'Сделай делитель частоты на 4: внутри двухбитный счётчик cnt, на выход div отдай его старший бит. После сброса выход равен 0.',
      ),
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
        row(0, '0', t('Сброс: выход 0')),
        row(1, '0', t('Первый такт: счётчик 1, выход 0')),
        row(2, '1', t('Счётчик 2: выход стал 1')),
        row(3, '1', t('Счётчик 3: выход держится')),
        row(4, '0', t('Счётчик снова 0: выход 0')),
        row(5, '0', t('Ещё один такт нуля')),
        row(6, '1', t('Второй период начался')),
        row(7, '1', t('Единица второго периода')),
        row(8, '0', t('Третий период')),
        row(10, '1', t('Периодичность сохраняется')),
      ],
      hints: [
        t('Счётчик cnt уже написан. Остаётся выбрать, какой его бит отдать на выход.'),
        t('Нужен тот бит, который меняется реже всего: старший.'),
        'assign div = cnt[1];',
      ],
    },
  },
  {
    id: 'pulse-every-n',
    chapter: 'counters',
    title: t('Короткий импульс раз в 4 такта'),
    minutes: 8,
    theory: [
      {
        title: t('Импульс-«тик»'),
        md: t(
          'Делитель из прошлого урока даёт ровный меандр: половину времени 1, половину 0. А иногда нужен именно **короткий импульс**: единица ровно на один такт, а потом долгая пауза. Такой «тик» обычно разрешает что-то сделать: сдвинуть число, обновить индикатор.\n\nИмпульс раз в 4 такта выглядит так:',
        ),
        code: t(
          'такт:   0 1 2 3 4 5 6 7 8 9 10 11\ncnt:    0 1 2 3 0 1 2 3 0 1  2  3\npulse:  0 0 0 1 0 0 0 1 0 0  0  1',
        ),
      },
      {
        title: t('Сравнить счётчик с последним значением'),
        md: t(
          'Счётчик нам уже знаком: двухбитный, считает 0, 1, 2, 3 и сам возвращается в 0. А импульс — это просто **признак**, что счётчик сейчас равен 3. Признак делается одной строкой `assign`: результат сравнения `==` равен 1 или 0.',
        ),
        code: "assign pulse = (cnt == 2'd3);",
      },
    ],
    quiz: {
      question: t(
        'Импульс должен быть раз в 4 такта. Какое значение двухбитного счётчика ему соответствует?',
      ),
      options: [t('Любое, подойдёт 0'), t('Одно конкретное, например 3'), t('Все четыре сразу')],
      answer: 1,
      explain: t(
        'Двухбитный счётчик проходит каждое значение один раз за 4 такта. Если выбрать одно из них, признак будет единицей только в этом такте, а остальные три такта будет нулём.',
      ),
    },
    practice: {
      text: t(
        'Сделай «тик»: выход pulse равен 1 ровно в одном такте из четырёх, когда внутренний счётчик cnt равен 3. Счётчик уже написан, добавь признак.',
      ),
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
        row(0, '0', t('Сброс: импульса нет')),
        row(1, '0', t('Счётчик 1')),
        row(2, '0', t('Счётчик 2')),
        row(3, '1', t('Счётчик 3: импульс')),
        row(4, '0', t('Импульс длится один такт')),
        row(5, '0', t('Пауза между импульсами')),
        row(6, '0', t('Ещё такт без импульса')),
        row(7, '1', t('Второй импульс')),
        row(8, '0', t('После второго импульса')),
        row(11, '1', t('Третий импульс')),
        row(12, '0', t('И снова тишина')),
      ],
      hints: [
        t('Импульс нужен в тот момент, когда cnt равен последнему значению счёта, то есть 3.'),
        t("Сравнение пишется как cnt == 2'd3: оно само равно 1 или 0."),
        "assign pulse = (cnt == 2'd3);",
      ],
    },
  },
  {
    id: 'pwm-4bit',
    chapter: 'counters',
    title: t('ШИМ: яркость числом'),
    minutes: 12,
    theory: [
      {
        title: t('Мигать так быстро, что не видно'),
        md: t(
          'Светодиод умеет только «горит» и «не горит». Но если включать и выключать его очень быстро, глаз видит промежуточную яркость: чем дольше горит в каждом периоде, тем ярче. Этот приём называется **ШИМ** — широтно-импульсная модуляция. «Широта» здесь — длительность единицы в периоде.\n\nДоля времени с единицей называется скважностью, а число, которое её задаёт, мы назовём `duty` («рабочая часть»).',
        ),
        code: t(
          'период 16 тактов, duty = 4:\n\nсчётчик: 0 1 2 3 4 5 6 ... 15 0 1 2 3 4\npwm:     1 1 1 1 0 0 0 ...  0 1 1 1 1 0',
        ),
      },
      {
        title: t('Счётчик и сравнение'),
        md: t(
          'Схема очень проста. Свободный четырёхбитный счётчик бесконечно считает 0…15: это и есть период в 16 тактов. Выход равен 1, пока счётчик **меньше** `duty`.\n\nПри `duty = 0` единицы нет совсем, выход всегда 0. При `duty = 15` единица почти весь период, не хватает только одного такта, когда счётчик равен 15. Строго «меньше» (`<`) даёт именно такой результат.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        cnt <= 4'd0;\n    else\n        cnt <= cnt + 4'd1;\nend\nassign pwm = (cnt < duty);",
      },
    ],
    quiz: {
      question: t('Период 16 тактов, duty = 4. Сколько тактов из 16 выход pwm равен 1?'),
      options: ['4', '12', '16'],
      answer: 0,
      explain: t(
        'Выход равен 1, пока cnt меньше 4: это значения 0, 1, 2, 3, то есть четыре такта. Остальные 12 тактов выход 0.',
      ),
    },
    practice: {
      text: t(
        'Сделай ШИМ с периодом 16 тактов: выход pwm равен 1, пока свободный счётчик cnt меньше duty. Счётчик уже написан, добавь сравнение.',
      ),
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
        row(0, '1', t('Начало периода, duty = 3'), { duty: '3' }),
        row(2, '1', t('Счётчик 2 меньше 3'), { duty: '3' }),
        row(3, '0', t('Счётчик 3 не меньше 3'), { duty: '3' }),
        row(15, '0', t('Конец периода'), { duty: '3' }),
        row(16, '1', t('Новый период'), { duty: '3' }),
        row(19, '0', t('Второй период, после трёх тактов'), { duty: '3' }),
        row(20, '1', t('duty стал 8, счётчик 4'), { duty: '8' }),
        row(23, '1', t('Счётчик 7 меньше 8'), { duty: '8' }),
        row(24, '0', t('Счётчик 8 не меньше 8'), { duty: '8' }),
        row(32, '0', t('duty = 0: выход всегда 0'), { duty: '0' }),
        row(33, '1', t('duty = 15, счётчик 1'), { duty: '15' }),
        row(46, '1', t('Счётчик 14 меньше 15'), { duty: '15' }),
        row(47, '0', t('Счётчик 15 не меньше 15'), { duty: '15' }),
      ],
      hints: [
        t('Выход определяется только сравнением двух чисел: счётчика и duty.'),
        t('В Verilog «меньше» пишется знаком <. Скобки вокруг сравнения помогают читать.'),
        'assign pwm = (cnt < duty);',
      ],
    },
  },
  {
    id: 'ring-counter',
    chapter: 'counters',
    title: t('Кольцевой счётчик'),
    minutes: 9,
    theory: [
      {
        title: t('Бегущая единица'),
        md: t(
          'Кольцевой счётчик устроен иначе, чем те, что мы делали. В нём нет чисел: это четыре бита, из которых **только один равен 1**, и эта единица бежит по кругу: 0001, 0010, 0100, 1000, и снова 0001.\n\nТакой код называют «one-hot» («одна горячая»). Он удобен, когда нужно по очереди включать четыре светодиода или четыре шага чего-то.',
        ),
        code: t('такт:  0    1    2    3    4    5\nring:  0001 0010 0100 1000 0001 0010'),
      },
      {
        title: t('Сдвиг с замыканием'),
        md: t(
          'Чтобы сдвинуть биты влево, есть операция `<<`. Но обычный сдвиг выбрасывает старший бит и подставляет справа 0: после 1000 получилось бы 0000, и единица пропала бы навсегда.\n\nЗамкнуть кольцо можно, собрав новое значение из частей: три нижних бита идут наверх, а освободившийся младший бит берёт старший. Склеивание записывается фигурными скобками.',
        ),
        code: t(
          "if (reset)\n    ring <= 4'b0001;       // единица на старте\nelse if (en)\n    ring <= {ring[2:0], ring[3]};",
        ),
      },
    ],
    quiz: {
      question: t('Кольцо сейчас 1000. Каким оно станет после сдвига с замыканием?'),
      options: ['0000', '0001', '0100'],
      answer: 1,
      explain: t(
        'Единица из старшего бита уходит в младший: получается 0001. Обычный сдвиг << дал бы 0000, и единица потерялась бы.',
      ),
    },
    practice: {
      text: t(
        'Сделай кольцевой счётчик на 4 бита: по сбросу в нём 0001, при en = 1 единица сдвигается влево и после 1000 возвращается в 0001, при en = 0 кольцо стоит на месте.',
      ),
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
        row(0, '0001', t('Сброс: единица в младшем бите'), { en: '1' }),
        row(1, '0001', t('Сброс держится'), { en: '1' }),
        row(2, '0010', t('Первый сдвиг'), { en: '1' }),
        row(3, '0010', t('Пауза'), { en: '0' }),
        row(4, '0010', t('Пауза продолжается'), { en: '0' }),
        row(5, '0100', t('Сдвиг после паузы'), { en: '1' }),
        row(6, '1000', t('Единица в старшем бите'), { en: '1' }),
        row(7, '0001', t('Замыкание кольца'), { en: '1' }),
        row(8, '0010', t('Второй круг'), { en: '1' }),
        row(11, '0001', t('Ещё одно замыкание'), { en: '1' }),
      ],
      hints: [
        t('Обычный сдвиг << теряет старший бит. Нужно вернуть его в младший.'),
        t(
          'Новое значение склеивается из двух частей: {ring[2:0], ring[3]}: три нижних бита идут вверх, а старший бит приходит вниз.',
        ),
        'ring <= {ring[2:0], ring[3]};',
      ],
    },
  },
];
