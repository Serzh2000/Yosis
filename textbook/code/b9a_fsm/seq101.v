// Детектор последовательности 1-0-1 с перекрытием: автомат Мили «в три блока».
module seq101 (
    input  clk,
    input  rst,
    input  x,                    // очередной бит, по одному за такт
    output hit                   // 1 в том такте, когда пришёл последний бит
);
    localparam [1:0] S0 = 2'd0,  // ничего полезного не видели
                     S1 = 2'd1,  // видели «1»
                     S10 = 2'd2; // видели «10»

    reg [1:0] state, next;

    // Блок 1. Регистр состояния.
    always @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    // Блок 2. Переходы. Единица всегда может начать новую последовательность (перекрытие).
    always @(*) begin
        next = state;
        case (state)
            S0:      next = x ? S1 : S0;
            S1:      next = x ? S1 : S10;
            S10:     next = x ? S1 : S0;
            default: next = S0;
        endcase
    end

    // Блок 3. Выход Мили: зависит от состояния И от входа x.
    assign hit = (state == S10) && x;
endmodule
