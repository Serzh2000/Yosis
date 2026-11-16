// Example 2. Adding two BCD digits: ordinary binary addition plus the correction of 6.
module bcd_add (
    input  [3:0] a,        // digit 0..9
    input  [3:0] b,        // digit 0..9
    output [3:0] ones,     // ones digit of the sum
    output       tens      // tens digit of the sum (0 or 1)
);
    wire [4:0] raw = a + b;                   // ordinary binary sum, up to 18
    wire       fix = (raw > 5'd9);            // not a BCD digit?
    wire [4:0] res = fix ? raw + 5'd6 : raw;  // correction: skip the six unused codes
    assign ones = res[3:0];
    assign tens = res[4];
endmodule
