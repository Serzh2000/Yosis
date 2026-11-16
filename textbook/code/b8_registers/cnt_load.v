// Счётчик с параллельной загрузкой: приоритет сброс > загрузка > счёт.
module cnt_load (
    input            clk,
    input            rst,
    input            load,     // 1 = записать d вместо счёта
    input            en,       // 1 = считать
    input      [3:0] d,
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst)       q <= 4'd0;
        else if (load) q <= d;
        else if (en)   q <= q + 4'd1;
    end
endmodule
