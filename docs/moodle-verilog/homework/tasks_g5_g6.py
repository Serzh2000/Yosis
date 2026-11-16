"""Группы 5 и 6: время (триггеры, регистры, счётчики) и управление (кнопки, параметры, автоматы, ШИМ)."""
from hw_lib import CLOCK

TASKS = []


def seq_tb(decls, inst, show, helpers=''):
    return {'decls': CLOCK + decls, 'inst': inst, 'show': show, 'helpers': helpers}


# ============================== ГРУППА 5: время ==============================

TASKS.append(dict(
    id='5.1', group=5, level=1, qname='ДЗ 5.1 · D-триггер', lines=8,
    intro='''<p>D-триггер запоминает значение входа <code>d</code> <b>по переднему фронту</b> такта и держит его на выходе
<code>q</code> до следующего фронта (урок 11). В заготовке пропущена правая часть присваивания. Допишите её.</p>''',
    starter='''module d_ff(input wire clk, input wire d, output reg q);
  always @(posedge clk)
    q <= ;
endmodule
''',
    answer='''module d_ff(input wire clk, input wire d, output reg q);
  always @(posedge clk)
    q <= d;
endmodule
''',
    tb=seq_tb('  reg d;\n  wire q;', '  d_ff dut(.clk(clk), .d(d), .q(q));', '$display("q=%b", q);'),
    tests=['d = 1; tick; show; d = 0; show; tick; show;',
           'd = 0; tick; show; d = 1; show; tick; show; d = 0; tick; show;',
           'd = 1; rise; show; d = 0; show; fall; show;',
           'd = 1; tick; d = 0; #1 d = 1; tick; show;'],
    mutants=['''module d_ff(input wire clk, input wire d, output reg q);
  always @(*) q = d;
endmodule
''', '''module d_ff(input wire clk, input wire d, output reg q);
  always @(negedge clk) q <= d;
endmodule
''', '''module d_ff(input wire clk, input wire d, output reg q);
  always @(posedge clk) q <= ~d;
endmodule
''', '''module d_ff(input wire clk, input wire d, output reg q);
  always @(*) if (clk) q = d;
endmodule
'''],
    needs=[(11, r'always @\(posedge clk\)', 'always @(posedge clk)'), (11, r'q <= d', 'неблокирующее присваивание q <= d'),
           (11, r'Передний фронт', 'передний фронт')],
))

TASKS.append(dict(
    id='5.2', group=5, level=3, qname='ДЗ 5.2 · Регистр со сбросом и разрешением', lines=12,
    intro='''<p>4-битный регистр <code>reg4</code>. По переднему фронту <code>clk</code>:</p>
<ul><li>если <code>rst = 1</code> — <code>q</code> становится 0 (<b>синхронный</b> сброс, он важнее всего остального);</li>
<li>иначе, если <code>en = 1</code> — <code>q</code> запоминает <code>d</code>;</li>
<li>иначе <code>q</code> не меняется.</li></ul>
<p>Порядок проверок — это приоритет (урок 12). Порты заданы.</p>''',
    starter='''module reg4(input wire clk, input wire rst, input wire en, input wire [3:0] d, output reg [3:0] q);
  // ваш код
endmodule
''',
    answer='''module reg4(input wire clk, input wire rst, input wire en, input wire [3:0] d, output reg [3:0] q);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else if (en) q <= d;
  end
endmodule
''',
    tb=seq_tb('  reg rst, en;\n  reg [3:0] d;\n  wire [3:0] q;',
              '  reg4 dut(.clk(clk), .rst(rst), .en(en), .d(d), .q(q));', '$display("q=%d", q);'),
    tests=["rst = 1; en = 0; d = 4'd9; tick; show;",
           "rst = 1; en = 0; d = 4'd9; tick; rst = 0; en = 1; tick; show;",
           "rst = 1; en = 1; d = 4'd7; tick; rst = 0; d = 4'd5; tick; en = 0; d = 4'd3; tick; show;",
           "rst = 1; en = 1; d = 4'd15; tick; rst = 0; tick; show; rst = 1; show; tick; show;",
           "rst = 1; en = 1; d = 4'd6; tick; show;",
           "rst = 1; en = 0; d = 4'd0; tick; rst = 0; en = 1; d = 4'd4; tick; d = 4'd8; tick; show;"],
    mutants=['''module reg4(input wire clk, input wire rst, input wire en, input wire [3:0] d, output reg [3:0] q);
  always @(posedge clk) begin
    if (en) q <= d;
    else if (rst) q <= 4'd0;
  end
endmodule
''', '''module reg4(input wire clk, input wire rst, input wire en, input wire [3:0] d, output reg [3:0] q);
  always @(posedge clk or posedge rst) begin
    if (rst) q <= 4'd0;
    else if (en) q <= d;
  end
endmodule
''', '''module reg4(input wire clk, input wire rst, input wire en, input wire [3:0] d, output reg [3:0] q);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else q <= d;
  end
endmodule
'''],
    needs=[(12, r'Синхронный сброс', 'синхронный сброс'), (12, r'Разрешение', 'разрешение (enable)'),
           (12, r'Приоритет', 'приоритет сброса')],
))

