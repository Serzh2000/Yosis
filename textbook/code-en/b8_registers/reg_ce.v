// Storage register: W flip-flops with a common clock, a write enable and a synchronous reset.
module reg_ce #(parameter W = 4) (
    input              clk,
    input              rst,    // 1 = clear (beats write)
    input              we,     // 1 = store d at the edge
    input      [W-1:0] d,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (we) q <= d;        // with we = 0 the register holds
    end
endmodule
