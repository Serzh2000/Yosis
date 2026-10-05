import type { ExampleLesson } from './example-curriculum';
import type { Example } from './examples';
import {
  CLK,
  LEDS,
  SCL,
  SDA,
  hex,
  i2cFiles,
  labExample,
  lcdProgram,
  lcdRom,
  program,
  type LabPin,
} from './examples-lab-kit';
import type { BenchPart } from './examples-lab-parts';
import { I2C_MASTER_V, LCD4_V } from './lab/bus/verilog';
import {
  DHT11_READ_V,
  HCSR04_V,
  MCP3008_READ_V,
  NEC_RX_V,
  PS2_RX_V,
  SPI16_V,
  WS2812_TX_V,
} from './lab/bus/verilog-cores';
import { LCD_I2C_V } from './lab/bus/verilog-player';

/**
 * A second example for every protocol part, so each part of the laboratory has at least two.
 * They reuse the bus modules of the first examples and show another side of the same part.
 */
type Lesson = Omit<ExampleLesson, 'order'>;
const lesson = (
  topic: Lesson['topic'],
  objective: string,
  prerequisites: string[],
  observe: string,
  experiment: string,
): Lesson => ({ level: 4, topic, objective, prerequisites, observe, experiment });

const PLAYER = (variable = "8'h00", more = "1'b0") => `  i2c_player player (
    .clk(clk), .op(op), .step(step), .var_byte(${variable}), .more(${more}), .taken(taken),
    .rx(rx), .rx_strobe(rx_strobe), .ack_error(ack_error), .done(done), .sda(sda), .scl(scl)
  );`;
const PLAYER_WIRES = `  wire [9:0] step;
  wire [55:0] rx;
  wire rx_strobe, ack_error, done, taken;`;
const I2C_PORTS = `    input  wire clk,
    inout  wire sda,
    output wire scl,
    output wire [5:0] led_n`;

const oledInit = [0xae, 0x8d, 0x14, 0x20, 0x00, 0x21, 0x00, 0x7f, 0x22, 0x00, 0x07, 0xaf];
const oledSteps: [string, string?][] = [
  ['WAIT 100', 'после включения питания даём экрану 10 мс'],
  ['START'],
  ['WRITE 78', 'адрес экрана 0x3C и бит «запись»'],
  ['WRITE 00', 'управляющий байт: дальше идут команды'],
  ...oledInit.map((byte) => [`WRITE ${hex(byte)}`] as [string]),
  ['STOP'],
  ['START'],
  ['WRITE 78'],
  ['WRITE 40', 'управляющий байт: дальше идут пиксели'],
];
const oledData = oledSteps.length;
oledSteps.push(
  ['WRITEV', 'очередной байт картинки'],
  [`LOOPIF ${oledData}`, 'повторять, пока не отправлены все 1024 байта'],
  ['STOP'],
  ['END'],
);

const oledSource = `// OLED-экран SSD1306: шахматная доска, посчитанная на лету.
//
// Картинка не хранится в памяти: каждый байт вычисляется из своего места на экране.
// Экран — 8 страниц по 128 байт, байт — столбик из восьми пикселей. Клетка доски занимает
// 16 столбцов и одну страницу; цвет клетки — исключающее ИЛИ номера клетки по горизонтали
// и по вертикали. Команд настройки здесь минимум: включить преобразователь питания (0x8D 0x14),
// задать окно записи на весь экран и включить экран (0xAF).
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}
  reg [10:0] index = 0;                 // номер байта картинки: 0…1023
  wire more = index != 1024;

${program(oledSteps)}

  wire [2:0] page = index[9:7];
  wire [6:0] col = index[6:0];
  wire [7:0] pixel_byte = (col[4] ^ page[0]) ? 8'hFF : 8'h00;

${PLAYER('pixel_byte', 'more')}

  always @(posedge clk) if (taken) index <= index + 1;

  assign led_n = {4'b1111, ~ack_error, ~done};
endmodule
`;

const lcdItems = [
  ...lcdProgram(['Yosis Lab', 'I2C addr 0x27']),
  "10'h00F; // экран включён, курсор виден и мигает",
];
const lcdI2cSource = `// ЖК-экран 1602 через I²C: текст и мигающий курсор.
//
// Экран HD44780 управляется командами. После текста отправляем команду 0x0F: экран включён,
// курсор виден и мигает. Курсор стоит там, куда попал бы следующий символ — после второй
// строки. Модуль lcd_i2c сам превращает байт экрана в четыре байта для переходника PCF8574.
module top #(
    parameter POWER_UP = 405_000    // пауза после включения: 15 мс
) (
${I2C_PORTS}
);
  reg [19:0] wait_count = 0;
  reg [6:0] n = 0;
  reg [1:0] s = 0;
  reg start = 0, done = 0;
  reg [9:0] item;
  wire busy;

  always @* begin
    case (n)
${lcdRom(lcdItems)}
      default: item = 10'h000;
    endcase
  end
  wire last = n == ${lcdItems.length};

  lcd_i2c lcd (
    .clk(clk), .start(start), .short(item[9]), .rs_in(item[8]), .data(item[7:0]),
    .busy(busy), .sda(sda), .scl(scl)
  );

  always @(posedge clk) begin
    start <= 0;
    if (wait_count != POWER_UP) wait_count <= wait_count + 1;
    else if (!done) case (s)
      0: if (last) done <= 1; else begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin n <= n + 1; s <= 0; end
    endcase
  end

  assign led_n = {5'b11111, ~done};
endmodule
`;

