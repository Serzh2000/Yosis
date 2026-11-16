// Example 6. Signed overflow and a saturating adder.
module add4_ovf (
    input  [3:0] a, b,
    output [3:0] s,
    output       c3,         // carry INTO the top bit
    output       c4,         // carry OUT of the top bit
    output       v           // signed overflow
);
    wire [3:0] low = {1'b0, a[2:0]} + {1'b0, b[2:0]};   // the sum of the three low bits with a spare bit
    assign c3 = low[3];                                  // the spare bit is the carry into the top bit
    assign {c4, s[3]} = a[3] + b[3] + c3;
    assign s[2:0] = low[2:0];
    assign v = c3 ^ c4;                      // two operands of one sign, a result of the other
endmodule

module add4_sat (
    input  [3:0] a, b,       // signed numbers in two's complement
    output [3:0] s           // on overflow: +7 (0111) or -8 (1000) instead of a wrong result
);
    wire [3:0] raw = a + b;
    wire       v   = (a[3] == b[3]) && (raw[3] != a[3]);    // operands have equal signs, the result has the other
    assign s = v ? (a[3] ? 4'b1000 : 4'b0111) : raw;        // negatives stop at -8, positives at +7
endmodule
