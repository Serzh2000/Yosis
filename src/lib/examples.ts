import type { Project } from '../../shared/types';
import { logicExamples } from './examples-logic';
import { systemExamples } from './examples-systems';
import { applicationExamples } from './examples-applications';

export interface Example {
  id: string;
  title: string;
  description: string;
  project: Project;
  category?: 'logic' | 'memory' | 'systems';
}

type Pin = [signal: string, pin: number, explanation: string];
const clock: Pin = ['clk', 4, 'Такт от генератора платы: 27 МГц.'];
const reset: Pin = ['reset', 88, 'Кнопка сброса S1: нажата = 1, отпущена = 0.'];
const leds = (signal: string, count = 6): Pin[] =>
  Array.from({ length: count }, (_, bit) => [
    `${signal}[${bit}]`,
    15 + bit,
    `LED${bit}: уровень 0 включает светодиод, 1 выключает.`,
  ]);

function constraints(pins: Pin[]): string {
  return (
    `// Физические соединения Tang Nano 20K (GW2AR-LV18QN88C8/I7).
// IO_LOC связывает порт Verilog с номером вывода FPGA, а не контактом разъёма.
// IO_PORT задаёт электрический стандарт: LVCMOS33 — логические уровни 3,3 В.
// Для каждого отдельного бита шины требуется своё назначение.
// Проверенный pinout: https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst
// Полярность LED и частота: https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html
// Кнопки 87/88 и LED 15–20 уже находятся на плате.
// Кнопка даёт 1 при нажатии и 0 в покое; LED светится при 0 на выводе.

` +
    pins
      .map(
        ([signal, pin, explanation]) => `// ${signal}: ${explanation}
IO_LOC "${signal}" ${pin};
IO_PORT "${signal}" IO_TYPE=LVCMOS33${pin === 87 || pin === 88 ? ' PULL_MODE=DOWN' : ''};
${
  signal === 'clk'
    ? `// Такт подключаем к глобальному буферу с малой разницей задержек.
CLOCK_LOC "clk" BUFG;
`
    : ''
}`,
      )
      .join('\n')
  );
}

function example(
  id: string,
  title: string,
  description: string,
  source: string,
  pins: Pin[],
  otherFiles: Project['files'] = [],
): Example {
  return {
    id,
    title,
    description,
    project: {
      name: `${id}-lab`,
      top: 'top',
      board: 'tangnano20k',
      files: [
        { name: 'top.v', content: source },
        ...otherFiles,
        { name: 'board.cst', content: constraints(pins) },
      ],
    },
  };
}

