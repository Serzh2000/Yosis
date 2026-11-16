// Пример 2. Сложение двух цифр BCD: обычное двоичное сложение плюс поправка 6.
module bcd_add (
    input  [3:0] a,        // цифра 0..9
    input  [3:0] b,        // цифра 0..9
    output [3:0] ones,     // цифра единиц суммы
    output       tens      // цифра десятков суммы (0 или 1)
);
    wire [4:0] raw = a + b;                   // обычная двоичная сумма, до 18
    wire       fix = (raw > 5'd9);            // получилось не цифра BCD?
    wire [4:0] res = fix ? raw + 5'd6 : raw;  // поправка: пропустить шесть лишних кодов
    assign ones = res[3:0];
    assign tens = res[4];
endmodule
