// Example 4. A multiplexer as a universal gate: XOR on a 2:1 and any function of two variables on a 4:1.
module xor_on_mux (
    input  a, b,
    output y
);
    assign y = a ? ~b : b;        // at a = 0 the output is b, at a = 1 it is the inverse of b: that is XOR
endmodule

module mux_lut2 #(
    parameter [3:0] TT = 4'b0110  // the truth table column: bit i is the value at {a,b} = i
) (
    input  a, b,
    output y
);
    assign y = TT[{a, b}];        // the address {a,b} picks one of four constants TT[0]..TT[3]
endmodule

module and_on_lut (input a, b, output y);
    mux_lut2 #(.TT(4'b1000)) u (.a(a), .b(b), .y(y));    // 1000: one only at a = b = 1
endmodule

module or_on_lut (input a, b, output y);
    mux_lut2 #(.TT(4'b1110)) u (.a(a), .b(b), .y(y));    // 1110: one everywhere except 00
endmodule
