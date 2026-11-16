// Rising-edge detector: one one-cycle pulse per press.
module edge_det (
    input  clk,
    input  in,
    output pulse
);
    reg prev = 1'b0;
    always @(posedge clk) prev <= in;   // value of in in the previous cycle
    assign pulse = in & ~prev;          // 1 now, 0 before
endmodule
