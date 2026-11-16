// Тестбенч регистра: запись, хранение при we = 0, сброс сильнее записи.
`timescale 1ns/1ps
module tb_reg_ce;
    reg clk = 0, rst = 0, we = 0;
    reg [3:0] d = 0;
    wire [3:0] q;
    integer errors = 0;
    reg_ce #(.W(4)) dut (.clk(clk), .rst(rst), .we(we), .d(d), .q(q));
    always #5 clk = ~clk;

    task step(input r, input w, input [3:0] dd, input [3:0] exp, input [8*28-1:0] what);
        begin
            rst = r; we = w; d = dd; @(posedge clk); #1;
            if (q !== exp) begin errors = errors + 1; $display("ОШИБКА: %0s: q=%h, ждали %h", what, q, exp); end
        end
    endtask

    initial begin
        step(1, 0, 4'h0, 4'h0, "сброс");
        step(0, 1, 4'hA, 4'hA, "запись A");
        step(0, 0, 4'h5, 4'hA, "we=0: хранит A");
        step(0, 1, 4'h7, 4'h7, "запись 7");
        step(1, 1, 4'hF, 4'h0, "сброс и запись: сброс");
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
