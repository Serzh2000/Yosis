// Example 4. A four-bit comparator: equal, greater, less (unsigned and signed).
module comparator4 (
    input  [3:0] a, b,
    output       eq,        // a = b
    output       gt,        // a > b (unsigned numbers)
    output       lt,        // a < b (unsigned numbers)
    output       lt_signed  // a < b if the numbers are signed
);
    assign eq = &(a ~^ b);                   // XNOR per bit, then AND of all results (the equality figure)
    assign gt = a > b;
    assign lt = a < b;
    assign lt_signed = $signed(a) < $signed(b);   // 1111 as signed is -1, which is less than 0001
endmodule
