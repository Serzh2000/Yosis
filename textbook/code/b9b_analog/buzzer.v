// Зуммер тревоги: тон с заданным периодом и скважностью; без разрешения выход равен нулю.
// При 27 МГц период 13500 тактов даёт 2 кГц, а 3375 тактов единицы --- скважность 25 %.
module buzzer #(
    parameter PERIOD = 13500,    // тактов в периоде тона
    parameter HIGH   = 3375      // из них единица
) (
    input  clk,
    input  en,                   // 1 в состоянии ТРЕВОГА
    output out
);
    reg [13:0] cnt = 14'd0;
    always @(posedge clk) begin
        if (!en || cnt == PERIOD - 1) cnt <= 14'd0;
        else                          cnt <= cnt + 14'd1;
    end
    assign out = en && (cnt < HIGH);
endmodule
