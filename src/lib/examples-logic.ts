import type { Example } from './examples';
import { learningExample, clockPin, resetPin, ledPins } from './example-kit';

const buttons: [string, number, string][] = [
  ['button_a', 87, 'Первая кнопка: нажата = 1, отпущена = 0.'],
  ['button_b', 88, 'Вторая кнопка: нажата = 1, отпущена = 0.'],
];
const modePin: [string, number, string] = [
  'button',
  87,
  'Кнопка выбора S2: нажата = 1, отпущена = 0.',
];

function gates(
  id: string,
  title: string,
  description: string,
  comments: string,
  body: string,
): Example {
  return learningExample(
    id,
    title,
    description,
    `// ${comments.replaceAll('\n', '\n// ')}
// a/b — признаки нажатия; LED0…5 светятся при 0 на соответствующем led_n.
// В диаграммах задайте button_a/button_b = 00, 01, 10, 11: четыре комбинации кнопок.
// Тактовый сигнал не нужен. Неназначенные смыслом LED погашены.
module top(input wire button_a, input wire button_b, output wire [5:0] led_n);
    // Кнопка платы даёт 1 при нажатии и 0 в покое.
    wire a = button_a;
    wire b = button_b;
${body}
endmodule
`,
    [...buttons, ...ledPins()],
  );
}

// Один генератор тестовых чисел экономит внешние переключатели, которых на плате нет.
// Его состояние и выходы каждого опыта видны в RTL и временных диаграммах.
function demo(
  id: string,
  title: string,
  description: string,
  comments: string,
  body: string,
  withButton = false,
): Example {
  return learningExample(
    id,
    title,
    description,
    `// ${comments.replaceAll('\n', '\n// ')}
// sample перебирает числа 0…63 с шагом 0,25 с от генератора платы 27 МГц.
// После включения sample = 0. Нажатая кнопка 88 удерживает синхронный сброс.
// LED0…5 показывают lights: 1 в lights зажигает LED через инверсию led_n.
// Для короткой симуляции замените STEP_TICKS на 1 и задайте clk/reset,
// сброс на два фронта и 66 циклов. На плате верните 6_750_000.
// Изменение скорости просмотра диаграмм не сокращает аппаратный делитель.
module top #(
    parameter integer STEP_TICKS = 6_750_000
)(input wire clk, input wire reset, ${withButton ? 'input wire button, ' : ''}output wire [5:0] led_n);
    // Кнопки платы дают 1 при нажатии и 0 в покое. Внутри схемы сброс и кнопка
    // активны нулём, поэтому сразу на входе стоит инверсия.
    wire reset_n = ~reset;${withButton ? '\n    wire button_n = ~button;' : ''}
    reg [25:0] ticks = 26'd0;
    reg [5:0] sample = 6'd0;
    always @(posedge clk) begin
        if (!reset_n) begin ticks <= 26'd0; sample <= 6'd0; end
        else if (ticks == STEP_TICKS - 1) begin ticks <= 26'd0; sample <= sample + 6'd1; end
        else ticks <= ticks + 26'd1;
    end
${body}
    assign led_n = ~lights;
endmodule
`,
    [clockPin, resetPin, ...(withButton ? [modePin] : []), ...ledPins()],
  );
}