TASKS.append(dict(
    id='5.3', group=5, level=3, qname='ДЗ 5.3 · Счётчик от 0 до 9', lines=14,
    intro='''<p>Десятичный счётчик <code>cnt10</code>: по фронту <code>clk</code> при <code>en = 1</code> значение <code>q</code>
увеличивается на 1; после <b>9</b> возвращается к 0. При <code>en = 0</code> значение хранится. Сброс <code>rst</code>
(синхронный) обнуляет счётчик. Выход <code>wrap</code> равен 1, пока <code>q = 9</code> (последнее значение перед
переходом в 0). Образец записи счёта до N — урок 13.</p>''',
    starter='''module cnt10(input wire clk, input wire rst, input wire en, output reg [3:0] q, output wire wrap);
  // ваш код
endmodule
''',
    answer='''module cnt10(input wire clk, input wire rst, input wire en, output reg [3:0] q, output wire wrap);
  assign wrap = (q == 4'd9);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else if (en) begin
      if (q == 4'd9) q <= 4'd0;
      else q <= q + 4'd1;
    end
  end
endmodule
''',
    tb=seq_tb('  reg rst, en;\n  wire [3:0] q;\n  wire wrap;', '  cnt10 dut(.clk(clk), .rst(rst), .en(en), .q(q), .wrap(wrap));',
              '$display("q=%d wrap=%b", q, wrap);'),
    tests=['rst = 1; en = 0; tick; rst = 0; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (3) tick; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (9) tick; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (10) tick; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (23) tick; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (5) tick; en = 0; repeat (4) tick; show;',
           'rst = 1; en = 0; tick; rst = 0; en = 1; repeat (7) tick; rst = 1; tick; rst = 0; show;'],
    mutants=['''module cnt10(input wire clk, input wire rst, input wire en, output reg [3:0] q, output wire wrap);
  assign wrap = (q == 4'd9);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else if (en) q <= q + 4'd1;
  end
endmodule
''', '''module cnt10(input wire clk, input wire rst, input wire en, output reg [3:0] q, output wire wrap);
  assign wrap = (q == 4'd8);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else if (en) begin
      if (q == 4'd9) q <= 4'd0;
      else q <= q + 4'd1;
    end
  end
endmodule
''', '''module cnt10(input wire clk, input wire rst, input wire en, output reg [3:0] q, output wire wrap);
  assign wrap = (q == 4'd9);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else begin
      if (q == 4'd9) q <= 4'd0;
      else q <= q + 4'd1;
    end
  end
endmodule
'''],
    needs=[(13, r'cnt == N', 'счёт до N через сравнение'), (13, r'Переполнение', 'переполнение'),
           (12, r'Синхронный сброс', 'синхронный сброс')],
))

