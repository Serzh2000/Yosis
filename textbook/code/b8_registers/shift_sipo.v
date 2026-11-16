// Сдвиговый регистр «последовательный вход -> параллельный выход» (рис. «Четырёхразрядный сдвиговый регистр»).
// Новый бит din входит справа (младший разряд), содержимое сдвигается влево.
module shift_sipo #(parameter W = 4) (
    input          clk,
    input          rst,
    input          din,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst) q <= {W{1'b0}};
        else     q <= {q[W-2:0], din};   // склейка: отбросили старший, дописали din
    end
endmodule
