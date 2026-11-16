// Регистр хранения: W триггеров с общим тактом, разрешением записи и синхронным сбросом.
module reg_ce #(parameter W = 4) (
    input              clk,
    input              rst,    // 1 = обнулить (сильнее записи)
    input              we,     // 1 = записать d по фронту
    input      [W-1:0] d,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (we) q <= d;        // при we = 0 регистр хранит
    end
endmodule
