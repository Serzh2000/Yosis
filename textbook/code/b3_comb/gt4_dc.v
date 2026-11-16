// «Цифра BCD больше четырёх»: коды 10..15 безразличны, это записано значением x.
module gt4_dc (
    input      [3:0] x,
    output reg       y
);
    always @* begin
        case (x)
            4'd0, 4'd1, 4'd2, 4'd3, 4'd4: y = 1'b0;
            4'd5, 4'd6, 4'd7, 4'd8, 4'd9: y = 1'b1;
            default: y = 1'bx;               // 10..15: «неважно», оптимизатор выберет сам
        endcase
    end
endmodule
