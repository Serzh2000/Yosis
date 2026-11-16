// For all 64 levels the number of ones in any 64 clocks equals the level; the ones do not come in a burst.
`timescale 1ns/1ps
module tb_sigma_delta;
    reg        clk = 0;
    reg  [5:0] level = 6'd0;
    wire       bit_out;
    integer    j, k, ones, run, maxrun, bad = 0;

    sigma_delta #(.W(6)) dut (.clk(clk), .level(level), .bit_out(bit_out));
    always #5 clk = ~clk;

    initial begin
        for (j = 0; j < 64; j = j + 1) begin
            level = j[5:0];
            repeat (70) @(posedge clk);
            ones = 0; run = 0; maxrun = 0;
            for (k = 0; k < 64; k = k + 1) begin
                @(posedge clk); #1;
                if (bit_out) begin ones = ones + 1; run = run + 1; if (run > maxrun) maxrun = run; end
                else run = 0;
            end
            if (ones !== j) bad = bad + 1;
            if (j == 32 && maxrun > 1) bad = bad + 1;   // half level: ones alternate with zeros
        end
        if (bad == 0) $display("sigma_delta: OK"); else $display("sigma_delta: ERRORS %0d", bad);
        $finish;
    end
endmodule
