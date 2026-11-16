`timescale 1ns/1ps
module tb_debounce;
    reg clk = 0, in = 0;
    wire out;
    integer bad = 0;
    debounce #(.N(4)) dut (.clk(clk), .in(in), .out(out));
    always #5 clk = ~clk;
    initial begin
        repeat (4) @(posedge clk);
        // bounce: the input jumps 1-0-1-0-1, then stays at 1
        in = 1; #12 in = 0; #8 in = 1; #14 in = 0; #6 in = 1;
        repeat (3) @(posedge clk);
        if (out !== 1'b0) bad = bad + 1;      // until it settles, the output does not change
        repeat (12) @(posedge clk); #1;
        if (out !== 1'b1) bad = bad + 1;      // 1 has been held for a long time
        in = 0; repeat (12) @(posedge clk); #1;
        if (out !== 1'b0) bad = bad + 1;
        if (bad == 0) $display("debounce: OK"); else $display("debounce: ERRORS %0d", bad);
        $finish;
    end
endmodule
