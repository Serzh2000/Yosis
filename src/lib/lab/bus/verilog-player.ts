/**
 * Building blocks for the examples that talk to a part over I2C or to the TM1637 display. They
 * sit on top of the cores in verilog.ts and verilog-cores.ts.
 */

/** Runs a program of I2C commands that the example keeps in a small table. */
export const I2C_PLAYER_V = `// «Проигрыватель» программы обмена по I²C. Вместо того чтобы описывать конечный автомат
// для каждой микросхемы, мы записываем обмен списком команд (как программу), а этот
// модуль выполняет их по одной с помощью ведущего i2c_master.
//
// Команда — 12 бит: старшие 4 бита — код, младшие 8 — число (op = {код, число}).
//   0 END    остановиться (загорается done)
//   1 START  начать обмен (или повторный START)
//   2 STOP   закончить обмен
//   3 WRITE  отправить байт «число»
//   4 WRITEV отправить байт var_byte, который выставляет внешняя схема
//   5 READ   прочитать байт и ответить ACK (будут ещё байты)
//   6 READL  прочитать последний байт и ответить NACK
//   7 WAIT   пауза «число» × 100 мкс
//   8 LOOPIF перейти на команду «число», если more = 1
//   9 JUMP   перейти на команду «число» безусловно
// Прочитанные байты сдвигаются в rx: последний лежит в rx[7:0], предыдущий в rx[15:8].
module i2c_player #(
  parameter DIV = 17        // частота SCL = 27 МГц / (4 * DIV), то есть около 400 кГц
) (
  input clk,
  input [11:0] op,          // текущая команда; внешняя таблица выдаёт её по номеру step
  output reg [9:0] step = 0,
  input [7:0] var_byte,
  input more,
  output reg taken = 0,     // импульс: байт var_byte взят, можно готовить следующий
  output reg [55:0] rx = 0,
  output reg rx_strobe = 0, // импульс после каждого прочитанного байта
  output reg ack_error = 0, // 1, если хоть одно устройство не ответило ACK
  output reg done = 0,
  inout sda,
  output scl
);
  localparam END = 0, START = 1, STOP = 2, WRITE = 3, WRITEV = 4, READ = 5, READL = 6,
             WAIT = 7, LOOPIF = 8, JUMP = 9;

  reg go = 0;
  reg [2:0] mcmd = 0;
  reg [7:0] mdata = 0;
  reg mnack = 0;
  wire busy, bus_nack;
  wire [7:0] rdata;
  i2c_master #(.DIV(DIV)) bus (
    .clk(clk), .start(go), .cmd(mcmd), .wdata(mdata), .nack(mnack),
    .busy(busy), .rdata(rdata), .ack_error(bus_nack), .sda(sda), .scl(scl)
  );

  wire [3:0] code = op[11:8];
  wire [7:0] arg = op[7:0];
  reg [1:0] phase = 0;
  reg [23:0] pause = 0;

  always @(posedge clk) begin
    go <= 0;
    taken <= 0;
    rx_strobe <= 0;
    if (!done) case (phase)
      0: case (code)               // выбираем, что делать с текущей командой
        END:    done <= 1;
        START:  begin mcmd <= 1; go <= 1; phase <= 1; end
        STOP:   begin mcmd <= 2; go <= 1; phase <= 1; end
        WRITE:  begin mcmd <= 3; mdata <= arg; go <= 1; phase <= 1; end
        WRITEV: begin mcmd <= 3; mdata <= var_byte; go <= 1; phase <= 1; taken <= 1; end
        READ:   begin mcmd <= 4; mnack <= 0; go <= 1; phase <= 1; end
        READL:  begin mcmd <= 4; mnack <= 1; go <= 1; phase <= 1; end
        WAIT:   begin pause <= arg * 2700; phase <= 3; end
        LOOPIF: step <= more ? arg : step + 1;
        JUMP:   step <= arg;
        default: step <= step + 1;
      endcase
      1: phase <= 2;               // команда принята ведущим
      2: if (!busy) begin          // команда выполнена
        if (mcmd == 3 && bus_nack) ack_error <= 1;
        if (mcmd == 4) begin rx <= {rx[47:0], rdata}; rx_strobe <= 1; end
        step <= step + 1;
        phase <= 0;
      end
      3: if (pause == 0) begin step <= step + 1; phase <= 0; end
         else pause <= pause - 1;
    endcase
  end
endmodule
`;

