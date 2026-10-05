import type { Example } from './examples';
import { I2C_MASTER_V } from './lab/bus/verilog';
import {
  DHT11_READ_V,
  HCSR04_V,
  MCP3008_READ_V,
  NEC_RX_V,
  PS2_RX_V,
  TM1637_BUS_V,
  UART_TX_V,
} from './lab/bus/verilog-cores';
import { I2C_PLAYER_V, TM1637_SHOW_V } from './lab/bus/verilog-player';
import { CLK, LEDS, SCL, SDA, i2cFiles, labExample, program } from './examples-lab-kit';

const lm75Source =
  () => `// Термометр LM75 по I²C: читаем температуру и печатаем её в USB-терминал (UART 115200 бод).
//
// LM75 хранит температуру в регистре 0 двумя байтами. Старший байт — целые градусы в
// дополнительном коде (так записываются отрицательные числа), а старший бит младшего
// байта — половинка градуса. Мы собираем число в полуградусах, берём модуль, делим на цифры
// и отправляем текст вида «T=+ 25.5 C». Шесть младших бит целых градусов видны на светодиодах
// (0 — горит). Температуру датчика меняет ползунок на детали.
module top (
    input  wire clk,
    inout  wire sda,
    output wire scl,
    output wire uart_tx,
    output wire [5:0] led_n
);
  wire [9:0] step;
  wire [55:0] rx;
  wire rx_strobe, ack_error, done, taken;

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE 90', 'адрес LM75 0x48 и бит «запись»'],
  ['WRITE 00', 'указатель на регистр температуры'],
  ['START', 'повторный START: теперь будем читать'],
  ['WRITE 91', 'адрес и бит «чтение»'],
  ['READ', 'старший байт: целые градусы со знаком'],
  ['READL', 'младший байт: бит 7 — это +0,5 °C'],
  ['STOP'],
  ['WAIT 200', 'пауза 20 мс; пока ждём, печатаем температуру'],
  ['JUMP 1', 'и снова опрашиваем датчик'],
])}

  i2c_player player (
    .clk(clk), .op(op), .step(step), .var_byte(8'h00), .more(1'b0), .taken(taken),
    .rx(rx), .rx_strobe(rx_strobe), .ack_error(ack_error), .done(done), .sda(sda), .scl(scl)
  );

  // Температура в полуградусах: 9-битное число со знаком.
  wire [8:0] halves = {rx[15:8], rx[7]};
  wire negative = halves[8];
  wire [8:0] magnitude = negative ? -halves : halves;
  wire [7:0] whole = magnitude[8:1];
  wire [3:0] hundreds = whole / 100;
  wire [3:0] tens = (whole / 10) % 10;
  wire [3:0] ones = whole % 10;
  assign led_n = ~whole[5:0];

  // Шаг 9 программы — датчик только что опрошен: начинаем печать.
  wire ready = step == 9;
  reg ready_before = 0;
  reg [3:0] index = 12;                 // номер печатаемого символа; 12 — печать закончена
  reg send = 0;
  wire tx_busy;
  reg [7:0] letter;
  always @* begin
    case (index)
      0: letter = "T";
      1: letter = "=";
      2: letter = negative ? "-" : "+";
      3: letter = hundreds != 0 ? "0" + hundreds : " ";
      4: letter = (hundreds != 0 || tens != 0) ? "0" + tens : " ";
      5: letter = "0" + ones;
      6: letter = ".";
      7: letter = magnitude[0] ? "5" : "0";
      8: letter = " ";
      9: letter = "C";
      10: letter = 8'h0D;
      default: letter = 8'h0A;
    endcase
  end

  uart_sender uart (.clk(clk), .send(send), .data(letter), .busy(tx_busy), .tx(uart_tx));

  always @(posedge clk) begin
    send <= 0;
    ready_before <= ready;
    if (ready && !ready_before) index <= 0;
    else if (send) index <= index + 1;
    else if (index < 12 && !tx_busy) send <= 1;
  end
endmodule
`;

