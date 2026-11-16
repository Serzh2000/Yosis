// Пример 4. Исключающее ИЛИ тремя способами: оператор ^, И-ИЛИ-НЕ и «ИЛИ без И».
module xor_forms (
    input  a, b,
    output y_op,        // y = a ^ b
    output y_sop,       // y = a & ~b | ~a & b: «различны»
    output y_or_and,    // y = (a | b) & ~(a & b): «хотя бы один, но не оба»
    output same         // XNOR: 1, если входы равны
);
    assign y_op     = a ^ b;
    assign y_sop    = (a & ~b) | (~a & b);
    assign y_or_and = (a | b) & ~(a & b);
    assign same     = ~(a ^ b);
endmodule