/** Writes bytes to an HD44780 behind a PCF8574 I2C backpack. */
export const LCD_I2C_V = `// Запись байтов в ЖК-экран HD44780 через переходник PCF8574 (адрес 0x27).
// Ножки PCF8574 подключены к экрану так: P0 = RS, P1 = RW, P2 = E, P3 = подсветка, P4..P7 = D4..D7.
// Один полубайт — это две записи в PCF8574: сначала с E = 1, потом с E = 0 (экран защёлкивает
// данные по спаду E). Байт — два полубайта, поэтому одна запись байта — это 4 байта по I²C.
// Весь обмен для одного байта экрана — отдельная транзакция: START, адрес, данные, STOP.
module lcd_i2c #(
  parameter DIV = 17
) (
  input clk,
  input start,
  input short,             // 1 = только старший полубайт (первые шаги инициализации)
  input rs_in,             // 0 = команда, 1 = символ
  input [7:0] data,
  output reg busy = 0,
  inout sda,
  output scl
);
  localparam T_SHORT = 135000;  // 5 мс: так долго ждём после первых шагов инициализации
  localparam T_SLOW = 54000;    // 2 мс: очистка экрана и «домой»
  localparam T_FAST = 1500;     // около 55 мкс: все остальные байты

  reg go = 0;
  reg [2:0] mcmd = 0;
  reg [7:0] mdata = 0;
  wire mbusy, nack;
  i2c_master #(.DIV(DIV)) bus (
    .clk(clk), .start(go), .cmd(mcmd), .wdata(mdata), .nack(1'b0),
    .busy(mbusy), .rdata(), .ack_error(nack), .sda(sda), .scl(scl)
  );

  reg [3:0] st = 0;
  reg [1:0] ph = 0;
  reg [7:0] sh = 0;
  reg rs = 0, is_short = 0;
  reg [17:0] t = 0;
  wire [3:0] high = sh[7:4];
  wire [3:0] low = sh[3:0];

  always @(posedge clk) begin
    go <= 0;
    case (st)
      0: if (start) begin
        busy <= 1; sh <= data; rs <= rs_in; is_short <= short; st <= 1; ph <= 0;
      end
      8: begin                         // пауза, чтобы экран успел выполнить команду
        if (t != 0) t <= t - 1;
        else begin busy <= 0; st <= 0; end
      end
      default: case (ph)
        0: begin
          go <= 1; ph <= 1;
          case (st)
            1: mcmd <= 1;                                                  // START
            2: begin mcmd <= 3; mdata <= 8'h4E; end                        // адрес 0x27, запись
            3: begin mcmd <= 3; mdata <= {high, 1'b1, 1'b1, 1'b0, rs}; end // старший, E = 1
            4: begin mcmd <= 3; mdata <= {high, 1'b1, 1'b0, 1'b0, rs}; end // старший, E = 0
            5: begin mcmd <= 3; mdata <= {low, 1'b1, 1'b1, 1'b0, rs}; end  // младший, E = 1
            6: begin mcmd <= 3; mdata <= {low, 1'b1, 1'b0, 1'b0, rs}; end  // младший, E = 0
            7: mcmd <= 2;                                                  // STOP
          endcase
        end
        1: ph <= 2;
        2: if (!mbusy) begin
          ph <= 0;
          // Короткая запись (начало инициализации) обходится без младшего полубайта.
          st <= (st == 4 && is_short) ? 7 : st + 1;
          if (st == 7) t <= is_short ? T_SHORT : (!rs && sh[7:2] == 0) ? T_SLOW : T_FAST;
        end
      endcase
    endcase
  end
endmodule
`;

/** Shows four BCD digits and a colon on a TM1637. */
export const TM1637_SHOW_V = `// Показывает четыре десятичные цифры на индикаторе TM1637 и всё время обновляет их.
// Обмен с TM1637 состоит из трёх коротких «разговоров»:
//   1. команда 0x40 — «буду писать данные по порядку»
//   2. команда 0xC0 (адрес первой цифры) и четыре байта — сами цифры
//   3. команда 0x88 + яркость — включить индикатор
// Цифра передаётся как набор сегментов: бит 0 = a, ... бит 6 = g, бит 7 = точка (на этом
// индикаторе точка второй цифры — это двоеточие часов).
// digits = {цифра1, цифра2, цифра3, цифра4}, слева направо, каждая в двоично-десятичном виде;
// значение 15 гасит разряд.
module tm1637_show #(
  parameter DIV = 27,       // CLK индикатора = 27 МГц / (4 * DIV), около 250 кГц
  parameter BRIGHTNESS = 7  // 0..7
) (
  input clk,
  input [15:0] digits,
  input colon,
  inout dio,
  output tclk
);
  function [7:0] segments(input [3:0] d);
    case (d)
      0: segments = 8'h3F;  1: segments = 8'h06;  2: segments = 8'h5B;  3: segments = 8'h4F;
      4: segments = 8'h66;  5: segments = 8'h6D;  6: segments = 8'h7D;  7: segments = 8'h07;
      8: segments = 8'h7F;  9: segments = 8'h6F;  default: segments = 8'h00;
    endcase
  endfunction

  reg go = 0;
  reg [1:0] mcmd = 0;
  reg [7:0] mdata = 0;
  wire mbusy;
  tm1637_bus #(.DIV(DIV)) bus (
    .clk(clk), .start(go), .cmd(mcmd), .wdata(mdata), .busy(mbusy), .dio(dio), .tclk(tclk)
  );

  reg [3:0] step = 0;
  reg [1:0] ph = 0;
  always @(posedge clk) begin
    go <= 0;
    case (ph)
      0: begin
        go <= 1; ph <= 1;
        case (step)
          0: begin mcmd <= 1; end                                 // START
          1: begin mcmd <= 3; mdata <= 8'h40; end                 // данные по порядку
          2: begin mcmd <= 2; end                                 // STOP
          3: begin mcmd <= 1; end
          4: begin mcmd <= 3; mdata <= 8'hC0; end                 // адрес первой цифры
          5: begin mcmd <= 3; mdata <= segments(digits[15:12]); end
          6: begin mcmd <= 3; mdata <= segments(digits[11:8]) | (colon ? 8'h80 : 8'h00); end
          7: begin mcmd <= 3; mdata <= segments(digits[7:4]); end
          8: begin mcmd <= 3; mdata <= segments(digits[3:0]); end
          9: begin mcmd <= 2; end
          10: begin mcmd <= 1; end
          11: begin mcmd <= 3; mdata <= 8'h88 | BRIGHTNESS; end    // включить, яркость
          default: begin mcmd <= 2; end
        endcase
      end
      1: ph <= 2;
      2: if (!mbusy) begin
        ph <= 0;
        step <= step == 12 ? 0 : step + 1;
      end
    endcase
  end
endmodule
`;
