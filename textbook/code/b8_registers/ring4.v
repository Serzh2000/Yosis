// Кольцевой регистр: единица бежит по кругу («бегущий огонь» на четырёх светодиодах).
module ring4 (
    input        clk,
    input        rst,
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst) q <= 4'b0001;               // начальное состояние ОБЯЗАТЕЛЬНО ненулевое
        else     q <= {q[2:0], q[3]};        // старший разряд возвращается в младший
    end
endmodule
