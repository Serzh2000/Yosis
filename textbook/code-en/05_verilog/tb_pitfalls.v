// Shows the mistakes in simulation: the latch remembers, the blocking "swap" corrupts the value.
`timescale 1ns/1ps
module tb_pitfalls;
    reg  clk = 0, rst = 1, en = 0, d = 0;
    wire qb, qo, ab, bb, ao, bo;
    integer bad = 0;
    latch_bad l1 (.en(en), .d(d), .q(qb));
    latch_ok  l2 (.en(en), .d(d), .q(qo));
    swap_bad  s1 (.clk(clk), .rst(rst), .a(ab), .b(bb));
    swap_ok   s2 (.clk(clk), .rst(rst), .a(ao), .b(bo));
    always #5 clk = ~clk;
    initial begin
        en = 1; d = 1; #1;
        if (qb !== 1'b1 || qo !== 1'b1) bad = bad + 1;
        en = 0; #1;
        if (qb !== 1'b1) bad = bad + 1;          // the latch remembers the one
        if (qo !== 1'b0) bad = bad + 1;          // the fixed one gives 0
        repeat (2) @(posedge clk);
        #1 rst = 0;
        @(posedge clk); #1;
        if (ao !== 1'b0 || bo !== 1'b1) bad = bad + 1;   // swap: (1,0) -> (0,1)
        if (ab !== bb) bad = bad + 1;                    // the wrong one: both are equal
        if (bad == 0) $display("pitfalls: OK"); else $display("pitfalls: ERRORS %0d", bad);
        $finish;
    end
endmodule
