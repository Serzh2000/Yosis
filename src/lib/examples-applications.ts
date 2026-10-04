import type { Example } from './examples';
import { learningExample, clockPin, resetPin, ledPins } from './example-kit';

interface ApplicationOptions {
  parameters?: string;
  button?: boolean;
  notes: string;
}

// Учебные сигналы остаются внутри схемы; наружу выходят только реальные LED.
// Наличие счётчика растра или аудиофазы не означает подключения HDMI или динамика.
function application(
  id: string,
  title: string,
  description: string,
  body: string,
  options: ApplicationOptions,
): Example {
  return learningExample(
    id,
    title,
    description,
    `// ${title} — учебный проект для Tang Nano 20K.
// clk — штатный генератор 27 МГц, reset — кнопка 88: нажата = 1.
// LED0…5 включаются уровнем 0. Все промежуточные сигналы доступны в диаграммах.
// Для симуляции задайте clk/reset и удержите сброс первые два такта.
${options.notes
  .split('\n')
  .map((line) => `// ${line}`)
  .join('\n')}
module top${options.parameters ? ` #(\n    ${options.parameters}\n)` : ''} (
    input wire clk,
    input wire reset,${options.button ? '\n    input wire button,' : ''}
    output wire [5:0] led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое. Внутри схемы сброс и кнопка
    // активны нулём, поэтому сразу на входе стоит инверсия. Регистр started
    // равен 0 после загрузки FPGA и даёт схеме один такт начального сброса.
    reg started = 1'b0;
    always @(posedge clk) started <= 1'b1;
    wire reset_n = started & ~reset;${options.button ? '\n    wire button_n = ~button;' : ''}
${body}
endmodule
`,
    [
      clockPin,
      resetPin,
      ...(options.button
        ? [
            ['button', 87, 'Кнопка выбора учебного режима S2: нажата = 1, отпущена = 0.'] as [
              string,
              number,
              string,
            ],
          ]
        : []),
      ...ledPins(),
    ],
    'systems',
  );
}

const buttonSynchronizer = `    // Два триггера синхронизируют кнопку; дребезг они не удаляют.
    reg button_meta, button_sync;
    always @(posedge clk) begin
        if (!reset_n) begin button_meta <= 1'b1; button_sync <= 1'b1; end
        else begin button_meta <= button_n; button_sync <= button_meta; end
    end
`;

export const applicationExamples: Example[] = [
  application(
    'moving-average',
    'Скользящее среднее: четыре отсчёта',
    'Короткий импульс превращается в четыре меньших отсчёта.',
    `    reg [25:0] ticks;
    reg [2:0] sample_phase;
    reg [5:0] delay1, delay2, delay3;
    reg [5:0] average;
    wire sample_tick = (ticks == SAMPLE_TICKS - 1);
    // Вместо неизвестного внешнего АЦП — воспроизводимый цифровой импульс.
    wire [5:0] input_sample = (sample_phase == 0) ? 6'd32 : 6'd0;
    // Четыре числа до 63 дают до 252: нужны восемь бит, не шесть.
    wire [7:0] window_sum = {2'b00, input_sample} + {2'b00, delay1}
                         + {2'b00, delay2} + {2'b00, delay3};
    always @(posedge clk) begin
        if (!reset_n) begin
            ticks <= 0; sample_phase <= 0; delay1 <= 0; delay2 <= 0; delay3 <= 0; average <= 0;
        end else if (sample_tick) begin
            ticks <= 0; sample_phase <= sample_phase + 1'b1;
            delay1 <= input_sample; delay2 <= delay1; delay3 <= delay2;
            // Деление на четыре — сдвиг; дробную часть здесь отбрасываем.
            average <= window_sum[7:2];
        end else ticks <= ticks + 1'b1;
    end
    assign led_n = ~average;`,
    {
      parameters: 'parameter integer SAMPLE_TICKS = 6_750_000',
      notes:
        'Раз в восемь отсчётов input_sample равен 32; остальные семь равны 0. Внешний АЦП не нужен.\nПосле импульса average = 8 четыре отсчёта подряд, затем 0: энергия распределилась по окну.\nSAMPLE_TICKS = 1 и 20 тактов покажут два полных отклика; на плате один отсчёт длится 0,25 с.\nЗадержки начинают с нулей: среднее первых отсчётов тоже делится на четыре, не на число заполненных ячеек.\nПараметр SAMPLE_TICKS: 1…67 108 864. reset_n одновременно очищает окно и выход.',
    },
  ),

  application(
    'fir-filter',
    'FIR: настраиваемые коэффициенты',
    'Три задержанных отсчёта, signed-умножения и импульсная характеристика.',
    `    reg [25:0] ticks;
    reg [2:0] sample_phase;
    reg signed [6:0] delay1, delay2;
    reg signed [15:0] filtered;
    wire sample_tick = (ticks == SAMPLE_TICKS - 1);
    wire signed [6:0] input_sample = (sample_phase == 0) ? 7'sd32 : 7'sd0;
    // Максимум одного произведения 63*128 помещается в signed 15 бит.
    wire signed [14:0] term0 = input_sample * COEFF_A;
    wire signed [14:0] term1 = delay1 * COEFF_B;
    wire signed [14:0] term2 = delay2 * COEFF_C;
    // Перед суммой расширяем знак; трёх произведений достаточно для signed 16 бит.
    wire signed [15:0] weighted = {term0[14], term0} + {term1[14], term1} + {term2[14], term2};
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; sample_phase <= 0; delay1 <= 0; delay2 <= 0; filtered <= 0; end
        else if (sample_tick) begin
            ticks <= 0; sample_phase <= sample_phase + 1'b1;
            delay1 <= input_sample; delay2 <= delay1;
            filtered <= weighted >>> SCALE_SHIFT;
        end else ticks <= ticks + 1'b1;
    end
    // LED показывают шесть младших битов. Отрицательное число смотрите как signed в диаграмме.
    assign led_n = ~filtered[5:0];`,
    {
      parameters:
        "parameter integer SAMPLE_TICKS = 6_750_000,\n    parameter signed [7:0] COEFF_A = 8'sd1,\n    parameter signed [7:0] COEFF_B = 8'sd2,\n    parameter signed [7:0] COEFF_C = 8'sd1,\n    parameter integer SCALE_SHIFT = 2",
      notes:
        'FIR — фильтр с конечной импульсной характеристикой: y[n] = A*x[n] + B*x[n−1] + C*x[n−2].\nПо умолчанию коэффициенты 1,2,1 и деление на 4 дают отклик 8,16,8 на импульс 32.\nИзмените A=1, B=0, C=−1, SCALE_SHIFT=0: получится разность текущего и позапрошлого отсчётов, 32,0,−32.\nЭто цифровая модель; микрофон, динамик и аналоговый фильтр к плате не подключены.\nКоэффициенты signed от −128 до 127; SCALE_SHIFT от 0 до 15. Сдвиг signed округляет отрицательное число вниз.\nSAMPLE_TICKS = 1 для короткого опыта; допустимо 1…67 108 864. Обратите внимание на разрядность суммы и задержки.',
    },
  ),

  application(
    'raster-scan',
    'Мини-растр: строки и кадры',
    'Активная область, интервалы гашения и два сигнала синхронизации.',
    `    reg [3:0] horizontal;
    reg [2:0] vertical;
    wire active_video = (horizontal < 8) && (vertical < 4);
    // В строке: 8 видимых точек, 2 перед синхронизацией, 2 sync, 2 после.
    wire hsync_n = !((horizontal >= 10) && (horizontal < 12));
    // В кадре: 4 видимые строки, 1 перед sync, 1 sync, 1 после.
    wire vsync_n = !(vertical == 5);
    wire pixel = active_video && (horizontal[1] ^ vertical[0]);
    always @(posedge clk) begin
        if (!reset_n) begin horizontal <= 0; vertical <= 0; end
        else if (horizontal == 13) begin
            horizontal <= 0;
            if (vertical == 6) vertical <= 0;
            else vertical <= vertical + 1'b1;
        end else horizontal <= horizontal + 1'b1;
    end
    // LED0 — видимая область, LED1/2 — активные sync, LED3 — тестовый пиксель.
    assign led_n = ~{2'b00, pixel, ~vsync_n, ~hsync_n, active_video};`,
    {
      notes:
        'Одна строка длится 14 тактов, кадр — 7 строк, то есть 98 тактов. Координата 0 — первая.\nВременные диаграммы покажут horizontal 0…13, vertical 0…6 и 32 видимые точки в кадре.\nСмотрите hsync_n: низкий уровень только в точках 10 и 11. vsync_n низкий всю строку 5.\nЭто маленький учебный растр; частоты и размеры не соответствуют VGA/HDMI. Монитор не подключайте по этому CST.\nНа плате LED слишком быстро меняются для отдельных строк; смысл примера — счётчики, границы и диаграммы.\nВсе сигналы работают от одного clk. horizontal/vertical не используются как новые тактовые входы.',
    },
  ),

  application(
    'dds-tone',
    'DDS: цифровой генератор частоты',
    'Слово настройки управляет скоростью накопления фазы.',
    `    reg [15:0] phase;
    wire [16:0] phase_sum = {1'b0, phase} + {1'b0, FREQUENCY_WORD};
    wire digital_tone = phase[15];
    always @(posedge clk) begin
        if (!reset_n) phase <= 0;
        else phase <= phase_sum[15:0]; // Переполнение — переход фазы на новый круг.
    end
    assign led_n = ~{phase[14:10], digital_tone};`,
    {
      parameters: "parameter [15:0] FREQUENCY_WORD = 16'd2",
      notes:
        'DDS — прямой цифровой синтез: phase = (phase + FREQUENCY_WORD) по модулю 65 536.\nСредняя частота старшего бита: 27 000 000 * FREQUENCY_WORD / 65 536 Гц. Слово 2 даёт примерно 824 Гц.\nЧастотный шаг около 412 Гц; для более точных нот нужна фаза большей разрядности. Это ограничение данного опыта.\nFREQUENCY_WORD=16 384 даёт цикл из четырёх фаз: 0,16 384,32 768,49 152; удобный тест на диаграммах.\nСлово 0 сохраняет нулевую фазу. Используйте слова 1…32 768 для частот до половины clk.\nLED0 показывает цифровую прямоугольную волну, остальные — часть фазы. Аналоговый звук и вывод на динамик не реализованы.',
    },
  ),

  application(
    'sigma-delta',
    'Сигма-дельта: плотность импульсов',
    'Шестибитный уровень превращается в однобитный цифровой поток.',
    `${buttonSynchronizer}
    reg [5:0] remainder;
    reg pulse;
    wire [5:0] level = button_sync ? RELEASED_LEVEL : PRESSED_LEVEL;
    wire [6:0] accumulated = {1'b0, remainder} + {1'b0, level};
    always @(posedge clk) begin
        if (!reset_n) begin remainder <= 0; pulse <= 0; end
        else begin remainder <= accumulated[5:0]; pulse <= accumulated[6]; end
    end
    assign led_n = ~{remainder[5:1], pulse};`,
    {
      button: true,
      parameters:
        "parameter [5:0] RELEASED_LEVEL = 6'd16,\n    parameter [5:0] PRESSED_LEVEL = 6'd48",
      notes:
        'Каждый такт прибавляем level к остатку; перенос выдаём как pulse, остаток сохраняем. Это первый порядок.\nЗа 64 такта с постоянным level=16 будут 16 единиц, с level=48 — 48 единиц: 25% и 75%.\nУровень 0 выдаёт только нули; 63 — 63 единицы из 64, а не постоянную единицу.\nКнопка 87 выбирает уровень после двух триггеров. Остаток при переключении сохраняется.\nLED0 показывает pulse как среднюю яркость, LED1…5 — остаток. Сравните распределение импульсов с обычным PWM.\nАналоговый ЦАП требует внешнего фильтра; этот проект показывает только цифровой поток и не подключает аудиовыход.',
    },
  ),

  application(
    'tiny-cpu',
    'Маленький процессор: fetch и execute',
    'ROM-программа считает 3→2→1→0, делает условный переход и останавливается.',
    `    localparam FETCH = 1'b0, EXECUTE = 1'b1;
    reg state, halted;
    reg [2:0] pc;
    reg [8:0] instruction;
    reg [5:0] accumulator, output_value;
    // Формат инструкции: старшие 3 бита — opcode, младшие 6 — число или адрес.
    function [8:0] program_rom(input [2:0] address);
        begin
            case (address)
                0: program_rom = {3'b001, 6'd3};  // LDI 3: загрузить аккумулятор.
                1: program_rom = {3'b101, 6'd0};  // OUT: показать аккумулятор.
                2: program_rom = {3'b010, 6'd63}; // ADD 63: вычесть 1 по модулю 64.
                3: program_rom = {3'b110, 6'd1};  // JNZ 1: повторить, пока accumulator != 0.
                4: program_rom = {3'b101, 6'd0};  // OUT: показать итоговый ноль.
                5: program_rom = {3'b111, 6'd0};  // HLT: остановить исполнение.
                default: program_rom = 9'd0;     // NOP.
            endcase
        end
    endfunction
    always @(posedge clk) begin
        if (!reset_n) begin
            state <= FETCH; halted <= 0; pc <= 0; instruction <= 0; accumulator <= 0; output_value <= 0;
        end else if (!halted) begin
            if (state == FETCH) begin instruction <= program_rom(pc); state <= EXECUTE; end
            else begin
                state <= FETCH; pc <= pc + 1'b1;
                case (instruction[8:6])
                    3'b000: begin end // NOP: только перейти к следующей инструкции.
                    3'b001: accumulator <= instruction[5:0];
                    3'b010: accumulator <= accumulator + instruction[5:0];
                    3'b011: accumulator <= accumulator ^ instruction[5:0];
                    3'b100: pc <= instruction[2:0];
                    3'b101: output_value <= accumulator;
                    3'b110: if (accumulator != 0) pc <= instruction[2:0];
                    3'b111: begin halted <= 1; pc <= pc; end
                endcase
            end
        end
    end
    assign led_n = ~output_value;`,
    {
      notes:
        'Каждая инструкция занимает два такта: FETCH читает ROM, EXECUTE изменяет регистры.\nСмотрите pc, instruction, state, accumulator, output_value и halted; после reset программа займёт 24 такта.\nНа OUT видны 3,2,1,0; HLT сохраняет pc и значения. Сброс запускает программу с адреса 0.\nЭто учебная архитектура на восемь 9-битных инструкций, не RISC-V и не выполнение C-кода.\nАккумулятор шестибитный: 0+63 = 63, 3+63 = 2 по модулю 64. Команда JNZ использует младшие три бита адреса.\nНа 27 МГц программа завершится быстрее глаза; вывод нуля погасит LED. Пошагово изучайте её на диаграммах.',
    },
  ),

  application(
    'stream-skid',
    'Эластичный буфер valid/ready',
    'Одно слово хранения, обратное давление и замена прочитанного слова в тот же такт.',
    `${buttonSynchronizer}
    reg full;
    reg [5:0] payload, source_data, last_received;
    reg [5:0] received_count;
    reg [1:0] sink_phase;
    wire input_valid = reset_n;
    wire output_valid = full;
    // Каждый четвёртый такт приёмник занят; нажатие останавливает его надолго.
    wire output_ready = button_sync && (sink_phase != 3);
    wire input_ready = !full || output_ready;
    wire send = input_valid && input_ready;
    wire receive = output_valid && output_ready;
    always @(posedge clk) begin
        if (!reset_n) begin
            full <= 0; payload <= 0; source_data <= 0; last_received <= 0; received_count <= 0; sink_phase <= 0;
        end else begin
            sink_phase <= sink_phase + 1'b1;
            if (input_ready) begin full <= input_valid; if (input_valid) payload <= source_data; end
            if (send) source_data <= source_data + 1'b1;
            if (receive) begin last_received <= payload; received_count <= received_count + 1'b1; end
        end
    end
    assign led_n = ~{(output_valid && !output_ready), output_valid, last_received[3:0]};`,
    {
      button: true,
      notes:
        'Передача происходит на фронте только при valid=1 И ready=1. Источник выдаёт 0,1,2… по модулю 64.\nЕсли full=1 и output_ready=0, payload и source_data удерживаются: следующее слово не теряется.\nПри одновременных send и receive приёмник забирает старое payload, а буфер сохраняет новое.\nЭто однословная эластичная очередь с комбинаторным input_ready; она не разрывает цепочку ready как двухсловный skid.\nLED5 — ожидание приёмника, LED4 — полный буфер, LED0…3 — младшая часть последнего принятого слова.\nВ симуляции нажмите button_n на 8 тактов, затем отпустите. Счёт должен продолжиться в прежнем порядке без пропусков.',
    },
  ),

  application(
    'protocol-checker',
    'Проверка протокола: ошибка остаётся',
    'Отладочный монитор ловит изменение valid/data во время ожидания.',
    `${buttonSynchronizer}
    reg [1:0] phase;
    reg [5:0] source_data, held_data;
    reg waiting, fault;
    wire inject_fault = !button_sync;
    wire ready = (phase == 3);
    // FAULT_MODE=1 нарушает valid, FAULT_MODE=0 меняет data, пока ready=0.
    wire valid = !(inject_fault && (FAULT_MODE == 1) && (phase == 2));
    always @(posedge clk) begin
        if (!reset_n) begin phase <= 0; source_data <= 0; held_data <= 0; waiting <= 0; fault <= 0; end
        else begin
            phase <= phase + 1'b1;
            if ((valid && ready) || (inject_fault && (FAULT_MODE == 0))) source_data <= source_data + 1'b1;
            // После stalled такта отправитель обязан сохранить и valid, и данные до принятия.
            if (waiting && (!valid || (source_data != held_data))) fault <= 1'b1;
            waiting <= valid && !ready;
            held_data <= source_data;
        end
    end
    assign led_n = ~{fault, waiting, source_data[3:0]};`,
    {
      button: true,
      parameters: 'parameter integer FAULT_MODE = 0',
      notes:
        'Исправный отправитель меняет слово только после передачи: ready бывает 1 каждый четвёртый такт.\nМонитор запоминает слово при ожидании; на следующем фронте оно обязано оставаться прежним, даже если ready уже появился.\nНажатие 87 специально ломает отправитель. LED5/fault фиксирует ошибку и остаётся 1 после отпускания.\nFAULT_MODE=0 — данные меняются раньше подтверждения. FAULT_MODE=1 — valid исчезает во время ожидания.\nreset_n очищает fault; остановка нарушений его не очищает. LED4 — сохранённое ожидание, остальные показывают часть слова.\nЭто синтезируемый монитор, а не встроенный запуск SystemVerilog assertions. Проверяйте fault в диаграммах или тестбенче.',
    },
  ),
];
