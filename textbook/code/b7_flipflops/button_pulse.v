// Кнопка -> синхронизатор -> детектор фронта: один импульс на нажатие,
// сколько бы тактов кнопка ни была зажата.
module button_pulse (
    input  clk,
    input  btn,        // асинхронная кнопка (1 = нажата)
    output pulse
);
    reg ff1 = 1'b0, ff2 = 1'b0, ff3 = 1'b0;
    always @(posedge clk) begin
        ff1 <= btn;    // синхронизатор, первый триггер
        ff2 <= ff1;    // синхронизатор, второй триггер
        ff3 <= ff2;    // прошлое значение для детектора фронта
    end
    assign pulse = ff2 & ~ff3;
endmodule
