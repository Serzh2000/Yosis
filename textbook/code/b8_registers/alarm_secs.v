// Этап проекта «Охранная панель»: счётчик секунд тревоги.
// Считает импульсы tick, пока тревога включена; останавливается на 9; ключ (rst) обнуляет.
module alarm_secs (
    input            clk,
    input            rst,       // ключ охраны
    input            alarm,     // тревога запомнена (глава «Триггеры»)
    input            tick,      // «прошла секунда» (из clk_div или cnt_mod)
    output reg [3:0] secs
);
    always @(posedge clk) begin
        if (rst)                              secs <= 4'd0;
        else if (alarm && tick && secs != 4'd9) secs <= secs + 4'd1;
    end
endmodule
