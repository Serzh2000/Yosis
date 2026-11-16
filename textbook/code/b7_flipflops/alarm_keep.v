// Этап проекта «Охранная панель»: запоминание тревоги.
// sensor = 1 хоть один такт -> alarm остаётся 1, пока не придёт key (сброс сильнее датчика).
module alarm_keep (
    input      clk,
    input      key,       // ключ охраны: сброс
    input      sensor,    // «дверь открыта и охрана включена»
    output reg alarm = 1'b0
);
    always @(posedge clk) begin
        if (key)         alarm <= 1'b0;    // сброс побеждает датчик
        else if (sensor) alarm <= 1'b1;    // запомнить
    end
endmodule