const rtcSource = () => `// Часы DS1307 на четырёхразрядном индикаторе TM1637.
//
// DS1307 — часы реального времени по I²C (адрес 0x68). Время лежит в регистрах как «двоично-
// десятичные» числа (BCD): каждая десятичная цифра занимает четыре бита, поэтому 0x45 — это
// «45». Регистр 0 — секунды (бит 7 = CH останавливает часы), 1 — минуты, 2 — часы.
// Схема: 1) записывает время 12:30:00 и этим запускает часы (CH = 0); 2) снова и снова читает
// секунды, минуты и часы; 3) выводит часы и минуты на TM1637, а двоеточие мигает раз в секунду.
// На настоящей плате время лучше записывать один раз, иначе после каждого сброса оно
// начинается заново. В лаборатории часы идут в 1000 раз быстрее реального времени.
module top (
    input  wire clk,
    inout  wire sda,
    output wire scl,
    inout  wire tm_dio,
    output wire tm_clk,
    output wire [5:0] led_n
);
  wire [9:0] step;
  wire [55:0] rx;
  wire rx_strobe, ack_error, done, taken;

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE D0', 'адрес DS1307 0x68 и бит «запись»'],
  ['WRITE 00', 'начинаем с регистра 0'],
  ['WRITE 00', 'секунды = 00, бит CH = 0: часы пошли'],
  ['WRITE 30', 'минуты = 30'],
  ['WRITE 12', 'часы = 12 (24-часовой режим)'],
  ['STOP'],
  ['START', 'дальше — бесконечное чтение времени'],
  ['WRITE D0'],
  ['WRITE 00', 'указатель на регистр 0'],
  ['START'],
  ['WRITE D1', 'адрес и бит «чтение»'],
  ['READ', 'секунды'],
  ['READ', 'минуты'],
  ['READL', 'часы'],
  ['STOP'],
  ['WAIT 50', 'пауза 5 мс'],
  ['JUMP 8'],
])}

  i2c_player player (
    .clk(clk), .op(op), .step(step), .var_byte(8'h00), .more(1'b0), .taken(taken),
    .rx(rx), .rx_strobe(rx_strobe), .ack_error(ack_error), .done(done), .sda(sda), .scl(scl)
  );

  // После трёх чтений rx = {секунды, минуты, часы}.
  wire [7:0] seconds = rx[23:16];
  wire [7:0] minutes = rx[15:8];
  wire [7:0] hours = rx[7:0] & 8'h3F;

  tm1637_show show (
    .clk(clk), .digits({hours, minutes}), .colon(seconds[0]), .dio(tm_dio), .tclk(tm_clk)
  );

  // Светодиоды показывают единицы секунд (двоично); LED5 горит при ошибке на шине.
  assign led_n = {~ack_error, 1'b1, ~seconds[3:0]};
endmodule
`;

const eepromSource =
  () => `// EEPROM 24C02: счётчик включений, который переживает выключение питания.
//
// Микросхема хранит 256 байт и помнит их без питания. Схема при каждом запуске:
//   1. читает байт по адресу 0 (счётчик);
//   2. записывает его обратно, увеличив на единицу;
//   3. ждёт окончания записи — внутренний цикл занимает до 5 мс, и всё это время микросхема
//      молчит (в лаборатории она тоже не отвечает);
//   4. читает счётчик ещё раз и показывает его на светодиодах (0 — горит).
// Свежая микросхема содержит 0xFF; считаем это нулём. В лаборатории содержимое сохраняется
// между запусками: останавливайте и запускайте схему и смотрите, как число растёт.
module top (
    input  wire clk,
    inout  wire sda,
    output wire scl,
    output wire [5:0] led_n
);
  wire [9:0] step;
  wire [55:0] rx;
  wire rx_strobe, ack_error, done, taken;

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START', 'читаем счётчик: сначала записываем адрес ячейки'],
  ['WRITE A0', 'адрес 0x50 и бит «запись»'],
  ['WRITE 00', 'адрес ячейки внутри памяти'],
  ['START', 'повторный START'],
  ['WRITE A1', 'адрес и бит «чтение»'],
  ['READL', 'счётчик попадает в rx[7:0]'],
  ['STOP'],
  ['START', 'записываем счётчик плюс один'],
  ['WRITE A0'],
  ['WRITE 00', 'адрес ячейки'],
  ['WRITEV', 'новое значение (var_byte)'],
  ['STOP', 'после STOP память начинает внутреннюю запись'],
  ['WAIT 80', 'ждём 8 мс: цикл записи не больше 5 мс'],
  ['START', 'читаем счётчик ещё раз, чтобы показать'],
  ['WRITE A0'],
  ['WRITE 00'],
  ['START'],
  ['WRITE A1'],
  ['READL'],
  ['STOP'],
  ['END'],
])}

  wire [7:0] stored = rx[7:0] == 8'hFF ? 8'h00 : rx[7:0];
  wire [7:0] next_value = stored + 8'h01;

  i2c_player player (
    .clk(clk), .op(op), .step(step), .var_byte(next_value), .more(1'b0), .taken(taken),
    .rx(rx), .rx_strobe(rx_strobe), .ack_error(ack_error), .done(done), .sda(sda), .scl(scl)
  );

  // Пока схема работает, светодиоды погашены; когда done = 1, показан счётчик.
  assign led_n = done ? ~rx[5:0] : 6'b111111;
endmodule
`;

