// T flip-flop: with t = 1 it toggles at every edge; with t = 0 it holds.
// If t = 1 all the time, q is a square wave at clk/2 (a divide-by-2 frequency divider).
module t_ff (
    input      clk,
    input      rst,
    input      t,
    output reg q
);
    always @(posedge clk) begin
        if (rst)    q <= 1'b0;
        else if (t) q <= ~q;       // the same as D = T xor Q
    end
endmodule
