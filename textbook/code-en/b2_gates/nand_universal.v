// Example 2. Universality of NAND: NOT, AND, OR and XOR built from NAND gates only.
module nand_gate (input a, b, output y);
    assign y = ~(a & b);              // the only "brick"
endmodule

module not_from_nand (input a, output y);
    nand_gate g1 (.a(a), .b(a), .y(y));                  // both inputs tied: ~(a&a) = ~a
endmodule

module and_from_nand (input a, b, output y);
    wire n;
    nand_gate g1 (.a(a), .b(b), .y(n));                  // ~(ab)
    nand_gate g2 (.a(n), .b(n), .y(y));                  // invert once more: ab
endmodule

module or_from_nand (input a, b, output y);
    wire na, nb;
    nand_gate g1 (.a(a), .b(a), .y(na));                 // ~a
    nand_gate g2 (.a(b), .b(b), .y(nb));                 // ~b
    nand_gate g3 (.a(na), .b(nb), .y(y));                // ~(~a & ~b) = a + b (De Morgan's law)
endmodule

module xor_from_nand (input a, b, output y);
    wire n, p, q;
    nand_gate g1 (.a(a), .b(b), .y(n));                  // the shared node
    nand_gate g2 (.a(a), .b(n), .y(p));
    nand_gate g3 (.a(b), .b(n), .y(q));
    nand_gate g4 (.a(p), .b(q), .y(y));                  // four NAND gates in total
endmodule
