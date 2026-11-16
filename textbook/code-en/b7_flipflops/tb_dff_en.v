// Enable flip-flop testbench: with en = 0 the output does not change, whatever d does.
`timescale 1ns/1ps
module tb_dff_en;
    reg clk = 0, en = 0, d = 0;
    wire q;
    integer errors = 0;
    dff_en dut (.clk(clk), .en(en), .d(d), .q(q));
    always #5 clk = ~clk;

    initial begin
        d = 1; en = 0; @(posedge clk); #1;
        if (q !== 1'b0) begin errors = errors + 1; $display("ERROR: en=0 but q changed"); end
        en = 1; @(posedge clk); #1;
        if (q !== 1'b1) begin errors = errors + 1; $display("ERROR: en=1, q must become 1"); end
        en = 0; d = 0; @(posedge clk); #1;
        if (q !== 1'b1) begin errors = errors + 1; $display("ERROR: with en=0 q must hold 1"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
