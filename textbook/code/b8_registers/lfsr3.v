// Трёхразрядный LFSR с рис. «LFSR»: q0 <= q1 xor q2, q1 <= q0, q2 <= q1.
// Перебирает все 7 ненулевых состояний. Состояние 000 запретно (из него не выйти).
module lfsr3 (
    input        clk,
    input        rst,
    output reg [2:0] q       // q[0] = q0, q[1] = q1, q[2] = q2
);
    wire fb = q[1] ^ q[2];                   // обратная связь: исключающее ИЛИ отводов
    always @(posedge clk) begin
        if (rst) q <= 3'b001;                // q0 = 1: ненулевое начальное состояние
        else     q <= {q[1], q[0], fb};      // q2<=q1, q1<=q0, q0<=fb
    end
endmodule
