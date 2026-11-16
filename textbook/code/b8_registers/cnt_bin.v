// Двоичный синхронный счётчик с разрешением счёта и синхронным сбросом.
// После 1111 переходит в 0000 (модуль 2^W).
module cnt_bin #(parameter W = 4) (
    input          clk,
    input          rst,
    input          en,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (en) q <= q + 1'b1;     // регистр + сумматор «+1» в обратной связи
    end
endmodule
