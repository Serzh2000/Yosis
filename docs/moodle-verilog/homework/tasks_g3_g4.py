"""Группы 3 и 4: always/case, иерархия модулей; файл .cst и испытательные стенды."""
import itertools

TASKS = []


def comb_tb(decls, inst, show):
    return {'decls': decls, 'inst': inst, 'show': show}


# ============================== ГРУППА 3: поведение и структура ==============================

TASKS.append(dict(
    id='3.1', group=3, level=2, qname='ДЗ 3.1 · Дешифратор 2 → 4', lines=14,
    intro='''<p>Дешифратор по двухбитному коду <code>code</code> зажигает <b>один</b> из четырёх выходов:
код 0 → <code>0001</code>, 1 → <code>0010</code>, 2 → <code>0100</code>, 3 → <code>1000</code>.</p>
<p>В заготовке написаны первые два варианта. Допишите остальные и ветвь <code>default</code>, чтобы не получилась
защёлка (урок 8).</p>''',
    starter='''module dec2to4(input wire [1:0] code, output reg [3:0] y);
  always @(*) begin
    case (code)
      2'd0: y = 4'b0001;
      2'd1: y = 4'b0010;
      // допишите остальные варианты и default
    endcase
  end
endmodule
''',
    answer='''module dec2to4(input wire [1:0] code, output reg [3:0] y);
  always @(*) begin
    case (code)
      2'd0: y = 4'b0001;
      2'd1: y = 4'b0010;
      2'd2: y = 4'b0100;
      2'd3: y = 4'b1000;
      default: y = 4'b0000;
    endcase
  end
endmodule
''',
    tb=comb_tb('  reg [1:0] code;\n  wire [3:0] y;', '  dec2to4 dut(.code(code), .y(y));', '$display("y=%b", y);'),
    tests=["code = 2'd%d; show;" % i for i in range(4)],
    mutants=['''module dec2to4(input wire [1:0] code, output reg [3:0] y);
  always @(*) begin
    case (code)
      2'd0: y = 4'b0001;
      2'd1: y = 4'b0010;
      2'd2: y = 4'b1000;
      2'd3: y = 4'b0100;
      default: y = 4'b0000;
    endcase
  end
endmodule
'''],
    needs=[(8, r'case\s*/\s*default\s*/\s*endcase', 'case / default'), (8, r'Защёлка', 'защёлка из-за пропущенного варианта')],
))

SEG = {0: '0111111', 1: '0000110', 2: '1011011', 3: '1001111', 4: '1100110',
       5: '1101101', 6: '1111101', 7: '0000111', 8: '1111111', 9: '1101111'}