const hcsr04Source = () => `// Дальномер HC-SR04 на индикаторе TM1637.
//
// Модуль hcsr04 запускает измерение импульсом на trig и считает длину ответного импульса
// на echo: 58 мкс на каждый сантиметр. Расстояние в сантиметрах разбивается на сотни, десятки
// и единицы и выводится на четырёхразрядный индикатор (первый разряд пустой).
// Светодиоды — шкала близости: чем ближе предмет, тем больше их горит (0 — горит).
// Расстояние задаёт ползунок на детали. ВАЖНО: echo у настоящего HC-SR04 выдаёт 5 В, а вход
// FPGA рассчитан на 3,3 В — между ними нужен делитель из двух резисторов.
module top (
    input  wire clk,
    output wire trig,
    input  wire echo,
    inout  wire tm_dio,
    output wire tm_clk,
    output wire [5:0] led_n
);
  wire [8:0] distance_cm;
  wire measured;
  hcsr04 sensor (.clk(clk), .trig(trig), .echo(echo), .distance_cm(distance_cm), .done(measured));

  // Раскладываем расстояние на цифры; 15 (0xF) гасит разряд, чтобы не было нулей слева.
  wire [3:0] hundreds = distance_cm / 100;
  wire [3:0] tens = (distance_cm / 10) % 10;
  wire [3:0] ones = distance_cm % 10;
  wire [3:0] shown_hundreds = hundreds == 0 ? 4'hF : hundreds;
  wire [3:0] shown_tens = (hundreds == 0 && tens == 0) ? 4'hF : tens;

  tm1637_show show (
    .clk(clk), .digits({4'hF, shown_hundreds, shown_tens, ones}), .colon(1'b0),
    .dio(tm_dio), .tclk(tm_clk)
  );

  assign led_n = {
    ~(distance_cm < 25), ~(distance_cm < 50), ~(distance_cm < 75),
    ~(distance_cm < 100), ~(distance_cm < 125), ~(distance_cm < 150)
  };
endmodule
`;

const dhtSource = () => `// Датчик DHT11 → UART: температура и влажность по одному проводу.
//
// Модуль dht11_read тянет линию к нулю на 20 мс, отпускает её и принимает 40 бит ответа.
// Мы запускаем его раз в секунду (чаще DHT11 опрашивать нельзя), а полученные цифры
// печатаем в USB-терминал (UART, 115200 бод): «T=24C H=45%». Если контрольная сумма не
// сошлась, вместо цифр печатаются чёрточки. Температуру и влажность меняют ползунки.
module top #(
    // Период опроса в тактах 27 МГц: 27_000_000 — одна секунда, как требует даташит.
    parameter PERIOD = 27_000_000
) (
    input  wire clk,
    inout  wire dht,
    output wire uart_tx,
    output wire [5:0] led_n
);
  reg [24:0] timer = PERIOD - 27_000;   // первый опрос — через 1 мс после запуска
  reg start = 0;
  wire busy, ok;
  wire [39:0] data;
  dht11_read reader (.clk(clk), .start(start), .dht(dht), .busy(busy), .data(data), .ok(ok));

  // Результат запоминаем в конце каждого опроса.
  reg busy_before = 0;
  reg [7:0] humidity = 0, temperature = 0;
  reg good = 0;
  reg [3:0] index = 14;                // номер печатаемого символа; 14 — печать закончена
  reg send = 0;
  wire tx_busy;

  always @(posedge clk) begin
    start <= 0;
    send <= 0;
    busy_before <= busy;
    if (timer == PERIOD) begin timer <= 0; start <= 1; end
    else timer <= timer + 1;
    if (busy_before && !busy) begin
      humidity <= data[39:32];
      temperature <= data[23:16];
      good <= ok;
      index <= 0;
    end else if (send) index <= index + 1;
    else if (index < 14 && !tx_busy) send <= 1;
  end

  reg [7:0] letter;
  wire [3:0] t_tens = temperature / 10, t_ones = temperature % 10;
  wire [3:0] h_tens = humidity / 10, h_ones = humidity % 10;
  always @* begin
    case (index)
      0: letter = "T";
      1: letter = "=";
      2: letter = good ? "0" + t_tens : "-";
      3: letter = good ? "0" + t_ones : "-";
      4: letter = "C";
      5: letter = " ";
      6: letter = "H";
      7: letter = "=";
      8: letter = good ? "0" + h_tens : "-";
      9: letter = good ? "0" + h_ones : "-";
      10: letter = "%";
      11: letter = 8'h0D;
      default: letter = 8'h0A;
    endcase
  end

  uart_sender uart (.clk(clk), .send(send), .data(letter), .busy(tx_busy), .tx(uart_tx));
  assign led_n = {5'b11111, ~good};
endmodule
`;

