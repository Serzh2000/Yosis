// All 16 input words: the three encoders must give identical y and valid.
`timescale 1ns/1ps
module tb_enc4;
    reg  [3:0] d;
    wire [1:0] y1, y2, y3;
    wire       v1, v2, v3;
    integer i, bad = 0;
    enc4_if    a (.d(d), .y(y1), .valid(v1));
    enc4_casez b (.d(d), .y(y2), .valid(v2));
    enc4_gates c (.d(d), .y(y3), .valid(v3));
    initial begin
        for (i = 0; i < 16; i = i + 1) begin
            d = i[3:0]; #1;
            if (y1 !== y2 || y1 !== y3 || v1 !== v2 || v1 !== v3) bad = bad + 1;
            if (d == 4'b0110 && y1 !== 2'd2) bad = bad + 1;   // the highest one wins
        end
        if (bad == 0) $display("enc4: OK"); else $display("enc4: ERRORS %0d", bad);
        $finish;
    end
endmodule