TASKS.append(dict(
    id='3.2', group=3, level=3, qname='ДЗ 3.2 · Цифра на семисегментном индикаторе', lines=12,
    intro='''<p>Модуль <code>seg7</code> по цифре <code>digit</code> (0–9) выдаёт код сегментов <code>seg[6:0]</code>
(<code>seg[0]</code> — сегмент a, …, <code>seg[6]</code> — g; сегмент горит при 1). Для чисел 10–15 индикатор должен
<b>погаснуть</b> (все нули).</p>
<table border="1" cellpadding="4"><tr><th>digit</th><th>seg (g…a)</th><th>digit</th><th>seg (g…a)</th></tr>
<tr><td>0</td><td>0111111</td><td>5</td><td>1101101</td></tr>
<tr><td>1</td><td>0000110</td><td>6</td><td>1111101</td></tr>
<tr><td>2</td><td>1011011</td><td>7</td><td>0000111</td></tr>
<tr><td>3</td><td>1001111</td><td>8</td><td>1111111</td></tr>
<tr><td>4</td><td>1100110</td><td>9</td><td>1101111</td></tr></table>
<p>Порты заданы. Таблицу вариантов удобно описать оператором <code>case</code> в блоке <code>always @(*)</code>.</p>''',
    starter='''module seg7(input wire [3:0] digit, output reg [6:0] seg);
  // ваш код
endmodule
''',
    answer='''module seg7(input wire [3:0] digit, output reg [6:0] seg);
  always @(*) begin
    case (digit)
''' + ''.join("      4'd%d: seg = 7'b%s;\n" % (d, c) for d, c in SEG.items()) + '''      default: seg = 7'b0000000;
    endcase
  end
endmodule
''',
    tb=comb_tb('  reg [3:0] digit;\n  wire [6:0] seg;', '  seg7 dut(.digit(digit), .seg(seg));', '$display("seg=%b", seg);'),
    tests=["digit = 4'd%d; show;" % i for i in range(16)],
    mutants=['''module seg7(input wire [3:0] digit, output reg [6:0] seg);
  always @(*) begin
    case (digit)
''' + ''.join("      4'd%d: seg = 7'b%s;\n" % (d, c) for d, c in SEG.items() if d != 9) + '''      default: seg = 7'b0000000;
    endcase
  end
endmodule
''', '''module seg7(input wire [3:0] digit, output reg [6:0] seg);
  always @(*) begin
    case (digit)
''' + ''.join("      4'd%d: seg = 7'b%s;\n" % (d, c) for d, c in SEG.items()) + '''      default: seg = 7'b1111111;
    endcase
  end
endmodule
'''],
    needs=[(8, r'always @\(\*\)', 'always @(*)'), (8, r'default', 'default'), (8, r'reg\s', 'тип reg в always')],
))

HA = '''module half_adder(input wire a, input wire b, output wire sum, output wire carry);
  assign sum = a ^ b;
  assign carry = a & b;
endmodule
'''
FA = '''module full_adder(input wire a, input wire b, input wire cin, output wire sum, output wire cout);
  wire s1, c1, c2;
  half_adder ha1 (.a(a), .b(b), .sum(s1), .carry(c1));
  half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));
  assign cout = c1 | c2;
endmodule
'''
TASKS.append(dict(
    id='3.3', group=3, level=3, qname='ДЗ 3.3 · Полный сумматор из полусумматоров', lines=24,
    intro='''<p>Модуль <code>half_adder</code> (полусумматор) уже написан. Постройте из <b>двух</b> его экземпляров
полный сумматор <code>full_adder</code> с входом переноса <code>cin</code> и выходом переноса <code>cout</code>:</p>
<ul><li>первый полусумматор складывает <code>a</code> и <code>b</code>;</li>
<li>второй — результат первого и <code>cin</code>;</li>
<li>перенос <code>cout</code> равен «ИЛИ» двух переносов.</li></ul>
<p>Подключайте порты по именам: <code>.порт(сигнал)</code>. Это тот же пример, что был на уроке 9.</p>''',
    starter=HA + '''
module full_adder(input wire a, input wire b, input wire cin, output wire sum, output wire cout);
  // ваш код: два экземпляра half_adder и ИЛИ для переноса
endmodule
''',
    answer=HA + '\n' + FA,
    tb=comb_tb('  reg a, b, cin;\n  wire sum, cout;', '  full_adder dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));',
               '$display("sum=%b cout=%b", sum, cout);'),
    tests=['a = %d; b = %d; cin = %d; show;' % v for v in itertools.product([0, 1], repeat=3)],
    mutants=[HA + '''
module full_adder(input wire a, input wire b, input wire cin, output wire sum, output wire cout);
  wire s1, c1, c2;
  half_adder ha1 (.a(a), .b(b), .sum(s1), .carry(c1));
  half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));
  assign cout = c1;
endmodule
''', HA + '''
module full_adder(input wire a, input wire b, input wire cin, output wire sum, output wire cout);
  assign sum = a ^ b;
  assign cout = (a & b) | cin;
endmodule
'''],
    needs=[(9, r'Экземпляр модуля', 'экземпляр модуля'), (9, r'\.порт\(сигнал\)', 'подключение по именам')],
))

