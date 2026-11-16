// Example 4. Exclusive OR in three ways: the ^ operator, AND-OR-NOT and "OR without AND".
module xor_forms (
    input  a, b,
    output y_op,        // y = a ^ b
    output y_sop,       // y = a & ~b | ~a & b: "different"
    output y_or_and,    // y = (a | b) & ~(a & b): "at least one, but not both"
    output same         // XNOR: 1 if the inputs are equal
);
    assign y_op     = a ^ b;
    assign y_sop    = (a & ~b) | (~a & b);
    assign y_or_and = (a | b) & ~(a & b);
    assign same     = ~(a ^ b);
endmodule
