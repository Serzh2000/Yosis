// D flip-flop with an ASYNCHRONOUS reset: rst acts at once, without waiting for an edge.
module dff_rst_async (
    input      clk,
    input      rst,
    input      d,
    output reg q
);
    always @(posedge clk or posedge rst) begin   // sensitivity list: both clk and rst
        if (rst) q <= 1'b0;
        else     q <= d;
    end
endmodule
