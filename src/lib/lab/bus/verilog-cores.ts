/**
 * Small Verilog cores for the protocol parts, used by the examples and by the part tests. The
 * text is what a pupil reads in the editor, so comments are in Russian.
 */

/** Two-wire master for the TM1637 display: START, STOP and byte writes, least significant bit first. */
export const TM1637_BUS_V = `// Передатчик для индикатора TM1637. Протокол похож на I²C, но без адреса,
// а байты идут младшим битом вперёд. Команды: 1 = START, 2 = STOP, 3 = записать байт.
// Бит делится на четыре четверти по DIV тактов (CLK = 27 МГц / (4 * DIV)).
// DIO — линия с открытым коллектором: схема тянет её к нулю или отпускает (z).
// После каждого байта индикатор на девятом такте сам тянет DIO к нулю — это подтверждение.
module tm1637_bus #(
  parameter DIV = 27        // около 250 кГц
) (
  input clk,
  input start,
  input [1:0] cmd,
  input [7:0] wdata,
  output reg busy = 0,
  inout dio,
  output reg tclk = 1
);
  reg dio_low = 0;
  assign dio = dio_low ? 1'b0 : 1'bz;

  reg [15:0] cnt = 0;
  reg [1:0] q = 0;
  reg [3:0] n = 0;
  reg [1:0] c = 0;
  reg [7:0] sh = 0;
  wire tick = cnt == DIV - 1;

  always @(posedge clk) begin
    cnt <= busy && !tick ? cnt + 1 : 0;
    if (!busy) begin
      if (start) begin busy <= 1; c <= cmd; sh <= wdata; q <= 0; n <= 0; end
    end else if (tick) begin
      q <= q + 1;
      case (c)
        1: case (q) // START: DIO падает, пока CLK высокий
          0: dio_low <= 0;
          1: tclk <= 1;
          2: dio_low <= 1;
          3: begin tclk <= 0; busy <= 0; end
        endcase
        2: case (q) // STOP: DIO растёт, пока CLK высокий
          0: dio_low <= 1;
          1: tclk <= 1;
          2: dio_low <= 0;
          3: busy <= 0;
        endcase
        3: case (q) // байт: восемь бит и подтверждение
          0: dio_low <= n < 8 ? ~sh[0] : 0;
          1: tclk <= 1;
          3: begin
            tclk <= 0;
            sh <= {1'b0, sh[7:1]};
            n <= n + 1;
            if (n == 8) busy <= 0;
          end
        endcase
        default: busy <= 0;
      endcase
    end
  end
endmodule
`;

/** Sends one 24-bit colour (green, red, blue) to a WS2812B strip. */
export const WS2812_TX_V = `// Передатчик цвета для ленты WS2812B. Один пиксель — 24 бита: зелёный, красный, синий,
// старшим битом вперёд. Бит — это высокий импульс на выходе dout:
//   ноль:      около 0,4 мкс высокого уровня (11 тактов по 37 нс), потом низкий уровень
//   единица:   около 0,8 мкс высокого уровня (22 такта), потом низкий уровень
// Весь бит длится 34 такта, то есть около 1,26 мкс. Пауза больше 50 мкс «защёлкивает» цвета.
module ws2812_tx (
  input clk,
  input start,
  input [23:0] grb,
  output reg busy = 0,
  output reg dout = 0
);
  reg [5:0] t = 0;
  reg [4:0] n = 0;
  reg [23:0] sh = 0;

  always @(posedge clk) begin
    if (!busy) begin
      if (start) begin busy <= 1; sh <= grb; n <= 0; t <= 0; dout <= 1; end
    end else begin
      t <= t + 1;
      if (t == (sh[23] ? 21 : 10)) dout <= 0;
      if (t == 33) begin
        t <= 0;
        sh <= {sh[22:0], 1'b0};
        n <= n + 1;
        if (n == 23) busy <= 0;
        else dout <= 1;
      end
    end
  end
endmodule
`;

