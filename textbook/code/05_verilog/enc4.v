// Приоритетный шифратор 4 -> 2: выигрывает старший активный вход. Три записи одной функции.
module enc4_if (
    input      [3:0] d,
    output reg [1:0] y,
    output reg       valid       // 1, если активен хотя бы один вход
);
    always @(*) begin
        valid = 1'b1;
        if      (d[3]) y = 2'd3;
        else if (d[2]) y = 2'd2;
        else if (d[1]) y = 2'd1;
        else if (d[0]) y = 2'd0;
        else begin y = 2'd0; valid = 1'b0; end
    end
endmodule

module enc4_casez (
    input      [3:0] d,
    output reg [1:0] y,
    output reg       valid
);
    always @(*) begin
        valid = 1'b1;
        casez (d)                // ? значит «любое значение»; порядок строк задаёт приоритет
            4'b1???: y = 2'd3;
            4'b01??: y = 2'd2;
            4'b001?: y = 2'd1;
            4'b0001: y = 2'd0;
            default: begin y = 2'd0; valid = 1'b0; end
        endcase
    end
endmodule

// Тот же шифратор из вентилей: сравните схему на вкладке RTL.
module enc4_gates (
    input  [3:0] d,
    output [1:0] y,
    output       valid
);
    assign y[1]  = d[3] | d[2];
    assign y[0]  = d[3] | (~d[2] & d[1]);
    assign valid = |d;
endmodule
