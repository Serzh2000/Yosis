"""Группа 7: память и связь."""
from hw_lib import CLOCK

TASKS = []

ROM_PAT = ['000001', '000010', '000100', '001000', '010000', '100000', '010101', '111111']
TASKS.append(dict(
    id='7.1', group=7, level=3, qname='ДЗ 7.1 · ПЗУ на восемь узоров', lines=12,
    intro='''<p>Модуль <code>rom8</code> — постоянная память (ПЗУ): по адресу <code>addr</code> (3 бита) выдаёт слово
<code>data</code> (6 бит), которое «зашито» в схему:</p>
<table border="1" cellpadding="4"><tr><th>addr</th><th>data</th><th>addr</th><th>data</th></tr>
<tr><td>0</td><td>000001</td><td>4</td><td>010000</td></tr>
<tr><td>1</td><td>000010</td><td>5</td><td>100000</td></tr>
<tr><td>2</td><td>000100</td><td>6</td><td>010101</td></tr>
<tr><td>3</td><td>001000</td><td>7</td><td>111111</td></tr></table>
<p>В уроке 19 такое ПЗУ описывается оператором <code>case</code>. Порты заданы.</p>''',
    starter='''module rom8(input wire [2:0] addr, output reg [5:0] data);
  // ваш код
endmodule
''',
    answer='''module rom8(input wire [2:0] addr, output reg [5:0] data);
  always @(*) begin
    case (addr)
''' + ''.join("      3'd%d: data = 6'b%s;\n" % (i, p) for i, p in enumerate(ROM_PAT)) + '''      default: data = 6'b000000;
    endcase
  end
endmodule
''',
    tb={'decls': '  reg [2:0] addr;\n  wire [5:0] data;', 'inst': '  rom8 dut(.addr(addr), .data(data));',
        'show': '$display("data=%b", data);'},
    tests=["addr = 3'd%d; show;" % i for i in range(8)],
    mutants=['''module rom8(input wire [2:0] addr, output reg [5:0] data);
  always @(*) begin
    case (addr)
''' + ''.join("      3'd%d: data = 6'b%s;\n" % (i, p) for i, p in enumerate(ROM_PAT) if i != 6) + '''      default: data = 6'b000000;
    endcase
  end
endmodule
''', '''module rom8(input wire [2:0] addr, output reg [5:0] data);
  always @(*) data = 6'b000001 << addr;
endmodule
'''],
    needs=[(19, r'ПЗУ', 'ПЗУ'), (19, r'case', 'ПЗУ через case'), (8, r'case / default / endcase', 'case / default')],
))

RAM_OK = '''module ram16x8(input wire clk, input wire we, input wire [3:0] addr, input wire [7:0] din,
               output reg [7:0] dout);
  reg [7:0] mem [0:15];
  always @(posedge clk) begin
    if (we) mem[addr] <= din;
    dout <= mem[addr];
  end
endmodule
'''
TASKS.append(dict(
    id='7.2', group=7, level=3, qname='ДЗ 7.2 · ОЗУ 16 × 8 с синхронным чтением', lines=14,
    intro='''<p>Модуль <code>ram16x8</code> — оперативная память на 16 слов по 8 бит. По фронту <code>clk</code>:</p>
<ul><li>если <code>we = 1</code> — слово <code>din</code> записывается по адресу <code>addr</code>;</li>
<li>в любом случае выход <code>dout</code> получает слово, которое лежало по адресу <code>addr</code>
<b>до</b> этой записи (чтение <b>синхронное</b>: данные появляются на такт позже смены адреса).</li></ul>
<p>Массив слов: <code>reg [7:0] mem [0:15];</code> (урок 19). Порты заданы.</p>''',
    starter='''module ram16x8(input wire clk, input wire we, input wire [3:0] addr, input wire [7:0] din,
               output reg [7:0] dout);
  // ваш код
endmodule
''',
    answer=RAM_OK,
    tb={'decls': CLOCK + '  reg we;\n  reg [3:0] addr;\n  reg [7:0] din;\n  wire [7:0] dout;',
        'inst': '  ram16x8 dut(.clk(clk), .we(we), .addr(addr), .din(din), .dout(dout));',
        'show': '$display("dout=%h", dout);'},
    tests=["we = 1; addr = 4'd1; din = 8'h11; tick; addr = 4'd2; din = 8'h22; tick; we = 0; addr = 4'd1; tick; show; addr = 4'd2; tick; show;",
           "we = 1; addr = 4'd5; din = 8'h33; tick; din = 8'h77; tick; show; we = 0; tick; show;",
           "we = 1; addr = 4'd5; din = 8'h33; tick; addr = 4'd6; din = 8'h44; tick; we = 0; addr = 4'd5; tick; show; addr = 4'd6; show; tick; show;",
           "we = 1; addr = 4'd9; din = 8'hAA; tick; we = 0; din = 8'h55; tick; tick; show;"],
    mutants=['''module ram16x8(input wire clk, input wire we, input wire [3:0] addr, input wire [7:0] din,
               output wire [7:0] dout);
  reg [7:0] mem [0:15];
  always @(posedge clk) if (we) mem[addr] <= din;
  assign dout = mem[addr];
endmodule
''', '''module ram16x8(input wire clk, input wire we, input wire [3:0] addr, input wire [7:0] din,
               output reg [7:0] dout);
  reg [7:0] mem [0:15];
  always @(posedge clk) begin
    if (we) begin mem[addr] <= din; dout <= din; end
    else dout <= mem[addr];
  end
endmodule
''', '''module ram16x8(input wire clk, input wire we, input wire [3:0] addr, input wire [7:0] din,
               output reg [7:0] dout);
  reg [7:0] mem [0:15];
  always @(posedge clk) begin
    mem[addr] <= din;
    dout <= mem[addr];
  end
endmodule
'''],
    needs=[(19, r'reg \[5:0\] mem \[0:15\]', 'массив слов'), (19, r'if \(we\) mem\[addr\] <= din', 'запись по we'),
           (19, r'синхронное|Синхронное|на такт позже', 'синхронное чтение')],
))