/** A 16-bit write for the MAX7219 (and any similar SPI shift register): CS, CLK, DIN. */
export const SPI16_V = `// Отправка 16-битного слова по трём проводам: CS (LOAD), SCLK, MOSI (DIN).
// Старший бит идёт первым. Данные выставляются при низком SCLK, микросхема
// читает их по переднему фронту SCLK, а слово принимает по переднему фронту CS.
module spi16 #(
  parameter DIV = 4         // тактов на половину периода SCLK
) (
  input clk,
  input start,
  input [15:0] word,
  output reg busy = 0,
  output reg cs = 1,
  output reg sclk = 0,
  output reg mosi = 0
);
  reg [2:0] st = 0;
  reg [4:0] i = 0;
  reg [7:0] cnt = 0;
  reg [15:0] sh = 0;

  always @(posedge clk) begin
    if (cnt != 0) cnt <= cnt - 1;
    else case (st)
      0: if (start) begin busy <= 1; sh <= word; cs <= 0; i <= 0; st <= 1; cnt <= DIV; end
      1: begin mosi <= sh[15]; sh <= {sh[14:0], 1'b0}; st <= 2; cnt <= DIV; end
      2: begin sclk <= 1; st <= 3; cnt <= DIV; end
      3: begin sclk <= 0; i <= i + 1; st <= i == 15 ? 4 : 1; cnt <= DIV; end
      4: begin cs <= 1; st <= 5; cnt <= DIV; end
      5: begin busy <= 0; st <= 0; end
    endcase
  end
endmodule
`;

/** Reads one channel of an MCP3008 ADC. */
export const MCP3008_READ_V = `// Чтение одного канала АЦП MCP3008 по SPI (режим 0), три байта подряд:
//   1-й байт: 0000 0001           — старт-бит
//   2-й байт: 1 CCC 0000          — 1 = одиночный вход, CCC = номер канала
//   3-й байт: любой               — в это время АЦП отвечает
// Ответ: нулевой бит, затем десять бит результата (старший первым).
// Мы читаем MISO по переднему фронту SCLK и берём последние десять бит из 24.
module mcp3008_read #(
  parameter DIV = 8         // тактов на половину периода SCLK
) (
  input clk,
  input start,
  input [2:0] channel,
  output reg busy = 0,
  output reg [9:0] value = 0,
  output reg cs = 1,
  output reg sclk = 0,
  output reg mosi = 0,
  input miso
);
  reg [2:0] st = 0;
  reg [4:0] i = 0;
  reg [7:0] cnt = 0;
  reg [23:0] tx = 0;
  reg [23:0] rx = 0;

  always @(posedge clk) begin
    if (cnt != 0) cnt <= cnt - 1;
    else case (st)
      0: if (start) begin
        busy <= 1; cs <= 0; i <= 0; st <= 1; cnt <= DIV;
        tx <= {7'b0, 1'b1, 1'b1, channel, 12'b0};
      end
      1: begin mosi <= tx[23]; tx <= {tx[22:0], 1'b0}; st <= 2; cnt <= DIV; end
      2: begin sclk <= 1; rx <= {rx[22:0], miso}; st <= 3; cnt <= DIV; end
      3: begin sclk <= 0; i <= i + 1; st <= i == 23 ? 4 : 1; cnt <= DIV; end
      4: begin cs <= 1; value <= rx[9:0]; st <= 5; cnt <= DIV; end
      5: begin busy <= 0; st <= 0; end
    endcase
  end
endmodule
`;

/** Asks a DHT11 for a reading. */
export const DHT11_READ_V = `// Чтение датчика DHT11 по одному проводу.
//   1. Тянем линию к нулю на 20 мс (датчику нужно не меньше 18 мс) и отпускаем её.
//   2. Датчик отвечает: 80 мкс нуля, 80 мкс единицы.
//   3. Затем 40 бит: каждый начинается с 50 мкс нуля, а длина единицы решает значение:
//      около 27 мкс — бит 0, около 70 мкс — бит 1.
// Мы меряем длину единицы в тактах 27 МГц: больше 40 мкс (1080 тактов) — бит равен 1.
// В data лежат пять байтов: влажность, её дробная часть, температура, дробная часть, контрольная сумма.
module dht11_read (
  input clk,
  input start,
  inout dht,
  output reg busy = 0,
  output reg [39:0] data = 0,
  output reg ok = 0          // контрольная сумма сошлась
);
  reg low = 0;
  assign dht = low ? 1'b0 : 1'bz;

  // Сигнал датчика приходит в любой момент, поэтому сначала проводим его через два триггера.
  reg d1 = 1, d2 = 1;
  always @(posedge clk) begin d1 <= dht; d2 <= d1; end

  localparam IDLE = 0, PULL = 1, RISE = 8, WAIT_LOW = 2, WAIT_HIGH = 3, WAIT_START = 4,
             BIT_LOW = 5, BIT_HIGH = 6, DONE = 7;
  reg [3:0] st = IDLE;
  reg [19:0] cnt = 0;
  reg [5:0] nbits = 0;

  always @(posedge clk) begin
    case (st)
      IDLE: if (start) begin busy <= 1; ok <= 0; low <= 1; cnt <= 0; st <= PULL; end
      PULL: begin
        cnt <= cnt + 1;
        if (cnt == 540000) begin low <= 0; cnt <= 0; st <= RISE; end        // 20 мс
      end
      // Линия поднимается не мгновенно: сначала ждём, пока подтяжка вернёт единицу.
      RISE: if (d2) begin cnt <= 0; st <= WAIT_LOW; end
      WAIT_LOW: begin
        cnt <= cnt + 1;
        if (!d2) st <= WAIT_HIGH;
        else if (cnt == 54000) begin busy <= 0; st <= IDLE; end             // датчик молчит
      end
      WAIT_HIGH: if (d2) st <= WAIT_START;
      WAIT_START: if (!d2) begin nbits <= 0; st <= BIT_LOW; end
      BIT_LOW: if (d2) begin cnt <= 0; st <= BIT_HIGH; end
      BIT_HIGH: begin
        if (d2) cnt <= cnt + 1;
        else begin
          data <= {data[38:0], cnt > 1080};
          nbits <= nbits + 1;
          st <= nbits == 39 ? DONE : BIT_LOW;
        end
      end
      DONE: begin
        ok <= (data[39:32] + data[31:24] + data[23:16] + data[15:8]) == data[7:0];
        busy <= 0;
        st <= IDLE;
      end
    endcase
  end
endmodule
`;

