// D-триггер с СИНХРОННЫМ сбросом: rst действует только по фронту clk.
module dff_rst_sync (
    input      clk,
    input      rst,    // 1 = сбросить
    input      d,
    output reg q
);
    always @(posedge clk) begin
        if (rst) q <= 1'b0;   // сброс сильнее записи
        else     q <= d;
    end
endmodule
