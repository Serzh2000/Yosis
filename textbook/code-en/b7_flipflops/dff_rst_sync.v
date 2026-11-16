// D flip-flop with a SYNCHRONOUS reset: rst acts only at the clk edge.
module dff_rst_sync (
    input      clk,
    input      rst,    // 1 = reset
    input      d,
    output reg q
);
    always @(posedge clk) begin
        if (rst) q <= 1'b0;   // reset wins over write
        else     q <= d;
    end
endmodule
