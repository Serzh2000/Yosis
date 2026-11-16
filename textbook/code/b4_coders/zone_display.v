// Этап проекта «Охранная панель»: четыре датчика зон -> номер старшей сработавшей зоны на индикаторе.
// При z = 0000 индикатор гаснет (вариант со звёздочкой 2).
module zone_display (
    input      [3:0] z,       // z[3] -- самая важная зона
    output reg [6:0] seg      // {g,f,e,d,c,b,a}
);
    reg [1:0] num;            // выход приоритетного шифратора
    reg       v;              // valid

    always @* begin           // 1) приоритетный шифратор
        v = 1'b1;
        casez (z)
            4'b1???: num = 2'd3;
            4'b01??: num = 2'd2;
            4'b001?: num = 2'd1;
            4'b0001: num = 2'd0;
            default: begin num = 2'd0; v = 1'b0; end
        endcase
    end

    always @* begin           // 2) цифра -> сегменты, с гашением при v = 0
        if (!v) seg = 7'b0000000;
        else begin
            case (num)
                2'd0:    seg = 7'b0111111;
                2'd1:    seg = 7'b0000110;
                2'd2:    seg = 7'b1011011;
                default: seg = 7'b1001111;
            endcase
        end
    end
endmodule
