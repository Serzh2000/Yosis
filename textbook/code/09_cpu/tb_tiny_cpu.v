`timescale 1ns/1ps
module tb_tiny_cpu;
    reg clk = 0, rst = 1;
    wire [7:0] out, acc;
    wire [3:0] pc;
    integer n = 0, bad = 0;
    reg [7:0] prev = 8'd0;
    reg [7:0] expected [0:9];
    tiny_cpu dut (.clk(clk), .rst(rst), .out(out), .pc(pc), .acc(acc));
    always #5 clk = ~clk;

    initial begin
        expected[0] = 0; expected[1] = 1; expected[2] = 1; expected[3] = 2; expected[4] = 3;
        expected[5] = 5; expected[6] = 8; expected[7] = 13; expected[8] = 21; expected[9] = 34;
        repeat (3) @(posedge clk); #1 rst = 0;
    end

    // Каждую выполненную команду OUT сверяем с таблицей
    always @(posedge clk) if (!rst && dut.phase && dut.op == 4'd8) begin
        #1;
        if (n < 10) begin
            if (out !== expected[n]) begin bad = bad + 1; $display("OUT #%0d: %0d, ждали %0d", n, out, expected[n]); end
            n = n + 1;
        end
    end

    initial begin
        #5000;
        if (bad == 0 && n >= 10) $display("tiny_cpu: OK, %0d чисел Фибоначчи", n);
        else $display("tiny_cpu: ОШИБОК %0d, чисел %0d", bad, n);
        $finish;
    end
endmodule
