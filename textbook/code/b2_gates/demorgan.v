// Пример 3. Закон де Моргана: две схемы одной функции и выход «несовпадение».
module demorgan (
    input  a, b,
    output y1,          // ~(a & b)
    output y2,          // ~a | ~b
    output z1,          // ~(a | b)
    output z2,          // ~a & ~b
    output mismatch     // 1, если хотя бы одна пара различается: должен быть всегда 0
);
    assign y1 = ~(a & b);
    assign y2 = ~a | ~b;
    assign z1 = ~(a | b);
    assign z2 = ~a & ~b;
    assign mismatch = (y1 ^ y2) | (z1 ^ z2);    // XOR двух равных сигналов даёт 0
endmodule
