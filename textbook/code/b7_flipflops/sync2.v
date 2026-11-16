// Синхронизатор из двух триггеров: приводит асинхронный сигнал (кнопку) к такту clk.
module sync2 (
    input  clk,
    input  async_in,     // сигнал не связан с clk
    output sync_out      // им можно пользоваться внутри схемы
);
    reg ff1 = 1'b0, ff2 = 1'b0;
    always @(posedge clk) begin
        ff1 <= async_in;   // может поймать метастабильность
        ff2 <= ff1;        // за такт успокаивается
    end
    assign sync_out = ff2;
endmodule
