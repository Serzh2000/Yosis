// Сброс синхронный и асинхронный: что видно между фронтами.
`timescale 1ns/1ps
module tb_dff_rst;
    reg clk = 0, rst = 0, d = 1;
    wire qs, qa;
    integer errors = 0;
    dff_rst_sync  s (.clk(clk), .rst(rst), .d(d), .q(qs));
    dff_rst_async a (.clk(clk), .rst(rst), .d(d), .q(qa));
    always #5 clk = ~clk;

    initial begin
        rst = 1; @(posedge clk); #1; rst = 0;       // начальный сброс
        @(posedge clk); #1;                          // d = 1 записана
        if (qs !== 1'b1 || qa !== 1'b1) begin errors = errors + 1; $display("ОШИБКА: запись d=1"); end
        #1 rst = 1; #1;                              // сброс между фронтами
        if (qs !== 1'b1) begin errors = errors + 1; $display("ОШИБКА: синхронный сброс сработал без фронта"); end
        if (qa !== 1'b0) begin errors = errors + 1; $display("ОШИБКА: асинхронный сброс не сработал сразу"); end
        @(posedge clk); #1;
        if (qs !== 1'b0) begin errors = errors + 1; $display("ОШИБКА: синхронный сброс не сработал по фронту"); end
        rst = 0;
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
