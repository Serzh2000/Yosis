`timescale 1ns/1ps
// Decoder testbench: two 2->4 and two 3->8 descriptions are compared with the reference "a one at position a".
module tb_dec;
    reg  [2:0] a3;
    reg        en;
    wire [3:0] y_as, y_cs;
    wire [7:0] y_sh, y_cd;
    reg  [7:0] exp8;
    integer i, bad = 0;
    dec2to4_assign  u1 (.a(a3[1:0]), .en(en), .y(y_as));
    dec2to4_case    u2 (.a(a3[1:0]), .en(en), .y(y_cs));
    dec3to8         u3 (.a(a3), .en(en), .y(y_sh));
    dec3to8_cascade u4 (.a(a3), .en(en), .y(y_cd));
    initial begin
        for (i = 0; i < 16; i = i + 1) begin
            {en, a3} = i; #1;
            exp8 = en ? (8'd1 << a3) : 8'd0;
            if (y_as !== (en ? (4'd1 << a3[1:0]) : 4'd0)) bad = bad + 1;
            if (y_cs !== (en ? (4'd1 << a3[1:0]) : 4'd0)) bad = bad + 1;
            if (y_sh !== exp8) bad = bad + 1;
            if (y_cd !== exp8) bad = bad + 1;
        end
        if (bad == 0) $display("dec: OK"); else $display("dec: ERRORS %0d", bad);
        $finish;
    end
endmodule