const marqueeItems = lcdProgram(['FPGA Tang Nano 20K * ', 'running text * ']);
const lcdDirectSource = `// ЖК-экран 1602 напрямую: бегущая строка.
//
// В памяти экрана 40 символов на строку, а видно только 16. Команда 0x18 сдвигает видимое
// окно на один символ влево — текст «едет», хотя сам он записан один раз. Схема сначала
// выводит обе строки, а потом раз за разом шлёт команду сдвига.
module top #(
    parameter POWER_UP = 405_000,   // пауза после включения: 15 мс
    parameter STEP = 4_000_000      // пауза между сдвигами: около 150 мс
) (
    input  wire clk,
    output wire lcd_rs,
    output wire lcd_e,
    output wire [3:0] lcd_d,
    output wire [5:0] led_n
);
  reg [22:0] wait_count = 0;
  reg [6:0] n = 0;
  reg [1:0] s = 0;
  reg start = 0, ready = 0, written = 0;
  reg [9:0] item;
  wire busy;

  always @* begin
    case (n)
${lcdRom(marqueeItems)}
      default: item = 10'h018;       // команда «сдвинуть окно влево»
    endcase
  end
  wire last = n == ${marqueeItems.length};

  lcd4 lcd (
    .clk(clk), .start(start), .short(item[9]), .rs_in(item[8]), .data(item[7:0]),
    .busy(busy), .rs(lcd_rs), .e(lcd_e), .d(lcd_d)
  );

  always @(posedge clk) begin
    start <= 0;
    if (!ready) begin
      if (wait_count == POWER_UP) begin ready <= 1; wait_count <= 0; end
      else wait_count <= wait_count + 1;
    end else case (s)
      0: if (!last) begin start <= 1; s <= 1; end
         else begin
           written <= 1;
           // Текст выведен: дальше каждые STEP тактов отправляем команду сдвига.
           if (wait_count == STEP) begin wait_count <= 0; start <= 1; s <= 1; end
           else wait_count <= wait_count + 1;
         end
      1: s <= 2;
      2: if (!busy) begin if (!last) n <= n + 1; s <= 0; end
    endcase
  end

  assign led_n = {5'b11111, ~written};
endmodule
`;

const lm75Source = `// Термометр LM75: термостат с гистерезисом.
//
// Схема читает температуру и управляет «нагревателем» (LED0): включает его ниже 24 °C и
// выключает выше 26 °C. Между порогами состояние не меняется — это гистерезис, без него
// нагреватель щёлкал бы туда-сюда у самой границы. LED1 горит, когда жарче 30 °C.
// Температуру меняет ползунок на детали.
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE 90', 'адрес LM75 0x48 и бит «запись»'],
  ['WRITE 00', 'указатель на регистр температуры'],
  ['START', 'повторный START: теперь читаем'],
  ['WRITE 91', 'адрес и бит «чтение»'],
  ['READ', 'старший байт: целые градусы со знаком'],
  ['READL', 'младший байт: половинка градуса'],
  ['STOP'],
  ['WAIT 100', 'пауза 10 мс'],
  ['JUMP 1', 'и снова опрашиваем датчик'],
])}

${PLAYER()}

  // Целые градусы — число со знаком в старшем байте ответа.
  wire signed [7:0] degrees = rx[15:8];
  reg heater = 0;
  always @(posedge clk)
    if (rx_strobe) begin
      if (degrees < 8'sd24) heater <= 1;
      else if (degrees > 8'sd26) heater <= 0;
    end
  wire hot = degrees > 8'sd30;

  assign led_n = {~ack_error, 3'b111, ~hot, ~heater};
endmodule
`;

