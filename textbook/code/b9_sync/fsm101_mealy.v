// Тот же детектор 101 как автомат Мили: выход зависит и от входа, поэтому единица
// поднимается в том же такте, где пришёл последний бит (на такт раньше, чем у автомата Мура).
module fsm101_mealy (
    input  clk,
    input  rst,
    input  x,
    output y
);
    localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2;   // три состояния: S3 не нужно
    reg [1:0] state, next;

    always @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    always @* begin
        case (state)
            S0:      next = x ? S1 : S0;
            S1:      next = x ? S1 : S2;
            S2:      next = x ? S1 : S0;       // после 101 последняя 1 начинает новую тройку
            default: next = S0;
        endcase
    end

    assign y = (state == S2) && x;             // Мили: состояние И вход
endmodule
