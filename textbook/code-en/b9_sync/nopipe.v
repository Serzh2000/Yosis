// The same y = a*b + c without a pipeline: one long chain of logic between registers.
// Latency is 1 cycle, but the allowed clock frequency is lower (multiplier + adder in one cycle).
module nopipe (
    input            clk,
    input      [3:0] a, b, c,
    output reg [8:0] y
);
    always @(posedge clk) y <= a * b + c;
endmodule
