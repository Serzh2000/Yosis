`timescale 1ns/1ps
// Тестбенч: таблица из главы (a = младший бит) и гашение на кодах 10..15.
module tb_seg7;
    reg  [3:0] x;
    wire [6:0] seg;
    reg  [6:0] t [0:9];
    integer i, bad = 0;
    seg7 dut (.x(x), .seg(seg));
    initial begin
        t[0] = 7'b0111111; t[1] = 7'b0000110; t[2] = 7'b1011011; t[3] = 7'b1001111; t[4] = 7'b1100110;
        t[5] = 7'b1101101; t[6] = 7'b1111101; t[7] = 7'b0000111; t[8] = 7'b1111111; t[9] = 7'b1101111;
        for (i = 0; i < 10; i = i + 1) begin
            x = i; #1;
            if (seg !== t[i]) bad = bad + 1;
        end
        for (i = 10; i < 16; i = i + 1) begin
            x = i; #1;
            if (seg !== 7'b0000000) bad = bad + 1;
        end
        if (bad == 0) $display("seg7: OK"); else $display("seg7: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
