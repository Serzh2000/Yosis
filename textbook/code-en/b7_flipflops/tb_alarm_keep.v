// Testbench for "alarm with memory".
`timescale 1ns/1ps
module tb_alarm_keep;
    reg clk = 0, key = 0, sensor = 0;
    wire alarm;
    integer errors = 0;
    alarm_keep dut (.clk(clk), .key(key), .sensor(sensor), .alarm(alarm));
    always #5 clk = ~clk;

    task step(input k, input s, input exp, input [8*32-1:0] what);
        begin
            key = k; sensor = s; @(posedge clk); #1;
            if (alarm !== exp) begin errors = errors + 1; $display("ERROR: %0s: alarm=%b", what, alarm); end
        end
    endtask

    initial begin
        step(0, 0, 1'b0, "quiet");
        step(0, 1, 1'b1, "door opened");
        step(0, 0, 1'b1, "door closed: remembered");
        step(0, 0, 1'b1, "still remembered");
        step(1, 0, 1'b0, "key reset it");
        step(1, 1, 1'b0, "key and sensor: key wins");
        step(0, 1, 1'b1, "sensor again");
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
