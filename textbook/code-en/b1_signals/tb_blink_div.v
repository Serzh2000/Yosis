// Testbench: with N = 3 the period of led is 8 clocks (4 clocks high, 4 low).
`timescale 1ns/1ps
module tb_blink_div;
    reg clk = 1'b0;
    wire led;
    integer errors = 0;
    integer k;

    blink_div #(.N(3)) dut (.clk(clk), .led(led));

    always #5 clk = ~clk;

    initial begin
        #1;
        for (k = 1; k <= 16; k = k + 1) begin
            @(posedge clk);
            #1;
            // after edge k the counter is k mod 8 and led is its bit 2
            if (led !== k[2]) begin
                errors = errors + 1;
                $display("ERROR: edge %0d led=%b", k, led);
            end
        end
        if (errors == 0) $display("OK: blink_div, period 8 clocks");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
