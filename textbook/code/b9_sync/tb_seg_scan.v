// Тестбенч: за 8 тактов выход проходит 8 слов в порядке адресов и возвращается в начало.
`timescale 1ns/1ps
module tb_seg_scan;
    reg clk = 0;
    wire [6:0] seg;
    reg [6:0] want [0:7];
    integer errors = 0, i;
    seg_scan dut (.clk(clk), .seg(seg));
    always #5 clk = ~clk;

    initial begin
        want[0] = 7'h3F; want[1] = 7'h06; want[2] = 7'h5B; want[3] = 7'h4F;
        want[4] = 7'h66; want[5] = 7'h6D; want[6] = 7'h7D; want[7] = 7'h07;
        #1;
        for (i = 0; i < 16; i = i + 1) begin
            if (seg !== want[i % 8]) begin errors = errors + 1; $display("ОШИБКА: такт %0d: seg=%h", i, seg); end
            @(posedge clk); #1;
        end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