export const logicExamples: Example[] = [
  demo(
    'full-adder',
    'Полный сумматор',
    'Два бита, входной перенос и двухбитная сумма.',
    'a = sample[0], b = sample[1]; кнопка 87 задаёт входной перенос cin.\nLED0 — сумма, LED1 — выходной перенос; LED2/3/4 показывают a/b/cin.\nБез нажатий в начале всё погашено. Нажатие 87 добавляет единицу.',
    `    wire a = sample[0], b = sample[1], cin = ~button_n;
    wire [1:0] result = {1'b0, a} + {1'b0, b} + {1'b0, cin};
    wire [5:0] lights = {1'b0, cin, b, a, result};`,
    true,
  ),

  demo(
    'full-subtractor',
    'Полный вычитатель',
    'Разность одного разряда и входной/выходной заём.',
    'a = sample[0], b = sample[1]; нажатие 87 задаёт входной заём bin.\nLED0 — разность по модулю 2, LED1 — заём; LED2/3/4 — a/b/bin.\nПри a=0,b=0,bin=1 разность и заём равны 1: проверьте на диаграммах.',
    `    wire a = sample[0], b = sample[1], bin = ~button_n;
    wire difference = a ^ b ^ bin;
    wire borrow = (~a & b) | (~(a ^ b) & bin);
    wire [5:0] lights = {1'b0, bin, b, a, borrow, difference};`,
    true,
  ),

  gates(
    'implication',
    'Если A, то B',
    'Импликация нарушена только для A=1, B=0.',
    'LED0 показывает a → b, LED1 — нарушение правила a И НЕ b.\nВ покое LED0 горит. Если нажать только первую кнопку, загорится LED1.',
    `    wire [5:0] lights = {4'b0000, (a & ~b), (~a | b)};
    assign led_n = ~lights;`,
  ),

  demo(
    'exactly-two',
    'Ровно два из трёх',
    'Проверка количества единиц без проверки их положения.',
    'a/b — младшие биты sample, c — нажатие 87. LED0 горит при ровно двух единицах.\nLED1/2/3 показывают a/b/c; остальные погашены. В начале LED0 погашен.\nОтличайте «ровно два» от «не меньше двух».',
    `    wire a = sample[0], b = sample[1], c = ~button_n;
    wire exactly = (a & b & ~c) | (a & ~b & c) | (~a & b & c);
    wire [5:0] lights = {2'b00, c, b, a, exactly};`,
    true,
  ),

  demo(
    'majority',
    'Голосование 2 из 3',
    'Решение большинства: две или три единицы.',
    'a/b — младшие биты sample, c — нажатие 87. LED0 — решение большинства.\nLED1/2/3 показывают голоса a/b/c. В начале голоса и решение равны 0.\nВ отличие от «ровно два», сочетание 111 тоже включает LED0.',
    `    wire a = sample[0], b = sample[1], c = ~button_n;
    wire voted = (a & b) | (a & c) | (b & c);
    wire [5:0] lights = {2'b00, c, b, a, voted};`,
    true,
  ),

  gates(
    'demorgan',
    'Законы де Моргана',
    'Два способа записи каждой инверсии дают одинаковый результат.',
    'LED0/1: НЕ(a И b) и (НЕ a) ИЛИ (НЕ b).\nLED2/3: НЕ(a ИЛИ b) и (НЕ a) И (НЕ b). LED4 сигнализировал бы несовпадение.\nВ покое горят LED0…3. При всех нажатиях LED4 всегда остаётся погашенным.',
    `    wire nand_form = ~(a & b), nand_terms = ~a | ~b;
    wire nor_form = ~(a | b), nor_terms = ~a & ~b;
    wire [5:0] lights = {1'b0, ((nand_form ^ nand_terms) | (nor_form ^ nor_terms)), nor_terms, nor_form, nand_terms, nand_form};
    assign led_n = ~lights;`,
  ),

  demo(
    'consensus',
    'Теорема консенсуса',
    'Третий член не меняет таблицу истинности выражения.',
    'a/b/c = sample[0/1/2]. LED0 = ab + НЕ(a)c, LED1 добавляет bc.\nLED2 загорается только при различии; в исправной схеме он всегда погашен.\nLED3/4/5 показывают a/b/c. В начале все LED погашены.\nРечь о логическом равенстве; RTL-симуляция не моделирует физические помехи.',
    `    wire a = sample[0], b = sample[1], c = sample[2];
    wire short_form = (a & b) | (~a & c);
    wire expanded = short_form | (b & c);
    wire [5:0] lights = {c, b, a, (short_form ^ expanded), expanded, short_form};`,
  ),

  gates(
    'mux-four',
    'Выбор одного из четырёх слов',
    'Две кнопки выбирают шестибитный рисунок.',
    'Адрес {b,a}: 00 → LED0, 01 → LED1/2, 10 → LED3/4, 11 → LED5.\nВ покое горит LED0. Четыре источника данных свернуты в case.\nВ RTL найдите мультиплексор и сравните выбор с декодером адреса.',
    `    function [5:0] calculate_lights(input [5:0] word);
        begin
            case (word[1:0])
                2'd0: calculate_lights = 6'b000001;
                2'd1: calculate_lights = 6'b000110;
                2'd2: calculate_lights = 6'b011000;
                default: calculate_lights = 6'b100000;
            endcase
        end
    endfunction
    wire [5:0] lights = calculate_lights({4'b0000,b,a});
    assign led_n = ~lights;`,
  ),

  demo(
    'demux-four',
    'Демультиплексор 1 → 4',
    'Один вход направляется на выбранный выход.',
    'sample[1:0] — адрес, button_n=0 — данные 1. LED0…3 — выходы.\nLED4/5 показывают адрес. В начале всё погашено, нажатие 87 включает LED0.\nПосле отпускания все четыре выхода становятся 0 независимо от адреса.',
    `    wire [3:0] routed = (~button_n) ? (4'b0001 << sample[1:0]) : 4'b0000;
    wire [5:0] lights = {sample[1:0], routed};`,
    true,
  ),

  demo(
    'signed-min-max',
    'Минимум и максимум со знаком',
    'Числа −4…3 сравниваются как signed.',
    'a = sample[2:0], b = sample[5:3] — трёхбитные дополнительные коды.\nКнопка 87 отпущена: LED0…2 показывают минимум; нажата: максимум.\nLED3 означает a<b, LED4 — a=b, LED5 — a>b. В начале горит только LED4.\nНапример, 100 означает −4, а не +4: проверьте сравнение −4 и +3.',
    `    wire signed [2:0] a = sample[2:0], b = sample[5:3];
    wire signed [2:0] low = (a < b) ? a : b;
    wire signed [2:0] high = (a > b) ? a : b;
    wire [2:0] chosen = button_n ? low : high;
    wire [5:0] lights = {(a > b), (a == b), (a < b), chosen};`,
    true,
  ),

  demo(
    'carry-overflow',
    'Перенос и знаковое переполнение',
    'Одна сумма, два разных признака ошибки диапазона.',
    'a = sample[2:0], b = sample[5:3]. LED0…2 — младшие три бита суммы.\nLED3 — перенос беззнакового сложения, LED4 — переполнение signed −4…3.\nLED5 показывает знак результата. В начале все LED погашены.\n3+1 даёт signed-переполнение без переноса; −1+1 даёт перенос без переполнения.',
    `    wire [2:0] a = sample[2:0], b = sample[5:3];
    wire [3:0] sum = {1'b0, a} + {1'b0, b};
    wire overflow = (~(a[2] ^ b[2])) & (a[2] ^ sum[2]);
    wire [5:0] lights = {sum[2], overflow, sum[3], sum[2:0]};`,
  ),

  demo(
    'absolute-value',
    'Модуль signed-числа',
    'Дополнительный код превращается в положительную величину.',
    'value = sample[2:0] обозначает 0,1,2,3,−4,−3,−2,−1.\nLED0…2 показывают unsigned-модуль 0…4; LED3 — исходный знак.\nLED4 отмечает особый код −4; LED5 погашен. В начале всё погашено.\nМодуль −4 равен +4 и требует unsigned-представления либо расширения signed.',
    `    wire signed [2:0] value = sample[2:0];
    wire signed [3:0] extended = {value[2], value};
    wire [3:0] magnitude = value[2] ? -extended : extended;
    wire [5:0] lights = {1'b0, (value == 3'b100), value[2], magnitude[2:0]};`,
  ),

  demo(
    'saturating-add',
    'Сложение с насыщением',
    'Сумма 0…14 ограничивается максимумом 7.',
    'a = sample[2:0], b = sample[5:3]. LED0…2 — min(a+b,7).\nLED3 показывает ограничение, LED4 — перенос, LED5 — точную сумму 7.\nВ начале всё погашено. При 7+1 получается 7, а не обычный переход к 0.',
    `    wire [3:0] sum = {1'b0, sample[2:0]} + {1'b0, sample[5:3]};
    wire [2:0] clamped = sum > 4'd7 ? 3'd7 : sum[2:0];
    wire [5:0] lights = {(sum == 4'd7), sum[3], (sum > 4'd7), clamped};`,
  ),

  demo(
    'unsigned-average',
    'Среднее без переполнения',
    'Расширяем сумму перед делением на два.',
    'a = sample[2:0], b = sample[5:3]. LED0…2 — floor((a+b)/2).\nLED3 показывает отброшенную половину (нечётную сумму), LED4 — равенство a/b.\nLED5 погашен. В начале горит LED4. Для 7 и 7 среднее равно 7.\nДеление на 2 реализуется сдвигом уже расширенной четырёхбитной суммы.',
    `    wire [3:0] sum = {1'b0, sample[2:0]} + {1'b0, sample[5:3]};
    wire [5:0] lights = {1'b0, (sample[2:0] == sample[5:3]), sum[0], sum[3:1]};`,
  ),

  demo(
    'shift-add-multiply',
    'Умножение сдвигами и сложением',
    'Три бита × два бита без оператора умножения.',
    'a = sample[2:0] (0…7), b = sample[4:3] (0…3). LED0…4 показывают a*b.\nLED5 загорается при ненулевом результате. В начале всё погашено.\nМножитель выбирает a и 2a; сумма этих частичных произведений даёт результат.',
    `    wire [4:0] a = {2'b00, sample[2:0]};
    wire [4:0] first = sample[3] ? a : 5'd0;
    wire [4:0] second = sample[4] ? (a << 1) : 5'd0;
    wire [4:0] product = first + second;
    wire [5:0] lights = {(|product), product};`,
  ),

  demo(
    'guarded-division',
    'Деление и остаток',
    'Защита от деления на ноль и проверка a=q·b+r.',
    'a = sample[2:0], b = sample[5:3]. LED0…2 — частное, LED3…5 — остаток.\nПри b=0 выдаём частное 0 и остаток a; это явно выбранное поведение ошибки.\nВ начале всё погашено. При 7/3 увидите q=2,r=1: 7=2·3+1.\nКомбинационный делитель дороже сумматора: сравните число LUT в Gowin.',
    `    wire [2:0] a = sample[2:0], b = sample[5:3];
    wire [2:0] quotient = (b == 3'd0) ? 3'd0 : a / b;
    wire [2:0] remainder = (b == 3'd0) ? a : a % b;
    wire [5:0] lights = {remainder, quotient};`,
  ),

  demo(
    'population-count',
    'Сколько единиц в слове',
    'Вес шестибитного слова: от нуля до шести.',
    'LED0…2 показывают число единиц в sample. LED3 — есть хотя бы одна единица.\nLED4 — больше трёх единиц, LED5 — все шесть единиц. В начале всё погашено.\nНа диаграммах сравните 001111 и 101010: важны единицы, а не численное значение.',
    `    function [2:0] calculate_count(input [5:0] word);
    integer i;
        begin
            calculate_count = 3'd0;
            for (i = 0; i < 6; i = i + 1) calculate_count = calculate_count + {2'b00, word[i]};
        end
    endfunction
    wire [2:0] count = calculate_count(sample);
    wire [5:0] lights = {(&sample), (count > 3'd3), (|sample), count};`,
  ),

  demo(
    'leading-zero-count',
    'Нули перед старшей единицей',
    'Количество ведущих нулей шестибитного слова.',
    'Просматриваем sample от бита 5 к биту 0. LED0…2 — количество нулей до первой 1.\nДля 000000 ответ 6 (LED1 и LED2), LED3 также отмечает пустое слово.\nLED4/5 погашены. Для 001010 ответ 2; это шаг перед нормализацией числа.',
    `    function [2:0] calculate_count(input [5:0] word);
        begin
            if (word[5]) calculate_count = 3'd0;
            else if (word[4]) calculate_count = 3'd1;
            else if (word[3]) calculate_count = 3'd2;
            else if (word[2]) calculate_count = 3'd3;
            else if (word[1]) calculate_count = 3'd4;
            else if (word[0]) calculate_count = 3'd5;
            else calculate_count = 3'd6;
        end
    endfunction
    wire [2:0] count = calculate_count(sample);
    wire [5:0] lights = {2'b00, (sample == 6'd0), count};`,
  ),

  demo(
    'trailing-zero-count',
    'Нули после младшей единицы',
    'Число нулевых младших разрядов и делимость на степени двойки.',
    'Считаем нули sample от бита 0 до первой 1. LED0…2 — ответ 0…6.\nДля 000000 ответ 6, LED3 отмечает особый случай; LED4/5 погашены.\nВ начале горят LED1/2/3. Для 001000 ответ 3: число делится на 8.',
    `    function [2:0] calculate_count(input [5:0] word);
        begin
            if (word[0]) calculate_count = 3'd0;
            else if (word[1]) calculate_count = 3'd1;
            else if (word[2]) calculate_count = 3'd2;
            else if (word[3]) calculate_count = 3'd3;
            else if (word[4]) calculate_count = 3'd4;
            else if (word[5]) calculate_count = 3'd5;
            else calculate_count = 3'd6;
        end
    endfunction
    wire [2:0] count = calculate_count(sample);
    wire [5:0] lights = {2'b00, (sample == 6'd0), count};`,
  ),

  demo(
    'priority-encoder-six',
    'Приоритетный шифратор 6 → 3',
    'Номер старшего активного запроса и отдельный valid.',
    'sample — шесть запросов. LED0…2 — номер выбранного бита, LED3 — valid.\nСтарший номер имеет приоритет. Если запросов нет, номер 0 и valid=0.\nВ начале всё погашено. Номер 0 с valid=1 отличается от отсутствия запросов.',
    `    function [2:0] calculate_index(input [5:0] word);
        begin
            if (word[5]) calculate_index = 3'd5;
            else if (word[4]) calculate_index = 3'd4;
            else if (word[3]) calculate_index = 3'd3;
            else if (word[2]) calculate_index = 3'd2;
            else if (word[1]) calculate_index = 3'd1;
            else calculate_index = 3'd0;
        end
    endfunction
    wire [2:0] index = calculate_index(sample);
    wire [5:0] lights = {2'b00, (|sample), index};`,
  ),

  demo(
    'binary-onehot',
    'Двоичный номер → one-hot',
    'Шесть допустимых адресов и два пустых.',
    'sample[2:0] — номер 0…7. Для 0…5 горит единственный соответствующий LED.\nНомера 6/7 дают все нули: на плате только шесть LED, лишние выходы не придуманы.\nВ начале горит LED0. Это перевод номера в one-hot, а не кольцевой регистр.',
    `    wire [2:0] index = sample[2:0];
    wire [5:0] lights = index < 3'd6 ? (6'b000001 << index) : 6'b000000;`,
  ),

  demo(
    'onehot-check',
    'Проверка one-hot и one-hot-or-zero',
    'Чем ровно одна единица отличается от не более одной.',
    'LED0 — в sample ровно одна единица; LED1 — не более одной.\nLED2 — слово пустое, LED3 — ошибка (две или больше единиц), LED4/5 погашены.\nВ начале горят LED1/2. Для 000001 горят LED0/1; для 000011 горит LED3.',
    `    wire at_most_one = (sample & (sample - 6'd1)) == 6'd0;
    wire nonzero = |sample;
    wire [5:0] lights = {2'b00, (~at_most_one), (~nonzero), at_most_one, (at_most_one & nonzero)};`,
  ),

  demo(
    'thermometer-code',
    'Термометрический код',
    'Значение превращается в непрерывную шкалу единиц.',
    'sample[2:0] — уровень. Горят LED с номерами меньше уровня, максимум шесть LED.\nВ начале всё погашено; 3 зажигает LED0/1/2, 6 и 7 — все шесть.\nСравните со one-hot: шкала содержит несколько единиц, но без пропусков.',
    `    genvar bit_index;
    wire [5:0] lights;
    generate for (bit_index = 0; bit_index < 6; bit_index = bit_index + 1) begin: scale
        assign lights[bit_index] = sample[2:0] > bit_index;
    end endgenerate`,
  ),

  demo(
    'binary-bcd',
    'Двоичное число → десятки и единицы',
    'BCD для десятичных чисел 0…31 в двух режимах просмотра.',
    'Число = sample[4:0]. Кнопка 87 отпущена: LED0…3 — BCD единиц.\nКнопка нажата: LED0…3 — BCD десятков. LED4 означает просмотр десятков.\nLED5 показывает ненулевые десятки. В начале всё погашено.\nЭто код цифры; шесть LED платы не являются десятичным индикатором.',
    `    wire [4:0] value = sample[4:0];
    wire [3:0] units = value % 5'd10;
    wire [3:0] tens = value / 5'd10;
    wire [3:0] digit = button_n ? units : tens;
    wire [5:0] lights = {(tens != 4'd0), (~button_n), digit};`,
    true,
  ),

  demo(
    'segment-decoder',
    'Декодер семисегментной цифры',
    'Таблица сегментов 0…9 и честное ограничение шести LED.',
    'sample[3:0] — цифра. segments[6:0] хранит a,b,c,d,e,f,g как биты 0…6.\nОтпущенная 87: LED0…5 показывают a…f; нажата: LED0 показывает g, LED1 — valid.\nВ начале отображается 0: горят все шесть a…f. Коды 10…15 гасят сегменты.\nФизические LED расположены в ряд, это НЕ настоящий семисегментный дисплей.',
    `    function [6:0] calculate_segments(input [5:0] word);
        begin
            case (word[3:0])
                4'd0: calculate_segments = 7'b0111111;
                4'd1: calculate_segments = 7'b0000110;
                4'd2: calculate_segments = 7'b1011011;
                4'd3: calculate_segments = 7'b1001111;
                4'd4: calculate_segments = 7'b1100110;
                4'd5: calculate_segments = 7'b1101101;
                4'd6: calculate_segments = 7'b1111101;
                4'd7: calculate_segments = 7'b0000111;
                4'd8: calculate_segments = 7'b1111111;
                4'd9: calculate_segments = 7'b1101111;
                default: calculate_segments = 7'b0000000;
            endcase
        end
    endfunction
    wire [6:0] segments = calculate_segments(sample);
    wire [5:0] lights = button_n ? segments[5:0] : {4'b0000, (sample[3:0] < 4'd10), segments[6]};`,
    true,
  ),

  demo(
    'rotate-word',
    'Циклическое вращение слова',
    'Старший бит возвращается в младший или наоборот.',
    'sample — исходное шестибитное слово. Отпущенная 87: вращение влево на один.\nНажатая 87: вращение вправо на один. Нули не добавляются, биты не теряются.\nВ начале всё погашено; для 100001 результат слева 000011, справа 110000.',
    `    wire [5:0] lights = button_n ? {sample[4:0], sample[5]} : {sample[0], sample[5:1]};`,
    true,
  ),

  demo(
    'barrel-shifter',
    'Бочковой сдвигатель',
    'Переменный сдвиг данных на 0…3 позиции.',
    'data = sample[3:0], amount = sample[5:4]. Отпущенная 87: сдвиг влево, нажата: вправо.\nLED0…5 показывают результат; сдвиг влево ограничен шестью разрядами.\nВ начале всё погашено. На диаграммах сравните data=15 со сдвигами 0,1,2,3.\nСдвигатель комбинационный: он меняет связи, не пересылает биты по тактам.',
    `    wire [5:0] data = {2'b00, sample[3:0]};
    wire [1:0] amount = sample[5:4];
    wire [5:0] lights = button_n ? (data << amount) : (data >> amount);`,
    true,
  ),

  demo(
    'prefix-parity',
    'Накопительный XOR',
    'Каждый выход — чётность префикса младших разрядов.',
    'LEDi показывает XOR sample[0]…sample[i]. В начале всё погашено.\nДля sample=000001 горят все LED: единица участвует в каждом префиксе.\nИз двух соседних префиксов можно восстановить исходный бит через XOR.',
    `    wire [5:0] lights;
    assign lights[0] = sample[0];
    genvar i;
    generate for (i = 1; i < 6; i = i + 1) begin: prefixes
        assign lights[i] = lights[i-1] ^ sample[i];
    end endgenerate`,
  ),

  demo(
    'reverse-bits',
    'Разворот порядка битов',
    'Бит 0 становится битом 5; число меняется, единицы сохраняются.',
    'LED0 получает sample[5], LED1 — sample[4] и так далее.\nВ начале всё погашено; sample=000001 зажигает LED5.\nЗдесь только провода: разворот не требует памяти, такта или арифметического блока.',
    `    wire [5:0] lights = {sample[0], sample[1], sample[2], sample[3], sample[4], sample[5]};`,
  ),

  demo(
    'bit-spread',
    'Разрежение трёх битов',
    'Между исходными битами появляются нули.',
    'data = sample[2:0]. LED0/2/4 показывают data[0/1/2], LED1/3/5 погашены.\nВ начале всё погашено. Для 111 получается 010101.\nТакой перенос битов используют при чередовании координат в коде Мортона.',
    `    wire [5:0] lights = {1'b0, sample[2], 1'b0, sample[1], 1'b0, sample[0]};`,
  ),

  demo(
    'small-rom',
    'ROM из восьми слов',
    'Адрес выбирает заранее записанный шестибитный рисунок.',
    'sample[2:0] — адрес 0…7. Таблица показывает 001001,010010,100100,\n001111,111100,010101,101010,111111. В начале горят LED0 и LED3.\nЭто таблица постоянных данных; маленькая ROM может превратиться в LUT.\nLED расположены в ряд, рисунки — шестибитные слова, а не экран.',
    `    function [5:0] calculate_lights(input [5:0] word);
        begin
            case (word[2:0])
                3'd0: calculate_lights = 6'b001001;
                3'd1: calculate_lights = 6'b010010;
                3'd2: calculate_lights = 6'b100100;
                3'd3: calculate_lights = 6'b001111;
                3'd4: calculate_lights = 6'b111100;
                3'd5: calculate_lights = 6'b010101;
                3'd6: calculate_lights = 6'b101010;
                default: calculate_lights = 6'b111111;
            endcase
        end
    endfunction
    wire [5:0] lights = calculate_lights(sample);`,
  ),

  demo(
    'crc-three',
    'CRC-3 короткого слова',
    'Остаток полиномиального деления на x³+x+1.',
    'Считаем CRC sample[5:0], старший бит первый, начальное состояние 000.\nLED0…2 — CRC, LED3 — ненулевой остаток, LED4/5 погашены. В начале всё погашено.\nДля 000001 CRC=011. XOR заменяет вычитание в арифметике полиномов над битами.\nЭто учебная проверка слова; здесь нет UART-пакета или согласованного протокола.',
    `    function [2:0] calculate_crc(input [5:0] word);
    reg feedback;
    integer i;
        begin
            calculate_crc = 3'b000;
            feedback = 1'b0;
            for (i = 5; i >= 0; i = i - 1) begin
                feedback = word[i] ^ calculate_crc[2];
                calculate_crc = {calculate_crc[1:0], 1'b0};
                if (feedback) calculate_crc = calculate_crc ^ 3'b011;
            end
        end
    endfunction
    wire [2:0] crc = calculate_crc(sample);
    wire [5:0] lights = {2'b00, (|crc), crc};`,
  ),

  demo(
    'hamming-encode',
    'Укороченный код Хэмминга (6,3)',
    'Три информационных бита и три проверки чётности.',
    'data = sample[2:0]. Позиции 1,2,4 содержат проверки p1,p2,p4; 3,5,6 — данные.\nLED0…5 показывают позиции 1…6. В начале всё погашено.\nПроверки делают группы {1,3,5}, {2,3,6}, {4,5,6} чётными.\nЭто укороченный (7,4): позиция 7 удалена как нулевой информационный бит.',
    `    wire [2:0] data = sample[2:0];
    wire p1 = data[0] ^ data[1];
    wire p2 = data[0] ^ data[2];
    wire p4 = data[1] ^ data[2];
    wire [5:0] lights = {data[2], data[1], p4, data[0], p2, p1};`,
  ),

  demo(
    'hamming-syndrome',
    'Синдром Хэмминга',
    'Проверки чётности указывают номер одиночной ошибки.',
    'sample — принятое шестибитное слово в позициях 1…6 укороченного кода Хэмминга.\nLED0…2 — синдром 0…7. LED3 = проверки согласованы, LED4 = синдром 1…6.\nLED5 = синдром 7, за пределами этого слова. В начале горит только LED3.\nИз нулевого кодового слова изменение одного бита даёт его номер (1…6).\nНесколько ошибок могут дать такой же синдром: это не надёжный детектор всех ошибок.',
    `    wire s1 = sample[0] ^ sample[2] ^ sample[4];
    wire s2 = sample[1] ^ sample[2] ^ sample[5];
    wire s4 = sample[3] ^ sample[4] ^ sample[5];
    wire [2:0] syndrome = {s4, s2, s1};
    wire [5:0] lights = {(syndrome == 3'd7), (syndrome != 3'd0 && syndrome < 3'd7), (syndrome == 3'd0), syndrome};`,
  ),

  demo(
    'signed-compare',
    'Signed и unsigned: разные сравнения',
    'Одинаковые три бита могут означать разные числа.',
    'a = sample[2:0], b = sample[5:3]. LED0 — unsigned a<b, LED1 — signed a<b.\nLED2 отмечает различие результатов, LED3 — равенство, LED4/5 — знаки a/b.\nВ начале горит LED3. Сравните коды 100 и 011: unsigned 4>3, signed −4<3.',
    `    wire [2:0] a = sample[2:0], b = sample[5:3];
    wire signed [2:0] signed_a = a, signed_b = b;
    wire unsigned_less = a < b, signed_less = signed_a < signed_b;
    wire [5:0] lights = {b[2], a[2], (a == b), (unsigned_less ^ signed_less), signed_less, unsigned_less};`,
  ),

  demo(
    'range-check',
    'Окно значений',
    'Внутри диапазона, на границе, ниже или выше.',
    'value = sample[2:0]. LED0 — 2…5 включительно, LED1 — 3…4 строго внутри.\nLED2 — граница 2/5, LED3 — ниже 2, LED4 — выше 5, LED5 погашен.\nВ начале горит LED3. Отличайте включающие >=/<= от строгих >/<.',
    `    wire [2:0] value = sample[2:0];
    wire [5:0] lights = {1'b0, (value > 3'd5), (value < 3'd2), (value == 3'd2 || value == 3'd5), (value > 3'd2 && value < 3'd5), (value >= 3'd2 && value <= 3'd5)};`,
  ),

  demo(
    'bit-mask',
    'Установка, сброс и инверсия маски',
    'Одна маска выполняет три разные операции над словом.',
    'word = sample[2:0], mask = sample[5:3]. Отпущенная 87: установить биты (OR).\nНажатая 87: сбросить биты (AND NOT). LED0…2 — выбранный результат.\nLED3…5 всегда показывают инверсию по маске (XOR). В начале всё погашено.\nЕсли mask=000, все три операции оставляют слово без изменений.',
    `    wire [2:0] word = sample[2:0], mask = sample[5:3];
    wire [2:0] changed = button_n ? (word | mask) : (word & ~mask);
    wire [5:0] lights = {word ^ mask, changed};`,
    true,
  ),

  demo(
    'lookup-square',
    'Квадрат через таблицу',
    'Восемь результатов заменяют арифметический умножитель.',
    'n = sample[2:0], LED0…5 показывают n²: 0,1,4,9,16,25,36,49.\nВ начале всё погашено. case задаёт готовую таблицу функции на ограниченном диапазоне.\nСравните RTL и LUT с умножением: небольшая таблица тоже реализует арифметику.',
    `    function [5:0] calculate_lights(input [5:0] word);
        begin
            case (word[2:0])
                3'd0: calculate_lights = 6'd0;
                3'd1: calculate_lights = 6'd1;
                3'd2: calculate_lights = 6'd4;
                3'd3: calculate_lights = 6'd9;
                3'd4: calculate_lights = 6'd16;
                3'd5: calculate_lights = 6'd25;
                3'd6: calculate_lights = 6'd36;
                default: calculate_lights = 6'd49;
            endcase
        end
    endfunction
    wire [5:0] lights = calculate_lights(sample);`,
  ),
];