const eepromSource = `// EEPROM 24C02: записать четыре байта и проверить чтением.
//
// За одну посылку память принимает до восьми байт подряд (страничная запись): после адреса
// ячейки идут данные, и внутренний указатель сам переходит к следующей ячейке. Затем схема
// ждёт конца внутренней записи, читает те же четыре ячейки подряд и сравнивает с образцом.
// LED0 горит, если прочитано то же, что записано; LED1 — если не совпало.
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE A0', 'адрес 0x50 и бит «запись»'],
  ['WRITE 10', 'адрес первой ячейки: 0x10'],
  ['WRITE DE', 'четыре байта данных подряд'],
  ['WRITE AD'],
  ['WRITE BE'],
  ['WRITE EF'],
  ['STOP', 'после STOP память записывает страницу'],
  ['WAIT 80', 'ждём 8 мс: цикл записи не больше 5 мс'],
  ['START', 'ставим указатель на ту же ячейку'],
  ['WRITE A0'],
  ['WRITE 10'],
  ['START'],
  ['WRITE A1', 'адрес и бит «чтение»'],
  ['READ'],
  ['READ'],
  ['READ'],
  ['READL', 'последний байт: отвечаем NACK'],
  ['STOP'],
  ['END'],
])}

${PLAYER()}

  wire match = rx[31:0] == 32'hDEADBEEF;
  assign led_n = {~ack_error, 3'b111, ~(done & ~match), ~(done & match)};
endmodule
`;

const rtcSource = `// Часы DS1307: секунды на светодиодах.
//
// Самое короткое знакомство с часами: запускаем их записью нуля в регистр секунд (бит CH = 0)
// и дальше читаем только этот регистр. Секунды хранятся в двоично-десятичном виде: младшие
// четыре бита — единицы, следующие три — десятки. LED0–LED3 показывают единицы, LED4–LED5 —
// два младших бита десятков. В лаборатории часы идут в 1000 раз быстрее.
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE D0', 'адрес DS1307 0x68 и бит «запись»'],
  ['WRITE 00', 'регистр 0 — секунды'],
  ['WRITE 00', 'секунды = 00, бит CH = 0: часы пошли'],
  ['STOP'],
  ['START', 'дальше — бесконечное чтение секунд'],
  ['WRITE D0'],
  ['WRITE 00', 'указатель на регистр 0'],
  ['START'],
  ['WRITE D1', 'адрес и бит «чтение»'],
  ['READL', 'секунды'],
  ['STOP'],
  ['WAIT 20', 'пауза 2 мс'],
  ['JUMP 6'],
])}

${PLAYER()}

  wire [6:0] seconds = rx[6:0];
  assign led_n = ~{seconds[5:4], seconds[3:0]};
endmodule
`;

const pcfChaserSource = `// Расширитель портов PCF8574: бегущий огонь по I²C.
//
// У микросхемы нет регистров: записанный байт сразу появляется на восьми выводах. Светодиоды
// подключены к плюсу, поэтому горит тот, чей бит равен нулю. Схема раз за разом записывает
// байт с одним нулём и сдвигает ноль после каждой записи.
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}
  reg [7:0] pattern = 8'b11111110;

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE 40', 'адрес PCF8574 0x20 и бит «запись»'],
  ['WRITEV', 'байт для восьми выводов'],
  ['STOP'],
  ['WAIT 250', 'пауза 25 мс между шагами'],
  ['JUMP 1'],
])}

${PLAYER('pattern')}

  // taken — импульс «байт взят»: готовим следующий узор.
  always @(posedge clk) if (taken) pattern <= {pattern[6:0], pattern[7]};

  assign led_n = {~ack_error, 5'b11111};
endmodule
`;

const pcfReadSource = `// Расширитель портов PCF8574: чтение переключателей.
//
// Чтобы читать вывод PCF8574, в него сначала записывают единицу: микросхема отпускает
// линию, и замкнутый на землю переключатель читается нулём. Схема один раз записывает 0xFF,
// а потом всё время читает порт. Замкнутые переключатели P0–P5 зажигают LED0–LED5 платы.
module top (
${I2C_PORTS}
);
${PLAYER_WIRES}

${program([
  ['WAIT 10', 'пауза 1 мс после включения'],
  ['START'],
  ['WRITE 40', 'адрес PCF8574 0x20 и бит «запись»'],
  ['WRITE FF', 'все выводы — входы: линии отпущены'],
  ['STOP'],
  ['START', 'дальше — бесконечное чтение порта'],
  ['WRITE 41', 'адрес и бит «чтение»'],
  ['READL', 'состояние восьми выводов'],
  ['STOP'],
  ['WAIT 20', 'пауза 2 мс'],
  ['JUMP 5'],
])}

${PLAYER()}

  // Замкнутый переключатель читается нулём, а светодиод платы и горит при нуле.
  assign led_n = rx[5:0];
endmodule
`;

