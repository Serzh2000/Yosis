// То же через casez: знак ? значит «любое значение», строки проверяются сверху вниз.
module prio4_casez (
    input      [3:0] x,
    output reg [1:0] y,
    output reg       v
);
    always @* begin
        v = 1'b1;
        casez (x)
            4'b1???: y = 2'd3;
            4'b01??: y = 2'd2;
            4'b001?: y = 2'd1;
            4'b0001: y = 2'd0;
            default: begin y = 2'd0; v = 1'b0; end
        endcase
    end
endmodule
