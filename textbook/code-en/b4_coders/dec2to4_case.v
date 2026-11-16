// The same decoder with case: the truth table "row for row".
module dec2to4_case (
    input      [1:0] a,
    input            en,
    output reg [3:0] y
);
    always @* begin
        if (!en) y = 4'b0000;            // disabled: all outputs are zero
        else begin
            case (a)
                2'd0: y = 4'b0001;
                2'd1: y = 4'b0010;
                2'd2: y = 4'b0100;
                2'd3: y = 4'b1000;
                default: y = 4'b0000;    // safety net for a with x/z; unreachable in synthesis
            endcase
        end
    end
endmodule
