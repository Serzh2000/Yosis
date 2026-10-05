import type { Example } from './examples';
import { I2C_MASTER_V, LCD4_V } from './lab/bus/verilog';
import { LCD_I2C_V } from './lab/bus/verilog-player';
import {
  CLK,
  SCL,
  SDA,
  LEDS,
  hex,
  i2cFiles,
  labExample,
  lcdProgram,
  lcdRom,
  program,
  textFunction,
} from './examples-lab-kit';

// ---------------------------------------------------------------------------------------------
const oledSource = () => {
  const init: [number, string][] = [
    [0xae, 'экран выключить на время настройки'],
    [0xd5, 'делитель частоты...'],
    [0x80, '...стандартный'],
    [0xa8, 'число строк...'],
    [0x3f, '...64'],
    [0xd3, 'смещение по вертикали...'],
    [0x00, '...нет'],
    [0x40, 'первая строка памяти — верхняя'],
    [0x8d, 'преобразователь питания матрицы...'],
    [0x14, '...включить (без него экран не светится)'],
    [0x20, 'способ записи...'],
    [0x00, '...по строкам страниц, слева направо'],
    [0x21, 'окно записи: столбцы...'],
    [0x00, '...от 0'],
    [0x7f, '...до 127'],
    [0x22, 'окно записи: страницы...'],
    [0x00, '...от 0'],
    [0x07, '...до 7'],
    [0xa1, 'зеркало по горизонтали (экран стоит «вверх ногами»)'],
    [0xc8, 'зеркало по вертикали'],
    [0xda, 'разводка строк...'],
    [0x12, '...для экрана 128x64'],
    [0x81, 'яркость...'],
    [0xcf, '...высокая'],
    [0xd9, 'время заряда...'],
    [0xf1, '...по рекомендации производителя'],
    [0xdb, 'уровень Vcomh...'],
    [0x40, '...по рекомендации производителя'],
    [0xa4, 'показывать содержимое памяти'],
    [0xa6, 'обычные цвета (не инверсия)'],
    [0xaf, 'экран включить'],
  ];
  const steps: [string, string?][] = [
    ['WAIT 100', 'после включения питания даём экрану 10 мс'],
    ['START'],
    ['WRITE 78', 'адрес экрана 0x3C сдвинут на бит и дополнен нулём «запись»'],
    ['WRITE 00', 'управляющий байт: дальше идут команды'],
    ...init.map(([byte, note]) => [`WRITE ${hex(byte)}`, note] as [string, string]),
    ['STOP'],
    ['START'],
    ['WRITE 78'],
    ['WRITE 40', 'управляющий байт: дальше идут пиксели'],
  ];
  const data = steps.length;
  steps.push(
    ['WRITEV', 'очередной байт картинки'],
    [`LOOPIF ${data}`, 'повторять, пока не отправлены все 1024 байта'],
    ['STOP'],
    ['END'],
  );
  return `// OLED-экран 128×64 (контроллер SSD1306) по шине I²C: включаем его и рисуем надпись.
//
// Память экрана — 8 «страниц» по 128 байт. Один байт — столбец из 8 пикселей высотой
// (младший бит сверху). Мы отправляем 1024 байта подряд, и экран заполняется по строкам
// страниц. Сначала настраиваем экран командами (управляющий байт 0x00), потом шлём пиксели
// (управляющий байт 0x40). Без команд 0x8D 0x14 и 0xAF экран остаётся тёмным.
//
// Шина: sda и scl на выводах разъёма J5. Скорость около 400 кГц (DIV = 17 в i2c_player).
// LED0 горит, когда рисование закончено; LED1 — если экран не ответил (ACK не пришёл).
module top (
    input  wire clk,
    inout  wire sda,
    output wire scl,
    output wire [5:0] led_n
);
  wire [9:0] step;
  wire [55:0] rx;
  wire rx_strobe, ack_error, done, taken;
  reg [10:0] index = 0;                 // номер байта картинки: 0…1023
  wire more = index != 1024;
  reg [7:0] pixel_byte;

${program(steps)}

  i2c_player player (
    .clk(clk), .op(op), .step(step), .var_byte(pixel_byte), .more(more), .taken(taken),
    .rx(rx), .rx_strobe(rx_strobe), .ack_error(ack_error), .done(done), .sda(sda), .scl(scl)
  );

  always @(posedge clk) if (taken) index <= index + 1;

  // Какой пиксельный байт лежит на странице page и в столбце col.
  wire [2:0] page = index[9:7];
  wire [6:0] col = index[6:0];
${textFunction('line1', 'HELLO, WORLD!')}
${textFunction('line2', 'FPGA + I2C')}
  always @* begin
    pixel_byte = 8'h00;
    if (page == 0) pixel_byte = 8'h01;                        // верхняя линия рамки
    if (page == 7) pixel_byte = 8'h80;                        // нижняя линия рамки
    if (col == 0 || col == 127) pixel_byte = 8'hFF;           // боковые линии
    if (page == 2 && col >= 25 && col < 103) pixel_byte = line1(col - 7'd25);
    if (page == 4 && col >= 34 && col < 94) pixel_byte = line2(col - 7'd34);
  end

  assign led_n = {4'b1111, ~ack_error, ~done};
endmodule
`;
};

