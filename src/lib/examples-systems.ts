import type { Example } from './examples';
import { learningExample, clockPin, resetPin, ledPins, type ExampleCategory } from './example-kit';

type Pin = [string, number, string];
interface Options {
  parameters?: string;
  button?: boolean;
  ports?: string;
  pins?: Pin[];
  category?: ExampleCategory;
  notes: string;
}

// Every example keeps physical ports separate from its internal teaching signals.
// Protocol demonstrations use internal loopback unless a real UART pin is named.
function system(
  id: string,
  title: string,
  description: string,
  body: string,
  options: Options,
): Example {
  const button = options.button !== false;
  const source = `// ${title} — Tang Nano 20K, входной генератор 27 МГц.
// LED0…5 активны при 0: наружу идёт инверсия признаков «свет включён».
// Для диаграмм выберите clk и reset (активная 1), держите сброс 2 такта.
${options.notes
  .split('\n')
  .map((line) => `// ${line}`)
  .join('\n')}
module top${options.parameters ? ` #(\n    ${options.parameters}\n)` : ''} (
    input wire clk,
    input wire reset,${button ? '\n    input wire button,' : ''}${options.ports ? `\n    ${options.ports},` : ''}
    output wire [5:0] led_n
);
    // Кнопки платы дают 1 при нажатии и 0 в покое. Внутри схемы сброс и кнопка
    // активны нулём, поэтому сразу на входе стоит инверсия. Регистр started
    // равен 0 после загрузки FPGA и даёт схеме один такт начального сброса.
    reg started = 1'b0;
    always @(posedge clk) started <= 1'b1;
    wire reset_n = started & ~reset;${button ? '\n    wire button_n = ~button;' : ''}
${body}
endmodule
`;
  return learningExample(
    id,
    title,
    description,
    source,
    [
      clockPin,
      resetPin,
      ...(button ? [['button', 87, 'Кнопка действия S2: нажата = 1, отпущена = 0.'] as Pin] : []),
      ...(options.pins ?? []),
      ...ledPins(),
    ],
    options.category ?? 'systems',
  );
}

const pressSync = `    // Два триггера уменьшают риск метастабильности; дребезг они не фильтруют.
    reg meta, synced, previous;
    wire press = previous && !synced;
    always @(posedge clk) begin
        if (!reset_n) begin meta <= 1; synced <= 1; previous <= 1; end
        else begin meta <= button_n; synced <= meta; previous <= synced; end
    end