TASKS.append(dict(
    id='5.4', group=5, level=4, qname='ДЗ 5.4 · Делитель частоты на 6', lines=14,
    intro='''<p>Модуль <code>div6</code> делит частоту тактового сигнала на 6: выход <code>out</code> повторяется в 6 раз
реже, чем такт <code>clk</code>, и имеет вид «3 такта единица, 3 такта ноль». Сброс <code>rst</code> (синхронный) ставит
<code>out = 0</code> и начинает счёт заново. Первый переход <code>out</code> в 1 происходит на 3-м фронте после снятия сброса.</p>
<p>Как это сделать — продумайте сами (урок 13: делитель частоты и счётчик). Интерфейс задан.</p>''',
    starter='''module div6(input wire clk, input wire rst, output reg out);
  // ваш код
endmodule
''',
    answer='''module div6(input wire clk, input wire rst, output reg out);
  reg [1:0] cnt;
  always @(posedge clk) begin
    if (rst) begin
      cnt <= 2'd0;
      out <= 1'b0;
    end else if (cnt == 2'd2) begin
      cnt <= 2'd0;
      out <= ~out;
    end else cnt <= cnt + 2'd1;
  end
endmodule
''',
    tb=seq_tb('  reg rst;\n  wire out;', '  div6 dut(.clk(clk), .rst(rst), .out(out));', '$display("out=%b", out);'),
    tests=['rst = 1; tick; rst = 0; repeat (12) begin tick; show; end',
           'rst = 1; tick; rst = 0; repeat (4) tick; rst = 1; tick; rst = 0; repeat (3) begin tick; show; end',
           'rst = 1; tick; show; rst = 0; repeat (7) tick; show;'],
    mutants=['''module div6(input wire clk, input wire rst, output reg out);
  reg [1:0] cnt;
  always @(posedge clk) begin
    if (rst) begin cnt <= 2'd0; out <= 1'b0; end
    else if (cnt == 2'd1) begin cnt <= 2'd0; out <= ~out; end
    else cnt <= cnt + 2'd1;
  end
endmodule
''', '''module div6(input wire clk, input wire rst, output reg out);
  reg [2:0] cnt;
  always @(posedge clk) begin
    if (rst) begin cnt <= 3'd0; out <= 1'b0; end
    else if (cnt == 3'd3) begin cnt <= 3'd0; out <= ~out; end
    else cnt <= cnt + 3'd1;
  end
endmodule
'''],
    needs=[(13, r'Делитель частоты', 'делитель частоты'), (13, r'f вых = f вх / N|в N раз реже', 'смысл деления частоты'),
           (13, r'Счётчик', 'счётчик')],
))