export const examples: Example[] = [
  example(
    'logic',
    'Логическое выражение',
    'AND + OR: от выражения к таблице LUT.',
    `// Комбинационная логика: y = (a И b) ИЛИ c.
// assign описывает постоянно действующую связь, а не программу по шагам.
// На диаграммах переберите a, b, c = 0/1 и посмотрите таблицу LUT в Gowin.
// a/b — уровни кнопок (нажата = 1). c — UART_RX на выводе 70,
// внешний сигнал от USB-UART; это НЕ третья кнопка. В симуляции задайте c сами.
// y выведен на LED0: y = 0 включает LED, y = 1 выключает его.
module top (
    input wire a,
    input wire b,
    input wire c,
    output wire y
);
    assign y = (a & b) | c;
endmodule
`,
    [
      ['a', 87, 'Уровень первой кнопки: 1 при нажатии.'],
      ['b', 88, 'Уровень второй кнопки: 1 при нажатии.'],
      ['c', 70, 'UART_RX от встроенного USB-UART; задаётся внешним устройством, не кнопкой.'],
      ['y', 15, 'LED0; 0 = светится, 1 = погашен.'],
    ],
  ),

  example(
    'button',
    'Кнопка → LED',
    'Самая простая связь входа с выходом.',
    `// Пока кнопка отпущена, LED0 светится; нажатие гасит его. Памяти и такта нет.
// Кнопка даёт 1 при нажатии, а LED светится при 0: прямое соединение переворачивает смысл.
// assign работает непрерывно: изменение button сразу меняет led.
// В виртуальной плате выберите полярность LED «Активный 0».
module top (
    input wire button,
    output wire led
);
    assign led = button;
endmodule
`,
    [
      ['button', 87, 'Кнопка S2: 1 при нажатии, 0 в покое.'],
      ['led', 15, 'LED0: 0 включает свет.'],
    ],
  ),

  example(
    'not',
    'Инвертор NOT',
    'Поменяйте 0 и 1 местами.',
    `// NOT инвертирует уровень кнопки: 0 превращается в 1 и наоборот.
// Таблица: button = 0 → led = 1; button = 1 → led = 0.
// Физический LED активен при 0: он светится, пока кнопка нажата (button = 1).
// Отпустите — свет погаснет. Сравните это с примером «Кнопка → LED».
// assign и оператор ~ описывают комбинационный инвертор без регистра.
module top (
    input wire button,
    output wire led
);
    assign led = ~button;
endmodule
`,
    [
      ['button', 87, 'Кнопка S2: нажата = 1.'],
      ['led', 15, 'LED0 показывает инвертированный уровень; 0 включает свет.'],
    ],
  ),

  example(
    'gates',
    'AND · OR · XOR',
    'Две кнопки и три логических элемента.',
    `// Кнопки платы дают 1 при нажатии: это уже готовые признаки нажатия.
// a = 1 означает «первая нажата», b = 1 — «вторая нажата».
// LED0 (AND) светится, если нажаты обе кнопки.
// LED1 (OR) светится, если нажата хотя бы одна.
// LED2 (XOR) светится, если нажата ровно одна.
// Последний ~ нужен потому, что физический LED светится при 0.
// Все assign — комбинационные связи: такт для них не требуется.
module top (
    input wire button_a,
    input wire button_b,
    output wire [2:0] led_n
);
    wire a = button_a;
    wire b = button_b;
    assign led_n[0] = ~(a & b);
    assign led_n[1] = ~(a | b);
    assign led_n[2] = ~(a ^ b);
endmodule
`,
    [
      ['button_a', 87, 'Первая кнопка: нажата = 1.'],
      ['button_b', 88, 'Вторая кнопка: нажата = 1.'],
      ...leds('led_n', 3),
    ],
  ),

  example(
    'mux',
    'Мультиплексор',
    'Вторая кнопка выбирает сигнал или его инверсию.',
    `// Мультиплексор выбирает один из двух входов по сигналу select.
// Первая кнопка даёт признак pressed (1 = нажата).
// Если вторая отпущена, LED повторяет pressed; если нажата — его инверсию.
// Выражение select ? B : A означает: select = 1 выбирает B, иначе A.
// Это комбинационная схема, поэтому assign не ждёт тактового фронта.
module top (
    input wire button_a,
    input wire button_select,
    output wire led_n
);
    wire pressed = button_a;
    wire select = button_select;
    wire selected = select ? ~pressed : pressed;
    assign led_n = ~selected; // 1 в selected → уровень 0 → LED светится.
endmodule
`,
    [
      ['button_a', 87, 'Первая кнопка — данные; 1 при нажатии.'],
      ['button_select', 88, 'Вторая кнопка — выбор; 1 выбирает инверсию.'],
      ['led_n', 15, 'LED0, активный при 0.'],
    ],
  ),

  example(
    'counter',
    'Счётчик',
    'Шесть регистров, сложение и пауза.',
    `// Счётчик 0…63 увеличивается на один шаг каждые STEP_TICKS тактов clk.
// 27 МГц / 6 750 000 даёт 4 шага в секунду: на плате счёт виден глазом.
// always @(posedge clk) описывает память, а <= обновляет регистры одновременно.
// reset = 1 сбрасывает на ближайшем фронте; pause = 1 удерживает значение.
// На плате кнопка 88 — сброс, кнопка 87 — пауза (считать, когда отпущена).
// Выход count — обычное двоичное число, LED активны при 0 и показывают его инверсию.
// Для виртуальных LED выберите «Активный 0». В диаграммах смотрите count как число.
// Для короткой симуляции (32–64 такта) временно поставьте STEP_TICKS = 1: шаг на каждом такте.
// Для платы верните 6_750_000. Замедленное воспроизведение не меняет STEP_TICKS.
module top #(
    parameter integer STEP_TICKS = 6_750_000
) (
    input wire clk,
    input wire reset,
    input wire pause,
    output reg [5:0] count = 6'd0
);
    reg [22:0] ticks = 23'd0;
    // Кнопка паузы даёт 1 при нажатии: счёт разрешён, пока она отпущена.
    wire enable = ~pause;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 23'd0;
            count <= 6'd0;
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 23'd0;
            if (enable) count <= count + 6'd1;
        end else begin
            ticks <= ticks + 23'd1;
        end
    end
endmodule
`,
    [
      clock,
      reset,
      ['pause', 87, 'Кнопка паузы S2: нажата = 1 — счёт остановлен.'],
      ...leds('count'),
    ],
  ),

  example(
    'blink',
    'Мигалка 27 МГц',
    'Делитель частоты: один полный цикл в секунду.',
    `// 27 000 000 фронтов clk за секунду. За 13 500 000 фронтов проходит 0,5 с.
// На каждом таком интервале меняем lit, поэтому полный цикл LED длится 1 с.
// Счётчик начинает с 0: последняя величина равна HALF_PERIOD - 1.
// reset = 1 синхронно сбрасывает счётчик и выключает LED.
// Регистры обновляются только в always; assign переводит lit в активный при 0 выход.
// Чтобы увидеть мигание за короткую симуляцию, временно замените HALF_PERIOD на 4.
// Замедление проигрывателя не сокращает 13,5 млн тактов; период симуляции задаётся отдельно.
// Для реальной платы верните 13_500_000: расчёт сделан для входного clk = 27 МГц.
module top #(
    parameter integer HALF_PERIOD = 13_500_000
) (
    input wire clk,
    input wire reset,
    output wire led_n
);
    reg [23:0] ticks = 24'd0;
    reg lit = 1'b0;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 24'd0;
            lit <= 1'b0;
        end else if (ticks == HALF_PERIOD - 1) begin
            ticks <= 24'd0;
            lit <= ~lit;
        end else begin
            ticks <= ticks + 24'd1;
        end
    end
    assign led_n = ~lit;
endmodule
`,
    [clock, reset, ['led_n', 15, 'LED0: переключается каждые 0,5 с при такте 27 МГц.']],
  ),

  example(
    'chaser',
    'Бегущий огонь',
    'Кольцевой сдвиг по шести светодиодам.',
    `// lights — шесть регистров: ровно один бит равен 1.
// Каждые 2 700 000 тактов (0,1 с при 27 МГц) сдвигаем этот бит по кольцу.
// {lights[4:0], lights[5]} переносит последний бит обратно в начало.
// reset = 1 зажигает первый LED; остальные выключены.
// LED активны при 0, поэтому наружу идёт ~lights.
// always хранит состояние; assign связывает регистры с физическими выходами.
// Для 32–64 тактов симуляции временно поставьте STEP_TICKS = 4.
// Замедленное воспроизведение показывает фронты медленно, но не изменяет делитель.
module top #(
    parameter integer STEP_TICKS = 2_700_000
) (
    input wire clk,
    input wire reset,
    output wire [5:0] led_n
);
    reg [21:0] ticks = 22'd0;
    reg [5:0] lights = 6'b000001;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 22'd0;
            lights <= 6'b000001;
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 22'd0;
            lights <= {lights[4:0], lights[5]};
        end else begin
            ticks <= ticks + 22'd1;
        end
    end
    assign led_n = ~lights;
endmodule
`,
    [clock, reset, ...leds('led_n')],
  ),

  example(
    'pwm',
    'Яркость через PWM',
    'Свет включён 25% или 75% периода.',
    `// PWM быстро включает и выключает LED, а глаз видит среднюю яркость.
// При PWM_BITS = 8 phase считает 0…255: полный период равен 256 тактам.
// Кнопка отпущена (bright_n = 1): свет включён 25% времени; нажата: 75%.
// На плате нажмите кнопку 87 для большей яркости; 88 — синхронный сброс.
// При 27 МГц частота PWM около 105,47 кГц. На диаграмме видны отдельные импульсы.
// Виртуальная плата показывает логический уровень, а не усреднённую яркость.
// Для короткой симуляции поставьте PWM_BITS = 3: период займёт 8 тактов.
// Или сохраните аппаратные 8 бит и установите хотя бы 300 тактов симуляции.
// PWM_BITS выбирайте от 2 до 16; замедление проигрывателя не изменяет этот период.
// always обновляет phase; assign и сравнение дают комбинационный выход.
module top #(
    parameter integer PWM_BITS = 8
) (
    input wire clk,
    input wire reset,
    input wire button_bright,
    output wire led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое; внутри схемы эти сигналы активны нулём.
    wire bright_n = ~button_bright;
    localparam integer PERIOD = 1 << PWM_BITS;
    reg [PWM_BITS-1:0] phase = 0;
    wire [PWM_BITS:0] duty = bright_n ? PERIOD / 4 : 3 * PERIOD / 4;
    always @(posedge clk) begin
        if (reset) phase <= 0;
        else          phase <= phase + 1'b1;
    end
    assign led_n = ~(phase < duty); // 0 зажигает физический LED.
endmodule
`,
    [
      clock,
      reset,
      ['button_bright', 87, 'Кнопка S2: нажата = 1 — заполнение 75%, отпущена — 25%.'],
      ['led_n', 15, 'LED0 получает PWM с активным уровнем 0.'],
    ],
  ),

  example(
    'traffic',
    'Автомат светофора',
    'Состояния: красный → зелёный → жёлтый.',
    `// Учебный автомат: RED длится 3 с, GREEN — 3 с, YELLOW — 1 с.
// LED0 обозначает красный, LED1 — зелёный, LED2 — жёлтый: это условные роли,
// сами три светодиода на плате не становятся разноцветными.
// SECOND_TICKS = 27 000 000 даёт одну секунду от входного clk = 27 МГц.
// Все регистры используют один clk; секундный счётчик лишь разрешает переход.
// reset = 1 возвращает RED. <= хранит состояние; always @* расшифровывает его.
// Для короткой симуляции временно установите SECOND_TICKS = 4 и 40 тактов.
// Скорость проигрывания диаграмм не заменяет этот делитель частоты.
module top #(
    parameter integer SECOND_TICKS = 27_000_000
) (
    input wire clk,
    input wire reset,
    output wire [2:0] led_n
);
    localparam [1:0] RED = 2'd0, GREEN = 2'd1, YELLOW = 2'd2;
    reg [24:0] ticks = 25'd0;
    reg [1:0] seconds = 2'd0;
    reg [1:0] state; // После загрузки FPGA регистр равен 0, то есть RED.
    reg [2:0] lights;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 25'd0;
            seconds <= 2'd0;
            state <= RED;
        end else if (ticks == SECOND_TICKS - 1) begin
            ticks <= 25'd0;
            if (state == YELLOW || seconds == 2'd2) begin
                seconds <= 2'd0;
                case (state)
                    RED:    state <= GREEN;
                    GREEN:  state <= YELLOW;
                    default: state <= RED;
                endcase
            end else begin
                seconds <= seconds + 2'd1;
            end
        end else begin
            ticks <= ticks + 25'd1;
        end
    end
    always @* begin
        case (state)
            RED:     lights = 3'b001;
            GREEN:   lights = 3'b010;
            YELLOW:  lights = 3'b100;
            default: lights = 3'b001;
        endcase
    end
    assign led_n = ~lights; // Светодиоды платы активны при 0.
endmodule
`,
    [clock, reset, ...leds('led_n', 3)],
  ),

  example(
    'alu',
    'Иерархическая ALU',
    'Три модуля: регистры → ALU → сумматор.',
    `// В дереве RTL откройте top → u_alu → u_adder: три уровня одной схемы.
// Операнд a — внутренний 6-битный счётчик; b постоянно равен 3.
// Старшие биты a выбирают операцию: 00 — сложение, 01 — AND, 10 — OR, 11 — XOR.
// Нажатая кнопка 87 (button = 1) разрешает следующий шаг, 88 сбрасывает (reset = 1).
// led_n сохраняет инвертированный результат ALU для ПРЕДЫДУЩЕГО a:
// <= обновляет регистры вместе. Инверсия нужна, потому что LED светятся при 0.
// Сложение по модулю 64: перенос за пределы 6 бит отбрасывается.
// При 27 МГц шаги слишком быстры для глаза. В симуляции держите button = 1
// и смотрите значения на каждом фронте; замедленное воспроизведение не меняет clk.
// Запустите 70 тактов симуляции, чтобы пройти все четыре операции и переполнение a.
module top (
    input wire clk,
    input wire reset,
    input wire button,
    output reg [5:0] led_n = 6'b111111
);
    reg [5:0] a = 6'd0;
    wire [5:0] alu_result;
    alu u_alu (
        .a(a), .b(6'd3), .operation(a[5:4]), .result(alu_result)
    );
    always @(posedge clk) begin
        if (reset) begin
            a <= 6'd0;
            led_n <= 6'b111111;
        end else if (button) begin
            a <= a + 6'd1;
            led_n <= ~alu_result;
        end
    end
endmodule
`,
    [
      clock,
      reset,
      ['button', 87, 'Кнопка S2: нажата = 1 — шаги ALU, отпущена — регистры удерживаются.'],
      ...leds('led_n'),
    ],
    [
      {
        name: 'alu.v',
        content: `// ALU — комбинационная схема: результат меняется вместе с входами.
// Сумматор выделен в отдельный модуль, чтобы видеть иерархию.
// always @* и = нужны для комбинационного выбора; все варианты задают result.
module alu (
    input wire [5:0] a,
    input wire [5:0] b,
    input wire [1:0] operation,
    output reg [5:0] result
);
    wire [5:0] sum;
    adder u_adder (.a(a), .b(b), .sum(sum));
    always @* begin
        case (operation)
            2'b00: result = sum;
            2'b01: result = a & b;
            2'b10: result = a | b;
            2'b11: result = a ^ b;
        endcase
    end
endmodule
`,
      },
      {
        name: 'adder.v',
        content: `// Шестибитный сумматор. assign — непрерывная комбинационная связь.
// Это аппаратная операция: синтез построит LUT/ALU и цепочку переноса.
// Выход имеет 6 бит, поэтому результат 63 + 1 станет 0.
module adder (
    input wire [5:0] a,
    input wire [5:0] b,
    output wire [5:0] sum
);
    assign sum = a + b;
endmodule
`,
      },
    ],
  ),
  example(
    'inverse-gates',
    'NAND · NOR · XNOR',
    'Инверсия трёх основных логических операций.',
    `// a и b — признаки нажатия кнопок, активные при 1.
// NAND = НЕ(a И b): LED0 погаснет только при двух нажатых кнопках.
// NOR = НЕ(a ИЛИ b): LED1 светится, когда обе отпущены.
// XNOR = НЕ(a XOR b): LED2 светится, когда кнопки в одинаковом состоянии.
// Внутренняя логика активна при 1; ещё одна инверсия даёт активный при 0 LED.
// На диаграммах переберите четыре сочетания button_a/button_b. Такт не нужен.
module top (
    input wire button_a,
    input wire button_b,
    output wire [2:0] led_n
);
    wire a = button_a;
    wire b = button_b;
    wire [2:0] result = {~(a ^ b), ~(a | b), ~(a & b)};
    assign led_n = ~result;
endmodule
`,
    [
      ['button_a', 87, 'Первая кнопка: нажата = 1.'],
      ['button_b', 88, 'Вторая кнопка: нажата = 1.'],
      ...leds('led_n', 3),
    ],
  ),

  example(
    'half-adder',
    'Полусумматор',
    'Сумма двух битов и перенос в следующий разряд.',
    `// Складываем признаки нажатия двух кнопок: 0+0, 0+1, 1+0, 1+1.
// sum = a XOR b — младший бит результата.
// carry = a AND b — перенос: он появляется только при 1+1.
// LED0 показывает sum, LED1 — carry: два нажатия дают двоичное 10.
// Это комбинационная схема. Операторы ^ и & работают одновременно.
// Сначала инвертируем кнопки; в конце инвертируем выход для физических LED.
module top (
    input wire button_a,
    input wire button_b,
    output wire [1:0] led_n
);
    wire a = button_a;
    wire b = button_b;
    wire sum = a ^ b;
    wire carry = a & b;
    assign led_n = ~{carry, sum};
endmodule
`,
    [
      ['button_a', 87, 'Первое слагаемое: нажатая кнопка означает 1.'],
      ['button_b', 88, 'Второе слагаемое: нажатая кнопка означает 1.'],
      ...leds('led_n', 2),
    ],
  ),

  example(
    'comparator',
    'Компаратор',
    'Меньше, равно или больше — сравнение двух битов.',
    `// Кнопки задают два однобитных числа: нажата = 1, отпущена = 0.
// LED0: a < b, LED1: a == b, LED2: a > b.
// При известных входах светится ровно один LED. При равенстве горит средний.
// <, == и > возвращают один бит; это параллельная комбинационная логика.
// В симуляции сравните все четыре комбинации. Триггеров здесь нет.
module top (
    input wire button_a,
    input wire button_b,
    output wire [2:0] led_n
);
    wire a = button_a;
    wire b = button_b;
    assign led_n[0] = ~(a < b);
    assign led_n[1] = ~(a == b);
    assign led_n[2] = ~(a > b);
endmodule
`,
    [
      ['button_a', 87, 'Число a: 0 на выводе означает нажатие и a = 1.'],
      ['button_b', 88, 'Число b: 0 на выводе означает нажатие и b = 1.'],
      ...leds('led_n', 3),
    ],
  ),

  example(
    'decoder',
    'Декодер 2 → 4',
    'Двоичный номер выбирает один из четырёх LED.',
    `// Две кнопки задают address: button0 — младший, button1 — старший бит.
// Отпущенные кнопки дают address = 00 и зажигают LED0.
// Нажмите первую: 01 → LED1; вторую: 10 → LED2; обе: 11 → LED3.
// 4'b0001 << address сдвигает единицу в выбранный разряд.
// Такой код называют one-hot: один активный бит среди четырёх.
// assign работает постоянно, а ~ учитывает активный при 0 физический LED.
module top (
    input wire button0,
    input wire button1,
    output wire [3:0] led_n
);
    wire [1:0] address = {button1, button0};
    wire [3:0] selected = 4'b0001 << address;
    assign led_n = ~selected;
endmodule
`,
    [
      ['button0', 87, 'Младший бит адреса: нажата = 1.'],
      ['button1', 88, 'Старший бит адреса: нажата = 1.'],
      ...leds('led_n', 4),
    ],
  ),

  example(
    'priority',
    'Приоритет кнопок',
    'Если запросов два, выбираем старший.',
    `// button1 имеет приоритет над button0.
// LED0 показывает номер выбранной кнопки: 0 для button0, 1 для button1.
// LED1 — valid: есть хотя бы один запрос. Без него номер 0 неоднозначен.
// Если обе кнопки нажаты, выбирается button1 и светятся оба LED.
// always @* описывает комбинационный выбор. Значения по умолчанию
// заданы перед if, поэтому при отсутствии запроса нет скрытой памяти.
module top (
    input wire button0,
    input wire button1,
    output wire [1:0] led_n
);
    reg selected;
    reg valid;
    always @* begin
        selected = 1'b0;
        valid = 1'b0;
        if (button1) begin
            selected = 1'b1;
            valid = 1'b1;
        end else if (button0) begin
            selected = 1'b0;
            valid = 1'b1;
        end
    end
    assign led_n = ~{valid, selected};
endmodule
`,
    [
      ['button0', 87, 'Запрос с меньшим приоритетом: нажата = 1.'],
      ['button1', 88, 'Запрос с большим приоритетом: нажата = 1.'],
      ...leds('led_n', 2),
    ],
  ),

  example(
    'parity',
    'Бит чётности',
    'Пять битов данных и XOR всех разрядов.',
    `// data считает от 0 до 31. LED0…4 показывают пять битов числа.
// LED5 показывает parity: 1, если в data нечётное число единиц.
// ^data — редукция XOR: объединяет все пять битов в один.
// Если дописать этот бит к data, общее число единиц станет чётным.
// reset = 1 сбрасывает на фронте clk; enable = 0 удерживает счётчик.
// LED активны при 0: наружу выводим инверсию {parity, data}.
// На плате 27 МГц слишком быстро для глаза; смотрите по тактам в симуляции.
module top (
    input wire clk,
    input wire reset,
    input wire pause,
    output wire [5:0] led_n
);
    // Кнопка паузы даёт 1 при нажатии: счёт разрешён, пока она отпущена.
    wire enable = ~pause;
    reg [4:0] data = 5'd0;
    wire parity = ^data;
    always @(posedge clk) begin
        if (reset) data <= 5'd0;
        else if (enable) data <= data + 5'd1;
    end
    assign led_n = ~{parity, data};
endmodule
`,
    [clock, reset, ['pause', 87, 'Отпущена = счёт, нажата = пауза.'], ...leds('led_n')],
  ),

  example(
    'shift',
    'Сдвиговый регистр',
    'Последовательный вход превращается в шесть битов.',
    `// На каждом фронте clk сдвигаем history к старшим битам и добавляем pressed.
// history[0] — последняя выборка; history[5] — выборка пять тактов назад.
// button — асинхронная кнопка (button_n — её инверсия). Два регистра meta/synced синхронизируют её
// с clk: новое значение доходит до history с задержкой в несколько тактов.
// В симуляции задайте нажатие на 4 периода, затем отпускание: увидите сдвиг.
// Сброс очищает history. Физические LED показывают единицы через инверсию.
// При 27 МГц удержание кнопки быстро заполнит все биты, это не бегущий огонь.
module top (
    input wire clk,
    input wire reset,
    input wire button,
    output wire [5:0] led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое; внутри схемы эти сигналы активны нулём.
    wire button_n = ~button;
    reg meta = 1'b1, synced = 1'b1;
    reg [5:0] history = 6'd0;
    always @(posedge clk) begin
        if (reset) begin
            meta <= 1'b1;
            synced <= 1'b1;
            history <= 6'd0;
        end else begin
            meta <= button_n;
            synced <= meta;
            history <= {history[4:0], ~synced};
        end
    end
    assign led_n = ~history;
endmodule
`,
    [
      clock,
      reset,
      ['button', 87, 'Последовательные данные: нажата = логическая 1.'],
      ...leds('led_n'),
    ],
  ),

  example(
    'capture',
    'Регистр с загрузкой',
    'Запомните число и удерживайте его на выходе.',
    `// running увеличивается каждый такт, saved хранит последний снимок.
// Два регистра синхронизируют кнопку. Пока кнопка нажата (load_n = 0), saved копирует running.
// После отпускания saved удерживается: регистр с разрешением загрузки.
// Из-за <= копируется ПРЕДЫДУЩЕЕ running: все регистры обновляются одновременно.
// В диаграммах наблюдайте running и saved, меняя button_load по периодам.
// Сброс очищает оба числа; LED показывают сохранённые биты (активный 0).
// На физической плате число меняется при 27 МГц и фиксируется после отпускания.
module top (
    input wire clk,
    input wire reset,
    input wire button_load,
    output wire [5:0] led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое; внутри схемы эти сигналы активны нулём.
    wire load_n = ~button_load;
    reg [5:0] running = 6'd0, saved = 6'd0;
    reg load_meta = 1'b1, load_sync = 1'b1;
    always @(posedge clk) begin
        if (reset) begin
            running <= 6'd0;
            saved <= 6'd0;
            load_meta <= 1'b1;
            load_sync <= 1'b1;
        end else begin
            running <= running + 6'd1;
            load_meta <= load_n;
            load_sync <= load_meta;
            if (!load_sync) saved <= running;
        end
    end
    assign led_n = ~saved;
endmodule
`,
    [
      clock,
      reset,
      ['button_load', 87, 'Нажата = записывать текущий счёт, отпущена = удерживать снимок.'],
      ...leds('led_n'),
    ],
  ),

  example(
    'updown',
    'Счётчик вверх / вниз',
    'Кнопка меняет направление счёта.',
    `// Отпущенная кнопка: +1 за шаг. Нажатая: -1. Шаг делается каждые STEP_TICKS тактов clk.
// 27 МГц / 6 750 000 даёт 4 шага в секунду: на плате счёт виден глазом.
// Шесть битов хранят 0…63: после 63 идёт 0, перед 0 — 63.
// Два регистра синхронизируют direction_n; смена направления имеет задержку.
// reset = 1 синхронно устанавливает 0. Внешний выход инвертирован для LED.
// На диаграмме смотрите внутренний count, не инвертированное led_n.
// Для короткой симуляции (32–64 такта) временно поставьте STEP_TICKS = 1: шаг на каждом такте.
// Для платы верните 6_750_000. Замедленное воспроизведение не меняет STEP_TICKS.
module top #(
    parameter integer STEP_TICKS = 6_750_000
) (
    input wire clk,
    input wire reset,
    input wire button_direction,
    output wire [5:0] led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое; внутри схемы эти сигналы активны нулём.
    wire direction_n = ~button_direction;
    reg [22:0] ticks = 23'd0;
    reg [5:0] count = 6'd0;
    reg direction_meta = 1'b1, direction_sync = 1'b1;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 23'd0;
            count <= 6'd0;
            direction_meta <= 1'b1;
            direction_sync <= 1'b1;
        end else begin
            direction_meta <= direction_n;
            direction_sync <= direction_meta;
            if (ticks == STEP_TICKS - 1) begin
                ticks <= 23'd0;
                if (direction_sync) count <= count + 6'd1;
                else count <= count - 6'd1;
            end else begin
                ticks <= ticks + 23'd1;
            end
        end
    end
    assign led_n = ~count;
endmodule
`,
    [
      clock,
      reset,
      ['button_direction', 87, 'Отпущена = вверх, нажата = вниз; вход проходит синхронизацию.'],
      ...leds('led_n'),
    ],
  ),

  example(
    'saturating',
    'Счётчик с насыщением',
    'Дойдите до 63 и остановитесь вместо переполнения.',
    `// Обычный шестибитный счётчик переходит 63 → 0; здесь проверяем предел.
// Шаг делается каждые STEP_TICKS тактов clk; при 6 750 000 это 4 шага в секунду на 27 МГц.
// enable = 1 разрешает +1 только пока count < 63. При 63 значение удерживается.
// Нажатая кнопка даёт enable = 0 и ставит паузу. reset = 1 начинает заново.
// Если ветка не выполняется, триггеры сохраняют значение — это разрешение FF.
// LED показывают биты через инверсию: на пределе все шесть светятся.
// На плате предел достигается примерно за 16 секунд (63 шага по 0,25 с).
// Для симуляции поставьте STEP_TICKS = 1, задайте 70 периодов и два периода сброса.
// Для платы верните 6_750_000.
module top #(
    parameter integer STEP_TICKS = 6_750_000
) (
    input wire clk,
    input wire reset,
    input wire pause,
    output wire [5:0] led_n
);
    // Кнопка паузы даёт 1 при нажатии: счёт разрешён, пока она отпущена.
    wire enable = ~pause;
    reg [22:0] ticks = 23'd0;
    reg [5:0] count = 6'd0;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 23'd0;
            count <= 6'd0;
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 23'd0;
            if (enable && count != 6'd63) count <= count + 6'd1;
        end else begin
            ticks <= ticks + 23'd1;
        end
    end
    assign led_n = ~count;
endmodule
`,
    [clock, reset, ['pause', 87, 'Отпущена = разрешён счёт, нажата = пауза.'], ...leds('led_n')],
  ),

  example(
    'gray',
    'Счётчик кода Грея',
    'Соседние значения отличаются ровно одним битом.',
    `// binary считает 0…63; gray = binary XOR (binary >> 1).
// У двоичного 011111 → 100000 меняются все биты. В коде Грея — один.
// Шестибитная последовательность циклическая, включая переход 63 → 0.
// Шаг делается каждые STEP_TICKS тактов clk; при 6 750 000 это 4 шага в секунду на 27 МГц.
// enable = 0 удерживает binary. reset = 1 устанавливает 0 на фронте clk.
// На диаграммах сравните binary и gray; led_n — инверсия gray для платы.
// Формула комбинационная: здесь не обещается отсутствие физических глитчей.
// Для короткой симуляции (32–64 такта) временно поставьте STEP_TICKS = 1: шаг на каждом такте.
// Для платы верните 6_750_000.
module top #(
    parameter integer STEP_TICKS = 6_750_000
) (
    input wire clk,
    input wire reset,
    input wire pause,
    output wire [5:0] led_n
);
    // Кнопка паузы даёт 1 при нажатии: счёт разрешён, пока она отпущена.
    wire enable = ~pause;
    reg [22:0] ticks = 23'd0;
    reg [5:0] binary = 6'd0;
    wire [5:0] gray = binary ^ (binary >> 1);
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 23'd0;
            binary <= 6'd0;
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 23'd0;
            if (enable) binary <= binary + 6'd1;
        end else begin
            ticks <= ticks + 23'd1;
        end
    end
    assign led_n = ~gray;
endmodule
`,
    [
      clock,
      reset,
      ['pause', 87, 'Отпущена = следующий код, нажата = удержание.'],
      ...leds('led_n'),
    ],
  ),

  example(
    'johnson',
    'Счётчик Джонсона',
    'Заполнение и очистка цепочки из шести регистров.',
    `// Сдвигаем state, а в младший бит возвращаем ИНВЕРСИЮ старшего.
// После сброса: 000000 → 000001 → 000011 → … → 111111 → 111110 → … → 000000.
// Из состояния 0 последовательность занимает 12 шагов: 2 × число регистров.
// Шаг делается каждые STEP_TICKS тактов clk; при 6 750 000 это 4 шага в секунду на 27 МГц.
// Сброс нужен для известного начального состояния; не все 64 состояния входят в цикл.
// enable = 0 удерживает цепочку. LED активны при 0, наружу идёт ~state.
// Сравните с кольцевым сдвигом «Бегущий огонь»: здесь заполнение меняется.
// Для короткой симуляции (32–64 такта) временно поставьте STEP_TICKS = 1: шаг на каждом такте.
// Для платы верните 6_750_000.
module top #(
    parameter integer STEP_TICKS = 6_750_000
) (
    input wire clk,
    input wire reset,
    input wire pause,
    output wire [5:0] led_n
);
    // Кнопка паузы даёт 1 при нажатии: счёт разрешён, пока она отпущена.
    wire enable = ~pause;
    reg [22:0] ticks = 23'd0;
    reg [5:0] state = 6'd0;
    always @(posedge clk) begin
        if (reset) begin
            ticks <= 23'd0;
            state <= 6'd0;
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 23'd0;
            if (enable) state <= {state[4:0], ~state[5]};
        end else begin
            ticks <= ticks + 23'd1;
        end
    end
    assign led_n = ~state;
endmodule
`,
    [clock, reset, ['pause', 87, 'Отпущена = сдвиг, нажата = пауза.'], ...leds('led_n')],
  ),

  example(
    'edge-toggle',
    'Одно нажатие → переключение',
    'Синхронизация входа и детектор фронта.',
    `// meta и synced — два триггера для асинхронного входа кнопки.
// previous хранит прошлый synced. previous=1 и synced=0 означает новое нажатие.
// В этот единственный такт меняем lit; удержание кнопки больше его не меняет.
// reset = 1 выключает LED и заполняет синхронизатор уровнем «отпущена».
// В диаграммах задайте button: 0 → 1 на несколько периодов → 0 → 1.
// Переключение задерживается на несколько тактов из-за синхронизации.
// Это НЕ подавление дребезга: реальная кнопка может дать несколько фронтов.
// Подавление дребезга — следующий опыт с фильтром устойчивого состояния.
module top (
    input wire clk,
    input wire reset,
    input wire button,
    output wire led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое; внутри схемы эти сигналы активны нулём.
    wire button_n = ~button;
    reg meta = 1'b1, synced = 1'b1, previous = 1'b1, lit = 1'b0;
    always @(posedge clk) begin
        if (reset) begin
            meta <= 1'b1;
            synced <= 1'b1;
            previous <= 1'b1;
            lit <= 1'b0;
        end else begin
            meta <= button_n;
            synced <= meta;
            previous <= synced;
            if (previous && !synced) lit <= ~lit;
        end
    end
    assign led_n = ~lit;
endmodule
`,
    [
      clock,
      reset,
      ['button', 87, 'Кнопка переключения S2: новое нажатие — переход 0 → 1.'],
      ['led_n', 15, 'LED0: 0 включает свет, каждое обнаруженное нажатие меняет состояние.'],
    ],
  ),
  ...logicExamples,
  ...systemExamples,
  ...applicationExamples,
];