const maxSource = `// Драйвер MAX7219 с восемью цифрами: число 12345678 и встроенный дешифратор.
//
// MAX7219 умеет сам превращать цифру в сегменты: регистр 9 (режим декодирования) = 0xFF
// включает дешифратор для всех разрядов. Тогда в регистры 1…8 достаточно записать цифры 0–9.
// Каждая запись — 16 бит по SPI: номер регистра и значение. Яркость меняется раз в полсекунды,
// чтобы было видно работу регистра 0x0A.
module top (
    input  wire clk,
    output wire max_din,
    output wire max_clk,
    output wire max_cs,
    output wire [5:0] led_n
);
  reg [3:0] i = 0;                       // 0…4 — настройка, 5…12 — цифры
  reg start = 0;
  reg [1:0] s = 0;
  reg [3:0] brightness = 4'd2;
  reg [23:0] timer = 0;
  wire busy;
  reg [15:0] word;

  spi16 spi (.clk(clk), .start(start), .word(word), .busy(busy),
             .cs(max_cs), .sclk(max_clk), .mosi(max_din));

  wire [3:0] place = i - 4'd4;           // регистр разряда: 1 — правый, 8 — левый
  always @* begin
    case (i)
      0: word = 16'h0C01;                              // обычная работа, не сон
      1: word = 16'h0B07;                              // показывать все восемь разрядов
      2: word = 16'h09FF;                              // дешифратор цифр для всех разрядов
      3: word = 16'h0F00;                              // тестовый режим выключен
      4: word = {12'h0A0, brightness};                 // яркость
      default: word = {4'h0, place, 4'h0, 4'd9 - place};   // слева 1, справа 8
    endcase
  end

  always @(posedge clk) begin
    start <= 0;
    if (timer == 24'd13_500_000) begin timer <= 0; brightness <= brightness + 4'd4; end
    else timer <= timer + 1;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin
        i <= i == 12 ? 4 : i + 1;                      // по кругу: яркость и восемь цифр
        s <= 0;
      end
    endcase
  end

  assign led_n = ~{2'b00, brightness};
endmodule
`;

const stripSource = `// Лента WS2812B: бегущая точка.
//
// Лента получает цвета по одному проводу: первые 24 бита забирает первый светодиод, остальное
// он передаёт дальше. Чтобы зажечь один светодиод, остальным отправляем чёрный цвет.
// Номер горящего светодиода растёт после каждого кадра; цвет точки меняется на каждом круге.
module top #(
    parameter FRAME_DELAY = 1_500_000   // пауза между кадрами: около 55 мс
) (
    input  wire clk,
    output wire ws_din,
    output wire [5:0] led_n
);
  reg [2:0] pixel = 0, dot = 0;
  reg [1:0] hue = 0;
  reg start = 0;
  reg [1:0] s = 0;
  reg [20:0] gap = 0;
  wire busy;

  // Порядок байт в ленте — зелёный, красный, синий.
  wire [23:0] color = (hue == 2'd0) ? 24'h002800 : (hue == 2'd1) ? 24'h280000 :
                      (hue == 2'd2) ? 24'h000028 : 24'h181800;
  wire [23:0] grb = (pixel == dot) ? color : 24'h000000;

  ws2812_tx tx (.clk(clk), .start(start), .grb(grb), .busy(busy), .dout(ws_din));

  always @(posedge clk) begin
    start <= 0;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin
        if (pixel == 7) begin pixel <= 0; gap <= FRAME_DELAY; s <= 3; end
        else begin pixel <= pixel + 1; s <= 0; end
      end
      3: if (gap == 0) begin
           dot <= dot + 1;
           if (dot == 7) hue <= hue + 1;
           s <= 0;
         end else gap <= gap - 1;
    endcase
  end

  assign led_n = ~{3'b000, dot};
endmodule
`;

const adcSource = `// АЦП MCP3008: число с потенциометра на светодиодах.
//
// АЦП превращает напряжение в десятибитное число 0…1023. Схема всё время повторяет измерение
// канала 0 и показывает шесть старших бит результата на светодиодах платы: крутите ползунок
// и читайте двоичное число. Полная шкала 3,3 В — это 63 на шести битах.
module top (
    input  wire clk,
    output wire adc_cs,
    output wire adc_clk,
    output wire adc_mosi,
    input  wire adc_miso,
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

  always @(posedge clk) begin
    start <= 0;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) s <= 0;
    endcase
  end

  assign led_n = ~value[9:4];
endmodule
`;

