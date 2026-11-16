// 101 detector testbench: the input 1010110010 gives two found triples (with overlap).
// The Moore output lags the Mealy output by one cycle.
`timescale 1ns/1ps
module tb_fsm101;
    reg clk = 0, rst = 1, x = 0;
    wire ym, yl;
    reg [9:0] bits = 10'b1010110010;
    integer errors = 0, i, cnt_moore = 0, cnt_mealy = 0;
    reg ml_prev = 0;
    fsm101        moore (.clk(clk), .rst(rst), .x(x), .y(ym));
    fsm101_mealy  mealy (.clk(clk), .rst(rst), .x(x), .y(yl));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        for (i = 9; i >= -1; i = i - 1) begin
            x = (i >= 0) ? bits[i] : 1'b0;       // after the tenth bit apply one more zero
            #2;                                  // the combinational Mealy output has settled
            if (yl) cnt_mealy = cnt_mealy + 1;
            // Moore: the one must be exactly one cycle later than Mealy
            if (ym !== ml_prev) begin errors = errors + 1; $display("ERROR: Moore and Mealy differ by other than one cycle, i=%0d", i); end
            ml_prev = yl;
            if (ym) cnt_moore = cnt_moore + 1;
            @(posedge clk); #1;
        end
        if (cnt_mealy !== 2) begin errors = errors + 1; $display("ERROR: Mealy found %0d triples, expected 2", cnt_mealy); end
        if (cnt_moore !== 2) begin errors = errors + 1; $display("ERROR: Moore found %0d triples, expected 2", cnt_moore); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
