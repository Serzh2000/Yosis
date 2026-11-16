// Pipeline testbench: a new triple every cycle; the result lags by 2 cycles (pipe2) and by 1 cycle (nopipe).
`timescale 1ns/1ps
module tb_pipe;
    reg clk = 0;
    reg [3:0] a = 0, b = 0, c = 0;
    wire [8:0] yp, yn;
    integer errors = 0, i;
    reg [8:0] exp_hist [0:31];
    pipe2  p (.clk(clk), .a(a), .b(b), .c(c), .y(yp));
    nopipe n (.clk(clk), .a(a), .b(b), .c(c), .y(yn));
    always #5 clk = ~clk;

    initial begin
        // cycle i: apply a=i+1, b=i+2, c=i+3 and remember the right answer
        for (i = 0; i < 12; i = i + 1) begin
            a = i + 1; b = i + 2; c = i + 3;
            exp_hist[i] = a * b + c;
            @(posedge clk); #1;
            // after edge i: nopipe already has the result of triple i, pipe2 of triple i-1
            if (yn !== exp_hist[i]) begin errors = errors + 1; $display("ERROR: nopipe, cycle %0d: %0d", i, yn); end
            if (i >= 1 && yp !== exp_hist[i-1]) begin errors = errors + 1; $display("ERROR: pipe2, cycle %0d: %0d, expected %0d", i, yp, exp_hist[i-1]); end
        end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
