// Counter testbench: binary (15 -> 0), modulo 6, with load, up/down.
`timescale 1ns/1ps
module tb_counters;
    reg clk = 0, rst = 1, en = 0, load = 0, up = 1;
    reg [3:0] d = 0;
    wire [3:0] qb, qm, ql, qu;
    wire tc;
    integer errors = 0, i, ticks;
    cnt_bin #(.W(4))        b (.clk(clk), .rst(rst), .en(en), .q(qb));
    cnt_mod #(.N(6), .W(4)) m (.clk(clk), .rst(rst), .q(qm), .tc(tc));
    cnt_load                l (.clk(clk), .rst(rst), .load(load), .en(en), .d(d), .q(ql));
    cnt_updown              u (.clk(clk), .rst(rst), .en(en), .up(up), .q(qu));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0; en = 1;
        // binary: after 15 comes 0 again
        for (i = 1; i <= 16; i = i + 1) begin
            @(posedge clk); #1;
            if (qb !== (i % 16)) begin errors = errors + 1; $display("ERROR: cnt_bin at step %0d: %0d", i, qb); end
        end
        // modulo 6: values 0..5, never 6; a tc pulse every 6 cycles
        rst = 1; @(posedge clk); #1 rst = 0;
        ticks = 0;
        for (i = 0; i < 24; i = i + 1) begin
            if (qm > 4'd5) begin errors = errors + 1; $display("ERROR: cnt_mod left its modulus: %0d", qm); end
            if (tc) ticks = ticks + 1;
            @(posedge clk); #1;
        end
        if (ticks !== 4) begin errors = errors + 1; $display("ERROR: tc %0d times in 24 cycles, expected 4", ticks); end
        // load: load beats counting
        rst = 1; @(posedge clk); #1 rst = 0;
        load = 1; d = 4'd9; @(posedge clk); #1; load = 0;
        if (ql !== 4'd9) begin errors = errors + 1; $display("ERROR: loaded 9, but q=%0d", ql); end
        @(posedge clk); #1;
        if (ql !== 4'd10) begin errors = errors + 1; $display("ERROR: counting after load: %0d", ql); end
        // up/down: up = 1 now; go up to 3, down to 0, then below zero
        rst = 1; @(posedge clk); #1 rst = 0; up = 1;
        repeat (3) begin @(posedge clk); #1; end
        if (qu !== 4'd3) begin errors = errors + 1; $display("ERROR: up to 3: %0d", qu); end
        up = 0; repeat (3) begin @(posedge clk); #1; end
        if (qu !== 4'd0) begin errors = errors + 1; $display("ERROR: down to 0: %0d", qu); end
        @(posedge clk); #1;
        if (qu !== 4'd15) begin errors = errors + 1; $display("ERROR: 0 - 1 must give 15: %0d", qu); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
