// Example 1. All seven gates: each is one assign line.
module all_gates (
    input  a, b,
    output y_not,     // NOT
    output y_and,     // AND
    output y_or,      // OR
    output y_nand,    // NAND
    output y_nor,     // NOR
    output y_xor,     // exclusive OR
    output y_xnor     // exclusive NOR (equality)
);
    assign y_not  = ~a;            // ~ is bitwise inversion
    assign y_and  = a & b;         // & is AND
    assign y_or   = a | b;         // | is OR
    assign y_nand = ~(a & b);      // AND with the output inverted
    assign y_nor  = ~(a | b);
    assign y_xor  = a ^ b;         // ^ is exclusive OR
    assign y_xnor = ~(a ^ b);      // or simply: a ~^ b
endmodule