const irSource = () => `// ИК-пульт управляет светодиодами.
//
// Приёмник пульта отдаёт на ir кадр протокола NEC без несущей частоты (в покое — единица).
// Модуль nec_rx меряет длины импульсов и пауз, проверяет, что вторая половина кадра — инверсия
// первой, и выдаёт код кнопки command. На стенде кнопки — на пульте, нажимайте мышью:
//   1…6  — переключают светодиоды LED0…LED5 (светодиод горит при 0)
//   0    — гасит все,  9 — зажигает все,  ⏻ — переворачивает состояние всех
module top (
    input  wire clk,
    input  wire ir,
    output wire [5:0] led_n
);
  wire [7:0] command, address;
  wire valid;
  nec_rx receiver (.clk(clk), .ir(ir), .command(command), .address(address), .valid(valid));

  reg [5:0] on = 0;                    // 1 — светодиод должен гореть
  always @(posedge clk) begin
    if (valid) case (command)
      8'h0C: on[0] <= ~on[0];          // кнопка 1
      8'h18: on[1] <= ~on[1];          // кнопка 2
      8'h5E: on[2] <= ~on[2];          // кнопка 3
      8'h08: on[3] <= ~on[3];          // кнопка 4
      8'h1C: on[4] <= ~on[4];          // кнопка 5
      8'h5A: on[5] <= ~on[5];          // кнопка 6
      8'h16: on <= 6'b000000;          // кнопка 0
      8'h4A: on <= 6'b111111;          // кнопка 9
      8'h45: on <= ~on;                // кнопка питания
      default: ;
    endcase
  end

  assign led_n = ~on;
endmodule
`;

const ps2Source = () => `// Клавиатура PS/2 → UART: нажатые клавиши появляются в USB-терминале.
//
// Клавиатура сама подаёт такты (около 12,5 кГц) и шлёт скан-коды: при нажатии — код клавиши,
// при отпускании — F0 и тот же код; у «серых» клавиш (стрелки) спереди ещё E0.
// Модуль ps2_rx принимает байты и проверяет бит нечётности. Мы пропускаем E0 и всё, что идёт
// после F0 (отпускание), а коды букв, цифр и некоторых клавиш переводим в ASCII и отправляем
// в терминал платы (UART 115200 бод). Нажимайте клавиши на детали.
module top (
    input  wire clk,
    input  wire ps2_clk,
    input  wire ps2_data,
    output wire uart_tx,
    output wire [5:0] led_n
);
  wire [7:0] code;
  wire strobe, parity_ok;
  ps2_rx keyboard (.clk(clk), .ps2_clk(ps2_clk), .ps2_data(ps2_data), .code(code),
                   .strobe(strobe), .parity_ok(parity_ok));

  // Скан-код набора 2 → ASCII (0 — клавиша не печатается).
  reg [7:0] ascii;
  always @* begin
    case (code)
      8'h1C: ascii = "A"; 8'h32: ascii = "B"; 8'h21: ascii = "C"; 8'h23: ascii = "D";
      8'h24: ascii = "E"; 8'h2B: ascii = "F"; 8'h34: ascii = "G"; 8'h33: ascii = "H";
      8'h43: ascii = "I"; 8'h3B: ascii = "J"; 8'h42: ascii = "K"; 8'h4B: ascii = "L";
      8'h3A: ascii = "M"; 8'h31: ascii = "N"; 8'h44: ascii = "O"; 8'h4D: ascii = "P";
      8'h15: ascii = "Q"; 8'h2D: ascii = "R"; 8'h1B: ascii = "S"; 8'h2C: ascii = "T";
      8'h3C: ascii = "U"; 8'h2A: ascii = "V"; 8'h1D: ascii = "W"; 8'h22: ascii = "X";
      8'h35: ascii = "Y"; 8'h1A: ascii = "Z";
      8'h45: ascii = "0"; 8'h16: ascii = "1"; 8'h1E: ascii = "2"; 8'h26: ascii = "3";
      8'h25: ascii = "4"; 8'h2E: ascii = "5"; 8'h36: ascii = "6"; 8'h3D: ascii = "7";
      8'h3E: ascii = "8"; 8'h46: ascii = "9";
      8'h29: ascii = " "; 8'h5A: ascii = 8'h0A; 8'h66: ascii = 8'h08;
      default: ascii = 8'h00;
    endcase
  end

  reg skip = 0;                        // 1 — следующий код относится к отпусканию клавиши
  reg [7:0] pending = 0;
  reg send = 0;
  wire tx_busy;
  reg [2:0] errors = 0;
  always @(posedge clk) begin
    send <= 0;
    if (strobe) begin
      if (!parity_ok) errors <= errors + 1;
      if (code == 8'hF0) skip <= 1;
      else if (code == 8'hE0) ;
      else begin
        skip <= 0;
        if (!skip && ascii != 0 && !tx_busy) begin pending <= ascii; send <= 1; end
      end
    end
  end

  uart_sender uart (.clk(clk), .send(send), .data(pending), .busy(tx_busy), .tx(uart_tx));
  assign led_n = {3'b111, ~errors};
endmodule
`;

