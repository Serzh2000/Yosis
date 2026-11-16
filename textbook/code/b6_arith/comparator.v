// Пример 4. Компаратор четырёхразрядных чисел: равно, больше, меньше (без знака и со знаком).
module comparator4 (
    input  [3:0] a, b,
    output       eq,        // a = b
    output       gt,        // a > b (числа без знака)
    output       lt,        // a < b (числа без знака)
    output       lt_signed  // a < b, если числа знаковые
);
    assign eq = &(a ~^ b);                   // XNOR по разрядам, затем И всех результатов (рис. «равенство»)
    assign gt = a > b;
    assign lt = a < b;
    assign lt_signed = $signed(a) < $signed(b);   // 1111 как знаковое = -1 меньше 0001
endmodule
