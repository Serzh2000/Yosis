// Пример 1. Полусумматор и полный сумматор (полный --- из двух полусумматоров и ИЛИ).
module half_adder (
    input  a, b,
    output s,         // сумма
    output c          // перенос
);
    assign s = a ^ b;
    assign c = a & b;
endmodule

module full_adder (
    input  a, b, cin,
    output s,         // сумма
    output cout       // перенос в следующий разряд
);
    wire s1, c1, c2;
    half_adder h1 (.a(a),  .b(b),   .s(s1), .c(c1));    // первый полусумматор: a + b
    half_adder h2 (.a(s1), .b(cin), .s(s),  .c(c2));    // второй: прибавляем входной перенос
    assign cout = c1 | c2;                              // перенос возникает в одном из двух
endmodule
