// Synchronous 4-bit binary counter (chapter "Registers and Counters").
module counter4 (
    input            clk,
    input            rst,    // synchronous reset
    input            en,     // count enable
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= 4'd0;
        else if (en) q <= q + 4'd1;
    end
endmodule