/** Decodes the NEC infrared protocol from a demodulated receiver. */
export const NEC_RX_V = `// Декодер инфракрасного протокола NEC. Приёмник (TSOP и подобные) убирает несущую 38 кГц,
// поэтому на входе ir в покое единица, а посылка — это нули:
//   заголовок: 9 мс нуля и 4,5 мс единицы
//   32 бита (младшим вперёд): адрес, ~адрес, команда, ~команда
//   бит: 562 мкс нуля, потом 562 мкс единицы для 0 или 1,69 мс единицы для 1
// Мы меряем длину пауз в тактах 27 МГц. Пауза длиннее 1,1 мс (29700 тактов) — это бит 1.
// Когда кадр принят и проверен, на один такт загорается valid, а в command лежит код кнопки.
module nec_rx (
  input clk,
  input ir,
  output reg [7:0] command = 0,
  output reg [7:0] address = 0,
  output reg valid = 0
);
  reg d1 = 1, d2 = 1, prev = 1;
  always @(posedge clk) begin d1 <= ir; d2 <= d1; prev <= d2; end
  wire fell = prev && !d2;
  wire rose = !prev && d2;

  localparam IDLE = 0, LEADER_LOW = 1, LEADER_HIGH = 2, MARK = 3, GAP = 4;
  reg [2:0] st = IDLE;
  reg [19:0] cnt = 0;
  reg [5:0] nbits = 0;
  reg [31:0] frame = 0;
  // Кадр после приёма очередного бита: он вдвигается сверху, поэтому первый бит окажется внизу.
  wire [31:0] next_frame = {cnt > 29700, frame[31:1]};

  always @(posedge clk) begin
    valid <= 0;
    cnt <= cnt + 1;
    case (st)
      IDLE: if (fell) begin cnt <= 0; st <= LEADER_LOW; end
      LEADER_LOW: if (rose) begin
        cnt <= 0;
        st <= (cnt > 200000 && cnt < 280000) ? LEADER_HIGH : IDLE;   // около 9 мс
      end
      LEADER_HIGH: if (fell) begin
        nbits <= 0;
        st <= (cnt > 100000 && cnt < 140000) ? MARK : IDLE;           // около 4,5 мс
      end
      MARK: if (rose) begin cnt <= 0; st <= GAP; end
      GAP: if (fell) begin
        frame <= next_frame;
        nbits <= nbits + 1;
        if (nbits == 31) begin
          st <= IDLE;
          // Вторая половина каждой пары — инверсия первой; иначе кадр искажён.
          if ((next_frame[7:0] ^ next_frame[15:8]) == 8'hFF &&
              (next_frame[23:16] ^ next_frame[31:24]) == 8'hFF) begin
            address <= next_frame[7:0];
            command <= next_frame[23:16];
            valid <= 1;
          end
        end else st <= MARK;
      end
    endcase
  end
endmodule
`;

