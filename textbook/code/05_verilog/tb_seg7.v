// Проверка нескольких цифр и общего свойства: у «1» горят два сегмента, у «8» все семь.
`timescale 1ns/1ps
module tb_seg7;
    reg  [3:0] digit;
    wire [6:0] seg;
    integer bad = 0;
    seg7 dut (.digit(digit), .seg(seg));
    initial begin
        digit = 4'd0; #1; if (seg !== 7'h3F) bad = bad + 1;
        digit = 4'd1; #1; if ($countones(seg) !== 2) bad = bad + 1;
        digit = 4'd8; #1; if (seg !== 7'h7F) bad = bad + 1;
        digit = 4'd9; #1; if (seg !== 7'h6F) bad = bad + 1;
        digit = 4'hF; #1; if (seg !== 7'h71) bad = bad + 1;
        if (bad == 0) $display("seg7: OK"); else $display("seg7: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