const hcsrSource = `// Дальномер HC-SR04: парковочный датчик.
//
// Чем ближе препятствие, тем чаще гудки — как в автомобиле. Модуль hcsr04 измеряет
// расстояние в сантиметрах, а пауза между гудками берётся пропорциональной ему. Ближе 10 см
// зуммер звучит непрерывно. LED0 горит, когда препятствие ближе 30 см.
// ВАЖНО: echo у настоящего HC-SR04 выдаёт 5 В — на плате нужен делитель до 3,3 В.
module top (
    input  wire clk,
    output wire trig,
    input  wire echo,
    output wire beep,
    output wire [5:0] led_n
);
  wire [8:0] distance_cm;
  wire measured;
  hcsr04 sensor (.clk(clk), .trig(trig), .echo(echo), .distance_cm(distance_cm), .done(measured));

  // Период гудков: 2^14 тактов на каждый сантиметр (на 100 см — около 60 мс).
  reg [22:0] timer = 0;
  wire [22:0] period = {distance_cm, 14'd0};
  always @(posedge clk) timer <= (timer >= period) ? 23'd0 : timer + 1'b1;
  wire near = distance_cm < 9'd10;
  wire far = distance_cm > 9'd150;
  assign beep = !far && (near || timer < {1'b0, period[22:1]});   // гудок — половина периода
  assign led_n = {4'b1111, ~near, ~(distance_cm < 9'd30)};
endmodule
`;

const dhtSource = `// Датчик DHT11: сигнализация влажности и жары.
//
// Датчик отвечает по одному проводу пятью байтами: влажность, её дробная часть, температура,
// её дробная часть и контрольная сумма. Модуль dht11_read делает обмен и проверяет сумму.
// LED0 горит при влажности от 60 %, LED1 — при температуре от 30 °C, LED5 — если последний
// ответ принят без ошибок. Значения задаются ползунками на детали.
module top #(
    parameter PERIOD = 1_350_000   // пауза между опросами: 50 мс (на плате лучше 27_000_000)
) (
    input  wire clk,
    inout  wire dht,
    output wire [5:0] led_n
);
  reg [24:0] timer = PERIOD - 27_000;   // первый опрос — через 1 мс после запуска
  reg start = 0;
  wire busy, ok;
  wire [39:0] data;
  dht11_read reader (.clk(clk), .start(start), .dht(dht), .busy(busy), .data(data), .ok(ok));

  reg busy_before = 0;
  reg [7:0] humidity = 0, temperature = 0;
  reg good = 0;
  always @(posedge clk) begin
    start <= 0;
    busy_before <= busy;
    if (timer == PERIOD) begin timer <= 0; start <= 1; end
    else if (!busy) timer <= timer + 1;
    if (busy_before && !busy) begin   // обмен закончен: запоминаем результат
      good <= ok;
      if (ok) begin humidity <= data[39:32]; temperature <= data[23:16]; end
    end
  end

  assign led_n = {~good, 3'b111, ~(temperature >= 8'd30), ~(humidity >= 8'd60)};
endmodule
`;

const irSource = `// ИК-приёмник: код кнопки пульта на светодиодах.
//
// Каждая кнопка пульта передаёт свой восьмибитный код команды. Модуль nec_rx принимает кадр
// протокола NEC и выдаёт код; шесть младших бит кода видны на светодиодах платы.
// Нажимайте кнопки пульта на детали и составьте таблицу «кнопка — код».
module top (
    input  wire clk,
    input  wire ir,
    output wire [5:0] led_n
);
  wire [7:0] command, address;
  wire valid;
  nec_rx receiver (.clk(clk), .ir(ir), .command(command), .address(address), .valid(valid));

  reg [5:0] code = 0;
  always @(posedge clk) if (valid) code <= command[5:0];
  assign led_n = ~code;
endmodule
`;

const ps2Source = `// Клавиатура PS/2: скан-код клавиши на светодиодах.
//
// Клавиатура сама тактирует передачу и посылает скан-код нажатой клавиши, а при отпускании —
// байт 0xF0 и тот же код. Модуль ps2_rx принимает байты. Схема пропускает 0xF0 и следующий за
// ним байт, чтобы на светодиодах оставался код последней НАЖАТОЙ клавиши (шесть младших бит).
module top (
    input  wire clk,
    input  wire ps2_clk,
    input  wire ps2_data,
    output wire [5:0] led_n
);
  wire [7:0] code;
  wire strobe, parity_ok;
  ps2_rx keyboard (.clk(clk), .ps2_clk(ps2_clk), .ps2_data(ps2_data), .code(code),
                   .strobe(strobe), .parity_ok(parity_ok));

  reg release_next = 0;           // предыдущий байт был 0xF0: этот — код отпускания
  reg [5:0] last = 0;
  always @(posedge clk)
    if (strobe && parity_ok) begin
      if (code == 8'hF0) release_next <= 1;
      else begin
        if (!release_next) last <= code[5:0];
        release_next <= 0;
      end
    end
  assign led_n = ~last;
endmodule
`;

const ADC_PINS: LabPin[] = [
  ['adc_cs', 75, 'Выбор АЦП (J5): 0 во время обмена.'],
  ['adc_clk', 80, 'Такт SPI (J5).'],
  ['adc_mosi', 42, 'Данные в АЦП (J5).'],
  ['adc_miso', 41, 'Данные из АЦП (J5).'],
];
const i2cPins = [CLK, SDA, SCL, ...LEDS()];
const BENCH = 'На стенде: деталь уже стоит и подключена — откройте «Лабораторию» и нажмите «Пуск».';
const top = (content: string) => ({ name: 'top.v', content });

