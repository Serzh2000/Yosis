// Input filter: the bounce 1-0-1-0-1 does not reach the output, a stable value passes after N clocks.
`timescale 1ns/1ps
module tb_in_filter;
    reg  clk = 0, raw = 0;
    wire clean;
    integer bad = 0;
    in_filter #(.N(6), .INIT(1'b0)) dut (.clk(clk), .raw(raw), .clean(clean));
    always #5 clk = ~clk;
    initial begin
        repeat (4) @(posedge clk);
        raw = 1; #12 raw = 0; #8 raw = 1; #14 raw = 0; #6 raw = 1;   // bounce
        repeat (3) @(posedge clk); #1;
        if (clean !== 1'b0) bad = bad + 1;
        repeat (14) @(posedge clk); #1;
        if (clean !== 1'b1) bad = bad + 1;
        raw = 0; repeat (14) @(posedge clk); #1;
        if (clean !== 1'b0) bad = bad + 1;
        if (bad == 0) $display("in_filter: OK"); else $display("in_filter: ERRORS %0d", bad);
        $finish;
    end
endmodule
