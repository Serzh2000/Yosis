// T-триггер: при t = 1 меняет состояние по каждому фронту; при t = 0 хранит.
// Если t = 1 всё время, q — меандр с частотой clk/2 (делитель частоты на 2).
module t_ff (
    input      clk,
    input      rst,
    input      t,
    output reg q
);
    always @(posedge clk) begin
        if (rst)    q <= 1'b0;
        else if (t) q <= ~q;       // то же, что D = T xor Q
    end
endmodule