export const busMoreExamples: Example[] = [
  labExample(
    'oled-checker',
    'OLED: шахматная доска',
    `Картинка для экрана SSD1306 вычисляется из координат, а не хранится в памяти. ${BENCH}`,
    [top(oledSource), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'lcd-i2c-cursor',
    'ЖК 1602 по I²C: мигающий курсор',
    `Текст и команда, включающая мигающий курсор. ${BENCH}`,
    [
      top(lcdI2cSource),
      { name: 'i2c_master.v', content: I2C_MASTER_V },
      { name: 'lcd_i2c.v', content: LCD_I2C_V },
    ],
    i2cPins,
  ),
  labExample(
    'lcd-direct-marquee',
    'ЖК 1602 напрямую: бегущая строка',
    `Команда сдвига окна прокручивает длинный текст. ${BENCH}`,
    [top(lcdDirectSource), { name: 'lcd4.v', content: LCD4_V }],
    [
      CLK,
      ['lcd_rs', 75, 'RS экрана (J5): 0 — команда, 1 — символ.'],
      ['lcd_e', 80, 'E экрана (J5): спад записывает полубайт.'],
      ['lcd_d[0]', 42, 'D4 экрана (J5).'],
      ['lcd_d[1]', 41, 'D5 экрана (J5).'],
      ['lcd_d[2]', 56, 'D6 экрана (J5).'],
      ['lcd_d[3]', 54, 'D7 экрана (J5).'],
      ...LEDS(),
    ],
  ),
  labExample(
    'lm75-thermostat',
    'LM75: термостат с гистерезисом',
    `Нагреватель включается ниже 24 °C и выключается выше 26 °C. ${BENCH}`,
    [top(lm75Source), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'eeprom-verify',
    'EEPROM 24C02: запись страницы и проверка',
    `Четыре байта записываются одной посылкой и сверяются чтением. ${BENCH}`,
    [top(eepromSource), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'rtc-seconds',
    'Часы DS1307: секунды на светодиодах',
    `Запуск часов и чтение одного регистра в двоично-десятичном виде. ${BENCH}`,
    [top(rtcSource), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'pcf8574-chaser',
    'PCF8574: бегущий огонь по I²C',
    `Восемь светодиодов на двух проводах шины. ${BENCH}`,
    [top(pcfChaserSource), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'pcf8574-switches',
    'PCF8574: чтение переключателей',
    `Порт читается по I²C, переключатели видны на светодиодах платы. ${BENCH}`,
    [top(pcfReadSource), ...i2cFiles()],
    i2cPins,
  ),
  labExample(
    'max7219-digits',
    'MAX7219: восемь цифр',
    `Встроенный дешифратор драйвера показывает число 12345678. ${BENCH}`,
    [top(maxSource), { name: 'spi16.v', content: SPI16_V }],
    [
      CLK,
      ['max_din', 75, 'Данные драйвера (J5).'],
      ['max_clk', 80, 'Такт драйвера (J5).'],
      ['max_cs', 42, 'Защёлка драйвера (J5): фронт принимает слово.'],
      ...LEDS(),
    ],
  ),
  labExample(
    'ws2812-dot',
    'Лента WS2812B: бегущая точка',
    `Один светодиод ленты горит, остальные получают чёрный цвет. ${BENCH}`,
    [top(stripSource), { name: 'ws2812_tx.v', content: WS2812_TX_V }],
    [CLK, ['ws_din', 75, 'Вход данных ленты (J5).'], ...LEDS()],
  ),
  labExample(
    'adc-binary',
    'АЦП MCP3008: число на светодиодах',
    `Шесть старших бит измерения показаны в двоичном виде. ${BENCH}`,
    [top(adcSource), { name: 'mcp3008_read.v', content: MCP3008_READ_V }],
    [CLK, ...ADC_PINS, ...LEDS()],
  ),
  labExample(
    'hcsr04-parking',
    'HC-SR04: парковочный датчик',
    `Чем ближе препятствие, тем чаще гудки. На стенде: дальномер и зуммер уже стоят и подключены — откройте «Лабораторию» и нажмите «Пуск».`,
    [top(hcsrSource), { name: 'hcsr04.v', content: HCSR04_V }],
    [
      CLK,
      ['trig', 75, 'Запуск измерения (J5).'],
      ['echo', 80, 'Ответный импульс (J5): длина пропорциональна расстоянию.'],
      ['beep', 42, 'Зуммер (J5): 1 включает звук.'],
      ...LEDS(),
    ],
  ),
  labExample(
    'dht11-alarm',
    'DHT11: сигнализация влажности и жары',
    `Пороги по влажности и температуре зажигают светодиоды. ${BENCH}`,
    [top(dhtSource), { name: 'dht11_read.v', content: DHT11_READ_V }],
    [CLK, ['dht', 75, 'Линия данных DHT11 (J5).', 'UP'], ...LEDS()],
  ),
  labExample(
    'ir-code',
    'ИК-приёмник: код кнопки',
    `Код команды пульта показывается на светодиодах. ${BENCH}`,
    [top(irSource), { name: 'nec_rx.v', content: NEC_RX_V }],
    [CLK, ['ir', 75, 'Выход ИК-приёмника (J5): в покое единица.'], ...LEDS()],
  ),
  labExample(
    'ps2-code',
    'Клавиатура PS/2: скан-код клавиши',
    `Код последней нажатой клавиши на светодиодах, коды отпускания пропускаются. ${BENCH}`,
    [top(ps2Source), { name: 'ps2_rx.v', content: PS2_RX_V }],
    [
      CLK,
      ['ps2_clk', 75, 'Такт клавиатуры (J5).', 'UP'],
      ['ps2_data', 80, 'Данные клавиатуры (J5).', 'UP'],
      ...LEDS(),
    ],
  ),
];

const i2c = { SDA: 75, SCL: 80 };
export const busMoreBenches: Record<string, BenchPart[]> = {
  'oled-checker': [{ def: 'oled-ssd1306', x: 330, pins: i2c }],
  'lcd-i2c-cursor': [{ def: 'lcd-i2c', x: 330, pins: i2c }],
  'lcd-direct-marquee': [
    { def: 'lcd-parallel', x: 330, pins: { RS: 75, E: 80, D4: 42, D5: 41, D6: 56, D7: 54 } },
  ],
  'lm75-thermostat': [{ def: 'lm75', x: 330, opts: { temp: 22 }, pins: i2c }],
  'eeprom-verify': [{ def: 'eeprom-24c02', x: 330, pins: i2c }],
  'rtc-seconds': [{ def: 'rtc-ds1307', x: 330, opts: { warp: 1000 }, pins: i2c }],
  'pcf8574-chaser': [{ def: 'pcf8574', x: 330, pins: i2c }],
  'pcf8574-switches': [{ def: 'pcf8574', x: 330, opts: { switches: 0b00100101 }, pins: i2c }],
  'max7219-digits': [
    { def: 'max7219', x: 330, opts: { mode: 'digits' }, pins: { DIN: 75, CLK: 80, CS: 42 } },
  ],
  'ws2812-dot': [{ def: 'ws2812', x: 330, opts: { pixels: 8 }, pins: { DIN: 75 } }],
  'adc-binary': [
    {
      def: 'adc-mcp3008',
      x: 330,
      opts: { value: 640 },
      pins: { CS: 75, CLK: 80, DIN: 42, DOUT: 41 },
    },
  ],
  'hcsr04-parking': [
    { def: 'hc-sr04', x: 220, opts: { distance: 60 }, pins: { TRIG: 75, ECHO: 80 } },
    { def: 'buzzer', x: 660, opts: { type: 'active' }, pins: { S: 42 } },
  ],
  'dht11-alarm': [{ def: 'dht11', x: 330, opts: { temp: 24, humidity: 65 }, pins: { DATA: 75 } }],
  'ir-code': [{ def: 'ir-receiver', x: 330, pins: { OUT: 75 } }],
  'ps2-code': [{ def: 'ps2-keyboard', x: 330, pins: { CLK: 75, DATA: 80 } }],
};

export const busMoreLessons: Record<string, Lesson> = {
  'oled-checker': lesson(
    'display',
    'Вычислить картинку для OLED из координат байта вместо хранения её в памяти.',
    ['oled-hello'],
    'Экран заполняется клетками 16 на 8 пикселей; соседние клетки по горизонтали и вертикали разного цвета.',
    'Сделайте клетки квадратными, взяв для строк биты внутри байта. Нарисуйте полосы вместо клеток.',
  ),
  'lcd-i2c-cursor': lesson(
    'display',
    'Управлять курсором символьного ЖК командой включения экрана.',
    ['lcd-i2c'],
    'После текста в конце второй строки появляется мигающий прямоугольник курсора.',
    'Замените 0x0F на 0x0E — курсор перестанет мигать. Поставьте курсор в начало первой строки командой 0x80.',
  ),
  'lcd-direct-marquee': lesson(
    'display',
    'Прокрутить длинный текст на ЖК командой сдвига видимого окна.',
    ['lcd-direct'],
    'Обе строки едут влево на символ за шаг, хотя текст записан в память экрана один раз.',
    'Смените направление командой 0x1C. Измените STEP и подберите удобную скорость чтения.',
  ),
  'lm75-thermostat': lesson(
    'interfaces',
    'Построить термостат с гистерезисом по показаниям датчика LM75.',
    ['lm75-uart'],
    'LED0 загорается ниже 24 °C и гаснет выше 26 °C; между порогами он не меняется.',
    'Сведите пороги в один и посмотрите на дребезг у границы. Учтите половинки градуса из младшего байта.',
  ),
  'eeprom-verify': lesson(
    'memory',
    'Записать в EEPROM несколько байт одной посылкой и проверить их чтением подряд.',
    ['eeprom-counter'],
    'После паузы на запись загорается LED0: прочитанные четыре байта совпали с образцом 0xDEADBEEF.',
    'Уберите паузу после записи и объясните ошибку. Запишите девять байт и найдите, где они оказались.',
  ),
  'rtc-seconds': lesson(
    'interfaces',
    'Запустить часы DS1307 и прочитать секунды в двоично-десятичном коде.',
    ['rtc-clock'],
    'LED0–LED3 считают от 0 до 9 и сбрасываются, LED4–LED5 показывают десятки секунд.',
    'Не записывайте регистр секунд и убедитесь, что часы стоят. Прочитайте минуты вместо секунд.',
  ),
  'pcf8574-chaser': lesson(
    'interfaces',
    'Управлять восемью выходами расширителя портов одной записью по I²C.',
    ['i2c-pattern'],
    'По светодиодам микросхемы бежит огонь: горит тот вывод, в который записан ноль.',
    'Запустите два огня навстречу. Смените адрес микросхемы в свойствах и исправьте адресный байт.',
  ),
  'pcf8574-switches': lesson(
    'interfaces',
    'Читать входы квазидвунаправленного порта PCF8574, предварительно записав в них единицы.',
    ['pcf8574-chaser'],
    'Замкнутые переключатели микросхемы зажигают светодиоды платы с теми же номерами.',
    'Запишите 0x00 вместо 0xFF и объясните, почему переключатели перестали читаться.',
  ),
  'max7219-digits': lesson(
    'display',
    'Вывести число на восемь разрядов MAX7219 через встроенный дешифратор цифр.',
    ['max7219-matrix'],
    'На индикаторе число 12345678; яркость ступенями растёт и возвращается к минимуму.',
    'Выключите дешифратор (0x0900) и посмотрите, что стало с цифрами. Покажите только четыре разряда.',
  ),
  'ws2812-dot': lesson(
    'interfaces',
    'Зажечь один светодиод адресной ленты, отправив остальным чёрный цвет.',
    ['ws2812-rainbow'],
    'Точка проходит ленту от начала до конца и на каждом круге меняет цвет.',
    'Оставляйте за точкой тусклый след. Запустите точку в обратную сторону.',
  ),
  'adc-binary': lesson(
    'interfaces',
    'Прочитать АЦП по SPI и показать результат двоичным числом.',
    ['adc-pwm'],
    'Ползунок потенциометра меняет число на светодиодах от 0 до 63.',
    'Покажите младшие шесть бит и объясните, почему они «дрожат» сильнее. Прочитайте канал 1.',
  ),
  'hcsr04-parking': lesson(
    'interfaces',
    'Превратить измеренное расстояние в частоту гудков парковочного датчика.',
    ['hcsr04-display'],
    'С уменьшением расстояния гудки учащаются, ближе 10 см звук непрерывный; дальше 150 см тишина.',
    'Добавьте три светодиода «зелёный — жёлтый — красный». Сделайте шкалу гудков нелинейной.',
  ),
  'dht11-alarm': lesson(
    'interfaces',
    'Сравнить показания DHT11 с порогами и учесть контрольную сумму ответа.',
    ['dht11-uart'],
    'LED5 подтверждает верный ответ; LED0 горит при влажности от 60 %, LED1 — при жаре от 30 °C.',
    'Добавьте гистерезис в 5 % влажности. Зажигайте LED2, если датчик не ответил три раза подряд.',
  ),
  'ir-code': lesson(
    'interfaces',
    'Принять команду пульта по протоколу NEC и показать её код.',
    ['ir-remote-leds'],
    'Каждая кнопка пульта даёт своё сочетание светодиодов, которое держится до следующей кнопки.',
    'Покажите адрес пульта вместо команды. Считайте, сколько раз подряд нажата одна кнопка.',
  ),
  'ps2-code': lesson(
    'interfaces',
    'Отличить нажатие клавиши PS/2 от отпускания по префиксу 0xF0.',
    ['ps2-uart'],
    'На светодиодах остаётся код последней нажатой клавиши; отпускание его не меняет.',
    'Показывайте код отпущенной клавиши. Зажгите все светодиоды, пока клавиша удерживается.',
  ),
};
