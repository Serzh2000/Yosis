// T flip-flop testbench: holds at t = 0, toggles at every edge at t = 1.
`timescale 1ns/1ps
module tb_t_ff;
    reg clk = 0, rst = 1, t = 0;
    wire q;
    integer errors = 0, i;
    reg prev;
    t_ff dut (.clk(clk), .rst(rst), .t(t), .q(q));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        t = 0; @(posedge clk); #1;
        if (q !== 1'b0) begin errors = errors + 1; $display("ERROR: t=0, q must hold 0"); end
        t = 1;
        for (i = 0; i < 6; i = i + 1) begin
            prev = q; @(posedge clk); #1;
            if (q !== ~prev) begin errors = errors + 1; $display("ERROR: q did not toggle, cycle %0d", i); end
        end
        t = 0; prev = q; @(posedge clk); #1;
        if (q !== prev) begin errors = errors + 1; $display("ERROR: q changed at t=0"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
