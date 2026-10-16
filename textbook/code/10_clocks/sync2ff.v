// Пример 10. Синхронизатор из двух триггеров и фильтр дребезга кнопки.
// Сигнал от кнопки не связан с тактовым: он может прийти в любой момент, в том числе в «запретное
// окно» вокруг фронта такта. Первый триггер при этом может войти в метастабильное состояние,
// второй даёт ему целый такт на успокоение.
module sync2ff (
    input  clk,
    input  async_in,        // сигнал из другого тактового домена или с кнопки
    output sync_out         // тот же сигнал, но синхронный с clk и безопасный
);
    (* async_reg = "true" *) reg s1 = 1'b0;
    (* async_reg = "true" *) reg s2 = 1'b0;
    always @(posedge clk) begin
        s1 <= async_in;     // здесь возможна метастабильность
        s2 <= s1;           // сюда она уже не доходит
    end
    assign sync_out = s2;
endmodule

// Фильтр дребезга: принимаем новое значение только если оно держится N тактов подряд
module debounce #(
    parameter integer N = 4
) (
    input  clk,
    input  in,
    output reg out = 1'b0
);
    wire s;
    sync2ff u_sync (.clk(clk), .async_in(in), .sync_out(s));

    reg [15:0] cnt = 0;
    always @(posedge clk) begin
        if (s == out) cnt <= 0;                   // ничего не меняется: счёт сброшен
        else if (cnt == N - 1) begin out <= s; cnt <= 0; end
        else cnt <= cnt + 16'd1;
    end
endmodule
