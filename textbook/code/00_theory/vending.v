// Автомат Мили: автомат по продаже за 15 рублей (глава «Проектирование автоматов»).
// Принимает монеты в 5 и 10 рублей. Выход vend зависит и от состояния, и от входов:
// товар выдаётся в том же такте, когда брошена последняя монета.
module vending (
    input      clk,
    input      rst,
    input      c5,      // монета 5 руб. (на один такт)
    input      c10,     // монета 10 руб.
    output     vend     // выдать товар
);
    localparam S0 = 2'd0, S5 = 2'd1, S10 = 2'd2;   // сколько рублей внесено
    reg [1:0] state, next;

    // Регистр состояния
    always @(posedge clk)
        if (rst) state <= S0;
        else     state <= next;

    // Логика переходов
    always @* begin
        next = state;
        case (state)
            S0:  if (c10) next = S10; else if (c5) next = S5;
            S5:  if (c10) next = S0;  else if (c5) next = S10;
            S10: if (c10 | c5) next = S0;
            default: next = S0;
        endcase
    end

    // Логика выходов Мили: зависит от состояния И от входов
    assign vend = (state == S5  &&  c10)
               || (state == S10 && (c5 | c10));
endmodule
