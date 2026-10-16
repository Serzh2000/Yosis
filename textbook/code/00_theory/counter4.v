// Синхронный четырёхразрядный двоичный счётчик (глава «Регистры и счётчики»).
module counter4 (
    input            clk,
    input            rst,    // синхронный сброс
    input            en,     // разрешение счёта
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= 4'd0;
        else if (en) q <= q + 4'd1;
    end
endmodule
