// "BCD digit greater than four": codes 10..15 are don't-cares, written as the value x.
module gt4_dc (
    input      [3:0] x,
    output reg       y
);
    always @* begin
        case (x)
            4'd0, 4'd1, 4'd2, 4'd3, 4'd4: y = 1'b0;
            4'd5, 4'd6, 4'd7, 4'd8, 4'd9: y = 1'b1;
            default: y = 1'bx;               // 10..15: "don't care", the optimizer picks
        endcase
    end
endmodule
