// Testbench: q toggles at every edge, so the period of q is twice the period of clk.
`timescale 1ns/1ps
module tb_clk_div2;
    reg clk = 1'b0;
    wire q;
    integer errors = 0;
    integer n = 0;
    reg prev;

    clk_div2 dut (.clk(clk), .q(q));

    always #5 clk = ~clk;                 // clock period 10 ns

    initial begin
        #1 prev = q;
        repeat (8) begin
            @(posedge clk);
            #1;                           // let q settle
            if (q === prev) begin
                errors = errors + 1;
                $display("ERROR: q did not toggle at edge %0d", n);
            end
            prev = q;
            n = n + 1;
        end
        if (errors == 0) $display("OK: clk_div2, q toggles at every edge");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