TASKS.append(dict(
    id='3.4', group=3, level=4, qname='ДЗ 3.4 · Четырёхразрядный сумматор', lines=28,
    intro='''<p>Модули <code>half_adder</code> и <code>full_adder</code> уже готовы. Соберите из них 4-разрядный сумматор
<code>adder4</code>: числа <code>a</code> и <code>b</code> по 4 бита, на выходе сумма <code>sum</code> (4 бита) и перенос
<code>cout</code>. Вход переноса самого младшего разряда равен 0.</p>
<p>Как соединить четыре экземпляра цепочкой, решаете сами: промежуточные переносы нужны во внутренних проводах.
Помните про разрядность: <code>wire [3:0] c</code> — четыре провода одним именем.</p>''',
    starter=HA + '\n' + FA + '''
module adder4(input wire [3:0] a, input wire [3:0] b, output wire [3:0] sum, output wire cout);
  // ваш код
endmodule
''',
    answer=HA + '\n' + FA + '''
module adder4(input wire [3:0] a, input wire [3:0] b, output wire [3:0] sum, output wire cout);
  wire [3:0] c;
  full_adder fa0 (.a(a[0]), .b(b[0]), .cin(1'b0), .sum(sum[0]), .cout(c[0]));
  full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c[0]), .sum(sum[1]), .cout(c[1]));
  full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c[1]), .sum(sum[2]), .cout(c[2]));
  full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c[2]), .sum(sum[3]), .cout(c[3]));
  assign cout = c[3];
endmodule
''',
    tb=comb_tb('  reg [3:0] a, b;\n  wire [3:0] sum;\n  wire cout;', '  adder4 dut(.a(a), .b(b), .sum(sum), .cout(cout));',
               '$display("sum=%d cout=%b", sum, cout);'),
    tests=["a = 4'd%d; b = 4'd%d; show;" % p for p in [(0, 0), (5, 3), (9, 8), (15, 15), (1, 15), (7, 9), (6, 10), (12, 4)]],
    mutants=[HA + '\n' + FA + '''
module adder4(input wire [3:0] a, input wire [3:0] b, output wire [3:0] sum, output wire cout);
  wire [3:0] c;
  full_adder fa0 (.a(a[0]), .b(b[0]), .cin(1'b0), .sum(sum[0]), .cout(c[0]));
  full_adder fa1 (.a(a[1]), .b(b[1]), .cin(1'b0), .sum(sum[1]), .cout(c[1]));
  full_adder fa2 (.a(a[2]), .b(b[2]), .cin(1'b0), .sum(sum[2]), .cout(c[2]));
  full_adder fa3 (.a(a[3]), .b(b[3]), .cin(1'b0), .sum(sum[3]), .cout(c[3]));
  assign cout = c[3];
endmodule
'''],
    needs=[(9, r'Иерархия', 'иерархия модулей'), (9, r'Разрядность портов', 'разрядность портов совпадает'),
           (7, r'\{carry,\s*sum\}|Перенос', 'перенос между разрядами')],
))

# ============================== ГРУППА 4: плата и проверка ==============================

CST_TEMPLATE = '''import re
_t = """{{ STUDENT_ANSWER | e('py') }}"""
_t = re.sub(r"/\\*.*?\\*/", "", _t, flags=re.S)
_t = re.sub(r"//[^\\n]*", "", _t)


def loc(name, pin):
    ok = re.search(r'IO_LOC\\s+"%s"\\s+%d\\s*;' % (re.escape(name), pin), _t)
    print("ok" if ok else "нет строки IO_LOC для %s на выводе %d" % (name, pin))


def level(name):
    ok = re.search(r'IO_PORT\\s+"%s"[^;]*IO_TYPE\\s*=\\s*LVCMOS33[^;]*;' % re.escape(name), _t)
    print("ok" if ok else "у %s нет IO_TYPE=LVCMOS33" % name)


def pull(name, mode):
    ok = re.search(r'IO_PORT\\s+"%s"[^;]*PULL_MODE\\s*=\\s*%s[^;]*;' % (re.escape(name), mode), _t)
    print("ok" if ok else "у %s нет PULL_MODE=%s" % (name, mode))


{{ TEST.testcode }}
'''