`;

export const systemExamples: Example[] = [
  system(
    'button-debounce',
    'Антидребезг кнопки',
    'Принимаем новое состояние только после устойчивого интервала.',
    `${pressSync}
    reg stable;
    reg [19:0] quiet;
    always @(posedge clk) begin
        if (!reset_n) begin stable <= 1; quiet <= 0; end
        else if (synced == stable) quiet <= 0;
        else if (quiet == STABLE_TICKS - 1) begin stable <= synced; quiet <= 0; end
        else quiet <= quiet + 1'b1;
    end
    assign led_n = {5'b11111, stable};`,
    {
      parameters: 'parameter integer STABLE_TICKS = 270_000',
      notes:
        'LED0 загорается после 10 мс устойчивого нажатия и гаснет после такого же отпускания.\nПоставьте STABLE_TICKS = 3 для короткой симуляции. Чередуйте button_n: 0,1,0,1, затем удержите 0.\nНа диаграмме synced повторит шум, stable пропустит только устойчивое состояние.\nПредел параметра: 1…1 048 576 тактов. Синхронный reset_n возвращает состояние «отпущена».',
    },
  ),

  system(
    'pulse-capture',
    'Фронт → растянутый импульс',
    'Одно нажатие включает LED на фиксированное время.',
    `${pressSync}
    reg [23:0] remaining;
    always @(posedge clk) begin
        if (!reset_n) remaining <= 0;
        else if (press) remaining <= HOLD_TICKS;
        else if (remaining != 0) remaining <= remaining - 1'b1;
    end
    assign led_n = {5'b11111, (remaining == 0)};`,
    {
      parameters: 'parameter integer HOLD_TICKS = 6_750_000',
      notes:
        'LED0 горит 0,25 с после фронта нажатия; удержание не продлевает импульс.\nНовый фронт во время свечения начинает интервал заново. Это захват СИНХРОНИЗИРОВАННОГО фронта.\nПоставьте HOLD_TICKS = 4; короткий низкий уровень надо держать хотя бы 2 такта входного clk.\nДребезг способен дать несколько фронтов: перед реальной кнопкой нужен фильтр из соседнего примера.',
    },
  ),

  system(
    'async-toggle-sync',
    'Передача события через toggle',
    'Событие меняет бит, принимающая сторона обнаруживает изменение.',
    `${pressSync}
    reg source_toggle;
    reg target_meta, target_sync, target_seen;
    reg [5:0] events;
    wire arrived = target_sync ^ target_seen;
    always @(posedge clk) begin
        if (!reset_n) begin
            source_toggle <= 0; target_meta <= 0; target_sync <= 0; target_seen <= 0; events <= 0;
        end else begin
            if (press) source_toggle <= ~source_toggle;
            target_meta <= source_toggle; target_sync <= target_meta; target_seen <= target_sync;
            if (arrived) events <= events + 1'b1;
        end
    end
    assign led_n = ~events;`,
    {
      notes:
        'LED показывают число доставленных событий, а не длительность нажатия.\nПроверяйте source_toggle, target_sync, arrived: каждый переход toggle даёт один такт arrived.\nЗдесь обе стороны тактируются clk, чтобы упражнение собиралось без второго внешнего генератора.\nВ реальном CDC для двух разных частот нужны два домена и ограничения времени.\nДва быстрых события могут взаимно уничтожиться до выборки; toggle без подтверждения не является очередью.\nСинхронизация не удаляет дребезг кнопки. В симуляции делайте паузу минимум 8 тактов между нажатиями.',
    },
  ),

  system(
    'reset-release',
    'Безопасное отпускание сброса',
    'Асинхронное включение и синхронное снятие reset.',
    `    reg [1:0] release_pipe;
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) release_pipe <= 2'b00;
        else release_pipe <= {release_pipe[0], 1'b1};
    end
    reg [4:0] count;
    always @(posedge clk) begin
        if (!release_pipe[1]) count <= 0;
        else count <= count + 1'b1;
    end
    assign led_n = ~{release_pipe[1], count};`,
    {
      button: false,
      notes:
        'Нажатие reset_n немедленно очищает два триггера release_pipe.\nПосле отпускания разрешение работы появится через два положительных фронта; счёт начнётся на третьем.\nLED5 — разрешение, LED0…4 — счётчик. Асинхронный reset не создаёт новый тактовый сигнал.\nНа диаграммах отпустите reset между фронтами и убедитесь, что release_pipe[1] меняется только на clk.\nДля большого проекта такое снятие сброса делают отдельно в каждом тактовом домене.',
    },
  ),

  system(
    'pulse-width',
    'Измерение длительности нажатия',
    'Число тактов высокого уровня сохраняется после отпускания.',
    `${pressSync}
    reg [5:0] width, captured;
    always @(posedge clk) begin
        if (!reset_n) begin width <= 0; captured <= 0; end
        else if (!synced) begin
            if (width != 63) width <= width + 1'b1;
        end else if (!previous) begin captured <= width; width <= 0; end
    end
    assign led_n = ~captured;`,
    {
      notes:
        'Считается длительность синхронизированного нажатия в тактах clk, максимум 63.\nLED обновляются при отпускании и сохраняют измерение до следующего импульса.\nПри 27 МГц человеческое нажатие почти всегда даст насыщение 63: упражнение прежде всего для диаграмм.\nДля измерения миллисекунд добавьте clock enable от делителя, а не новый clk.\nЗадайте 5 тактов button_n = 0, затем 1: captured станет 5 после задержки синхронизатора.',
    },
  ),

  system(
    'one-shot',
    'Одновибратор без повторного запуска',
    'Следующие нажатия игнорируются, пока длится импульс.',
    `${pressSync}
    reg [23:0] remaining;
    always @(posedge clk) begin
        if (!reset_n) remaining <= 0;
        else if (remaining != 0) remaining <= remaining - 1'b1;
        else if (press) remaining <= PULSE_TICKS;
    end
    assign led_n = {5'b11111, remaining == 0};`,
    {
      parameters: 'parameter integer PULSE_TICKS = 13_500_000',
      notes:
        'LED0 горит ровно 0,5 с после принятого нажатия. Повторные фронты во время свечения игнорируются.\nСравните с «Фронт → растянутый импульс»: там фронт перезапускает интервал.\nДля симуляции PULSE_TICKS = 6; введите два нажатия с расстоянием 3 такта.\nСброс синхронный, дребезг не подавляется. Параметр допустим от 1 до 16 777 215.',
    },
  ),

  system(
    'retrigger-timer',
    'Таймер после последнего события',
    'Каждое нажатие отодвигает выключение.',
    `${pressSync}
    reg [23:0] remaining;
    reg expired;
    always @(posedge clk) begin
        if (!reset_n) begin remaining <= 0; expired <= 0; end
        else begin
            expired <= 0;
            if (press) remaining <= TIMEOUT_TICKS;
            else if (remaining != 0) begin
                remaining <= remaining - 1'b1;
                if (remaining == 1) expired <= 1;
            end
        end
    end
    assign led_n = {4'b1111, ~expired, remaining == 0};`,
    {
      parameters: 'parameter integer TIMEOUT_TICKS = 6_750_000',
      notes:
        'LED0 показывает работающий таймер; LED1 — однотактовое событие истечения.\nПри новом фронте нажатия отсчёт снова равен TIMEOUT_TICKS, даже в последний такт старого интервала.\nTIMEOUT_TICKS = 5 делает сценарий коротким; сравните новое событие до и после истечения.\nОдин такт LED1 на 27 МГц глаз не увидит: он предназначен для диаграмм или другого автомата.\nНа плате перед кнопкой потребуется антидребезг. Все события обрабатываются одним clk.',
    },
  ),

  system(
    'watchdog',
    'Сторожевой таймер',
    'Нет подтверждений — появляется и сохраняется сигнал тревоги.',
    `${pressSync}
    reg [23:0] silence;
    reg alarm;
    always @(posedge clk) begin
        if (!reset_n) begin silence <= 0; alarm <= 0; end
        else if (press) silence <= 0;
        else if (silence == LIMIT_TICKS - 1) alarm <= 1;
        else silence <= silence + 1'b1;
    end
    assign led_n = {5'b11111, ~alarm};`,
    {
      parameters: 'parameter integer LIMIT_TICKS = 13_500_000',
      notes:
        'Нажимайте кнопку чаще 0,5 с, чтобы кормить watchdog. Пропуск зажигает LED0.\nТревога защёлкнута: позднее нажатие её не убирает; только reset_n = 0.\nВ диаграммах LIMIT_TICKS = 5, затем подайте heartbeat до границы и после неё.\nЭта версия лишь сигнализирует, не сбрасывает FPGA и не касается внешних устройств.\nДва триггера синхронизируют кнопку; дребезг может считаться дополнительным подтверждением.',
    },
  ),

  system(
    'divide-by-three',
    'Деление частоты на три',
    'Модуль 3 и несимметричный импульс 1/3 периода.',
    `    reg [1:0] phase;
    always @(posedge clk) begin
        if (!reset_n) phase <= 0;
        else if (phase == 2) phase <= 0;
        else phase <= phase + 1'b1;
    end
    assign led_n = {3'b111, ~phase, ~(phase == 0)};`,
    {
      button: false,
      notes:
        'phase идёт 0→1→2→0; LED0 светится на phase = 0, то есть один такт из трёх.\nLED1…2 показывают phase в двоичном виде. LED3…5 выключены.\nПри 27 МГц частота импульсов 9 МГц; визуально LED0 покажет среднюю яркость.\nНечётный делитель здесь имеет заполнение 1/3, а не 50%. Из него не делаем новый clk.\nИспользуйте phase == 0 как разрешение clock enable внутри always @(posedge clk).',
    },
  ),

  system(
    'fractional-tick',
    'Дробный делитель',
    'Аккумулятор выдаёт 3 события на каждые 8 тактов.',
    `    reg [2:0] phase;
    reg tick;
    reg [4:0] events;
    wire [3:0] sum = {1'b0, phase} + 4'd3;
    always @(posedge clk) begin
        if (!reset_n) begin phase <= 0; tick <= 0; events <= 0; end
        else begin
            phase <= sum[2:0]; tick <= sum[3];
            if (sum[3]) events <= events + 1'b1;
        end
    end
    assign led_n = ~{tick, events};`,
    {
      button: false,
      notes:
        'К трёхбитной фазе прибавляем 3. Перенос означает событие, нижние биты остаются как остаток.\nЗа любые полные 8 шагов будет 3 tick, но расстояния между ними различаются: 3,3,2 такта.\nLED5 показывает tick, LED0…4 — количество событий. Смотрите первые 16 фронтов в диаграммах.\nЭто частотное усреднение с джиттером, а не PLL и не точный равномерный такт.\nВсе регистры работают на clk; tick можно использовать как clock enable.',
    },
  ),

  system(
    'duty-cycle',
    'Измеритель заполнения',
    'Сколько из восьми последних отсчётов вход был нажат.',
    `${pressSync}
    reg [2:0] phase;
    reg [3:0] high_count, measured;
    wire [3:0] next_count = high_count + (!synced);
    always @(posedge clk) begin
        if (!reset_n) begin phase <= 0; high_count <= 0; measured <= 0; end
        else if (phase == 7) begin phase <= 0; measured <= next_count; high_count <= 0; end
        else begin phase <= phase + 1'b1; high_count <= next_count; end
    end
    assign led_n = ~{2'b00, measured};`,
    {
      notes:
        'Окно имеет 8 тактов. measured хранит число отсчётов нажатия 0…8 из предыдущего полного окна.\n0 означает 0%, 4 — 50%, 8 — 100%. LED0…3 показывают это число; остальные выключены.\nСинхронизатор задерживает вход на два такта. Для первого полного окна задайте вход до сброса.\nВ диаграммах сравните постоянный 0, постоянный 1 и меандр; меняйте вход на отрицательном фронте.\nНа плате вход постоянен миллионы тактов, поэтому видны в основном 0 или 8.',
    },
  ),

  system(
    'stopwatch',
    'Секундомер с паузой',
    'Нажатие переключает запуск; пауза сохраняет долю секунды.',
    `${pressSync}
    reg running;
    reg [24:0] ticks;
    reg [4:0] seconds;
    always @(posedge clk) begin
        if (!reset_n) begin running <= 0; ticks <= 0; seconds <= 0; end
        else begin
            if (press) running <= ~running;
            if (running) begin
                if (ticks == SECOND_TICKS - 1) begin ticks <= 0; seconds <= seconds + 1'b1; end
                else ticks <= ticks + 1'b1;
            end
        end
    end
    assign led_n = ~{running, seconds};`,
    {
      parameters: 'parameter integer SECOND_TICKS = 27_000_000',
      notes:
        'LED5 — идёт счёт, LED0…4 — секунды 0…31. Кнопка запускает и ставит на паузу.\nПри паузе ticks тоже удерживается: после продолжения считаем остаток секунды, а не новую секунду.\nSECOND_TICKS = 4 для симуляции; запустите, подождите 6 тактов, поставьте паузу, продолжите.\nСинхронизатор не фильтрует дребезг; на реальной кнопке добавьте антидребезг, иначе будет несколько переключений.',
    },
  ),

  system(
    'countdown',
    'Таймер обратного отсчёта',
    'Запуск на 15 секунд, затем устойчивый сигнал завершения.',
    `${pressSync}
    reg [24:0] ticks;
    reg [3:0] seconds;
    reg running, done;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; seconds <= 0; running <= 0; done <= 0; end
        else if (press) begin ticks <= 0; seconds <= 15; running <= 1; done <= 0; end
        else if (running) begin
            if (ticks == SECOND_TICKS - 1) begin
                ticks <= 0; seconds <= seconds - 1'b1;
                if (seconds == 1) begin running <= 0; done <= 1; end
            end else ticks <= ticks + 1'b1;
        end
    end
    assign led_n = ~{done, running, seconds};`,
    {
      parameters: 'parameter integer SECOND_TICKS = 27_000_000',
      notes:
        'LED0…3 — оставшиеся секунды, LED4 — работает, LED5 — завершено.\nНовое нажатие всегда загружает 15 и убирает done, даже если старый отсчёт ещё идёт.\nSECOND_TICKS = 2: весь цикл уложится в 30 тактов после запуска.\nПроверьте границу 1→0: running гаснет, done загорается и число не переходит в 15.\nДребезг может перезапускать таймер; для аппаратного использования добавьте фильтр.',
    },
  ),

  system(
    'event-window',
    'События в окне времени',
    'Считаем фронты, а не длительность кнопки.',
    `${pressSync}
    reg [24:0] ticks;
    reg [5:0] in_window, published;
    wire [5:0] next_count = (press && in_window != 63) ? in_window + 1'b1 : in_window;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; in_window <= 0; published <= 0; end
        else if (ticks == WINDOW_TICKS - 1) begin ticks <= 0; published <= next_count; in_window <= 0; end
        else begin ticks <= ticks + 1'b1; in_window <= next_count; end
    end
    assign led_n = ~published;`,
    {
      parameters: 'parameter integer WINDOW_TICKS = 27_000_000',
      notes:
        'Каждую секунду на LED публикуется количество нажатий в закончившемся окне.\nСобытие в последний такт включается в старое окно: next_count используется и при публикации.\nЧисло насыщается на 63. Удержание кнопки даёт одно событие, но дребезг может добавить ложные.\nДля диаграмм WINDOW_TICKS = 12; разместите события у границы двух окон и проверьте оба результата.',
    },
  ),

  system(
    'breathing-pwm',
    'Плавное дыхание LED',
    'PWM и треугольное изменение яркости без нового такта.',
    `    reg [7:0] phase;
    reg [17:0] ticks;
    reg [7:0] level;
    reg down;
    always @(posedge clk) begin
        if (!reset_n) begin phase <= 0; ticks <= 0; level <= 0; down <= 0; end
        else begin
            phase <= phase + 1'b1;
            if (ticks == LEVEL_TICKS - 1) begin
                ticks <= 0;
                if (!down) begin
                    if (level == 255) begin down <= 1; level <= 254; end
                    else level <= level + 1'b1;
                end else begin
                    if (level == 0) begin down <= 0; level <= 1; end
                    else level <= level - 1'b1;
                end
            end else ticks <= ticks + 1'b1;
        end
    end
    assign led_n = {5'b11111, ~(phase < level)};`,
    {
      button: false,
      parameters: 'parameter integer LEVEL_TICKS = 105_469',
      notes:
        'Яркость растёт от 0 до 255 и обратно примерно за две секунды. PWM-период — 256 тактов.\nLED0 получает сравнение phase < level: level = 0 выключает, 128 даёт 50%, 255 даёт 255/256.\nLEVEL_TICKS = 1 ускоряет изменение; нужно хотя бы 520 тактов, чтобы увидеть полный треугольник.\nВ виртуальной плате виден мгновенный уровень, а не интегрирование яркости человеческим глазом.\nНа развороте не допускаем переполнения 255→0: сначала меняется направление.',
    },
  ),

  system(
    'walking-pairs',
    'Два огня навстречу',
    'Два независимых кольца и их объединение.',
    `    reg [21:0] ticks;
    reg [5:0] left, right;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; left <= 6'b000001; right <= 6'b100000; end
        else if (ticks == STEP_TICKS - 1) begin
            ticks <= 0; left <= {left[4:0], left[5]}; right <= {right[0], right[5:1]};
        end else ticks <= ticks + 1'b1;
    end
    assign led_n = ~(left | right);`,
    {
      button: false,
      parameters: 'parameter integer STEP_TICKS = 2_700_000',
      notes:
        'Два кольцевых регистра движутся навстречу, а OR соединяет их на LED.\nОтличие от одного бегущего огня: данные хранятся отдельно и могут совпасть на одном светодиоде.\nSTEP_TICKS = 2 для симуляции; наблюдайте 100001→010010→001100→001100→010010→100001.\nСброс задаёт обе стартовые позиции; направление не создаёт отдельные тактовые домены.',
    },
  ),

  system(
    'serial-parity',
    'Последовательный бит чётности',
    'XOR копит четыре входных бита и выдаёт результат кадра.',
    `${pressSync}
    reg [1:0] position;
    reg parity, published;
    reg [3:0] word;
    always @(posedge clk) begin
        if (!reset_n) begin position <= 0; parity <= 0; published <= 0; word <= 0; end
        else begin
            word <= {word[2:0], !synced};
            if (position == 3) begin position <= 0; published <= parity ^ (!synced); parity <= 0; end
            else begin position <= position + 1'b1; parity <= parity ^ (!synced); end
        end
    end
    assign led_n = ~{1'b0, published, word};`,
    {
      notes:
        'В каждом такте один бит: отпущена = 0, нажата = 1. Это поток, а не событие нажатия.\nКаждые четыре такта published становится XOR последних четырёх битов; это бит для чётной чётности.\nLED0…3 — последние данные, LED4 — опубликованный XOR. Последовательность 1,0,1,1 даст XOR = 1.\nСинхронизатор добавляет два такта перед накопителем. В реальном протоколе нужен сигнал начала кадра.\nНа плате удержание кнопки даёт одинаковые биты; осмысленные кадры задавайте в диаграммах.',
    },
  ),

  system(
    'crc4',
    'CRC-4 по последовательным битам',
    'Сдвиг с обратной связью по полиному x⁴+x+1.',
    `${pressSync}
    reg [3:0] crc;
    reg [1:0] bit_index;
    wire feedback = crc[3] ^ (!synced);
    always @(posedge clk) begin
        if (!reset_n) begin crc <= 0; bit_index <= 0; end
        else begin
            crc <= {crc[2:0], 1'b0} ^ (feedback ? 4'b0011 : 4'b0000);
            bit_index <= bit_index + 1'b1;
        end
    end
    assign led_n = ~{bit_index, crc};`,
    {
      notes:
        'Обрабатываем поток MSB-first: входной бит XOR старший CRC, затем сдвиг и условный XOR 0011.\nНачальное CRC = 0, финальной инверсии нет. Это учебная конфигурация, не универсальный стандарт пакетов.\nПосле четырёх единиц CRC равно 0010; сравните с ручным делением двоичных полиномов.\nLED0…3 — CRC, LED4…5 — число битов по модулю 4. Два такта синхронизации задерживают вход.\nДля реального кадра понадобится отдельное начало/конец и выбранные правила отражения битов.',
    },
  ),

  system(
    'lfsr6',
    'Псевдослучайная последовательность',
    'LFSR с 63 ненулевыми состояниями.',
    `    reg [5:0] state;
    reg [21:0] ticks;
    always @(posedge clk) begin
        if (!reset_n) begin state <= 6'b000001; ticks <= 0; end
        else if (ticks == STEP_TICKS - 1) begin ticks <= 0; state <= {state[4:0], state[5] ^ state[4]}; end
        else ticks <= ticks + 1'b1;
    end
    assign led_n = ~state;`,
    {
      button: false,
      parameters: 'parameter integer STEP_TICKS = 2_700_000',
      notes:
        'XOR двух старших разрядов возвращается в младший: полином x⁶+x⁵+1.\nИз seed = 1 последовательность проходит 63 разных ненулевых числа и возвращается в 1.\nНулевой seed запрещён: ноль замкнётся навсегда. Это детерминированный генератор, не криптография.\nSTEP_TICKS = 1 и 64 такта покажут полный период; на плате новое состояние каждые 0,1 с.',
    },
  ),

  system(
    'sequence-1011',
    'Распознаватель 1011',
    'Автомат Мили обнаруживает образец, включая перекрытия.',
    `${pressSync}
    reg [1:0] state;
    reg matched;
    reg [2:0] hits;
    wire bit_in = !synced;
    wire hit = (state == 3) && bit_in;
    always @(posedge clk) begin
        if (!reset_n) begin state <= 0; matched <= 0; hits <= 0; end
        else begin
            matched <= hit;
            if (hit) hits <= hits + 1'b1;
            case (state)
                0: state <= bit_in ? 1 : 0;
                1: state <= bit_in ? 1 : 2;
                2: state <= bit_in ? 3 : 0;
                3: state <= bit_in ? 1 : 2;
            endcase
        end
    end
    assign led_n = ~{hits, matched, state};`,
    {
      notes:
        'Состояния означают найденный префикс: 0 — пусто, 1 — «1», 2 — «10», 3 — «101».\nПри state = 3 и входе 1 возникает hit. После совпадения остаётся префикс «1», поэтому перекрытия сохраняются.\nПоток 1011011 содержит два совпадения. Один бит задаётся на каждый такт, после синхронизатора.\nLED0…1 — состояние, LED2 — импульс совпадения, LED3…5 — число совпадений.\nНа плате это демонстрация структуры автомата; для человеческого ввода добавьте медленный enable.',
    },
  ),

  system(
    'door-controller',
    'Автомат двери',
    'Открытие, удержание и автоматическое закрытие.',
    `${pressSync}
    localparam CLOSED = 0, OPENING = 1, OPEN = 2, CLOSING = 3;
    reg [1:0] state;
    reg [23:0] ticks;
    always @(posedge clk) begin
        if (!reset_n) begin state <= CLOSED; ticks <= 0; end
        else begin
            case (state)
                CLOSED: if (press) begin state <= OPENING; ticks <= 0; end
                OPENING: if (ticks == MOVE_TICKS - 1) begin state <= OPEN; ticks <= 0; end
                         else ticks <= ticks + 1'b1;
                OPEN: if (press) ticks <= 0;
                      else if (ticks == HOLD_TICKS - 1) begin state <= CLOSING; ticks <= 0; end
                      else ticks <= ticks + 1'b1;
                CLOSING: if (press) begin state <= OPENING; ticks <= 0; end
                         else if (ticks == MOVE_TICKS - 1) begin state <= CLOSED; ticks <= 0; end
                         else ticks <= ticks + 1'b1;
            endcase
        end
    end
    assign led_n = ~(6'b000001 << state);`,
    {
      parameters:
        'parameter integer MOVE_TICKS = 6_750_000,\n    parameter integer HOLD_TICKS = 13_500_000',
      notes:
        'LED0 — закрыто, LED1 — открывается, LED2 — открыто, LED3 — закрывается.\nНажатие открывает. В OPEN новое нажатие продлевает удержание; при закрытии меняет направление.\nMOVE_TICKS = 2 и HOLD_TICKS = 4 ускорят симуляцию. Проверьте повторный запрос при закрытии.\nЭто только учебная индикация: нет мотора, концевиков, защиты от препятствия и аппаратной безопасности.\nСинхронизация кнопки не заменяет антидребезг.',
    },
  ),

  system(
    'request-ack',
    'Запрос и подтверждение',
    'Один запрос хранится до получения ответа.',
    `${pressSync}
    reg pending, acknowledged;
    reg [23:0] latency;
    reg [3:0] completed;
    always @(posedge clk) begin
        if (!reset_n) begin pending <= 0; acknowledged <= 0; latency <= 0; completed <= 0; end
        else begin
            acknowledged <= 0;
            if (!pending) begin
                if (press) begin pending <= 1; latency <= 0; end
            end else if (latency == RESPONSE_TICKS - 1) begin
                pending <= 0; acknowledged <= 1; completed <= completed + 1'b1;
            end else latency <= latency + 1'b1;
        end
    end
    assign led_n = ~{acknowledged, pending, completed};`,
    {
      parameters: 'parameter integer RESPONSE_TICKS = 6_750_000',
      notes:
        'Кнопка — запрос, внутренний потребитель отвечает через RESPONSE_TICKS.\nLED4 — запрос ожидает ответа, LED5 — однотактовый ack, LED0…3 — число завершённых операций.\nЗапросы во время pending игнорируются: это один слот, не FIFO. Данные должны быть стабильны до ack.\nRESPONSE_TICKS = 3 для диаграмм; подтвердите, что длительность pending равна трём тактам.\nВ настоящем CDC req/ack синхронизируют по обоим направлениям; здесь обе стороны используют clk.',
    },
  ),

  system(
    'elevator-fsm',
    'Лифт между двумя этажами',
    'Запрос, движение и прибытие с памятью направления.',
    `${pressSync}
    reg floor, moving;
    reg [23:0] travel;
    always @(posedge clk) begin
        if (!reset_n) begin floor <= 0; moving <= 0; travel <= 0; end
        else if (!moving) begin
            if (press) begin moving <= 1; travel <= 0; end
        end else if (travel == TRAVEL_TICKS - 1) begin moving <= 0; floor <= ~floor; travel <= 0; end
        else travel <= travel + 1'b1;
    end
    assign led_n = ~{3'b000, moving, (floor && !moving), (!floor && !moving)};`,
    {
      parameters: 'parameter integer TRAVEL_TICKS = 13_500_000',
      notes:
        'LED0 — нижний этаж, LED1 — верхний, LED2 — движение. Новое нажатие отправляет на другой этаж.\nВо время движения запросы игнорируются, чтобы не менять цель в пути. floor меняется только при прибытии.\nTRAVEL_TICKS = 4 для короткой симуляции; проверьте оба направления и нажатие во время движения.\nЭта схема — учебная модель состояний; реальный лифт требует датчиков и систем безопасности.\nНе подключайте привод. Используются только встроенные LED и кнопка без антидребезга.',
    },
  ),

  system(
    'vending-fsm',
    'Автомат с монетами',
    'Три события дают товар, удержание кнопки не считается повторно.',
    `${pressSync}
    reg [1:0] credit;
    reg dispense;
    reg [2:0] sales;
    always @(posedge clk) begin
        if (!reset_n) begin credit <= 0; dispense <= 0; sales <= 0; end
        else begin
            dispense <= 0;
            if (press) begin
                if (credit == 2) begin credit <= 0; dispense <= 1; sales <= sales + 1'b1; end
                else credit <= credit + 1'b1;
            end
        end
    end
    assign led_n = ~{sales, dispense, credit};`,
    {
      notes:
        'Одно нажатие — одна условная монета. После третьей credit возвращается в 0 и dispense = 1 один такт.\nLED0…1 — кредит, LED2 — выдача, LED3…5 — число продаж 0…7.\nУдержание даёт один фронт; для трёх монет нужны три нажатия с отпусканиями не короче двух тактов.\nРеальная механическая кнопка дребезжит: перед подсчётом монет нужен антидребезг.\nЭто упражнение по автоматам, а не платёжное устройство; счётчик продаж переполняется по модулю 8.',
    },
  ),

  system(
    'arbiter-round-robin',
    'Арбитр round-robin',
    'При двух запросах приоритет чередуется без голодания.',
    `${pressSync}
    reg prefer_b;
    reg [1:0] grant;
    reg [2:0] turns;
    wire request_a = !synced;
    wire request_b = 1'b1;
    always @(posedge clk) begin
        if (!reset_n) begin prefer_b <= 0; grant <= 0; turns <= 0; end
        else begin
            if (request_a && request_b) begin grant <= prefer_b ? 2'b10 : 2'b01; prefer_b <= ~prefer_b; end
            else if (request_a) begin grant <= 2'b01; prefer_b <= 1; end
            else if (request_b) begin grant <= 2'b10; prefer_b <= 0; end
            else grant <= 0;
            if (request_a || request_b) turns <= turns + 1'b1;
        end
    end
    assign led_n = ~{turns, prefer_b, grant};`,
    {
      notes:
        'Клиент B просит всегда, клиент A — пока кнопка нажата. Каждому выданному grant соответствует один такт.\nLED0/1 — разрешение A/B, LED2 — следующий приоритет, LED3…5 — число обслуженных тактов.\nПри обоих запросах grant идёт A,B,A,B; одновременно оба бита grant никогда не равны 1.\nСравните с фиксированным приоритетом: там B мог бы голодать при постоянном A.\nНа плате переключения 27 МГц усредняются; точную справедливость видно на диаграммах.',
    },
  ),

  system(
    'fifo-four',
    'FIFO на четыре слова',
    'Кольцевые указатели и полный/пустой буфер.',
    `${pressSync}
    reg [3:0] memory [0:3];
    reg [1:0] write_ptr, read_ptr;
    reg [2:0] used;
    reg [3:0] next_data, last_read;
    integer i;
    always @(posedge clk) begin
        if (!reset_n) begin
            write_ptr <= 0; read_ptr <= 0; used <= 0; next_data <= 1; last_read <= 0;
            for (i = 0; i < 4; i = i + 1) memory[i] <= 0;
        end else if (press) begin
            // Нажатие читает, остальные такты заполняют FIFO до полного.
            if (used != 0) begin last_read <= memory[read_ptr]; read_ptr <= read_ptr + 1'b1; used <= used - 1'b1; end
        end else if (used < 4) begin
            memory[write_ptr] <= next_data; next_data <= next_data + 1'b1;
            write_ptr <= write_ptr + 1'b1; used <= used + 1'b1;
        end
    end
    assign led_n = ~{(used == 4), (used == 0), last_read};`,
    {
      category: 'memory',
      notes:
        'После сброса внутренний источник записывает 1,2,3,4 и останавливается на full.\nКаждое нажатие читает старейшее слово; на следующем свободном такте источник добавляет новое.\nLED0…3 — последнее прочитанное слово, LED4 — empty, LED5 — full. Порядок чтения 1,2,3,4,5.\nОчередь хранит 4×4 бита; Yosys может собрать её из регистров, а не BRAM: слишком маленькая память.\nСброс очищает данные и указатели. Этот FIFO однодоменный; для двух clk нужны Gray-указатели и CDC.\nДребезг может прочитать несколько слов: в железе используйте фильтр кнопки.',
    },
  ),

  system(
    'stack-four',
    'Стек на четыре слова',
    'Последнее записанное слово читается первым.',
    `${pressSync}
    reg [3:0] memory [0:3];
    reg [2:0] depth;
    reg [3:0] next_data, last_pop;
    integer i;
    always @(posedge clk) begin
        if (!reset_n) begin
            depth <= 0; next_data <= 1; last_pop <= 0;
            for (i = 0; i < 4; i = i + 1) memory[i] <= 0;
        end else if (press) begin
            if (depth != 0) begin last_pop <= memory[depth - 1'b1]; depth <= depth - 1'b1; end
        end else if (depth < 4) begin memory[depth] <= next_data; next_data <= next_data + 1'b1; depth <= depth + 1'b1; end
    end
    assign led_n = ~{(depth == 4), (depth == 0), last_pop};`,
    {
      category: 'memory',
      notes:
        'Внутренний источник кладёт 1,2,3,4; нажатие снимает вершину, первое чтение даст 4, а не 1.\nПосле освобождения места источник сразу кладёт следующее число: сравните этот результат с FIFO.\nLED0…3 — последнее снятое слово, LED4 — empty, LED5 — full. Границы проверяются до доступа к массиву.\nВсего 16 бит памяти обычно реализуются триггерами. Для поведения LIFO смотрите depth и memory в симуляции.\nКнопка синхронизирована, но её дребезг не подавлен.',
    },
  ),

  system(
    'ram-write-read',
    'RAM: запись и чтение',
    'Сначала заполняем массив, затем проверяем синхронное чтение.',
    `    reg [3:0] memory [0:3];
    reg [1:0] address;
    reg writing;
    reg [3:0] data;
    integer i;
    always @(posedge clk) begin
        if (!reset_n) begin
            address <= 0; writing <= 1; data <= 0;
            for (i = 0; i < 4; i = i + 1) memory[i] <= 0;
        end else begin
            if (writing) begin
                memory[address] <= {address, ~address};
                if (address == 3) writing <= 0;
            end else data <= memory[address];
            address <= address + 1'b1;
        end
    end
    assign led_n = ~{writing, address[0], data};`,
    {
      button: false,
      category: 'memory',
      notes:
        'Четыре адреса заполняются узорами 0011,0110,1001,1100; затем читаются по кругу.\ndata — регистр чтения: после фронта он содержит слово по адресу, который был ДО фронта.\nLED0…3 — data, LED4 — младший бит следующего адреса, LED5 — фаза записи.\nЭто учебная RAM на 16 бит. Сброс массива исключает X в диаграммах, но мешает прямому выводу в BRAM.\nДля большой памяти очищают валидность/содержимое отдельным проходом и соблюдают возможности примитива BRAM.',
    },
  ),

  system(
    'rom-melody',
    'ROM с последовательностью узоров',
    'Адрес выбирает заранее заданное слово.',
    `    reg [2:0] address;
    reg [21:0] ticks;
    reg [5:0] pattern;
    always @* begin
        case (address)
            0: pattern = 6'b000001; 1: pattern = 6'b000011;
            2: pattern = 6'b000111; 3: pattern = 6'b001111;
            4: pattern = 6'b011111; 5: pattern = 6'b111111;
            6: pattern = 6'b010101; 7: pattern = 6'b101010;
        endcase
    end
    always @(posedge clk) begin
        if (!reset_n) begin address <= 0; ticks <= 0; end
        else if (ticks == STEP_TICKS - 1) begin address <= address + 1'b1; ticks <= 0; end
        else ticks <= ticks + 1'b1;
    end
    assign led_n = ~pattern;`,
    {
      button: false,
      category: 'memory',
      parameters: 'parameter integer STEP_TICKS = 2_700_000',
      notes:
        'Название «мелодия» — аналогия: ROM хранит партитуру световых узоров, звука и аудиовыхода здесь нет.\ncase задаёт восемь постоянных слов; адрес ходит 0…7. LUT могут реализовать такую маленькую ROM.\nSTEP_TICKS = 1 для диаграмм; сравните все восемь слов и возврат к первому.\nНа плате смена слова каждые 0,1 с. В памяти хранится содержание, счётчик определяет темп.',
    },
  ),

  system(
    'lookup-sine',
    'Таблица синусоиды',
    'Четыре четверти формы из маленькой ROM.',
    `    reg [3:0] phase;
    reg [21:0] ticks;
    reg [5:0] sample;
    always @* begin
        case (phase)
            0: sample = 32; 1: sample = 44; 2: sample = 54; 3: sample = 61;
            4: sample = 63; 5: sample = 61; 6: sample = 54; 7: sample = 44;
            8: sample = 32; 9: sample = 20; 10: sample = 10; 11: sample = 3;
            12: sample = 0; 13: sample = 3; 14: sample = 10; 15: sample = 20;
        endcase
    end
    always @(posedge clk) begin
        if (!reset_n) begin phase <= 0; ticks <= 0; end
        else if (ticks == SAMPLE_TICKS - 1) begin phase <= phase + 1'b1; ticks <= 0; end
        else ticks <= ticks + 1'b1;
    end
    assign led_n = ~sample;`,
    {
      button: false,
      category: 'memory',
      parameters: 'parameter integer SAMPLE_TICKS = 2_700_000',
      notes:
        '16 отсчётов приближённой синусоиды в беззнаковом диапазоне 0…63.\nLED показывают двоичный код отсчёта: это НЕ аналоговый ЦАП и не плавная яркость.\nSAMPLE_TICKS = 1; на диаграмме выберите числовой формат sample и сравните симметрию таблицы.\nphase управляет ROM, sample — комбинационный результат. Для аналогового выхода понадобятся DAC или PWM и фильтр.',
    },
  ),

  system(
    'uart-tx',
    'UART-передатчик 8N1',
    'По нажатию отправляем байт ASCII A на настоящий TX платы.',
    `${pressSync}
    reg [8:0] baud_count;
    reg [3:0] position;
    reg busy;
    reg tx;
    always @(posedge clk) begin
        if (!reset_n) begin baud_count <= 0; position <= 0; busy <= 0; tx <= 1; end
        else if (!busy) begin
            tx <= 1;
            if (press) begin busy <= 1; position <= 0; baud_count <= 0; tx <= 0; end
        end else if (baud_count == BIT_TICKS - 1) begin
            baud_count <= 0;
            if (position == 9) begin busy <= 0; tx <= 1; end
            else begin
                position <= position + 1'b1;
                case (position)
                    0: tx <= 1; 1: tx <= 0; 2: tx <= 0; 3: tx <= 0;
                    4: tx <= 0; 5: tx <= 0; 6: tx <= 1; 7: tx <= 0;
                    default: tx <= 1;
                endcase
            end
        end else baud_count <= baud_count + 1'b1;
    end
    assign uart_tx = tx;
    assign led_n = ~{busy, position, !tx};`,
    {
      parameters: 'parameter integer BIT_TICKS = 234',
      ports: 'output wire uart_tx',
      pins: [['uart_tx', 69, 'UART_TX FPGA → встроенный USB-UART, 8N1, примерно 115200 бод.']],
      notes:
        'TX вывод 69 идёт к встроенному USB-UART. Откройте соответствующий serial port: 115200, 8N1.\nБайт 0x41 («A»): старт 0, биты 1,0,0,0,0,0,1,0 младшим вперёд, стоп 1.\n27 000 000 / 234 ≈ 115 385 бод; отличие от 115 200 около 0,16%. BIT_TICKS = 4 для симуляции.\nНажатие во время busy игнорируется; FIFO здесь нет. После сброса TX держит обязательную единицу покоя.\nКнопка без антидребезга может отправить несколько байтов. LED5 — busy, LED0 — инверсия TX.',
    },
  ),

  system(
    'uart-rx',
    'UART-приёмник 8N1',
    'Принимаем байт по RX и показываем младшие пять битов.',
    `    reg rx_meta, rx_sync;
    reg [8:0] ticks;
    reg [3:0] position;
    reg receiving, valid;
    reg [7:0] shift, received;
    always @(posedge clk) begin
        if (!reset_n) begin
            rx_meta <= 1; rx_sync <= 1; ticks <= 0; position <= 0;
            receiving <= 0; valid <= 0; shift <= 0; received <= 0;
        end else begin
            rx_meta <= uart_rx; rx_sync <= rx_meta;
            if (!receiving) begin
                if (!rx_sync) begin receiving <= 1; ticks <= (BIT_TICKS / 2) - 1; position <= 0; end
            end else if (ticks != 0) ticks <= ticks - 1'b1;
            else begin
                ticks <= BIT_TICKS - 1;
                if (position == 0) begin
                    if (rx_sync) receiving <= 0;
                    else position <= 1;
                end else if (position <= 8) begin shift[position - 1'b1] <= rx_sync; position <= position + 1'b1; end
                else begin
                    receiving <= 0;
                    if (rx_sync) begin received <= shift; valid <= 1; end
                end
            end
        end
    end
    assign led_n = ~{valid, received[4:0]};`,
    {
      button: false,
      parameters: 'parameter integer BIT_TICKS = 234',
      ports: 'input wire uart_rx',
      pins: [['uart_rx', 70, 'UART_RX встроенный USB-UART → FPGA, 8N1, примерно 115200 бод.']],
      notes:
        'Отправьте байт в serial port платы: 115200, 8N1. RX идёт на FPGA-вывод 70.\nСначала подтверждаем середину стартового нуля, затем берём по одному биту в середине каждого интервала.\nДанные идут LSB-first. Некорректный стоп (0) отбрасывает кадр. valid хранится до сброса.\nLED0…4 — младшие пять битов принятого байта, LED5 — получен корректный кадр.\nBIT_TICKS = 8 для короткой симуляции; вход должен быть 1 в покое, затем 0 старт, 8 бит и 1 стоп.\nПараметр не меньше 4. Это одинарная выборка без oversampling, контроля чётности и FIFO.',
    },
  ),

  system(
    'spi-loopback',
    'SPI mode 0: внутренний loopback',
    'Передатчик и приёмник соединены внутри FPGA.',
    `${pressSync}
    reg [23:0] ticks;
    reg busy, sck, cs_n;
    reg [2:0] bit_index;
    reg [7:0] transmitted, received;
    wire mosi = transmitted[7];
    wire miso = mosi;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; busy <= 0; sck <= 0; cs_n <= 1; bit_index <= 0; transmitted <= 8'hA6; received <= 0; end
        else if (!busy) begin
            if (press) begin busy <= 1; cs_n <= 0; sck <= 0; ticks <= 0; bit_index <= 0; transmitted <= 8'hA6; received <= 0; end
        end else if (ticks == HALF_TICKS - 1) begin
            ticks <= 0; sck <= ~sck;
            if (!sck) received <= {received[6:0], miso};
            else if (bit_index == 7) begin busy <= 0; cs_n <= 1; end
            else begin transmitted <= {transmitted[6:0], 1'b0}; bit_index <= bit_index + 1'b1; end
        end else ticks <= ticks + 1'b1;
    end
    assign led_n = ~{busy, received[4:0]};`,
    {
      parameters: 'parameter integer HALF_TICKS = 1_350_000',
      notes:
        'Mode 0: SCK в покое 0, приём на растущем фронте, смена MOSI на падающем. MSB-first.\nПо кнопке передаём 0xA6. Внутренний miso = mosi возвращает те же биты в received.\nLED0…4 показывают младшие биты, LED5 — busy. HALF_TICKS = 1 для 16 полупериодов в симуляции.\nSCK, CS и MOSI остаются ВНУТРЕННИМИ сигналами: CST не заявляет непроверенные контакты разъёма.\nНастоящая SPI-периферия потребует назначений контактов, согласования напряжений и проверки тайминга.',
    },
  ),

  system(
    'i2c-pattern',
    'I²C: START и STOP',
    'Учебная последовательность линий с моделью открытого стока.',
    `${pressSync}
    reg [23:0] ticks;
    reg [2:0] state;
    reg drive_sda_low, drive_scl_low;
    wire sda = ~drive_sda_low;
    wire scl = ~drive_scl_low;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; state <= 0; drive_sda_low <= 0; drive_scl_low <= 0; end
        else if (state == 0) begin
            if (press) begin state <= 1; ticks <= 0; drive_sda_low <= 1; end
        end else if (ticks == STEP_TICKS - 1) begin
            ticks <= 0;
            case (state)
                1: begin state <= 2; drive_scl_low <= 1; end
                2: begin state <= 3; drive_sda_low <= 0; end
                3: begin state <= 4; drive_scl_low <= 0; end
                4: begin state <= 5; drive_scl_low <= 1; end
                5: begin state <= 6; drive_sda_low <= 1; end
                6: begin state <= 7; drive_scl_low <= 0; end
                7: begin state <= 0; drive_sda_low <= 0; end
            endcase
        end else ticks <= ticks + 1'b1;
    end
    assign led_n = ~{(state != 0), state, scl, sda};`,
    {
      parameters: 'parameter integer STEP_TICKS = 1_350_000',
      notes:
        'START — SDA падает при высоком SCL; STOP — SDA растёт при высоком SCL.\nМежду ними передаём один учебный бит 1. Это демонстрация формы, не полноценный I²C-контроллер.\nВнутренние pull-up идеальны: drive_low = 0 означает отпустить линию, а не силой подать 1.\nLED0/1 — SDA/SCL, LED2…4 — состояние, LED5 — busy. STEP_TICKS = 1 для диаграмм.\nНет адреса, ACK, clock stretching и арбитража. Внешние контакты не используются, поэтому CST только для кнопки/LED.',
    },
  ),

  system(
    'serial-sum',
    'Последовательный сумматор',
    'Один полный сумматор обрабатывает четыре разряда за четыре такта.',
    `${pressSync}
    reg [3:0] a_shift, b_shift, result;
    reg [1:0] position;
    reg carry, busy, done;
    wire [1:0] bit_sum = {1'b0, a_shift[0]} + {1'b0, b_shift[0]} + carry;
    always @(posedge clk) begin
        if (!reset_n) begin a_shift <= 0; b_shift <= 0; result <= 0; position <= 0; carry <= 0; busy <= 0; done <= 0; end
        else if (!busy) begin
            if (press) begin a_shift <= 4'd9; b_shift <= 4'd7; result <= 0; position <= 0; carry <= 0; busy <= 1; done <= 0; end
        end else begin
            result[position] <= bit_sum[0]; carry <= bit_sum[1];
            a_shift <= {1'b0, a_shift[3:1]}; b_shift <= {1'b0, b_shift[3:1]};
            if (position == 3) begin busy <= 0; done <= 1; end
            else position <= position + 1'b1;
        end
    end
    assign led_n = ~{done, carry, result};`,
    {
      notes:
        'По кнопке загружаем 9 и 7; результат 16 = carry 1 + четыре нуля.\nКаждый такт считается один разряд, начиная с младшего; carry переносится в следующий такт.\nLED0…3 — сумма, LED4 — перенос, LED5 — готово. Внутренние a_shift/b_shift показывают оставшиеся биты.\nСравните площадь с четырёхразрядным параллельным сумматором и задержку в четыре такта.\nГотовый результат удерживается до нового нажатия; кнопка синхронизирована, но без фильтра дребезга.',
    },
  ),

  system(
    'majority-filter',
    'Фильтр большинства 3 отсчётов',
    'Изолированный выброс не меняет выход.',
    `${pressSync}
    reg [2:0] history;
    wire majority = (history[0] & history[1]) | (history[0] & history[2]) | (history[1] & history[2]);
    always @(posedge clk) begin
        if (!reset_n) history <= 0;
        else history <= {history[1:0], !synced};
    end
    assign led_n = ~{2'b00, majority, history};`,
    {
      notes:
        'Каждый такт сдвигаем признак нажатия. Выход равен 1, если единиц среди последних трёх хотя бы две.\nОдиночный выброс 0,1,0 не пройдёт; два соседних 1 пройдут. LED3 — отфильтрованный сигнал.\nLED0…2 — окно отсчётов. Перед ним два триггера синхронизации; общая задержка видна в диаграммах.\nЭто фильтр коротких цифровых помех, а не готовый антидребезг на миллисекунды при 27 МГц.\nСравните с антидребезгом по устойчивому интервалу: критерии принятия входа разные.',
    },
  ),

  system(
    'capture-minmax',
    'Минимум и максимум потока',
    'Память экстремумов с отдельным сбросом измерения.',
    `${pressSync}
    reg [2:0] sample, minimum, maximum;
    always @(posedge clk) begin
        if (!reset_n) begin sample <= 0; minimum <= 7; maximum <= 0; end
        else begin
            sample <= sample + 1'b1;
            if (press) begin minimum <= sample; maximum <= sample; end
            else begin
                if (sample < minimum) minimum <= sample;
                if (sample > maximum) maximum <= sample;
            end
        end
    end
    assign led_n = ~{maximum, minimum};`,
    {
      notes:
        'Внутренний тестовый поток sample идёт 0…7. minimum и maximum хранят экстремумы обработанных значений.\nLED0…2 — минимум, LED3…5 — максимум. Начальный min = 7, max = 0 задают корректные границы диапазона.\nНажатие начинает новое окно измерения с текущего sample. Сначала используется старый sample, затем он увеличивается.\nВ диаграммах проверьте первые восемь отсчётов, перезапуск в середине диапазона и переход 7→0.\nДля настоящего датчика потребуется внешний интерфейс и сигнал valid, чтобы учитывать только новые данные.',
    },
  ),

  system(
    'bcd-stopwatch',
    'Десятичные цифры BCD',
    'Два десятичных счётчика с переносом 9→0.',
    `    reg [24:0] ticks;
    reg [3:0] units, tens;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 0; units <= 0; tens <= 0; end
        else if (ticks == SECOND_TICKS - 1) begin
            ticks <= 0;
            if (units == 9) begin units <= 0; tens <= tens == 9 ? 0 : tens + 1'b1; end
            else units <= units + 1'b1;
        end else ticks <= ticks + 1'b1;
    end
    // На шести LED показываем единицы и два младших бита десятков.
    assign led_n = ~{tens[1:0], units};`,
    {
      button: false,
      parameters: 'parameter integer SECOND_TICKS = 27_000_000',
      notes:
        'units и tens — отдельные BCD-цифры 0…9; они никогда не становятся 10…15.\nПосле 09 идёт 10, после 99 — 00. Это не шестибитный двоичный счётчик.\nLED0…3 показывают единицы, LED4…5 — только два младших бита десятков: все цифры смотрите в диаграммах.\nSECOND_TICKS = 1 и 101 такт позволят проверить весь цикл 00…99.\nДля семисегментного индикатора добавьте BCD-декодер и проверенные назначения выводов; индикатор здесь не подключён.',
    },
  ),
];
