// Example 1. A half adder and a full adder (the full one from two half adders and an OR).
module half_adder (
    input  a, b,
    output s,         // sum
    output c          // carry
);
    assign s = a ^ b;
    assign c = a & b;
endmodule

module full_adder (
    input  a, b, cin,
    output s,         // sum
    output cout       // carry into the next bit
);
    wire s1, c1, c2;
    half_adder h1 (.a(a),  .b(b),   .s(s1), .c(c1));    // the first half adder: a + b
    half_adder h2 (.a(s1), .b(cin), .s(s),  .c(c2));    // the second adds the incoming carry
    assign cout = c1 | c2;                              // the carry comes from one of the two
endmodule
