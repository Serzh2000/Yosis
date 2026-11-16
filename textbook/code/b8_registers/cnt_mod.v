// Счётчик по модулю N: считает 0, 1, ..., N-1 и возвращается в 0.
// tc (terminal count) — импульс длиной в такт на числе N-1: ровно раз в N тактов.
module cnt_mod #(parameter N = 10, parameter W = 4) (
    input          clk,
    input          rst,
    output reg [W-1:0] q,
    output         tc
);
    assign tc = (q == N - 1);            // сравниваем с N-1, а не с N!
    always @(posedge clk) begin
        if (rst || tc) q <= {W{1'b0}};   // возврат в 0 после N-1
        else           q <= q + 1'b1;
    end
endmodule