CST_OK = '''// кнопки: нажата = 1, подтяжка к земле
IO_LOC "btn[0]" 88;
IO_PORT "btn[0]" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;
IO_LOC "btn[1]" 87;
IO_PORT "btn[1]" IO_TYPE=LVCMOS33 PULL_MODE=DOWN;
// светодиоды горят при 0
''' + ''.join('IO_LOC "led_n[%d]" %d;\nIO_PORT "led_n[%d]" IO_TYPE=LVCMOS33 PULL_MODE=UP DRIVE=8;\n' % (i, 15 + i, i)
               for i in range(6)) + '''// генератор 27 МГц
IO_LOC "clk" 4;
IO_PORT "clk" IO_TYPE=LVCMOS33;
'''

CST_TESTS = ['loc("btn[0]", 88)', 'loc("btn[1]", 87)', 'pull("btn[0]", "DOWN")', 'pull("btn[1]", "DOWN")',
             'loc("led_n[0]", 15)', 'loc("led_n[1]", 16)', 'loc("led_n[2]", 17)', 'loc("led_n[3]", 18)',
             'loc("led_n[4]", 19)', 'loc("led_n[5]", 20)', 'level("led_n[3]")', 'level("btn[0]")',
             'loc("clk", 4)', 'level("clk")']
TASKS.append(dict(
    id='4.1', group=4, level=3, kind='python', qname='ДЗ 4.1 · Файл .cst для проекта', lines=22, examples=3,
    intro='''<p>Проект на плате имеет такие порты верхнего модуля:</p>
<table border="1" cellpadding="4"><tr><th>Порт</th><th>Вывод ПЛИС</th><th>Свойства</th></tr>
<tr><td><code>btn[0]</code> (S1)</td><td>88</td><td>LVCMOS33, подтяжка вниз</td></tr>
<tr><td><code>btn[1]</code> (S2)</td><td>87</td><td>LVCMOS33, подтяжка вниз</td></tr>
<tr><td><code>led_n[0]</code> … <code>led_n[5]</code></td><td>15 … 20 (по порядку)</td><td>LVCMOS33, подтяжка вверх, ток 8 мА</td></tr>
<tr><td><code>clk</code></td><td>4</td><td>LVCMOS33</td></tr></table>
<p>Напишите <b>текст файла .cst</b>: у шины каждый бит назначается отдельной строкой (урок 5). Для каждого порта нужна
строка <code>IO_LOC</code>, а свойства задаёт <code>IO_PORT</code>.</p>''',
    starter='''// кнопки
IO_LOC "btn[0]" 88;
// допишите остальное
''',
    answer=CST_OK,
    python_template=CST_TEMPLATE,
    tests=CST_TESTS,
    mutants=[CST_OK.replace('IO_LOC "led_n[3]" 18;\n', ''),
             CST_OK.replace('IO_LOC "btn[1]" 87;', 'IO_LOC "btn[1]" 86;'),
             CST_OK.replace('PULL_MODE=DOWN', 'PULL_MODE=UP'),
             CST_OK.replace('IO_PORT "clk" IO_TYPE=LVCMOS33;', '')],
    needs=[(5, r'IO_LOC', 'IO_LOC'), (5, r'IO_PORT', 'IO_PORT'), (5, r'PULL_MODE=DOWN', 'подтяжка DOWN'),
           (5, r'Шина в файле \.cst|каждый бит', 'шина в .cst: каждый бит отдельно')],
))

