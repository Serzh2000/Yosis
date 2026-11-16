// Example 3. De Morgan's law: two circuits for one function and a "mismatch" output.
module demorgan (
    input  a, b,
    output y1,          // ~(a & b)
    output y2,          // ~a | ~b
    output z1,          // ~(a | b)
    output z2,          // ~a & ~b
    output mismatch     // 1 if any pair differs: must always be 0
);
    assign y1 = ~(a & b);
    assign y2 = ~a | ~b;
    assign z1 = ~(a | b);
    assign z2 = ~a & ~b;
    assign mismatch = (y1 ^ y2) | (z1 ^ z2);    // XOR of two equal signals gives 0
endmodule
