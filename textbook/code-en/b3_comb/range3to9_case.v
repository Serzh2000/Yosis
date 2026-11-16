// Range 3..9 as a case table: value ranges in one branch, don't-care codes in default.
module range3to9_case (
    input      [3:0] x,
    output reg       y
);
    always @* begin
        case (x)
            4'd0, 4'd1, 4'd2:                       y = 1'b0;
            4'd3, 4'd4, 4'd5, 4'd6, 4'd7, 4'd8, 4'd9: y = 1'b1;
            default:                                y = 1'bx;   // 10..15 never occur
        endcase
    end
endmodule