VOTE_VARIANTS = {
    'ok': 'module vote(input wire a, input wire b, input wire c, output wire y);\n'
          '  assign y = (a & b) | (a & c) | (b & c);\nendmodule',
    'bug1': 'module vote(input wire a, input wire b, input wire c, output wire y);\n'
            '  assign y = (a & b) | (a & c) | (a & b);\nendmodule',
    'bug2': 'module vote(input wire a, input wire b, input wire c, output wire y);\n'
            '  assign y = a | b | c;\nendmodule',
    'bug3': 'module vote(input wire a, input wire b, input wire c, output wire y);\n'
            '  assign y = ((a & b) | (a & c) | (b & c)) & ~(a & b & c);\nendmodule',
}
NO_ERR = r'\A(?!.*ОШИБКА)'
TB_VOTE = '''`timescale 1ns/1ps
module tb_vote;
  reg a, b, c;
  wire y;
  integer i;
  reg expected;
  vote dut(.a(a), .b(b), .c(c), .y(y));
  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      {a, b, c} = i[2:0];
      #10;
      expected = (a & b) | (a & c) | (b & c);
      if (y !== expected)
        $display("ОШИБКА: a=%b b=%b c=%b y=%b, ожидалось %b", a, b, c, y, expected);
    end
    $finish;
  end
endmodule
'''
TASKS.append(dict(
    id='4.2', group=4, level=3, kind='tbwrite', qname='ДЗ 4.2 · Испытательный стенд для голосования', lines=24, examples=0,
    intro='''<p>Теперь вы проверяете не свой модуль, а <b>чужой</b>. Модуль голосования «два из трёх» уже описан (его
код вы не видите, интерфейс: <code>vote(a, b, c → y)</code>; <code>y = 1</code>, если «за» не менее двух).
Некоторые версии модуля содержат ошибки.</p>
<p>Напишите <b>испытательный стенд</b> с именем <code>tb_vote</code> (урок 10): он не имеет портов, подключает
экземпляр <code>vote</code>, перебирает <b>все 8 сочетаний</b> входов и для каждого сравнивает <code>y</code> с ожидаемым
значением. При несовпадении печатайте строку со словом <code>ОШИБКА</code> (с большими буквами). Для исправной
схемы это слово печататься не должно.</p>
<p>Модуль <code>vote</code> описывать не нужно.</p>''',
    starter='''`timescale 1ns/1ps
module tb_vote;
  // ваш код: reg для входов, wire для выхода, экземпляр vote
  // цикл for по 8 сочетаниям, пауза #10, проверка y !== ожидаемое
  // при ошибке: $display("ОШИБКА ...");
endmodule
''',
    answer=TB_VOTE,
    variants=VOTE_VARIANTS,
    variants_expect={'ok': NO_ERR, 'bug1': 'ОШИБКА', 'bug2': 'ОШИБКА', 'bug3': 'ОШИБКА'},
    tests=['ok', 'bug1', 'bug2', 'bug3'],
    mutants=[
        # ничего не проверяет
        '`timescale 1ns/1ps\nmodule tb_vote;\n  reg a, b, c; wire y;\n  vote dut(.a(a), .b(b), .c(c), .y(y));\n'
        '  initial begin #10 $finish; end\nendmodule\n',
        # проверяет только два сочетания
        '`timescale 1ns/1ps\nmodule tb_vote;\n  reg a, b, c; wire y;\n  vote dut(.a(a), .b(b), .c(c), .y(y));\n'
        '  initial begin\n    a = 0; b = 0; c = 0; #10; if (y !== 0) $display("ОШИБКА");\n'
        '    a = 1; b = 1; c = 1; #10; if (y !== 1) $display("ОШИБКА");\n    $finish;\n  end\nendmodule\n',
        # всегда ругается
        '`timescale 1ns/1ps\nmodule tb_vote;\n  reg a, b, c; wire y;\n  vote dut(.a(a), .b(b), .c(c), .y(y));\n'
        '  initial begin #10 $display("ОШИБКА"); $finish; end\nendmodule\n',
    ],
    needs=[(10, r'Испытательный стенд', 'испытательный стенд'), (10, r'for', 'цикл for'),
           (10, r'!==', 'сравнение !=='), (10, r'\$display', '$display')],
))

