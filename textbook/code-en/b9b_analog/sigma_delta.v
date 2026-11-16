// First-order sigma-delta modulator: a remainder accumulator, the output is one on overflow.
// In 2**W clocks the output is one exactly level times, and the ones are spread evenly over the period.
module sigma_delta #(
    parameter W = 6              // level width, the period is 2**W clocks
) (
    input          clk,
    input  [W-1:0] level,
    output         bit_out
);
    reg [W:0] acc = {(W+1){1'b0}};          // the high bit of acc is the carry of the previous addition
    always @(posedge clk)
        acc <= {1'b0, acc[W-1:0]} + {1'b0, level};   // add the level, the remainder stays
    assign bit_out = acc[W];
endmodule
