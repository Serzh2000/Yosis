// Model answer to the "complete it" task: an 8->3 priority encoder with casez.
module prio8_casez (
    input      [7:0] x,
    output reg [2:0] y,   // number of the highest active input
    output reg       v    // at least one input is active
);
    always @* begin
        v = 1'b1;
        casez (x)
            8'b1???_????: y = 3'd7;
            8'b01??_????: y = 3'd6;
            8'b001?_????: y = 3'd5;
            8'b0001_????: y = 3'd4;
            8'b0000_1???: y = 3'd3;
            8'b0000_01??: y = 3'd2;
            8'b0000_001?: y = 3'd1;
            8'b0000_0001: y = 3'd0;
            default: begin y = 3'd0; v = 1'b0; end
        endcase
    end
endmodule
