import type { Example } from './examples';
import { SPI16_V, TM1637_BUS_V, WS2812_TX_V } from './lab/bus/verilog-cores';
import { TM1637_SHOW_V } from './lab/bus/verilog-player';
import { CLK, LEDS, labExample } from './examples-lab-kit';

const matrixSource = () => `// Матрица 8×8 на MAX7219: смайлик, который подмигивает.
//
// MAX7219 принимает по трём проводам (CS, CLK, DIN) 16-битные кадры: старшие 8 бит — номер
// регистра, младшие 8 — данные. Для матрицы регистры 1…8 — это восемь строк картинки
// (старший бит — левая точка). После включения микросхема спит и гасит всё, поэтому
// сначала настраиваем её четырьмя кадрами:
//   0x0C01 — выйти из режима сна      0x0B07 — показывать все восемь строк
//   0x0A03 — яркость 3 из 15          0x0900 — декодер выключен (нужны сами точки)
// затем в цикле шлём восемь кадров с рисунком. Модуль spi16 отправляет один кадр.
module top #(
    // Через сколько тактов менять кадр (27_000_000 — раз в секунду).
    parameter BLINK = 2_700_000
) (
    input  wire clk,
    output wire max_din,
    output wire max_clk,
    output wire max_cs,
    output wire [5:0] led_n
);
  reg [3:0] i = 0;                       // 0…4 — настройка, 5…12 — строки картинки
  reg start = 0;
  reg [1:0] s = 0;
  reg wink = 0;
  reg [24:0] timer = 0;
  wire busy;
  reg [15:0] word;

  spi16 spi (.clk(clk), .start(start), .word(word), .busy(busy),
             .cs(max_cs), .sclk(max_clk), .mosi(max_din));

  // Картинка: смайлик; в кадре wink правый глаз закрыт.
  function [7:0] face(input closed, input [2:0] row);
    case (row)
      0: face = 8'h3C;  // ..XXXX..
      1: face = 8'h42;  // .X....X.
      2: face = closed ? 8'h85 : 8'hA5;  // глаза
      3: face = 8'h81;
      4: face = 8'hA5;
      5: face = 8'h99;  // улыбка
      6: face = 8'h42;
      default: face = 8'h3C;
    endcase
  endfunction

  wire [2:0] row = i - 4'd5;
  wire [3:0] register = {1'b0, row} + 4'd1;   // строка 0 лежит в регистре 1, строка 7 — в регистре 8
  always @* begin
    case (i)
      0: word = 16'h0C01;
      1: word = 16'h0B07;
      2: word = 16'h0A03;
      3: word = 16'h0900;
      4: word = 16'h0F00;                              // тестовый режим выключен
      default: word = {4'h0, register, face(wink, row)};
    endcase
  end

  always @(posedge clk) begin
    start <= 0;
    if (timer == BLINK) begin timer <= 0; wink <= ~wink; end
    else timer <= timer + 1;
    case (s)
      0: begin start <= 1; s <= 1; end
      1: s <= 2;
      2: if (!busy) begin
        i <= i == 12 ? 5 : i + 1;                      // после настройки рисуем строки по кругу
        s <= 0;
      end
    endcase
  end

  assign led_n = {5'b11111, ~wink};
endmodule
`;

const stopwatchSource = () => `// Секундомер на индикаторе TM1637: секунды и сотые доли.
//
// Счёт ведётся в двоично-десятичном виде (BCD): каждая цифра — отдельный четырёхбитный
// счётчик, и при переполнении 9 → 0 он передаёт единицу следующему разряду. Так цифры можно
// отправлять на индикатор без деления на 10. Модуль tm1637_show сам превращает их в сегменты
// и всё время обновляет индикатор.
//   S2 (кнопка 87) — старт/стоп     S1 (кнопка 88) — сброс в 00:00
// Сотая доля секунды — это 270 000 тактов по 37 нс. Кнопка S2 «дребезжит», поэтому после
// нажатия мы 10 мс её не слушаем.
module top #(
    parameter HUNDREDTH = 270_000
) (
    input  wire clk,
    input  wire reset,
    input  wire button,
    inout  wire tm_dio,
    output wire tm_clk,
    output wire [5:0] led_n
);
  reg [18:0] tick = 0;
  reg [3:0] hundredths_ones = 0, hundredths_tens = 0, seconds_ones = 0, seconds_tens = 0;
  reg running = 1;

  // Кнопки могут измениться в любой момент: пропускаем их через два триггера.
  reg [1:0] sync = 0;
  reg pressed_before = 0;
  reg [18:0] lock = 0;
  always @(posedge clk) begin
    sync <= {sync[0], button};
    pressed_before <= sync[1];
    if (lock != 0) lock <= lock - 1;
    else if (sync[1] && !pressed_before) begin running <= ~running; lock <= 270_000; end
  end

  always @(posedge clk) begin
    if (reset) begin
      tick <= 0;
      hundredths_ones <= 0; hundredths_tens <= 0; seconds_ones <= 0; seconds_tens <= 0;
    end else if (running) begin
      if (tick == HUNDREDTH - 1) begin
        tick <= 0;
        if (hundredths_ones == 9) begin
          hundredths_ones <= 0;
          if (hundredths_tens == 9) begin
            hundredths_tens <= 0;
            if (seconds_ones == 9) begin
              seconds_ones <= 0;
              seconds_tens <= seconds_tens == 5 ? 0 : seconds_tens + 1;
            end else seconds_ones <= seconds_ones + 1;
          end else hundredths_tens <= hundredths_tens + 1;
        end else hundredths_ones <= hundredths_ones + 1;
      end else tick <= tick + 1;
    end
  end

  tm1637_show show (
    .clk(clk), .digits({seconds_tens, seconds_ones, hundredths_tens, hundredths_ones}),
    .colon(1'b1), .dio(tm_dio), .tclk(tm_clk)
  );

  assign led_n = {5'b11111, ~running};
endmodule
`;

