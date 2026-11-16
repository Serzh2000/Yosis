// Сверка обоих мультиплексоров с индексацией d[s] для всех 64 комбинаций.
`timescale 1ns/1ps
module tb_mux4;
    reg  [3:0] d;
    reg  [1:0] s;
    wire y1, y2;
    integer i, bad = 0;
    mux4_tern u1 (.d(d), .s(s), .y(y1));
    mux4_case u2 (.d(d), .s(s), .y(y2));
    initial begin
        for (i = 0; i < 64; i = i + 1) begin
            {s, d} = i[5:0];
            #1;
            if (y1 !== d[s] || y2 !== d[s]) bad = bad + 1;
        end
        if (bad == 0) $display("mux4: OK"); else $display("mux4: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
