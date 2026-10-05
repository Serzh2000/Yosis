/**
 * Verilog building blocks shared by the bus-part examples and by the tests that check the parts.
 * The text is what a pupil reads in the editor, so comments are in Russian.
 */

/** A simple I2C master: START, STOP, write a byte, read a byte. SCL is not stretched. */
export const I2C_MASTER_V = `// Ведущий шины I²C. Умеет четыре команды: START, STOP, записать байт, прочитать байт.
// Одна команда = один импульс start. Пока busy = 1, команда выполняется.
//
// Каждый бит делится на четыре четверти по DIV тактов:
//   0: выставляем SDA   1: SCL вверх   2: читаем SDA   3: SCL вниз
// Частота SCL = 27 МГц / (4 * DIV). При DIV = 17 это около 400 кГц.
//
// SDA открытый коллектор: схема либо тянет линию к нулю, либо отпускает её (z),
// а единицу на линии создаёт подтягивающий резистор.
module i2c_master #(
  parameter DIV = 17
) (
  input clk,
  input start,              // импульс: выполнить команду cmd
  input [2:0] cmd,          // 1 = START, 2 = STOP, 3 = записать wdata, 4 = прочитать байт
  input [7:0] wdata,
  input nack,               // для чтения: 1 = ответить NACK (это последний байт)
  output reg busy = 0,
  output reg [7:0] rdata = 0,
  output reg ack_error = 0, // после записи: 1 = устройство не ответило ACK
  inout sda,
  output reg scl = 1
);
  reg sda_low = 0;
  assign sda = sda_low ? 1'b0 : 1'bz;

  reg [15:0] cnt = 0;
  reg [1:0] q = 0;          // четверть бита
  reg [3:0] n = 0;          // номер бита, 8 = бит подтверждения
  reg [2:0] c = 0;
  reg [7:0] sh = 0;
  wire tick = cnt == DIV - 1;

  always @(posedge clk) begin
    cnt <= busy && !tick ? cnt + 1 : 0;
    if (!busy) begin
      if (start) begin
        busy <= 1;
        c <= cmd;
        sh <= wdata;
        q <= 0;
        n <= 0;
      end
    end else if (tick) begin
      q <= q + 1;
      case (c)
        1: case (q) // START (или повторный START)
          0: sda_low <= 0;
          1: scl <= 1;
          2: sda_low <= 1;
          3: begin scl <= 0; busy <= 0; end
        endcase
        2: case (q) // STOP
          0: sda_low <= 1;
          1: scl <= 1;
          2: sda_low <= 0;
          3: busy <= 0;
        endcase
        3: case (q) // запись байта и приём бита подтверждения
          0: sda_low <= n < 8 ? ~sh[7] : 0;
          1: scl <= 1;
          2: if (n == 8) ack_error <= sda;
          3: begin
            scl <= 0;
            sh <= {sh[6:0], 1'b0};
            n <= n + 1;
            if (n == 8) busy <= 0;
          end
        endcase
        4: case (q) // чтение байта и отправка ACK или NACK
          0: sda_low <= n == 8 ? ~nack : 0;
          1: scl <= 1;
          2: if (n < 8) sh <= {sh[6:0], sda};
          3: begin
            scl <= 0;
            n <= n + 1;
            if (n == 8) begin busy <= 0; rdata <= sh; end
          end
        endcase
        default: busy <= 0;
      endcase
    end
  end
endmodule
`;

/** Writes bytes to an HD44780 character LCD wired directly in 4-bit mode (RW to ground). */
export const LCD4_V = `// Запись байтов в ЖК-экран HD44780 по четырём линиям данных (D4–D7), RW подключён к земле.
// Один байт уходит двумя полубайтами: сначала старший, потом младший. Каждый полубайт
// "защёлкивается" спадом сигнала E. После байта экрану нужно время на работу:
//   обычная команда или символ — около 40 мкс, очистка экрана и "домой" — около 1,6 мс,
//   первые полубайты инициализации (short = 1) — по даташиту ждём 4,1 мс и дольше.
// Времена взяты с запасом; в лаборатории экран подсвечивает предупреждение, если ждать меньше.
module lcd4 (
  input clk,
  input start,             // импульс: отправить байт
  input short,             // 1 = отправить только один полубайт (старший), для инициализации
  input rs_in,             // 0 = команда, 1 = символ
  input [7:0] data,
  output reg busy = 0,
  output reg rs = 0,
  output reg e = 0,
  output reg [3:0] d = 0
);
  localparam TSETUP = 27;       // 1 мкс при 27 МГц
  localparam TE = 27;
  localparam T_SHORT = 135000;  // 5 мс
  localparam T_SLOW = 54000;    // 2 мс
  localparam T_FAST = 1500;     // около 55 мкс

  reg [3:0] st = 0;
  reg [17:0] t = 0;
  reg [7:0] sh = 0;
  reg is_short = 0;

  always @(posedge clk) begin
    if (t != 0) t <= t - 1;
    else case (st)
      0: if (start) begin
        busy <= 1; rs <= rs_in; d <= data[7:4]; sh <= data; is_short <= short;
        st <= 1; t <= TSETUP;
      end
      1: begin e <= 1; st <= 2; t <= TE; end
      2: begin e <= 0; st <= is_short ? 5 : 3; t <= TE; end
      3: begin d <= sh[3:0]; st <= 4; t <= TSETUP; end
      4: begin e <= 1; st <= 6; t <= TE; end
      6: begin e <= 0; st <= 5; t <= TE; end
      5: begin
        st <= 7;
        t <= is_short ? T_SHORT : (!rs && sh[7:2] == 0) ? T_SLOW : T_FAST;
      end
      7: begin busy <= 0; st <= 0; end
    endcase
  end
endmodule
`;