const adcSource = () => `// Потенциометр через АЦП MCP3008 → линейка светодиодов и ШИМ.
//
// MCP3008 — десятибитный АЦП с интерфейсом SPI. Модуль mcp3008_read читает канал 0 (там стоит
// потенциометр), и мы получаем число 0…1023. Дальше с ним делаются две вещи:
//   • линейка: шесть светодиодов платы показывают, какая шестая часть шкалы выбрана;
//   • ШИМ: счётчик 0…1023 сравнивается с числом, и на выходе pwm получается сигнал со
//     скважностью value/1024; светодиод на выводе pwm светится тем ярче, чем выше значение.
// Частота SPI не больше 1,35 МГц при питании 3,3 В (DIV = 10 даёт 1,35 МГц).
module top (
    input  wire clk,
    output wire adc_cs,
    output wire adc_clk,
    output wire adc_mosi,
    input  wire adc_miso,
    output wire pwm,
    output wire [5:0] led_n
);
  reg start = 0;
  reg [1:0] s = 0;
  wire busy;
  wire [9:0] value;
  mcp3008_read #(.DIV(10)) adc (
    .clk(clk), .start(start), .channel(3'd0), .busy(busy), .value(value),
    .cs(adc_cs), .sclk(adc_clk), .mosi(adc_mosi), .miso(adc_miso)
  );

  // Постоянно повторяем измерение.
  always @(posedge clk) begin
    start <= 0;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) s <= 0;
    endcase
  end

  // Линейка: LED0 загорается первым, при значении больше 1/6 шкалы и дальше по одному.
  assign led_n = {
    ~(value >= 853), ~(value >= 683), ~(value >= 512),
    ~(value >= 341), ~(value >= 171), ~(value >= 1)
  };

  reg [9:0] counter = 0;
  always @(posedge clk) counter <= counter + 1;
  assign pwm = counter < value;
endmodule
`;

const uartFile = { name: 'uart_tx.v', content: UART_TX_V };
const tmPins = (clk: number, dio: number): [string, number, string, ('UP' | 'NONE')?][] => [
  ['tm_clk', clk, 'CLK индикатора TM1637 (J5).'],
  ['tm_dio', dio, 'DIO индикатора TM1637 (J5): двусторонняя линия с подтяжкой.', 'UP'],
];