TASKS.append(dict(
    id='5.5', group=5, level=4, qname='ДЗ 5.5 · Сдвиговый регистр с направлением', lines=14,
    intro='''<p>6-битный сдвиговый регистр <code>shreg6</code>. По фронту <code>clk</code>:</p>
<ul><li><code>rst = 1</code> — все биты в 0 (синхронный сброс);</li>
<li>иначе при <code>dir = 0</code> — сдвиг <b>влево</b>, новый бит <code>din</code> входит в <code>q[0]</code>;</li>
<li>иначе при <code>dir = 1</code> — сдвиг <b>вправо</b>, новый бит <code>din</code> входит в <code>q[5]</code>.</li></ul>
<p>Как записать сдвиги через конкатенацию, смотрите в уроке 14. Интерфейс задан.</p>''',
    starter='''module shreg6(input wire clk, input wire rst, input wire dir, input wire din, output reg [5:0] q);
  // ваш код
endmodule
''',
    answer='''module shreg6(input wire clk, input wire rst, input wire dir, input wire din, output reg [5:0] q);
  always @(posedge clk) begin
    if (rst) q <= 6'd0;
    else if (dir) q <= {din, q[5:1]};
    else q <= {q[4:0], din};
  end
endmodule
''',
    tb=seq_tb('  reg rst, dir, din;\n  wire [5:0] q;', '  shreg6 dut(.clk(clk), .rst(rst), .dir(dir), .din(din), .q(q));', '$display("q=%b", q);'),
    tests=['rst = 1; dir = 0; din = 0; tick; rst = 0; din = 1; tick; tick; din = 0; tick; show;',
           'rst = 1; dir = 1; din = 0; tick; rst = 0; din = 1; tick; tick; din = 0; tick; show;',
           'rst = 1; dir = 0; din = 0; tick; rst = 0; din = 1; repeat (6) tick; show; dir = 1; din = 0; tick; show;',
           'rst = 1; dir = 0; din = 0; tick; rst = 0; din = 1; tick; tick; rst = 1; tick; show;',
           'rst = 1; dir = 0; din = 0; tick; rst = 0; din = 1; tick; dir = 1; din = 0; tick; tick; show;'],
    mutants=['''module shreg6(input wire clk, input wire rst, input wire dir, input wire din, output reg [5:0] q);
  always @(posedge clk) begin
    if (rst) q <= 6'd0;
    else if (dir) q <= {q[4:0], din};
    else q <= {din, q[5:1]};
  end
endmodule
''', '''module shreg6(input wire clk, input wire rst, input wire dir, input wire din, output reg [5:0] q);
  always @(posedge clk) begin
    if (rst) q <= 6'd0;
    else if (dir) q <= {q[0], q[5:1]};
    else q <= {q[4:0], q[5]};
  end
endmodule
''', '''module shreg6(input wire clk, input wire rst, input wire dir, input wire din, output reg [5:0] q);
  always @(posedge clk) begin
    if (dir) q <= {din, q[5:1]};
    else q <= {q[4:0], din};
  end
endmodule
'''],
    needs=[(14, r'q <= \{q\[4:0\], d\}', 'сдвиг влево'), (14, r'q <= \{d, q\[5:1\]\}', 'сдвиг вправо'),
           (12, r'Синхронный сброс', 'синхронный сброс')],
))

# ============================== ГРУППА 6: реальный мир и управление ==============================

TASKS.append(dict(
    id='6.1', group=6, level=3, qname='ДЗ 6.1 · Выделитель переднего фронта', lines=12,
    intro='''<p>Модуль <code>edge_pulse</code> формирует импульс <code>pulse = 1</code> <b>в течение одного такта</b>,
когда сигнал <code>sig</code> переходит из 0 в 1 (передний фронт): это «выделитель фронта» из урока 15. Для этого запоминают
предыдущее значение сигнала в триггере. Сброс <code>rst</code> (синхронный) обнуляет запомненное значение.</p>''',
    starter='''module edge_pulse(input wire clk, input wire rst, input wire sig, output wire pulse);
  // ваш код
endmodule
''',
    answer='''module edge_pulse(input wire clk, input wire rst, input wire sig, output wire pulse);
  reg prev;
  always @(posedge clk) begin
    if (rst) prev <= 1'b0;
    else prev <= sig;
  end
  assign pulse = sig & ~prev;
endmodule
''',
    tb=seq_tb('  reg rst, sig;\n  wire pulse;', '  edge_pulse dut(.clk(clk), .rst(rst), .sig(sig), .pulse(pulse));',
              '$display("pulse=%b", pulse);'),
    tests=['rst = 1; sig = 0; tick; rst = 0; show; sig = 1; show; tick; show; sig = 0; tick; show; sig = 1; show; tick; show;',
           'rst = 1; sig = 0; tick; rst = 0; sig = 1; tick; tick; tick; show; sig = 0; show; tick; show;'],
    mutants=['''module edge_pulse(input wire clk, input wire rst, input wire sig, output wire pulse);
  assign pulse = sig;
endmodule
''', '''module edge_pulse(input wire clk, input wire rst, input wire sig, output wire pulse);
  reg prev;
  always @(posedge clk) begin if (rst) prev <= 1'b0; else prev <= sig; end
  assign pulse = prev & ~sig;
endmodule
''', '''module edge_pulse(input wire clk, input wire rst, input wire sig, output reg pulse);
  reg prev;
  always @(posedge clk) begin
    if (rst) begin prev <= 1'b0; pulse <= 1'b0; end
    else begin prev <= sig; pulse <= sig & ~prev; end
  end
endmodule
'''],
    needs=[(15, r'pressed = now & ~prev', 'выделитель фронта'), (15, r'prev <= now', 'запоминание предыдущего значения'),
           (12, r'Синхронный сброс', 'синхронный сброс')],
))

