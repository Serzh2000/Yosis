// Четырёхразрядный LFSR с обратной связью x^4 + x^3 + 1: проходит 15 ненулевых состояний.
module lfsr4 (
    input        clk,
    input        rst,
    output reg [3:0] q
);
    wire fb = q[3] ^ q[2];                   // отводы: старшие два разряда
    always @(posedge clk) begin
        if (rst) q <= 4'b0001;               // нельзя 0000: из него LFSR не выйдет
        else     q <= {q[2:0], fb};
    end
endmodule
