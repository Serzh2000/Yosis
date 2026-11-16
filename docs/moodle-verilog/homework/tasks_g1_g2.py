"""Группы 1 и 2: основы, шины, числа, выбор."""
import itertools

TASKS = []


def comb_tb(decls, inst, show):
    return {'decls': decls, 'inst': inst, 'show': show}


# ============================== ГРУППА 1: основы ==============================

TASKS.append(dict(
    id='1.1', group=1, level=1, qname='ДЗ 1.1 · Лампа и две кнопки', lines=8,
    intro='''<p>Лампа должна гореть, только если нажаты <b>обе</b> кнопки (как в начале урока 1). Допишите в заготовке
правую часть строки <code>assign</code>.</p>''',
    starter='''module lamp(input wire a, input wire b, output wire y);
  assign y = ;
endmodule
''',
    answer='''module lamp(input wire a, input wire b, output wire y);
  assign y = a & b;
endmodule
''',
    tb=comb_tb('  reg a, b;\n  wire y;', '  lamp dut(.a(a), .b(b), .y(y));', '$display("y=%b", y);'),
    tests=['a = %d; b = %d; show;' % (a, b) for a, b in itertools.product([0, 1], repeat=2)],
    mutants=['''module lamp(input wire a, input wire b, output wire y);
  assign y = a | b;
endmodule
''', '''module lamp(input wire a, input wire b, output wire y);
  assign y = a ^ b;
endmodule
'''],
    needs=[(1, r'assign y = a & b', 'пример «лампа и две кнопки»'), (3, r'~\s*&\s*\|\s*\^', 'операторы ~ & | ^')],
))

TASKS.append(dict(
    id='1.2', group=1, level=2, qname='ДЗ 1.2 · Найди три ошибки', lines=14,
    intro='''<p>В модуле сигнализации спрятаны <b>три ошибки</b>: из тех, что разбирались на уроке 2. Сирена должна включаться,
если охрана включена (<code>armed</code>) и открыта дверь или окно. Исправьте код так, чтобы он собирался и
работал правильно. Если не получается найти ошибку глазами, прочитайте сообщение компилятора: в нём указана строка.</p>''',
    starter='''module alarm (
  input wire door,
  input wire window,
  input wire armed,
  output wire siren,
);
  wire open
  assign open = door | window;
  assign siren = open & arm;
endmodule
''',
    answer='''module alarm (
  input wire door,
  input wire window,
  input wire armed,
  output wire siren
);
  wire open;
  assign open = door | window;
  assign siren = open & armed;
endmodule
''',
    tb=comb_tb('  reg door, window, armed;\n  wire siren;',
               '  alarm dut(.door(door), .window(window), .armed(armed), .siren(siren));', '$display("siren=%b", siren);'),
    tests=['door = %d; window = %d; armed = %d; show;' % v for v in itertools.product([0, 1], repeat=3)],
    mutants=['''module alarm (input wire door, input wire window, input wire armed, output wire siren);
  assign siren = door & armed;
endmodule
''', '''module alarm (input wire door, input wire window, input wire armed, output wire siren);
  wire open;
  assign open = door | window;
  assign siren = open | armed;
endmodule
'''],
    needs=[(2, r'запятая после последнего|после\s+последнего', 'запятая после последнего порта'),
           (2, r'нет\s*;\s*в конце', 'забытая «;»'), (2, r'опечатка в имени', 'опечатка в имени')],
))

TASKS.append(dict(
    id='1.3', group=1, level=3, qname='ДЗ 1.3 · Голосование «два из трёх»', lines=8,
    intro='''<p>Три члена комиссии голосуют кнопками <code>a</code>, <code>b</code>, <code>c</code>. Решение принято
(<code>y = 1</code>), если «за» проголосовали <b>не менее двух</b>. Порты заданы, напишите содержимое модуля.</p>''',
    starter='''module vote(input wire a, input wire b, input wire c, output wire y);
  // ваш код
endmodule
''',
    answer='''module vote(input wire a, input wire b, input wire c, output wire y);
  assign y = (a & b) | (a & c) | (b & c);
endmodule
''',
    tb=comb_tb('  reg a, b, c;\n  wire y;', '  vote dut(.a(a), .b(b), .c(c), .y(y));', '$display("y=%b", y);'),
    tests=['a = %d; b = %d; c = %d; show;' % v for v in itertools.product([0, 1], repeat=3)],
    mutants=['''module vote(input wire a, input wire b, input wire c, output wire y);
  assign y = a & b & c;
endmodule
''', '''module vote(input wire a, input wire b, input wire c, output wire y);
  assign y = (a & b) | (a & c);
endmodule
''', '''module vote(input wire a, input wire b, input wire c, output wire y);
  assign y = a | b | c;
endmodule
'''],
    needs=[(3, r'голосован', 'пример «голосование»'), (3, r'Приоритет', 'приоритет и скобки')],
))