MUX_VARIANTS = {
    'ok': 'module mux4(input wire [1:0] sel, input wire [3:0] d, output wire y);\n  assign y = d[sel];\nendmodule',
    'bug1': 'module mux4(input wire [1:0] sel, input wire [3:0] d, output wire y);\n'
            '  assign y = d[{sel[0], sel[1]}];\nendmodule',
    'bug2': 'module mux4(input wire [1:0] sel, input wire [3:0] d, output wire y);\n'
            '  assign y = (sel == 2\'d3) ? d[2] : d[sel];\nendmodule',
    'bug3': 'module mux4(input wire [1:0] sel, input wire [3:0] d, output wire y);\n'
            '  assign y = ((d == 4\'b1111) && (sel == 2\'d0)) ? 1\'b0 : d[sel];\nendmodule',
}
TB_MUX = '''`timescale 1ns/1ps
module tb_mux4;
  reg [1:0] sel;
  reg [3:0] d;
  wire y;
  integer i;
  mux4 dut(.sel(sel), .d(d), .y(y));
  initial begin
    for (i = 0; i < 64; i = i + 1) begin
      {sel, d} = i[5:0];
      #10;
      if (y !== d[sel])
        $display("ОШИБКА: sel=%d d=%b y=%b", sel, d, y);
    end
    $finish;
  end
endmodule
'''
TASKS.append(dict(
    id='4.3', group=4, level=4, kind='tbwrite', qname='ДЗ 4.3 · Стенд для мультиплексора 4:1', lines=24, examples=0,
    intro='''<p>Проверьте чужой мультиплексор 4:1 <code>mux4</code> с портами: <code>sel</code> (2 бита), <code>d</code> (4 бита
данных), <code>y</code> (1 бит). Исправный мультиплексор выдаёт на <code>y</code> тот бит <code>d</code>, номер которого
задан в <code>sel</code> (<code>sel = 2</code> → <code>y = d[2]</code>).</p>
<p>Напишите стенд <code>tb_mux4</code>: перебор <b>всех сочетаний</b> входов (сколько их?), проверка <code>y</code>, при
несовпадении печать строки с <code>ОШИБКА</code>. Ошибки в испытуемых версиях бывают редкие, так что одного-двух
сочетаний мало. Описывать сам <code>mux4</code> не нужно.</p>''',
    starter='''`timescale 1ns/1ps
module tb_mux4;
  // ваш код
endmodule
''',
    answer=TB_MUX,
    variants=MUX_VARIANTS,
    variants_expect={'ok': NO_ERR, 'bug1': 'ОШИБКА', 'bug2': 'ОШИБКА', 'bug3': 'ОШИБКА'},
    tests=['ok', 'bug1', 'bug2', 'bug3'],
    mutants=[
        '`timescale 1ns/1ps\nmodule tb_mux4;\n  reg [1:0] sel; reg [3:0] d; wire y;\n'
        '  mux4 dut(.sel(sel), .d(d), .y(y));\n  initial begin\n    sel = 0; d = 4\'b0001; #10;\n'
        '    if (y !== 1) $display("ОШИБКА"); sel = 3; d = 4\'b1000; #10; if (y !== 1) $display("ОШИБКА");\n'
        '    $finish;\n  end\nendmodule\n',
        '`timescale 1ns/1ps\nmodule tb_mux4;\n  reg [1:0] sel; reg [3:0] d; wire y;\n'
        '  mux4 dut(.sel(sel), .d(d), .y(y));\n  initial begin #10 $display("ОШИБКА"); $finish; end\nendmodule\n',
    ],
    needs=[(10, r'for', 'цикл for'), (6, r'Мультиплексор', 'мультиплексор'), (10, r'Испытательный стенд', 'стенд')],
))
