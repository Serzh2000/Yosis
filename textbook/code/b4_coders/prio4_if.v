// Приоритетный шифратор 4->2 через if / else if: старший активный вход побеждает.
module prio4_if (
    input      [3:0] x,
    output reg [1:0] y,   // номер старшего активного входа
    output reg       v    // valid: хотя бы один вход активен
);
    always @* begin
        v = 1'b1;
        if      (x[3]) y = 2'd3;
        else if (x[2]) y = 2'd2;
        else if (x[1]) y = 2'd1;
        else if (x[0]) y = 2'd0;
        else begin
            y = 2'd0;
            v = 1'b0;                  // ничего не нажато
        end
    end
endmodule