TASKS.append(dict(
    id='6.2', group=6, level=3, qname='ДЗ 6.2 · Делитель с параметром N', lines=14,
    intro='''<p>Настраиваемый делитель <code>divn</code> с параметром <code>N</code> (по умолчанию 4). Выход <code>strobe</code> равен 1
<b>один такт из каждых N</b>: когда внутренний счётчик находится в последнем состоянии (N − 1). Счётчик считает от 0 до N − 1
и снова с 0; сброс <code>rst</code> (синхронный) обнуляет его. Разрядность счётчика вычислите через <code>$clog2(N)</code>.</p>
<p>Проверка создаёт два экземпляра: с <code>N = 3</code> и <code>N = 5</code>, так что модуль обязан работать при любом N
(урок 16).</p>''',
    starter='''module divn #(parameter N = 4) (input wire clk, input wire rst, output wire strobe);
  // ваш код: счётчик разрядности $clog2(N)
endmodule
''',
    answer='''module divn #(parameter N = 4) (input wire clk, input wire rst, output wire strobe);
  reg [$clog2(N)-1:0] cnt;
  always @(posedge clk) begin
    if (rst) cnt <= 0;
    else if (cnt == N - 1) cnt <= 0;
    else cnt <= cnt + 1;
  end
  assign strobe = (cnt == N - 1);
endmodule
''',
    tb=seq_tb('  reg rst;\n  wire s3, s5;',
              '  divn #(.N(3)) d3 (.clk(clk), .rst(rst), .strobe(s3));\n  divn #(.N(5)) d5 (.clk(clk), .rst(rst), .strobe(s5));',
              '$display("s3=%b s5=%b", s3, s5);'),
    tests=['rst = 1; tick; rst = 0; repeat (12) begin show; tick; end',
           'rst = 1; tick; show; rst = 0; repeat (7) tick; show;'],
    mutants=['''module divn #(parameter N = 4) (input wire clk, input wire rst, output wire strobe);
  reg [1:0] cnt;
  always @(posedge clk) begin
    if (rst) cnt <= 0; else cnt <= cnt + 1;
  end
  assign strobe = (cnt == 2'd3);
endmodule
''', '''module divn #(parameter N = 4) (input wire clk, input wire rst, output wire strobe);
  reg [$clog2(N)-1:0] cnt;
  always @(posedge clk) begin
    if (rst) cnt <= 0;
    else if (cnt == N - 1) cnt <= 0;
    else cnt <= cnt + 1;
  end
  assign strobe = (cnt == N - 2);
endmodule
'''],
    needs=[(16, r'\$clog2', '$clog2'), (16, r'parameter', 'parameter'), (16, r'#\(\.N\(', 'задание параметра при подключении'),
           (13, r'cnt == N', 'счёт до N')],
))