export const sensorExamples: Example[] = [
  labExample(
    'lm75-uart',
    'Термометр LM75 → UART',
    'Температура с датчика LM75 по I²C печатается в терминал и показывается на светодиодах. На стенде: LM75 с ползунком температуры.',
    [{ name: 'top.v', content: lm75Source() }, ...i2cFiles(uartFile)],
    [CLK, SDA, SCL, ['uart_tx', 69, 'UART_TX → USB-терминал платы, 115200 бод.'], ...LEDS()],
  ),
  labExample(
    'rtc-clock',
    'Часы DS1307 на индикаторе TM1637',
    'Время из DS1307 (BCD по I²C) выводится на четыре цифры с мигающим двоеточием. На стенде: DS1307 (идёт в 1000 раз быстрее) и индикатор TM1637.',
    [
      { name: 'top.v', content: rtcSource() },
      { name: 'i2c_master.v', content: I2C_MASTER_V },
      { name: 'i2c_player.v', content: I2C_PLAYER_V },
      { name: 'tm1637_bus.v', content: TM1637_BUS_V },
      { name: 'tm1637_show.v', content: TM1637_SHOW_V },
    ],
    [CLK, SDA, SCL, ...tmPins(42, 41), ...LEDS()],
  ),
  labExample(
    'eeprom-counter',
    'EEPROM 24C02: счётчик включений',
    'Число хранится в энергонезависимой памяти и растёт при каждом запуске. На стенде: микросхема 24C02 с шестнадцатеричным дампом.',
    [{ name: 'top.v', content: eepromSource() }, ...i2cFiles()],
    [CLK, SDA, SCL, ...LEDS()],
  ),
  labExample(
    'hcsr04-display',
    'Дальномер HC-SR04 на индикаторе',
    'Длина импульса на echo превращается в сантиметры и выводится на TM1637 и шкалу светодиодов. На стенде: HC-SR04 (ползунок расстояния) и TM1637.',
    [
      { name: 'top.v', content: hcsr04Source() },
      { name: 'hcsr04.v', content: HCSR04_V },
      { name: 'tm1637_bus.v', content: TM1637_BUS_V },
      { name: 'tm1637_show.v', content: TM1637_SHOW_V },
    ],
    [
      CLK,
      ['trig', 75, 'TRIG дальномера (J5): импульс около 11 мкс запускает измерение.'],
      ['echo', 80, 'ECHO дальномера (J5): длина импульса — 58 мкс на сантиметр.'],
      ...tmPins(42, 41),
      ...LEDS(),
    ],
  ),
  labExample(
    'dht11-uart',
    'DHT11 → UART',
    'Датчик температуры и влажности на одном проводе: старт-импульс, 40 бит ответа, текст в терминал. На стенде: DHT11 с двумя ползунками.',
    [
      { name: 'top.v', content: dhtSource() },
      { name: 'dht11_read.v', content: DHT11_READ_V },
      uartFile,
    ],
    [
      CLK,
      ['dht', 75, 'Линия данных DHT11 (J5): двусторонняя, с подтяжкой.', 'UP'],
      ['uart_tx', 69, 'UART_TX → USB-терминал платы, 115200 бод.'],
      ...LEDS(),
    ],
  ),
  labExample(
    'ir-remote-leds',
    'ИК-пульт управляет светодиодами',
    'Кадр NEC от пульта декодируется по длительности импульсов; кнопки 1–6 переключают светодиоды. На стенде: ИК-приёмник с пультом.',
    [
      { name: 'top.v', content: irSource() },
      { name: 'nec_rx.v', content: NEC_RX_V },
    ],
    [CLK, ['ir', 75, 'Выход ИК-приёмника (J5): в покое 1, посылка — нули.'], ...LEDS()],
  ),
  labExample(
    'ps2-uart',
    'Клавиатура PS/2 → UART',
    'Скан-коды набора 2 с проверкой нечётности превращаются в буквы и уходят в терминал. На стенде: клавиатура PS/2.',
    [{ name: 'top.v', content: ps2Source() }, { name: 'ps2_rx.v', content: PS2_RX_V }, uartFile],
    [
      CLK,
      ['ps2_clk', 75, 'Такты PS/2 (J5): их подаёт клавиатура.', 'UP'],
      ['ps2_data', 80, 'Данные PS/2 (J5).', 'UP'],
      ['uart_tx', 69, 'UART_TX → USB-терминал платы, 115200 бод.'],
      ...LEDS(),
    ],
  ),
  labExample(
    'adc-pwm',
    'Потенциометр через MCP3008 → линейка и ШИМ',
    'АЦП по SPI читает ползунок: линейка светодиодов и ШИМ-яркость светодиода. На стенде: MCP3008 с потенциометром и светодиод на выходе ШИМ.',
    [
      { name: 'top.v', content: adcSource() },
      { name: 'mcp3008_read.v', content: MCP3008_READ_V },
    ],
    [
      CLK,
      ['adc_cs', 75, 'CS АЦП (J5): низкий уровень начинает обмен.'],
      ['adc_clk', 80, 'SCLK АЦП (J5).'],
      ['adc_mosi', 42, 'DIN АЦП (J5): номер канала.'],
      ['adc_miso', 41, 'DOUT АЦП (J5): результат.'],
      ['pwm', 56, 'Выход ШИМ (J5): яркость светодиода.'],
      ...LEDS(),
    ],
  ),
];
