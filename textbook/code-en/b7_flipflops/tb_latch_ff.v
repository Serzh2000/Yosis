// Latch and flip-flop side by side: while c = clk = 1 the latch follows d, the flip-flop does not.
`timescale 1ns/1ps
module tb_latch_ff;
    reg clk = 0, d = 0;
    wire ql, qf;
    integer errors = 0;
    d_latch l (.c(clk), .d(d), .q(ql));
    d_ff    f (.clk(clk), .d(d), .q(qf));

    task chk(input el, input ef, input [8*28-1:0] what);
        begin
            #1;
            if (ql !== el || qf !== ef) begin
                errors = errors + 1;
                $display("ERROR: %0s: latch=%b (expected %b), flip-flop=%b (expected %b)", what, ql, el, qf, ef);
            end
        end
    endtask

    initial begin
        d = 0; clk = 0; #5;
        clk = 1; chk(1'b0, 1'b0, "edge, d=0");
        d = 1;           chk(1'b1, 1'b0, "d=1 while clk=1");   // the latch passed it, the flip-flop did not
        d = 0;           chk(1'b0, 1'b0, "d=0 while clk=1");
        d = 1;           chk(1'b1, 1'b0, "d=1 again");
        clk = 0; #5;     chk(1'b1, 1'b0, "clk=0: holds");      // the latch froze the 1
        d = 0;           chk(1'b1, 1'b0, "d changes at clk=0");
        d = 1; #5; clk = 1; chk(1'b1, 1'b1, "edge, d=1");      // the flip-flop took d at the edge
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
