// Пример 2. Универсальность И-НЕ: НЕ, И, ИЛИ и исключающее ИЛИ только из элементов И-НЕ.
module nand_gate (input a, b, output y);
    assign y = ~(a & b);              // единственный «кирпич»
endmodule

module not_from_nand (input a, output y);
    nand_gate g1 (.a(a), .b(a), .y(y));                  // оба входа вместе: ~(a&a) = ~a
endmodule

module and_from_nand (input a, b, output y);
    wire n;
    nand_gate g1 (.a(a), .b(b), .y(n));                  // ~(ab)
    nand_gate g2 (.a(n), .b(n), .y(y));                  // ещё раз инвертируем: ab
endmodule

module or_from_nand (input a, b, output y);
    wire na, nb;
    nand_gate g1 (.a(a), .b(a), .y(na));                 // ~a
    nand_gate g2 (.a(b), .b(b), .y(nb));                 // ~b
    nand_gate g3 (.a(na), .b(nb), .y(y));                // ~(~a & ~b) = a + b (закон де Моргана)
endmodule

module xor_from_nand (input a, b, output y);
    wire n, p, q;
    nand_gate g1 (.a(a), .b(b), .y(n));                  // общий узел
    nand_gate g2 (.a(a), .b(n), .y(p));
    nand_gate g3 (.a(b), .b(n), .y(q));
    nand_gate g4 (.a(p), .b(q), .y(y));                  // всего четыре элемента И-НЕ
endmodule
