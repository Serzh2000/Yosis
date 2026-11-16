// Тестбенч триггера с разрешением: при en = 0 выход не меняется, как бы ни менялся d.
`timescale 1ns/1ps
module tb_dff_en;
    reg clk = 0, en = 0, d = 0;
    wire q;
    integer errors = 0;
    dff_en dut (.clk(clk), .en(en), .d(d), .q(q));
    always #5 clk = ~clk;

    initial begin
        d = 1; en = 0; @(posedge clk); #1;
        if (q !== 1'b0) begin errors = errors + 1; $display("ОШИБКА: en=0, а q изменился"); end
        en = 1; @(posedge clk); #1;
        if (q !== 1'b1) begin errors = errors + 1; $display("ОШИБКА: en=1, q должен стать 1"); end
        en = 0; d = 0; @(posedge clk); #1;
        if (q !== 1'b1) begin errors = errors + 1; $display("ОШИБКА: при en=0 q должен хранить 1"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