TASKS.append(dict(
    id='6.3', group=6, level=4, qname='ДЗ 6.3 · Светофор (автомат Мура)', lines=20,
    intro='''<p>Автомат светофора <code>traffic</code> имеет три состояния: красный → зелёный → жёлтый → снова красный.
Переход к следующему состоянию происходит по фронту <code>clk</code>, <b>только если</b> <code>step = 1</code> (иначе
состояние хранится). Сброс <code>rst</code> (синхронный) возвращает автомат в красный. Выходы <code>red</code>,
<code>yellow</code>, <code>green</code> — по одному на состояние; они зависят <b>только от состояния</b> (автомат Мура), а не
от входа <code>step</code>.</p>
<p>Как закодировать состояния и разложить логику на блоки, решаете сами (урок 17). Интерфейс задан.</p>''',
    starter='''module traffic(input wire clk, input wire rst, input wire step,
               output wire red, output wire yellow, output wire green);
  // ваш код
endmodule
''',
    answer='''module traffic(input wire clk, input wire rst, input wire step,
               output wire red, output wire yellow, output wire green);
  localparam RED = 2'd0, GREEN = 2'd1, YELLOW = 2'd2;
  reg [1:0] state, next;
  always @(*) begin
    next = state;
    case (state)
      RED:    if (step) next = GREEN;
      GREEN:  if (step) next = YELLOW;
      YELLOW: if (step) next = RED;
      default: next = RED;
    endcase
  end
  always @(posedge clk) begin
    if (rst) state <= RED;
    else state <= next;
  end
  assign red = (state == RED);
  assign green = (state == GREEN);
  assign yellow = (state == YELLOW);
endmodule
''',
    tb=seq_tb('  reg rst, step;\n  wire red, yellow, green;',
              '  traffic dut(.clk(clk), .rst(rst), .step(step), .red(red), .yellow(yellow), .green(green));',
              '$display("r=%b y=%b g=%b", red, yellow, green);'),
    tests=['rst = 1; step = 0; tick; rst = 0; show;',
           'rst = 1; step = 0; tick; rst = 0; step = 1; tick; show; tick; show; tick; show; tick; show;',
           'rst = 1; step = 0; tick; rst = 0; step = 1; tick; step = 0; tick; tick; show;',
           'rst = 1; step = 1; tick; show; rst = 0; tick; show;',
           'rst = 1; step = 0; tick; rst = 0; step = 1; tick; tick; show; rst = 1; tick; show;',
           'rst = 1; step = 0; tick; rst = 0; show; step = 1; show;'],
    mutants=['''module traffic(input wire clk, input wire rst, input wire step,
               output wire red, output wire yellow, output wire green);
  reg [1:0] state;
  always @(posedge clk) begin
    if (rst) state <= 2'd0;
    else if (step) state <= (state == 2'd1) ? 2'd0 : state + 2'd1;
  end
  assign red = (state == 2'd0);
  assign green = (state == 2'd1);
  assign yellow = (state == 2'd2);
endmodule
''', '''module traffic(input wire clk, input wire rst, input wire step,
               output wire red, output wire yellow, output wire green);
  reg [1:0] state;
  always @(posedge clk) begin
    if (rst) state <= 2'd1;
    else if (step) state <= (state == 2'd2) ? 2'd0 : state + 2'd1;
  end
  assign red = (state == 2'd0);
  assign green = (state == 2'd1);
  assign yellow = (state == 2'd2);
endmodule
''', '''module traffic(input wire clk, input wire rst, input wire step,
               output wire red, output wire yellow, output wire green);
  reg [1:0] state;
  always @(posedge clk) begin
    if (rst) state <= 2'd0;
    else if (step) state <= (state == 2'd2) ? 2'd0 : state + 2'd1;
  end
  assign red = (state == 2'd0) & ~step;
  assign green = (state == 2'd1);
  assign yellow = (state == 2'd2);
endmodule
'''],
    needs=[(17, r'Автомат Мура', 'автомат Мура'), (17, r'localparam', 'localparam для имён состояний'),
           (17, r'next = state', 'значение next по умолчанию'), (17, r'Конечный автомат', 'конечный автомат')],
))

