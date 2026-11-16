// 4->2 encoder with case: one-hot code (a single one) -> line number.
module enc4to2 (
    input      [3:0] x,   // x[i] = 1 when line i is active
    output reg [1:0] y    // number of the active line
);
    always @* begin
        case (x)
            4'b0001: y = 2'd0;
            4'b0010: y = 2'd1;
            4'b0100: y = 2'd2;
            4'b1000: y = 2'd3;
            default: y = 2'd0;   // not a one-hot code: a plain encoder has no sensible answer
        endcase
    end
endmodule