const stripSource = () => `// Лента WS2812B: бегущая радуга на восьми светодиодах.
//
// Каждый светодиод ленты получает 24 бита цвета (зелёный, красный, синий), а лишнее передаёт
// дальше. Бит кодируется длиной импульса на одном проводе: короткий (0,4 мкс) — 0, длинный
// (0,8 мкс) — 1. Пауза без импульсов дольше 50 мкс «защёлкивает» цвета. Модуль ws2812_tx
// отправляет один цвет. Цвет берётся с цветового круга: фаза 0…255 плавно проходит красный,
// зелёный, синий и возвращается к красному; у соседних светодиодов фазы сдвинуты на 32,
// а общий сдвиг растёт с каждым кадром, и радуга бежит по ленте. Яркость уменьшена в 8 раз,
// чтобы не слепить глаза.
module top #(
    // Пауза между кадрами в тактах: 54_000 — 2 мс. Увеличьте, чтобы радуга двигалась медленнее.
    parameter FRAME_DELAY = 54_000
) (
    input  wire clk,
    output wire ws_din,
    output wire [5:0] led_n
);
  reg [7:0] offset = 0;
  reg [2:0] pixel = 0;
  reg start = 0;
  reg [1:0] s = 0;
  reg [19:0] gap = 0;
  wire busy;

  // Цвет круга: фаза → {зелёный, красный, синий}, каждый канал не больше 31.
  function [23:0] wheel(input [7:0] p);
    reg [7:0] r, g, b;
    reg [7:0] q;
    begin
      if (p < 85) begin r = 255 - 3 * p; g = 3 * p; b = 0; end
      else if (p < 170) begin q = p - 85; r = 0; g = 255 - 3 * q; b = 3 * q; end
      else begin q = p - 170; r = 3 * q; g = 0; b = 255 - 3 * q; end
      wheel = {3'b000, g[7:3], 3'b000, r[7:3], 3'b000, b[7:3]};
    end
  endfunction

  wire [7:0] phase = offset + {pixel, 5'b00000};

  ws2812_tx tx (.clk(clk), .start(start), .grb(wheel(phase)), .busy(busy), .dout(ws_din));

  always @(posedge clk) begin
    start <= 0;
    case (s)
      0: begin start <= 1; s <= 1; end                 // отправить цвет текущего светодиода
      1: s <= 2;
      2: if (!busy) begin
        if (pixel == 7) begin pixel <= 0; gap <= FRAME_DELAY; s <= 3; end
        else begin pixel <= pixel + 1; s <= 0; end
      end
      3: if (gap == 0) begin offset <= offset + 1; s <= 0; end   // пауза: лента показывает кадр
         else gap <= gap - 1;
    endcase
  end

  assign led_n = 6'b111111;
endmodule
`;

export const displayExamples: Example[] = [
  labExample(
    'max7219-matrix',
    'Матрица MAX7219: подмигивающий смайлик',
    'Кадры по 16 бит (регистр и данные) по трём проводам: настройка из сна и восемь строк картинки. На стенде: матрица 8×8 на MAX7219.',
    [
      { name: 'top.v', content: matrixSource() },
      { name: 'spi16.v', content: SPI16_V },
    ],
    [
      CLK,
      ['max_din', 75, 'DIN MAX7219 (J5): данные.'],
      ['max_clk', 80, 'CLK MAX7219 (J5): такты, данные читаются по переднему фронту.'],
      ['max_cs', 42, 'CS (LOAD) MAX7219 (J5): передний фронт защёлкивает кадр.'],
      ...LEDS(),
    ],
  ),
  labExample(
    'tm1637-stopwatch',
    'TM1637: секундомер',
    'Счёт в BCD, двухпроводный протокол TM1637 с подтверждением. Кнопка S2 — старт и стоп, S1 — сброс. На стенде: индикатор TM1637.',
    [
      { name: 'top.v', content: stopwatchSource() },
      { name: 'tm1637_bus.v', content: TM1637_BUS_V },
      { name: 'tm1637_show.v', content: TM1637_SHOW_V },
    ],
    [
      CLK,
      ['reset', 88, 'Кнопка S1: нажата = 1, сброс секундомера.'],
      ['button', 87, 'Кнопка S2: нажата = 1, старт и стоп.'],
      ['tm_clk', 75, 'CLK индикатора TM1637 (J5).'],
      ['tm_dio', 80, 'DIO индикатора TM1637 (J5): двусторонняя линия с подтяжкой.', 'UP'],
      ...LEDS(),
    ],
  ),
  labExample(
    'ws2812-rainbow',
    'Лента WS2812: радуга',
    'Цвета кодируются длиной импульса на одном проводе, пауза 50 мкс защёлкивает кадр. На стенде: лента из 8 светодиодов WS2812B.',
    [
      { name: 'top.v', content: stripSource() },
      { name: 'ws2812_tx.v', content: WS2812_TX_V },
    ],
    [CLK, ['ws_din', 75, 'DIN ленты WS2812B (J5): цвета импульсами.'], ...LEDS()],
  ),
];
