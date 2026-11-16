`timescale 1ns/1ps
// Тестбенч к образцам ответов: prio8_casez, seg7_hex и zone_display (таблица проверки из главы).
module tb_samples;
    reg  [7:0] x8;
    wire [2:0] y8;
    wire       v8;
    reg  [3:0] h;
    wire [6:0] sh;
    reg  [3:0] z;
    wire [6:0] sz;
    integer i, k, bad = 0;
    reg [2:0] e;
    prio8_casez u1 (.x(x8), .y(y8), .v(v8));
    seg7_hex    u2 (.x(h), .seg(sh));
    zone_display u3 (.z(z), .seg(sz));
    initial begin
        for (i = 0; i < 256; i = i + 1) begin
            x8 = i; #1;
            e = 0;
            for (k = 0; k < 8; k = k + 1) if (x8[k]) e = k;      // последний подходящий = старший
            if (y8 !== e || v8 !== (x8 != 0)) bad = bad + 1;
        end
        h = 4'hA; #1; if (sh !== 7'b1110111) bad = bad + 1;
        h = 4'h1; #1; if (sh !== 7'b0000110) bad = bad + 1;
        h = 4'hF; #1; if (sh !== 7'b1110001) bad = bad + 1;
        z = 4'b0000; #1; if (sz !== 7'b0000000) bad = bad + 1;
        z = 4'b0010; #1; if (sz !== 7'b0000110) bad = bad + 1;
        z = 4'b0100; #1; if (sz !== 7'b1011011) bad = bad + 1;
        z = 4'b1000; #1; if (sz !== 7'b1001111) bad = bad + 1;
        z = 4'b0110; #1; if (sz !== 7'b1011011) bad = bad + 1;
        z = 4'b1010; #1; if (sz !== 7'b1001111) bad = bad + 1;
        if (bad == 0) $display("samples: OK"); else $display("samples: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