TASKS.append(dict(
    id='1.4', group=1, level=4, qname='ДЗ 1.4 · Охранный индикатор', lines=10,
    intro='''<p>Модуль <code>guard</code> следит за дверью и окном. Сирена <code>siren</code> включается (1), если охрана включена
(<code>armed = 1</code>) <b>и</b> открыта дверь или окно. Индикатор <code>led_n</code> на плате горит при 0 (активный
низкий уровень): он должен <b>гореть, когда сирена включена</b>.</p>
<p>Интерфейс задан, как устроено внутри — решаете сами: можно завести внутренний провод.</p>''',
    starter='''module guard(input wire door, input wire window, input wire armed,
             output wire siren, output wire led_n);
  // ваш код
endmodule
''',
    answer='''module guard(input wire door, input wire window, input wire armed,
             output wire siren, output wire led_n);
  wire open;
  assign open = door | window;
  assign siren = armed & open;
  assign led_n = ~siren;
endmodule
''',
    tb=comb_tb('  reg door, window, armed;\n  wire siren, led_n;',
               '  guard dut(.door(door), .window(window), .armed(armed), .siren(siren), .led_n(led_n));',
               '$display("siren=%b led_n=%b", siren, led_n);'),
    tests=['door = %d; window = %d; armed = %d; show;' % v for v in itertools.product([0, 1], repeat=3)],
    mutants=['''module guard(input wire door, input wire window, input wire armed,
             output wire siren, output wire led_n);
  assign siren = armed & (door | window);
  assign led_n = siren;
endmodule
''', '''module guard(input wire door, input wire window, input wire armed,
             output wire siren, output wire led_n);
  assign siren = armed | door | window;
  assign led_n = ~siren;
endmodule
'''],
    needs=[(2, r'Активный\s+низкий', 'активный низкий уровень'), (2, r'внутренний провод', 'внутренний провод'),
           (3, r'~', 'оператор ~')],
))

# ============================== ГРУППА 2: шины, числа, выбор ==============================

VEC8 = ['8\'h00', '8\'hFF', '8\'h1A', '8\'hA5', '8\'h0F', '8\'hF0', '8\'h3C', '8\'h81']
TASKS.append(dict(
    id='2.1', group=2, level=2, qname='ДЗ 2.1 · Поменять половинки байта', lines=8,
    intro='''<p>Модуль должен поменять местами старшую и младшую <b>половины</b> (по 4 бита) входного байта:
если <code>a = 8'h1A</code>, то <code>y = 8'hA1</code>. Сейчас выход просто повторяет вход. Измените одну строку:
используйте срезы <code>a[7:4]</code> и <code>a[3:0]</code> и конкатенацию <code>{ … , … }</code>.</p>''',
    starter='''module swap_nibbles(input wire [7:0] a, output wire [7:0] y);
  assign y = a;
endmodule
''',
    answer='''module swap_nibbles(input wire [7:0] a, output wire [7:0] y);
  assign y = {a[3:0], a[7:4]};
endmodule
''',
    tb=comb_tb('  reg [7:0] a;\n  wire [7:0] y;', '  swap_nibbles dut(.a(a), .y(y));', '$display("y=%h", y);'),
    tests=['a = %s; show;' % v for v in VEC8],
    mutants=['''module swap_nibbles(input wire [7:0] a, output wire [7:0] y);
  assign y = {a[7:4], a[3:0]};
endmodule
''', '''module swap_nibbles(input wire [7:0] a, output wire [7:0] y);
  assign y = {a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]};
endmodule
'''],
    needs=[(4, r'Конкатенац', 'конкатенация'), (4, r'x\[m:n\]|срез', 'срез шины')],
))

PAT = {0: '6\'b000000', 1: '6\'b101010', 2: '6\'b010101', 3: '6\'b111000'}
TASKS.append(dict(
    id='2.2', group=2, level=3, qname='ДЗ 2.2 · Выбор узора на светодиодах', lines=10,
    intro='''<p>Две кнопки образуют число <code>btn</code> от 0 до 3. По нему выбирается узор на шести светодиодах
(как в домашнем задании урока 6, вариант «Узоры»):</p>
<table border="1" cellpadding="4"><tr><th>btn</th><th>led_n</th></tr>
<tr><td>00</td><td>000000</td></tr><tr><td>01</td><td>101010</td></tr><tr><td>10</td><td>010101</td></tr><tr><td>11</td><td>111000</td></tr></table>
<p>Напишите содержимое модуля. Подсказка: вложенный условный оператор <code>?:</code>.</p>''',
    starter='''module pattern(input wire [1:0] btn, output wire [5:0] led_n);
  // ваш код
endmodule
''',
    answer='''module pattern(input wire [1:0] btn, output wire [5:0] led_n);
  assign led_n = (btn == 2'b00) ? 6'b000000 :
                 (btn == 2'b01) ? 6'b101010 :
                 (btn == 2'b10) ? 6'b010101 : 6'b111000;
endmodule
''',
    tb=comb_tb('  reg [1:0] btn;\n  wire [5:0] led_n;', '  pattern dut(.btn(btn), .led_n(led_n));', '$display("led_n=%b", led_n);'),
    tests=["btn = 2'd%d; show;" % i for i in range(4)],
    mutants=['''module pattern(input wire [1:0] btn, output wire [5:0] led_n);
  assign led_n = (btn == 2'b00) ? 6'b000000 : (btn == 2'b01) ? 6'b010101 : (btn == 2'b10) ? 6'b101010 : 6'b111000;
endmodule
''', '''module pattern(input wire [1:0] btn, output wire [5:0] led_n);
  assign led_n = btn[0] ? 6'b101010 : 6'b000000;
endmodule
'''],
    needs=[(6, r'Вложенный\s*\?:', 'вложенный ?:'), (6, r'==', 'сравнение =='), (4, r"4'b1010|6'd5|8'hFF", 'константы с размером')],
))

