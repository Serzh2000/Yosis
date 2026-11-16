// Тестбенч T-триггера: при t = 0 хранит, при t = 1 переключается на каждом фронте.
`timescale 1ns/1ps
module tb_t_ff;
    reg clk = 0, rst = 1, t = 0;
    wire q;
    integer errors = 0, i;
    reg prev;
    t_ff dut (.clk(clk), .rst(rst), .t(t), .q(q));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        t = 0; @(posedge clk); #1;
        if (q !== 1'b0) begin errors = errors + 1; $display("ОШИБКА: t=0, q должен хранить 0"); end
        t = 1;
        for (i = 0; i < 6; i = i + 1) begin
            prev = q; @(posedge clk); #1;
            if (q !== ~prev) begin errors = errors + 1; $display("ОШИБКА: q не переключился, такт %0d", i); end
        end
        t = 0; prev = q; @(posedge clk); #1;
        if (q !== prev) begin errors = errors + 1; $display("ОШИБКА: при t=0 q изменился"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
