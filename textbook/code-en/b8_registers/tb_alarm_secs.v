// Four project checks: growth, stop at 9, stop when the alarm is cleared, clear by the key.
`timescale 1ns/1ps
module tb_alarm_secs;
    reg clk = 0, rst = 1, alarm = 0, tick = 0;
    wire [3:0] secs;
    integer errors = 0, i;
    alarm_secs dut (.clk(clk), .rst(rst), .alarm(alarm), .tick(tick), .secs(secs));
    always #5 clk = ~clk;

    task one_second;
        begin tick = 1; @(posedge clk); #1; tick = 0; @(posedge clk); #1; end
    endtask

    initial begin
        @(posedge clk); #1 rst = 0;
        one_second;                                   // no alarm
        if (secs !== 4'd0) begin errors = errors + 1; $display("ERROR: counting without an alarm: %0d", secs); end
        alarm = 1;
        one_second; one_second; one_second;
        if (secs !== 4'd3) begin errors = errors + 1; $display("ERROR: growth to 3: %0d", secs); end
        for (i = 0; i < 12; i = i + 1) one_second;
        if (secs !== 4'd9) begin errors = errors + 1; $display("ERROR: stop at 9: %0d", secs); end
        rst = 1; @(posedge clk); #1 rst = 0;
        if (secs !== 4'd0) begin errors = errors + 1; $display("ERROR: the key did not clear: %0d", secs); end
        one_second; one_second; alarm = 0; one_second;
        if (secs !== 4'd2) begin errors = errors + 1; $display("ERROR: counting with the alarm cleared: %0d", secs); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
