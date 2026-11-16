// 4->2 priority encoder with if / else if: the highest active input wins.
module prio4_if (
    input      [3:0] x,
    output reg [1:0] y,   // number of the highest active input
    output reg       v    // valid: at least one input is active
);
    always @* begin
        v = 1'b1;
        if      (x[3]) y = 2'd3;
        else if (x[2]) y = 2'd2;
        else if (x[1]) y = 2'd1;
        else if (x[0]) y = 2'd0;
        else begin
            y = 2'd0;
            v = 1'b0;                  // nothing is pressed
        end
    end
endmodule