UART_OK = '''module uart_tx #(parameter CLKS = 4) (input wire clk, input wire rst, input wire start,
                                    input wire [7:0] data, output reg tx, output wire busy);
  localparam IDLE = 2'd0, START = 2'd1, DATA = 2'd2, STOP = 2'd3;
  reg [1:0] state;
  reg [$clog2(CLKS)-1:0] clks;
  reg [2:0] idx;
  reg [7:0] shreg;
  assign busy = (state != IDLE);
  always @(posedge clk) begin
    if (rst) begin
      state <= IDLE; tx <= 1'b1; clks <= 0; idx <= 3'd0;
    end else case (state)
      IDLE: if (start) begin shreg <= data; tx <= 1'b0; clks <= 0; state <= START; end
            else tx <= 1'b1;
      START: if (clks == CLKS - 1) begin clks <= 0; idx <= 3'd0; tx <= shreg[0]; state <= DATA; end
             else clks <= clks + 1;
      DATA: if (clks == CLKS - 1) begin
              clks <= 0;
              if (idx == 3'd7) begin tx <= 1'b1; state <= STOP; end
              else begin idx <= idx + 3'd1; tx <= shreg[idx + 3'd1]; end
            end else clks <= clks + 1;
      STOP: if (clks == CLKS - 1) begin clks <= 0; state <= IDLE; end
            else clks <= clks + 1;
    endcase
  end
endmodule
'''
TASKS.append(dict(
    id='7.3', group=7, level=5, qname='ДЗ 7.3 · Передатчик UART', lines=40,
    intro='''<p>Напишите передатчик UART <code>uart_tx</code> для кадра <b>8N1</b> (урок 20): в покое линия <code>tx</code> равна 1;
передача начинается, когда <code>start = 1</code> на фронте такта и передатчик свободен; затем: <b>стартовый бит 0</b>,
<b>8 бит данных младшим вперёд</b>, <b>стоп-бит 1</b>. Каждый бит длится <code>CLKS</code> тактов (параметр, по умолчанию 4;
на плате было бы 234). Выход <code>busy = 1</code> всё время, пока идёт кадр, и 0, когда линия свободна. Сброс
<code>rst</code> (синхронный) возвращает линию в покой.</p>
<p>Это комплексное задание: автомат состояний (урок 17), счётчик тактов бита и номера бита, сдвиг данных (урок 14),
параметр (урок 16). Проверка принимает кадр «как приёмник»: ждёт стартовый бит и считывает биты в их серединах, так что
точная задержка после <code>start</code> не важна.</p>''',
    starter='''module uart_tx #(parameter CLKS = 4) (input wire clk, input wire rst, input wire start,
                                    input wire [7:0] data, output reg tx, output wire busy);
  // ваш код
endmodule
''',
    answer=UART_OK,
    tb={'decls': CLOCK + '  reg rst, start;\n  reg [7:0] data;\n  wire tx, busy;\n  integer i, k;\n  reg [7:0] got;\n  reg stopbit;',
        'inst': '  uart_tx #(.CLKS(4)) dut(.clk(clk), .rst(rst), .start(start), .data(data), .tx(tx), .busy(busy));',
        'show': '$display("byte=%h stop=%b tx=%b busy=%b", got, stopbit, tx, busy);',
        'helpers': '''  task xfer(input [7:0] b);
    begin
      data = b; start = 1; tick; start = 0;
      i = 0;
      while (tx !== 1'b0 && i < 40) begin tick; i = i + 1; end
      repeat (2) tick;
      for (k = 0; k < 8; k = k + 1) begin repeat (4) tick; got[k] = tx; end
      repeat (4) tick; stopbit = tx;
      repeat (4) tick;
    end
  endtask
'''},
    tests=["rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; $display(\"idle tx=%b busy=%b\", tx, busy);",
           "rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; xfer(8'h4B); show;",
           "rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; xfer(8'h00); show;",
           "rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; xfer(8'hFF); show;",
           "rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; xfer(8'hE2); show; xfer(8'h01); show;",
           "rst = 1; start = 0; data = 8'h00; tick; rst = 0; tick; data = 8'h55; start = 1; tick; start = 0; "
           "repeat (6) tick; $display(\"busy=%b\", busy);"],
    mutants=[UART_OK.replace('tx <= shreg[idx + 3\'d1]', 'tx <= shreg[6 - idx]').replace("tx <= shreg[0]; state <= DATA", "tx <= shreg[7]; state <= DATA"),
             UART_OK.replace("if (idx == 3'd7) begin tx <= 1'b1; state <= STOP; end", "if (idx == 3'd7) begin tx <= 1'b0; state <= STOP; end"),
             UART_OK.replace('assign busy = (state != IDLE);', "assign busy = 1'b0;"),
             UART_OK.replace('clks == CLKS - 1', 'clks == CLKS - 2')],
    needs=[(20, r'8N1', 'кадр 8N1'), (20, r'IDLE', 'автомат IDLE → START → DATA → STOP'),
           (20, r'младшим вперёд', 'порядок бит'), (17, r'Конечный автомат', 'конечный автомат'),
           (16, r'parameter', 'параметр')],
))
