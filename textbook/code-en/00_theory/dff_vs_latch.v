// A level-sensitive latch and an edge-triggered flip-flop side by side: chapter "Flip-Flops".
module dff_vs_latch (
    input  clk,
    input  d,
    output reg q_latch,   // transparent while clk = 1
    output reg q_ff       // stores d only at the clk edge
);
    always @*              if (clk)  q_latch = d;
    always @(posedge clk)  q_ff <= d;
endmodule
