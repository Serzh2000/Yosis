// The three encodings behave identically: the outputs match on every clock.
`timescale 1ns/1ps
module tb_state_enc;
    reg  clk = 0, rst = 1, go = 0;
    wire y1, y2, y3;
    integer k, bad = 0, ones = 0;

    ring_bin    u1 (.clk(clk), .rst(rst), .go(go), .y(y1));
    ring_gray   u2 (.clk(clk), .rst(rst), .go(go), .y(y2));
    ring_onehot u3 (.clk(clk), .rst(rst), .go(go), .y(y3));
    always #5 clk = ~clk;

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        for (k = 0; k < 40; k = k + 1) begin
            go = (k % 3 != 0);                   // not a transition on every clock
            @(posedge clk); #1;
            if (y1 !== y2 || y1 !== y3) bad = bad + 1;
            if (y1) ones = ones + 1;
        end
        if (ones == 0 || ones == 40) bad = bad + 1;   // the output really changes
        if (bad == 0) $display("state_enc: OK"); else $display("state_enc: ERRORS %0d", bad);
        $finish;
    end
endmodule