TASKS.append(dict(
    id='2.3', group=2, level=3, qname='ДЗ 2.3 · Сумма двух чисел с переносом', lines=10,
    intro='''<p>Сложите два 2-битных числа <code>a</code> и <code>b</code>. Результат может быть от 0 до 6, то есть
не помещается в 2 бита: младшие два бита выдайте в <code>sum</code>, а старший (<b>перенос</b>) — в <code>carry</code>.
Например, <code>3 + 3 = 6 = 110₂</code>: <code>carry = 1</code>, <code>sum = 10</code>.
Подсказка: на уроке 7 разобрана запись <code>{carry, sum} = a + b</code>.</p>''',
    starter='''module add2c(input wire [1:0] a, input wire [1:0] b, output wire [1:0] sum, output wire carry);
  // ваш код
endmodule
''',
    answer='''module add2c(input wire [1:0] a, input wire [1:0] b, output wire [1:0] sum, output wire carry);
  assign {carry, sum} = a + b;
endmodule
''',
    tb=comb_tb('  reg [1:0] a, b;\n  wire [1:0] sum;\n  wire carry;', '  add2c dut(.a(a), .b(b), .sum(sum), .carry(carry));',
               '$display("carry=%b sum=%b", carry, sum);'),
    tests=["a = 2'd%d; b = 2'd%d; show;" % v for v in itertools.product(range(4), repeat=2)],
    mutants=['''module add2c(input wire [1:0] a, input wire [1:0] b, output wire [1:0] sum, output wire carry);
  assign sum = a + b;
  assign carry = 1'b0;
endmodule
''', '''module add2c(input wire [1:0] a, input wire [1:0] b, output wire [1:0] sum, output wire carry);
  assign sum = a + b;
  assign carry = a[1] & b[1];
endmodule
'''],
    needs=[(7, r'\{carry,\s*sum\}\s*=\s*a\s*\+\s*b', '{carry, sum} = a + b'), (7, r'N\s*\+\s*1', 'разрядность суммы N+1')],
))

ABS_PAIRS = [(0, 0), (5, 3), (3, 5), (15, 0), (0, 15), (7, 7), (9, 12), (12, 9), (1, 14), (14, 1)]
TASKS.append(dict(
    id='2.4', group=2, level=4, qname='ДЗ 2.4 · Модуль разности', lines=10,
    intro='''<p>Модуль <code>absdiff</code> получает два 4-битных числа без знака и выдаёт <b>модуль их разности</b>
<code>d = |a − b|</code> (всегда неотрицательный). Например, для 3 и 5 результат 2 в обоих порядках.</p>
<p>Интерфейс задан. Подумайте сами, как не получить «отрицательное» число: нужно сравнить числа и вычитать
меньшее из большего.</p>''',
    starter='''module absdiff(input wire [3:0] a, input wire [3:0] b, output wire [3:0] d);
  // ваш код
endmodule
''',
    answer='''module absdiff(input wire [3:0] a, input wire [3:0] b, output wire [3:0] d);
  assign d = (a > b) ? (a - b) : (b - a);
endmodule
''',
    tb=comb_tb('  reg [3:0] a, b;\n  wire [3:0] d;', '  absdiff dut(.a(a), .b(b), .d(d));', '$display("d=%d", d);'),
    tests=["a = 4'd%d; b = 4'd%d; show;" % p for p in ABS_PAIRS],
    mutants=['''module absdiff(input wire [3:0] a, input wire [3:0] b, output wire [3:0] d);
  assign d = a - b;
endmodule
''', '''module absdiff(input wire [3:0] a, input wire [3:0] b, output wire [3:0] d);
  assign d = (a > b) ? (b - a) : (a - b);
endmodule
'''],
    needs=[(6, r'==\s*!=\s*<\s*>|c \? x : y', 'условный оператор и сравнения'), (7, r'вычитан', 'вычитание'),
           (7, r'Переполнение', 'переполнение при вычитании')],
))