/** Receives scan codes from a PS/2 keyboard. */
export const PS2_RX_V = `// Приёмник PS/2. Клавиатура сама тактирует обмен (около 12,5 кГц) и меняет данные,
// пока ps2_clk высокий. Принимаем бит по каждому спаду ps2_clk. Кадр — 11 бит:
// старт (0), восемь бит данных (младшим вперёд), бит нечётности и стоп (1).
// Когда байт принят, на один такт загорается strobe, а в code лежит скан-код.
// Бит нечётности делает число единиц в данных вместе с ним нечётным: так ловят ошибки.
module ps2_rx (
  input clk,
  input ps2_clk,
  input ps2_data,
  output reg [7:0] code = 0,
  output reg strobe = 0,
  output reg parity_ok = 0
);
  reg [2:0] c = 3'b111;
  reg [1:0] d = 2'b11;
  always @(posedge clk) begin c <= {c[1:0], ps2_clk}; d <= {d[0], ps2_data}; end
  wire fell = c[2] && !c[1];

  reg [9:0] sh = 0;
  reg [3:0] n = 0;
  reg [15:0] quiet = 0;
  wire [10:0] word = {d[1], sh};

  always @(posedge clk) begin
    strobe <= 0;
    quiet <= quiet + 1;
    if (quiet == 16'hFFFF) n <= 0;           // кадр оборвался: начинаем заново
    if (fell) begin
      quiet <= 0;
      sh <= {d[1], sh[9:1]};
      n <= n + 1;
      if (n == 10) begin
        n <= 0;
        code <= word[8:1];
        parity_ok <= !word[0] && word[10] && (^word[9:1]);
        strobe <= 1;
      end
    end
  end
endmodule
`;

/** Echo timing for an HC-SR04. */
export const HCSR04_V = `// Дальномер HC-SR04. Измерение:
//   1. Подаём на trig импульс около 11 мкс.
//   2. Модуль излучает ультразвук, а на echo выдаёт единицу на время полёта звука
//      туда и обратно: 58 мкс на каждый сантиметр расстояния.
//   3. Мы считаем сантиметры сразу, а не микросекунды: каждые 1566 тактов (58 мкс) — плюс один.
//   4. Раз в 60 мс (так рекомендует даташит) повторяем.
// Результат distance_cm обновляется после каждого измерения.
module hcsr04 (
  input clk,
  output reg trig = 0,
  input echo,
  output reg [8:0] distance_cm = 0,
  output reg done = 0        // импульс на один такт: новое измерение готово
);
  reg e1 = 0, e2 = 0;
  always @(posedge clk) begin e1 <= echo; e2 <= e1; end

  localparam WAIT = 0, PULSE = 1, ECHO_WAIT = 2, ECHO = 3;
  reg [1:0] st = WAIT;
  reg [21:0] cnt = 0;
  reg [10:0] micro = 0;      // такты внутри одного сантиметра (счёт идёт с половины: так результат округляется)
  reg [8:0] cm = 0;

  always @(posedge clk) begin
    done <= 0;
    cnt <= cnt + 1;
    case (st)
      WAIT: if (cnt == 1620000) begin cnt <= 0; trig <= 1; st <= PULSE; end      // 60 мс
      PULSE: if (cnt == 300) begin cnt <= 0; trig <= 0; st <= ECHO_WAIT; end     // 11 мкс
      ECHO_WAIT: begin
        if (e2) begin cm <= 0; micro <= 783; st <= ECHO; end   // 783 = пол-сантиметра: округляем
        else if (cnt == 1080000) begin cnt <= 0; st <= WAIT; end                  // эха нет
      end
      ECHO: begin
        if (e2) begin
          micro <= micro + 1;
          if (micro == 1565) begin micro <= 0; cm <= cm + 1; end
        end else begin
          distance_cm <= cm;
          done <= 1;
          cnt <= 0;
          st <= WAIT;
        end
      end
    endcase
  end
endmodule
`;

/** UART transmitter, 8N1. */
export const UART_TX_V = `// Передатчик UART 8N1: старт-бит (0), восемь бит данных младшим вперёд, стоп-бит (1).
// DIV = 27 000 000 / скорость: 234 даёт 115200 бод.
// Выставьте data, подайте импульс send; пока busy = 1, байт уходит.
module uart_sender #(
  parameter DIV = 234
) (
  input clk,
  input send,
  input [7:0] data,
  output reg busy = 0,
  output reg tx = 1
);
  reg [9:0] frame = 10'h3FF;
  reg [3:0] n = 0;
  reg [8:0] cnt = 0;

  always @(posedge clk) begin
    if (!busy) begin
      if (send) begin frame <= {1'b1, data, 1'b0}; busy <= 1; n <= 0; cnt <= 0; end
    end else if (cnt == DIV - 1) begin
      cnt <= 0;
      tx <= frame[0];
      frame <= {1'b1, frame[9:1]};
      n <= n + 1;
      if (n == 10) busy <= 0;
    end else cnt <= cnt + 1;
  end
endmodule
`;
