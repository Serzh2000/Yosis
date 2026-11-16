import { table } from './helpers';
import type { VerilogLessonSpec } from './types';
import { t } from '../../../lib/i18n';

export const specs: VerilogLessonSpec[] = [
  {
    id: 'led-n-polarity',
    chapter: 'board',
    title: t('Светодиод горит нулём'),
    minutes: 6,
    theory: [
      {
        title: t('Почему «включить» значит 0'),
        md: t(
          'На плате светодиод одним выводом подключён к питанию, а другим к ножке ПЛИС. Ток течёт, когда ножка подтягивает свой вывод к нулю. Поэтому светодиод **горит при 0** и гаснет при 1. Уровень, который включает устройство, называют **активным**; здесь активный уровень низкий.\n\nКнопки устроены наоборот: в покое они дают 0, а при нажатии 1.',
        ),
        code: t('led_n = 0  ->  светодиод горит\nled_n = 1  ->  светодиод погашен'),
      },
      {
        title: t('Суффикс _n и инверсия'),
        md: t(
          'Выходы с низким активным уровнем принято называть с суффиксом `_n` (от слова negative): `led_n`. Так по имени видно, что 0 означает «включено».\n\nЧтобы не думать наоборот, внутри схемы удобно держать обычный сигнал `state`: 1 значит «светодиод должен гореть». А на выход его отдаёт инверсия: `led_n = ~state`.',
        ),
        code: t(
          'wire state = a & b;      // 1: пора гореть\nassign led_n = ~state;   // на ножку уходит 0',
        ),
      },
    ],
    quiz: {
      question: t(
        'Внутренний сигнал state = 1 означает «светодиод должен гореть». Какое значение получит led_n = ~state?',
      ),
      options: [t('1, светодиод погаснет'), t('0, светодиод загорится'), t('Зависит от кнопки')],
      answer: 1,
      explain: t('Инверсия превращает 1 в 0, а на плате именно 0 на ножке зажигает светодиод.'),
    },
    practice: {
      text: t(
        'Светодиод должен гореть, когда нажаты обе кнопки a и b. Внутри посчитай state = a & b, а на выход led_n отдай его инверсию.',
      ),
      starter:
        "// Урок: светодиод горит нулём\nmodule top (\n    input wire a,\n    input wire b,\n    output wire led_n\n);\n    wire state = a & b; // 1: светодиод должен гореть\n    assign led_n = 1'b1; // TODO: выход с низким активным уровнем\nendmodule\n",
      solution:
        '// Урок: светодиод горит нулём\nmodule top (\n    input wire a,\n    input wire b,\n    output wire led_n\n);\n    wire state = a & b; // 1: светодиод должен гореть\n    assign led_n = ~state;\nendmodule\n',
      output: 'led_n',
      cases: table(['a', 'b'], ['1', '1', '1', '0']),
      hints: [
        t(
          'Светодиод платы горит при 0, значит на led_n нужно выдать противоположное значение state.',
        ),
        t('Переворот значения в Verilog делает знак ~.'),
        t('Правильная строка: assign led_n = ~state;'),
      ],
    },
  },
  {
    id: 'two-buttons-two-leds',
    chapter: 'board',
    title: t('Две кнопки, два светодиода'),
    minutes: 7,
    theory: [
      {
        title: t('Выход из нескольких проводов'),
        md: t(
          'Когда светодиодов несколько, их удобно объединить в один выход-шину: `output wire [1:0] led_n`. Он состоит из двух проводов: `led_n[0]` и `led_n[1]`. Номер в квадратных скобках называют **индексом**, нумерация идёт с нуля.\n\nКаждый провод шины можно присвоить отдельно, как обычный сигнал.',
        ),
        code: t(
          'assign led_n[0] = ~a;   // первый светодиод\nassign led_n[1] = ~b;   // второй светодиод',
        ),
      },
      {
        title: t('Кнопка к своему светодиоду'),
        md: t(
          'Кнопка a зажигает светодиод 0, кнопка b зажигает светодиод 1, и они не мешают друг другу. Не забудь про активный низкий уровень: нажатая кнопка даёт 1, а светодиод включается нулём, поэтому между ними стоит инверсия.',
        ),
        code: 'a b | led_n[1] led_n[0]\n0 0 |    1         1\n0 1 |    0         1\n1 0 |    1         0\n1 1 |    0         0',
      },
    ],
    quiz: {
      question: t('Нажата только кнопка b. Что будет на led_n[1] и led_n[0]?'),
      options: ['led_n[1] = 0, led_n[0] = 1', 'led_n[1] = 1, led_n[0] = 0', t('Оба равны 0')],
      answer: 0,
      explain: t(
        'Кнопка b управляет светодиодом 1: он получает 0 и горит. Светодиод 0 не тронут, на его проводе остаётся 1.',
      ),
    },
    practice: {
      text: t(
        'Кнопка a зажигает светодиод led_n[0], кнопка b зажигает светодиод led_n[1]. Помни, что светодиод горит при 0.',
      ),
      starter:
        "// Урок: две кнопки, два светодиода\nmodule top (\n    input wire a,\n    input wire b,\n    output wire [1:0] led_n\n);\n    assign led_n = 2'b11; // TODO: каждая кнопка зажигает свой светодиод\nendmodule\n",
      solution:
        '// Урок: две кнопки, два светодиода\nmodule top (\n    input wire a,\n    input wire b,\n    output wire [1:0] led_n\n);\n    assign led_n[0] = ~a;\n    assign led_n[1] = ~b;\nendmodule\n',
      output: 'led_n',
      cases: table(['a', 'b'], ['11', '01', '10', '00']),
      hints: [
        t('Присвой отдельно каждый провод шины: led_n[0] и led_n[1].'),
        t(
          'Нажатая кнопка даёт 1, а светодиод включается нулём, так что перед кнопкой нужна инверсия ~.',
        ),
        'assign led_n[0] = ~a; assign led_n[1] = ~b;',
      ],
    },
  },
  {
    id: 'buttons-to-leds-bus',
    chapter: 'board',
    title: t('Сколько кнопок нажато'),
    minutes: 8,
    theory: [
      {
        title: t('Сумма как число'),
        md: t(
          'Знак `+` складывает не только числа, но и значения проводов. Если сложить две кнопки a и b, получится число нажатых кнопок: 0, 1 или 2. Для результата нужен провод пошире, потому что 1 + 1 = 2 в одном бите не помещается.\n\nОбъяви шину нужной ширины и присвой сумму ей: Verilog сам расширит a и b до этой ширины.',
        ),
        code: t('wire [5:0] count = a + b;   // 0, 1 или 2'),
      },
      {
        title: t('Показываем число светодиодами'),
        md: t(
          'Шесть светодиодов `led_n[5:0]` можно считать двоичным числом: горящий светодиод это единица. Число 2 это `000010`, и в нём должен гореть светодиод 1.\n\nПлата зажигает светодиод нулём, поэтому на выход идёт инверсия числа: `~count`. Для числа 2 получится `111101`.',
        ),
        code: t('count = 000010   (две кнопки)\nled_n = 111101   (горит светодиод 1)'),
      },
    ],
    quiz: {
      question: t('Нажата одна кнопка, число count = 000001. Что окажется на led_n[5:0]?'),
      options: ['000001', '111110', '111111'],
      answer: 1,
      explain: t(
        'Инверсия переворачивает каждый бит: 000001 превращается в 111110, и горит только светодиод 0.',
      ),
    },
    practice: {
      text: t(
        'Посчитай, сколько из кнопок a и b нажато, как шестибитное число и покажи его на led_n[5:0] (светодиод горит при 0).',
      ),
      starter:
        "// Урок: сколько кнопок нажато\nmodule top (\n    input wire a,\n    input wire b,\n    output wire [5:0] led_n\n);\n    wire [5:0] count = 6'd0; // TODO: сумма a и b\n    assign led_n = ~count;\nendmodule\n",
      solution:
        '// Урок: сколько кнопок нажато\nmodule top (\n    input wire a,\n    input wire b,\n    output wire [5:0] led_n\n);\n    wire [5:0] count = a + b;\n    assign led_n = ~count;\nendmodule\n',
      output: 'led_n',
      cases: table(['a', 'b'], ['111111', '111110', '111110', '111101']),
      hints: [
        t('Число нажатых кнопок это просто сумма двух проводов.'),
        t('Присвой сумму шине count шириной 6 бит: тогда результат не обрежется.'),
        'wire [5:0] count = a + b;',
      ],
    },
  },
  {
    id: 'led-chaser',
    chapter: 'board',
    title: t('Бегущий огонёк'),
    minutes: 10,
    theory: [
      {
        title: t('Один горящий светодиод'),
        md: t(
          'Бегущий огонёк это один зажжённый светодиод из четырёх, который каждый такт переходит на соседний. Положение огонька удобно хранить в регистре `pos` из четырёх бит, где единица стоит там, где должен гореть светодиод: `0001`, `0010`, `0100`, `1000`.\n\nНа выход идёт `~pos`, ведь светодиод включается нулём.',
        ),
        code: 'pos     led_n\n0001    1110\n0010    1101\n0100    1011\n1000    0111',
      },
      {
        title: t('Сдвиг по кругу'),
        md: t(
          'Чтобы огонёк перешёл на следующий светодиод, сдвинем единицу влево: отбросим старший бит, остальные подвинем, а старший бит поставим на место младшего. Так огонёк после последнего светодиода возвращается к первому.\n\nСброс `reset` возвращает огонёк в начало: `pos = 0001`.',
        ),
        code: "always @(posedge clk) begin\n    if (reset)\n        pos <= 4'b0001;\n    else\n        pos <= {pos[2:0], pos[3]};\nend",
      },
    ],
    quiz: {
      question: t(
        'Сейчас pos = 1000. Каким станет pos после очередного такта при сдвиге по кругу?',
      ),
      options: ['0000', '0001', '1000'],
      answer: 1,
      explain: t(
        'Старший бит не пропадает, а переходит на место младшего: {pos[2:0], pos[3]} даёт 0001.',
      ),
    },
    practice: {
      text: t(
        'Сделай бегущий огонёк: после сброса горит светодиод 0 (led_n = 1110), а каждый такт огонёк переходит на следующий светодиод и после третьего возвращается к нулевому.',
      ),
      starter:
        "// Урок: бегущий огонёк\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire [3:0] led_n\n);\n    reg [3:0] pos;\n\n    always @(posedge clk) begin\n        if (reset)\n            pos <= 4'b0001;\n        else\n            pos <= pos; // TODO: сдвинуть огонёк по кругу\n    end\n\n    assign led_n = ~pos;\nendmodule\n",
      solution:
        "// Урок: бегущий огонёк\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire [3:0] led_n\n);\n    reg [3:0] pos;\n\n    always @(posedge clk) begin\n        if (reset)\n            pos <= 4'b0001;\n        else\n            pos <= {pos[2:0], pos[3]};\n    end\n\n    assign led_n = ~pos;\nendmodule\n",
      output: 'led_n',
      config: { clock: 'clk', reset: 'reset', resetCycles: 2, periodNs: 10, cycles: 9 },
      cases: [
        { title: t('Сброс'), cycle: 1, inputs: {}, expected: '1110' },
        { title: t('Первый шаг'), cycle: 2, inputs: {}, expected: '1101' },
        { title: t('Второй шаг'), cycle: 3, inputs: {}, expected: '1011' },
        { title: t('Третий шаг'), cycle: 4, inputs: {}, expected: '0111' },
        { title: t('Возврат к началу'), cycle: 5, inputs: {}, expected: '1110' },
        { title: t('Новый круг'), cycle: 6, inputs: {}, expected: '1101' },
      ],
      hints: [
        t('Сейчас регистр pos сам себя перезаписывает и не меняется. Его нужно сдвигать.'),
        t('Сдвиг по кругу: отбрось старший бит и поставь его в конец через фигурные скобки.'),
        'pos <= {pos[2:0], pos[3]};',
      ],
    },
  },
  {
    id: 'led-blink-divider',
    chapter: 'board',
    title: t('Мигание: делим частоту на 8'),
    minutes: 10,
    theory: [
      {
        title: t('Бит счётчика как медленный такт'),
        md: t(
          'Глазом нельзя заметить смену сигнала на частоте мегагерц, поэтому светодиод мигает не от самого такта, а от медленного сигнала. Его берут из двоичного счётчика: младший бит `count[0]` меняется каждый такт, `count[1]` вдвое реже, `count[2]` ещё вдвое реже.\n\nВ итоге бит `count[2]` держит 0 четыре такта, потом 1 четыре такта: полный период 8 тактов. Это деление частоты на 8.',
        ),
        code: t('такт     0 1 2 3 4 5 6 7 8 ...\ncount[2] 0 0 0 0 1 1 1 1 0 ...'),
      },
      {
        title: t('Счётчик и инверсия'),
        md: t(
          'Счётчик из трёх бит считает по кругу 0, 1, …, 7 и снова с 0. Сброс обнуляет его, иначе прибавляем 1.\n\nСветодиод горит при 0, поэтому на выход идёт инверсия: `led_n = ~count[2]`. Тогда он горит, пока бит равен 1, и мигает с периодом 8 тактов.',
        ),
        code: "always @(posedge clk) begin\n    if (reset) count <= 3'd0;\n    else count <= count + 3'd1;\nend\nassign led_n = ~count[2];",
      },
    ],
    quiz: {
      question: t('Какой бит трёхбитного счётчика меняется реже всего?'),
      options: ['count[0]', 'count[1]', 'count[2]'],
      answer: 2,
      explain: t(
        'Старший бит меняется после каждых четырёх тактов, средний после двух, младший каждый такт. Чем старше бит, тем медленнее он мигает.',
      ),
    },
    practice: {
      text: t(
        'Допиши счётчик count: сброс обнуляет, иначе прибавляется 1. Выход led_n должен быть инверсией старшего бита счётчика, так светодиод мигает с периодом 8 тактов.',
      ),
      starter:
        "// Урок: мигание через делитель на 8\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire led_n\n);\n    reg [2:0] count;\n\n    always @(posedge clk) begin\n        if (reset)\n            count <= 3'd0;\n        else\n            count <= count; // TODO: считать\n    end\n\n    assign led_n = 1'b1; // TODO: инверсия старшего бита\nendmodule\n",
      solution:
        "// Урок: мигание через делитель на 8\nmodule top (\n    input wire clk,\n    input wire reset,\n    output wire led_n\n);\n    reg [2:0] count;\n\n    always @(posedge clk) begin\n        if (reset)\n            count <= 3'd0;\n        else\n            count <= count + 3'd1;\n    end\n\n    assign led_n = ~count[2];\nendmodule\n",
      output: 'led_n',
      config: { clock: 'clk', reset: 'reset', resetCycles: 1, periodNs: 10, cycles: 14 },
      cases: [
        { title: t('После сброса'), cycle: 0, inputs: {}, expected: '1' },
        { title: t('Третий такт'), cycle: 3, inputs: {}, expected: '1' },
        { title: t('Светодиод загорелся'), cycle: 4, inputs: {}, expected: '0' },
        { title: t('Седьмой такт'), cycle: 7, inputs: {}, expected: '0' },
        { title: t('Светодиод погас'), cycle: 8, inputs: {}, expected: '1' },
        { title: t('Одиннадцатый такт'), cycle: 11, inputs: {}, expected: '1' },
        { title: t('Снова горит'), cycle: 12, inputs: {}, expected: '0' },
      ],
      hints: [
        t('Сначала заставь счётчик считать: вместо count <= count нужно прибавить единицу.'),
        t('Из трёх бит счётчика самый медленный старший, count[2].'),
        t("count <= count + 3'd1; и assign led_n = ~count[2];"),
      ],
    },
  },
  {
    id: 'reaction-timer',
    chapter: 'projects',
    title: t('Секундомер по кнопке'),
    minutes: 14,
    theory: [
      {
        title: t('Что строим'),
        md: t(
          'Сделаем секундомер: первое нажатие кнопки запускает счёт тактов, второе останавливает, и число на выходе остаётся. Так измеряют время реакции: засёк, остановил, прочитал.\n\nНам понадобятся счётчик `count`, флаг `running` («счёт идёт») и способ заметить именно момент нажатия, а не то, что кнопка удерживается.',
        ),
      },
      {
        title: t('Момент нажатия'),
        md: t(
          'Кнопку держат несколько тактов подряд, а переключить `running` надо один раз. Поэтому запоминаем прошлое значение кнопки в регистре `prev`. **Нажатие** это когда сейчас кнопка 1, а на прошлом такте была 0: `button & ~prev`.\n\nВ момент нажатия переключаем `running`, а пока `running` равен 1, счётчик растёт.',
        ),
        code: 'wire press = button & ~prev;\n\nalways @(posedge clk) begin\n    prev <= button;\n    if (press) running <= ~running;\n    if (running) count <= count + 1;\nend',
      },
      {
        title: t('Сброс и порядок'),
        md: t(
          'Сброс обнуляет всё: счётчик, флаг и `prev`. Обрати внимание на порядок: в такт нажатия флаг `running` меняется только после фронта, поэтому в такт самого нажатия счётчик ещё видит старое значение флага. Так при остановке последний такт считается, а при запуске нет.',
        ),
      },
    ],
    quiz: {
      question: t(
        'Зачем нужен регистр prev, если можно просто переключать running при button = 1?',
      ),
      options: [
        t('Чтобы кнопка работала быстрее'),
        t('Чтобы одно долгое нажатие переключило running один раз, а не на каждом такте'),
        t('Чтобы счётчик не переполнялся'),
      ],
      answer: 1,
      explain: t(
        'Нажатие длится много тактов. Без prev флаг переключался бы на каждом из них. Сравнение с прошлым значением выделяет один момент: кнопка стала 1.',
      ),
    },
    practice: {
      text: t(
        'Допиши секундомер: нажатие кнопки (переход 0 -> 1) переключает running; пока running = 1, count растёт на 1 каждый такт; сброс всё обнуляет.',
      ),
      starter:
        "// Урок: секундомер по кнопке\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire button,\n    output reg [3:0] count\n);\n    reg running;\n    reg prev;\n    wire press = button & ~prev;\n\n    always @(posedge clk) begin\n        if (reset) begin\n            count <= 4'd0;\n            running <= 1'b0;\n            prev <= 1'b0;\n        end else begin\n            prev <= button;\n            // TODO: переключать running по нажатию и считать, пока running = 1\n        end\n    end\nendmodule\n",
      solution:
        "// Урок: секундомер по кнопке\nmodule top (\n    input wire clk,\n    input wire reset,\n    input wire button,\n    output reg [3:0] count\n);\n    reg running;\n    reg prev;\n    wire press = button & ~prev;\n\n    always @(posedge clk) begin\n        if (reset) begin\n            count <= 4'd0;\n            running <= 1'b0;\n            prev <= 1'b0;\n        end else begin\n            prev <= button;\n            if (press)\n                running <= ~running;\n            if (running)\n                count <= count + 4'd1;\n        end\n    end\nendmodule\n",
      output: 'count',
      config: {
        clock: 'clk',
        reset: 'reset',
        resetCycles: 2,
        periodNs: 10,
        cycles: 13,
        inputs: { button: '0' },
        stimuli: [
          { cycle: 2, inputs: { button: '1' } },
          { cycle: 4, inputs: { button: '0' } },
          { cycle: 7, inputs: { button: '1' } },
          { cycle: 9, inputs: { button: '0' } },
        ],
      },
      cases: [
        { title: t('До нажатия'), cycle: 1, inputs: { button: '0' }, expected: '0000' },
        {
          title: t('Нажали: счёт только начинается'),
          cycle: 2,
          inputs: { button: '1' },
          expected: '0000',
        },
        {
          title: t('Кнопка удержана, считаем один раз'),
          cycle: 3,
          inputs: { button: '1' },
          expected: '0001',
        },
        { title: t('Счёт идёт'), cycle: 4, inputs: { button: '0' }, expected: '0010' },
        { title: t('Счёт идёт дальше'), cycle: 6, inputs: { button: '0' }, expected: '0100' },
        {
          title: t('Второе нажатие остановило'),
          cycle: 8,
          inputs: { button: '1' },
          expected: '0101',
        },
        { title: t('Число застыло'), cycle: 11, inputs: { button: '0' }, expected: '0101' },
      ],
      hints: [
        t('Нужны две вещи внутри else: переключение running и прибавление к count.'),
        t(
          'Переключать running нужно только когда press равен 1, а прибавлять, когда running равен 1.',
        ),
        "if (press) running <= ~running; if (running) count <= count + 4'd1;",
      ],
    },
  },
  {
    id: 'alarm-latch',
    chapter: 'projects',
    title: t('Сигнализация с памятью'),
    minutes: 10,
    theory: [
      {
        title: t('Сигнал, который помнит'),
        md: t(
          'Датчик движения даёт 1 на мгновение, а тревога должна гореть, пока её не выключат. Значит, схеме нужна память: регистр `alarm`. Датчик **ставит** его в 1, и дальше он остаётся единицей, даже если датчик уже успокоился. Такую схему называют **защёлкой**: она «защёлкивает» событие.\n\nСнимает тревогу отдельный вход `clear`.',
        ),
      },
      {
        title: t('Что важнее'),
        md: t(
          'Если датчик и сброс пришли одновременно, надо выбрать, кто главнее. Для сигнализации главнее сброс: охранник нажал кнопку, и тревога снята. В коде это значит, что условие `clear` проверяется первым.\n\nВыход `led_n` инвертирован, как положено для платы: тревога горит светодиодом.',
        ),
        code: "always @(posedge clk) begin\n    if (clear)       alarm <= 1'b0;\n    else if (sensor) alarm <= 1'b1;\nend\nassign led_n = ~alarm;",
      },
    ],
    quiz: {
      question: t('Датчик сработал один такт и снова стал 0. Что будет с alarm, если clear = 0?'),
      options: [
        t('alarm сразу станет 0'),
        t('alarm останется 1, пока не придёт clear'),
        t('alarm начнёт мигать'),
      ],
      answer: 1,
      explain: t(
        'Регистр хранит значение до следующего присваивания. Присваивать ноль в нём может только clear, поэтому тревога сохраняется.',
      ),
    },
    practice: {
      text: t(
        'Сделай защёлку: датчик sensor = 1 ставит alarm в 1 и он остаётся, пока не придёт clear = 1; clear главнее датчика. На выходе led_n = ~alarm.',
      ),
      starter:
        "// Урок: сигнализация с памятью\nmodule top (\n    input wire clk,\n    input wire clear,\n    input wire sensor,\n    output wire led_n\n);\n    reg alarm;\n\n    always @(posedge clk) begin\n        if (clear)\n            alarm <= 1'b0;\n        else\n            alarm <= sensor; // TODO: тревога должна запоминаться\n    end\n\n    assign led_n = ~alarm;\nendmodule\n",
      solution:
        "// Урок: сигнализация с памятью\nmodule top (\n    input wire clk,\n    input wire clear,\n    input wire sensor,\n    output wire led_n\n);\n    reg alarm;\n\n    always @(posedge clk) begin\n        if (clear)\n            alarm <= 1'b0;\n        else if (sensor)\n            alarm <= 1'b1;\n    end\n\n    assign led_n = ~alarm;\nendmodule\n",
      output: 'led_n',
      config: {
        clock: 'clk',
        periodNs: 10,
        cycles: 12,
        inputs: { sensor: '0', clear: '1' },
        stimuli: [
          { cycle: 1, inputs: { sensor: '0', clear: '0' } },
          { cycle: 3, inputs: { sensor: '1', clear: '0' } },
          { cycle: 4, inputs: { sensor: '0', clear: '0' } },
          { cycle: 6, inputs: { sensor: '1', clear: '1' } },
          { cycle: 7, inputs: { sensor: '0', clear: '0' } },
          { cycle: 9, inputs: { sensor: '1', clear: '0' } },
          { cycle: 10, inputs: { sensor: '0', clear: '0' } },
        ],
      },
      cases: [
        { title: t('Тишина'), cycle: 2, inputs: { sensor: '0', clear: '0' }, expected: '1' },
        {
          title: t('Датчик сработал'),
          cycle: 3,
          inputs: { sensor: '1', clear: '0' },
          expected: '0',
        },
        {
          title: t('Датчик затих, тревога помнится'),
          cycle: 5,
          inputs: { sensor: '0', clear: '0' },
          expected: '0',
        },
        {
          title: t('Сброс главнее датчика'),
          cycle: 6,
          inputs: { sensor: '1', clear: '1' },
          expected: '1',
        },
        { title: t('Тревоги нет'), cycle: 8, inputs: { sensor: '0', clear: '0' }, expected: '1' },
        { title: t('Новая тревога'), cycle: 9, inputs: { sensor: '1', clear: '0' }, expected: '0' },
        {
          title: t('Снова помнится'),
          cycle: 11,
          inputs: { sensor: '0', clear: '0' },
          expected: '0',
        },
      ],
      hints: [
        t('Сейчас alarm просто повторяет датчик и забывает тревогу на следующем такте.'),
        t('Присваивай alarm только когда sensor равен 1, иначе оставляй значение прежним.'),
        "else if (sensor) alarm <= 1'b1;",
      ],
    },
  },
  {
    id: 'simple-alu',
    chapter: 'projects',
    title: t('Мини-АЛУ на четыре бита'),
    minutes: 12,
    theory: [
      {
        title: t('Устройство с выбором действия'),
        md: t(
          '**АЛУ** (арифметико-логическое устройство) это часть процессора, которая умеет несколько действий над числами и выполняет то, которое выбрал код операции. Наше мини-АЛУ получает два четырёхбитных числа `a` и `b`, двухбитный код `op` и выдаёт результат `y`.',
        ),
        code: t(
          'op | действие\n00 | a + b\n01 | a - b\n10 | a & b   (И по каждому биту)\n11 | a | b   (ИЛИ по каждому биту)',
        ),
      },
      {
        title: t('case выбирает действие'),
        md: t(
          'Выбор по коду записывают оператором `case`. Результат присваивают внутри блока `always @*`, поэтому `y` объявляют как `reg`: это не память, а просто тип для присваивания в блоке. Чтобы не получилась защёлка, ветка `default` обязательна.\n\nУчти, что числа четырёхбитные: `3 - 5` не уходит в минус, а оборачивается по кругу в `1110`.',
        ),
        code: "always @* begin\n    case (op)\n        2'b00: y = a + b;\n        2'b01: y = a - b;\n        2'b10: y = a & b;\n        default: y = a | b;\n    endcase\nend",
      },
    ],
    quiz: {
      question: t(
        'a = 0011 (3), b = 0101 (5), op = 01 (вычитание). Какой будет результат из четырёх бит?',
      ),
      options: ['0010', '1110', '1000'],
      answer: 1,
      explain: t(
        '3 - 5 = -2, а в четырёх битах это 16 - 2 = 14, то есть 1110. Старшие разряды просто отбрасываются.',
      ),
    },
    practice: {
      text: t(
        'Допиши АЛУ: при op = 00 результат a + b, при 01 a - b, при 10 побитовое И, при 11 побитовое ИЛИ.',
      ),
      starter:
        '// Урок: мини-АЛУ\nmodule top (\n    input wire [3:0] a,\n    input wire [3:0] b,\n    input wire [1:0] op,\n    output reg [3:0] y\n);\n    always @* begin\n        y = a + b; // TODO: выбрать действие по op\n    end\nendmodule\n',
      solution:
        "// Урок: мини-АЛУ\nmodule top (\n    input wire [3:0] a,\n    input wire [3:0] b,\n    input wire [1:0] op,\n    output reg [3:0] y\n);\n    always @* begin\n        case (op)\n            2'b00: y = a + b;\n            2'b01: y = a - b;\n            2'b10: y = a & b;\n            default: y = a | b;\n        endcase\n    end\nendmodule\n",
      output: 'y',
      cases: [
        {
          title: t('Сложение'),
          cycle: 0,
          inputs: { a: '3', b: '5', op: '0' },
          expected: '1000',
        },
        {
          title: t('Сложение с переполнением'),
          cycle: 1,
          inputs: { a: '15', b: '1', op: '0' },
          expected: '0000',
        },
        {
          title: t('Вычитание'),
          cycle: 2,
          inputs: { a: '5', b: '3', op: '1' },
          expected: '0010',
        },
        {
          title: t('Вычитание ниже нуля'),
          cycle: 3,
          inputs: { a: '3', b: '5', op: '1' },
          expected: '1110',
        },
        { title: t('И'), cycle: 4, inputs: { a: '3', b: '5', op: '2' }, expected: '0001' },
        { title: t('ИЛИ'), cycle: 5, inputs: { a: '3', b: '5', op: '3' }, expected: '0111' },
      ],
      hints: [
        t('Нужен оператор case по op с четырьмя вариантами.'),
        t('Для вычитания используй -, для И знак &, для ИЛИ знак |.'),
        "case (op) 2'b00: y = a + b; 2'b01: y = a - b; 2'b10: y = a & b; default: y = a | b; endcase",
      ],
    },
  },
  {
    id: 'majority-alarm',
    chapter: 'projects',
    title: t('Охрана: два датчика из трёх'),
    minutes: 9,
    theory: [
      {
        title: t('Защита от ложных тревог'),
        md: t(
          'Один датчик может сработать случайно: муха, сквозняк. Чтобы тревога была надёжнее, ставят три датчика и поднимают её, только когда **сработали хотя бы два**. Такую функцию называют **мажоритарной** (решает большинство).\n\nКроме того, у сигнализации есть переключатель `armed`: если охрана выключена, тревоги нет вообще.',
        ),
      },
      {
        title: t('Записываем условие'),
        md: t(
          'Два датчика из трёх: сработали s1 и s2, или s1 и s3, или s2 и s3. Каждое «и» это `&`, а «или» между вариантами это `|`. Всё вместе связываем через `&` с `armed`.\n\nСкобки ставим явно, чтобы порядок действий был виден сразу.',
        ),
        code: 'wire two = (s1 & s2) | (s1 & s3) | (s2 & s3);\nassign alarm = armed & two;',
      },
    ],
    quiz: {
      question: t('Охрана включена, сработал только датчик s2. Будет ли тревога?'),
      options: [
        t('Да, любой датчик поднимает тревогу'),
        t('Нет, нужно хотя бы два срабатывания'),
        t('Зависит от датчика s1'),
      ],
      answer: 1,
      explain: t(
        'Условие требует двух из трёх датчиков. Одно срабатывание считается случайным и тревогу не поднимает.',
      ),
    },
    practice: {
      text: t(
        'Выход alarm равен 1, когда охрана включена (armed = 1) и сработали хотя бы два датчика из s1, s2, s3.',
      ),
      starter:
        "// Урок: два датчика из трёх\nmodule top (\n    input wire armed,\n    input wire s1,\n    input wire s2,\n    input wire s3,\n    output wire alarm\n);\n    assign alarm = 1'b0; // TODO: охрана включена и сработали два из трёх\nendmodule\n",
      solution:
        '// Урок: два датчика из трёх\nmodule top (\n    input wire armed,\n    input wire s1,\n    input wire s2,\n    input wire s3,\n    output wire alarm\n);\n    wire two = (s1 & s2) | (s1 & s3) | (s2 & s3);\n    assign alarm = armed & two;\nendmodule\n',
      output: 'alarm',
      cases: table(
        ['armed', 's1', 's2', 's3'],
        ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '0', '1', '1', '1'],
      ),
      hints: [
        t('Сначала запиши, когда сработали два датчика из трёх: три пары.'),
        t('Пары соединяются знаком |, а внутри пары стоит &.'),
        'assign alarm = armed & ((s1 & s2) | (s1 & s3) | (s2 & s3));',
      ],
    },
  },
];