// ---------------------------------------------------------------------------------------------
const lcdI2cSource = () => {
  const items = lcdProgram(['Hello, FPGA!', 'LCD 1602 + I2C']);
  return `// Символьный экран 1602 с переходником I²C (PCF8574, адрес 0x27).
//
// Экран HD44780 понимает команды и символы. Переходник превращает каждый байт по I²C в
// состояние ножек экрана (RS, E, подсветка, D4–D7). Модуль lcd_i2c делает всю эту работу:
// мы только выдаём ему по одному байту экрана — это либо команда (rs = 0), либо символ (rs = 1).
// Таблица ниже — «программа» для экрана: инициализация, потом две строки текста.
//
// Первые четыре строки — особая последовательность запуска HD44780: после включения экран
// ещё не знает, 4 или 8 бит ему подают, и её нужно выполнить с паузами по даташиту.
// LED0 горит, когда вывод закончен.
module top #(
    // Пауза после включения питания. По даташиту HD44780 ждёт 40 мс (1_080_000 тактов),
    // экрану в лаборатории хватает и 15 мс.
    parameter POWER_UP = 405_000
) (
    input  wire clk,
    inout  wire sda,
    output wire scl,
    output wire [5:0] led_n
);
  reg [19:0] wait_count = 0;
  reg [6:0] n = 0;
  reg [1:0] s = 0;
  reg start = 0, done = 0;
  reg [9:0] item;
  wire busy;

  always @* begin
    case (n)
${lcdRom(items)}
      default: item = 10'h000;
    endcase
  end
  wire last = n == ${items.length};

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
};

// ---------------------------------------------------------------------------------------------
const lcdDirectSource = () => {
  const items = lcdProgram(['Hello, FPGA!', 'LCD 1602 direct']);
  return `// Символьный экран 1602 (HD44780), подключённый напрямую: RS, E и четыре линии данных D4–D7.
// RW соединён с землёй: мы только пишем в экран. Модуль lcd4 передаёт байт двумя полубайтами
// и сам выдерживает паузы, которые экрану нужны на выполнение команды.
//
// Таблица ниже — «программа» для экрана: сначала особая последовательность запуска, потом
// настройка и две строки текста. Каждая запись — {short, rs, байт}:
//   short = 1: передаётся только старший полубайт (так экран переводят в 4-битный режим)
//   rs = 0: байт — команда, rs = 1: байт — символ.
// LED0 горит, когда вывод закончен.
module top #(
    // Пауза после включения питания. По даташиту HD44780 ждёт 40 мс (1_080_000 тактов),
    // экрану в лаборатории хватает и 15 мс.
    parameter POWER_UP = 405_000
) (
    input  wire clk,
    output wire lcd_rs,
    output wire lcd_e,
    output wire [3:0] lcd_d,
    output wire [5:0] led_n
);
  reg [19:0] wait_count = 0;
  reg [6:0] n = 0;
  reg [1:0] s = 0;
  reg start = 0, done = 0;
  reg [9:0] item;
  wire busy;

  always @* begin
    case (n)
${lcdRom(items)}
      default: item = 10'h000;
    endcase
  end
  wire last = n == ${items.length};

  lcd4 lcd (
    .clk(clk), .start(start), .short(item[9]), .rs_in(item[8]), .data(item[7:0]),
    .busy(busy), .rs(lcd_rs), .e(lcd_e), .d(lcd_d)
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
};

export const i2cDisplayExamples: Example[] = [
  labExample(
    'oled-hello',
    'OLED-экран 128×64: привет, мир',
    'SSD1306 по I²C: настройка экрана командами и надпись из шрифта 5×7. На стенде: OLED-экран, провода SDA и SCL уже подключены.',
    [{ name: 'top.v', content: oledSource() }, ...i2cFiles()],
    [CLK, SDA, SCL, ...LEDS()],
  ),
  labExample(
    'lcd-i2c',
    'ЖК-экран 1602 по I²C',
    'Экран HD44780 за переходником PCF8574 (адрес 0x27): запуск, две строки текста. На стенде: ЖК-экран 16×2 с переходником I²C.',
    [
      { name: 'top.v', content: lcdI2cSource() },
      { name: 'i2c_master.v', content: I2C_MASTER_V },
      { name: 'lcd_i2c.v', content: LCD_I2C_V },
    ],
    [CLK, SDA, SCL, ...LEDS()],
  ),
  labExample(
    'lcd-direct',
    'ЖК-экран 1602 напрямую',
    'Экран HD44780 на четырёх линиях данных (D4–D7), RS и E: запуск в 4-битном режиме и две строки текста. На стенде: ЖК-экран 16×2 напрямую.',
    [
      { name: 'top.v', content: lcdDirectSource() },
      { name: 'lcd4.v', content: LCD4_V },
    ],
    [
      CLK,
      ['lcd_rs', 75, 'RS экрана (J5): 0 — команда, 1 — символ.'],
      ['lcd_e', 80, 'E экрана (J5): данные защёлкиваются по спаду.'],
      ['lcd_d[0]', 42, 'D4 экрана (J5).'],
      ['lcd_d[1]', 41, 'D5 экрана (J5).'],
      ['lcd_d[2]', 56, 'D6 экрана (J5).'],
      ['lcd_d[3]', 54, 'D7 экрана (J5).'],
      ...LEDS(),
    ],
  ),
];
