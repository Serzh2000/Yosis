// D flip-flop: stores d only at the rising edge of clk.
module d_ff (
    input      clk,
    input      d,
    output reg q
);
    always @(posedge clk) begin
        q <= d;              // non-blocking assignment: "q gets d after the edge"
    end
endmodule
