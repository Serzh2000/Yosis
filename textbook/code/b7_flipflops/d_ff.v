// D-триггер: запоминает d только в момент переднего фронта clk.
module d_ff (
    input      clk,
    input      d,
    output reg q
);
    always @(posedge clk) begin
        q <= d;              // неблокирующее присваивание: «q получит d после фронта»
    end
endmodule