TASKS.append(dict(
    id='6.4', group=6, level=4, qname='ДЗ 6.4 · ШИМ: управление яркостью', lines=16,
    intro='''<p>Генератор ШИМ <code>pwm8</code>: 8-битный счётчик циркулирует 0…255 (период 256 тактов), а выход
<code>pwm</code> равен 1, пока значение счётчика меньше <code>duty</code> (урок 18). Значит, за один период выход
равен 1 ровно <code>duty</code> тактов: <code>duty = 64</code> → яркость 25 %. Сброс <code>rst</code> (синхронный)
обнуляет счётчик.</p>
<p>Интерфейс задан. Проверка считает, сколько раз <code>pwm</code> был равен 1 за 256 тактов, при разных значениях
<code>duty</code>.</p>''',
    starter='''module pwm8(input wire clk, input wire rst, input wire [7:0] duty, output wire pwm);
  // ваш код
endmodule
''',
    answer='''module pwm8(input wire clk, input wire rst, input wire [7:0] duty, output wire pwm);
  reg [7:0] cnt;
  always @(posedge clk) begin
    if (rst) cnt <= 8'd0;
    else cnt <= cnt + 8'd1;
  end
  assign pwm = (cnt < duty);
endmodule
''',
    tb=seq_tb('  reg rst;\n  reg [7:0] duty;\n  wire pwm;\n  integer ones, i;',
              '  pwm8 dut(.clk(clk), .rst(rst), .duty(duty), .pwm(pwm));', '$display("ones=%0d", ones);',
              '''  task run(input integer n);
    begin
      ones = 0;
      for (i = 0; i < n; i = i + 1) begin
        tick;
        ones = ones + pwm;
      end
    end
  endtask
'''),
    tests=["rst = 1; duty = 8'd%d; tick; rst = 0; run(256); show;" % d for d in (0, 1, 64, 128, 200, 255)]
          + ["rst = 1; duty = 8'd100; tick; rst = 0; run(512); show;",
             "rst = 1; duty = 8'd10; tick; rst = 0; run(256); duty = 8'd250; run(256); show;"],
    mutants=['''module pwm8(input wire clk, input wire rst, input wire [7:0] duty, output wire pwm);
  reg [7:0] cnt;
  always @(posedge clk) begin if (rst) cnt <= 8'd0; else cnt <= cnt + 8'd1; end
  assign pwm = (cnt <= duty);
endmodule
''', '''module pwm8(input wire clk, input wire rst, input wire [7:0] duty, output wire pwm);
  reg [6:0] cnt;
  always @(posedge clk) begin if (rst) cnt <= 7'd0; else cnt <= cnt + 7'd1; end
  assign pwm = (cnt < duty);
endmodule
''', '''module pwm8(input wire clk, input wire rst, input wire [7:0] duty, output wire pwm);
  reg [7:0] cnt;
  always @(posedge clk) begin if (rst) cnt <= 8'd0; else cnt <= cnt + 8'd1; end
  assign pwm = (cnt > duty);
endmodule
'''],
    needs=[(18, r'pwm = \(cnt < duty\)', 'pwm = (cnt < duty)'), (18, r'Коэффициент заполнения', 'коэффициент заполнения'),
           (13, r'Счётчик', 'счётчик')],
))

