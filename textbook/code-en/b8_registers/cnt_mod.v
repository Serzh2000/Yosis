// Modulo-N counter: counts 0, 1, ..., N-1 and returns to 0.
// tc (terminal count) is a one-cycle pulse at the value N-1: exactly once every N cycles.
module cnt_mod #(parameter N = 10, parameter W = 4) (
    input          clk,
    input          rst,
    output reg [W-1:0] q,
    output         tc
);
    assign tc = (q == N - 1);            // compare with N-1, not with N!
    always @(posedge clk) begin
        if (rst || tc) q <= {W{1'b0}};   // back to 0 after N-1
        else           q <= q + 1'b1;
    end
endmodule
