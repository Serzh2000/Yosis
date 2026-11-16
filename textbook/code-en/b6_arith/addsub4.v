// Example 3. An adder-subtractor: at sub = 1 it computes a - b as a + ~b + 1.
module addsub4 (
    input  [3:0] a, b,
    input        sub,                 // 0 = add, 1 = subtract
    output [3:0] s,
    output       cout                 // carry out of the top bit
);
    wire [3:0] bx = b ^ {4{sub}};     // four XORs: at sub = 1 they invert every bit of b
    assign {cout, s} = a + bx + sub;  // sub also goes to the carry input: that is the "+1"
endmodule
