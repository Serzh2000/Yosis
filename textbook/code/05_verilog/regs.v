// Регистры из главы про триггеры: с разрешением записи, сдвиговый и делитель частоты.
module reg_en #(parameter W = 8) (
    input              clk,
    input              rst,       // синхронный сброс
    input              en,        // разрешение записи
    input      [W-1:0] d,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (en) q <= d;      // иначе q хранит старое значение
    end
endmodule

module shift4 (
    input            clk,
    input            rst,
    input            din,         // новый бит входит справа
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst) q <= 4'd0;
        else     q <= {q[2:0], din};   // сдвиг влево на один разряд
    end
endmodule

module clk_div #(parameter N = 4) (
    input      clk,
    input      rst,
    output reg tick              // один такт единицы через каждые N тактов
);
    reg [15:0] cnt;
    always @(posedge clk) begin
        if (rst) begin
            cnt  <= 16'd0;
            tick <= 1'b0;
        end else if (cnt == N - 1) begin
            cnt  <= 16'd0;
            tick <= 1'b1;
        end else begin
            cnt  <= cnt + 16'd1;
            tick <= 1'b0;
        end
    end
endmodule
