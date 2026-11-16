// Тот же дешифратор через case: таблица истинности «строка в строку».
module dec2to4_case (
    input      [1:0] a,
    input            en,
    output reg [3:0] y
);
    always @* begin
        if (!en) y = 4'b0000;            // выключен: все выходы нули
        else begin
            case (a)
                2'd0: y = 4'b0001;
                2'd1: y = 4'b0010;
                2'd2: y = 4'b0100;
                2'd3: y = 4'b1000;
                default: y = 4'b0000;    // страховка для a с x/z; при синтезе недостижима
            endcase
        end
    end
endmodule
