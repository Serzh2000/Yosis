// Пример 1. Все семь вентилей: каждый --- одна строка assign.
module all_gates (
    input  a, b,
    output y_not,     // НЕ
    output y_and,     // И
    output y_or,      // ИЛИ
    output y_nand,    // И-НЕ
    output y_nor,     // ИЛИ-НЕ
    output y_xor,     // исключающее ИЛИ
    output y_xnor     // исключающее ИЛИ-НЕ (равенство)
);
    assign y_not  = ~a;            // ~ --- побитовая инверсия
    assign y_and  = a & b;         // & --- И
    assign y_or   = a | b;         // | --- ИЛИ
    assign y_nand = ~(a & b);      // И с инверсией на выходе
    assign y_nor  = ~(a | b);
    assign y_xor  = a ^ b;         // ^ --- исключающее ИЛИ
    assign y_xnor = ~(a ^ b);      // можно и так: a ~^ b
endmodule
