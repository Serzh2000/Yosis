// Три типичные ошибки и их исправления. В каждой паре «плохой» и «хороший» модуль.

// 1) Латч: при en = 0 переменной q ничего не присвоено, и она «помнит» старое значение
module latch_bad (
    input      en, d,
    output reg q
);
    always @(*) begin
        if (en) q = d;
    end
endmodule

module latch_ok (
    input      en, d,
    output reg q
);
    always @(*) begin
        if (en) q = d;
        else    q = 1'b0;            // значение задано при любом условии
    end
endmodule

// 2) Блокирующее присваивание в тактируемом блоке: «обмен» не работает
module swap_bad (
    input      clk, rst,
    output reg a, b
);
    always @(posedge clk) begin
        if (rst) begin a <= 1'b1; b <= 1'b0; end
        else begin
            a = b;                   // a уже изменился
            b = a;                   // и сюда попадает новое a, то есть b = b
        end
    end
endmodule

module swap_ok (
    input      clk, rst,
    output reg a, b
);
    always @(posedge clk) begin
        if (rst) begin a <= 1'b1; b <= 1'b0; end
        else begin
            a <= b;                  // обе правые части берутся «до фронта»
            b <= a;
        end
    end
endmodule