PRESS_OK = '''module presscount(input wire clk, input wire rst, input wire btn, output reg [3:0] count);
  reg s1, s2;
  reg stable, prev;
  reg [1:0] cnt;
  always @(posedge clk) begin
    if (rst) begin
      s1 <= 1'b0; s2 <= 1'b0; stable <= 1'b0; prev <= 1'b0; cnt <= 2'd0; count <= 4'd0;
    end else begin
      s1 <= btn;
      s2 <= s1;
      if (s2 == stable) cnt <= 2'd0;
      else if (cnt == 2'd2) begin stable <= s2; cnt <= 2'd0; end
      else cnt <= cnt + 2'd1;
      prev <= stable;
      if (stable & ~prev) count <= count + 4'd1;
    end
  end
endmodule
'''
TASKS.append(dict(
    id='6.5', group=6, level=5, qname='ДЗ 6.5 · Счётчик нажатий кнопки', lines=26,
    intro='''<p>Соберите настоящий приёмник кнопки (урок 15) и счётчик нажатий. Модуль <code>presscount</code> считает
нажатия кнопки <code>btn</code> в 4-битном <code>count</code> (синхронный сброс <code>rst</code> обнуляет счёт):</p>
<ul><li>кнопка — асинхронный сигнал: пропустите её через <b>синхронизатор</b> из двух триггеров;</li>
<li>контакты <b>дребезжат</b>: новое значение принимается, только если оно держится <b>не менее 3 тактов подряд</b>;
более короткие импульсы (помехи) игнорируются;</li>
<li>каждое <b>нажатие</b> (устойчивый переход 0 → 1) увеличивает <code>count</code> ровно на 1; удержание кнопки и
отпускание счёт не меняют.</li></ul>
<p>Это комплексное задание: цепочка «синхронизатор → антидребезг → выделение фронта → счётчик». Точная задержка в
тактах не проверяется, проверка ждёт несколько тактов после каждого воздействия.</p>''',
    starter='''module presscount(input wire clk, input wire rst, input wire btn, output reg [3:0] count);
  // ваш код
endmodule
''',
    answer=PRESS_OK,
    tb=seq_tb('  reg rst, btn;\n  wire [3:0] count;', '  presscount dut(.clk(clk), .rst(rst), .btn(btn), .count(count));',
              '$display("count=%d", count);'),
    tests=['rst = 1; btn = 0; tick; tick; rst = 0; repeat (6) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (4) tick; btn = 1; repeat (10) tick; btn = 0; repeat (10) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (4) tick; btn = 1; tick; btn = 0; tick; btn = 1; tick; btn = 0; tick; '
           'btn = 1; repeat (10) tick; btn = 0; repeat (10) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (4) tick; btn = 1; tick; btn = 0; repeat (12) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (3) begin repeat (4) tick; btn = 1; repeat (8) tick; btn = 0; end '
           'repeat (10) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (4) tick; btn = 1; repeat (10) tick; btn = 0; tick; btn = 1; tick; '
           'btn = 0; repeat (12) tick; show;',
           'rst = 1; btn = 0; tick; rst = 0; repeat (4) tick; btn = 1; repeat (10) tick; btn = 0; repeat (10) tick; '
           'rst = 1; tick; rst = 0; repeat (4) tick; show;'],
    mutants=[
        # без антидребезга: фронт берётся сразу после синхронизатора
        '''module presscount(input wire clk, input wire rst, input wire btn, output reg [3:0] count);
  reg s1, s2, prev;
  always @(posedge clk) begin
    if (rst) begin s1 <= 1'b0; s2 <= 1'b0; prev <= 1'b0; count <= 4'd0; end
    else begin
      s1 <= btn; s2 <= s1; prev <= s2;
      if (s2 & ~prev) count <= count + 4'd1;
    end
  end
endmodule
''',
        # без выделения фронта: считает такты удержания
        '''module presscount(input wire clk, input wire rst, input wire btn, output reg [3:0] count);
  reg s1, s2;
  always @(posedge clk) begin
    if (rst) begin s1 <= 1'b0; s2 <= 1'b0; count <= 4'd0; end
    else begin s1 <= btn; s2 <= s1; if (s2) count <= count + 4'd1; end
  end
endmodule
''',
        # считает и нажатие, и отпускание
        PRESS_OK.replace('if (stable & ~prev) count', 'if (stable != prev) count'),
    ],
    needs=[(15, r'Синхронизатор', 'синхронизатор'), (15, r'Дребезг', 'дребезг'), (15, r'Антидребезг', 'антидребезг'),
           (15, r'Выделитель фронта', 'выделитель фронта'), (15, r'Порядок', 'порядок цепочки'),
           (13, r'Счётчик', 'счётчик'), (12, r'Синхронный сброс', 'синхронный сброс')],
))
