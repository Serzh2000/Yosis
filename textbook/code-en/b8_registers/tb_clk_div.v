// Divider testbench: instead of 13,500,000 take N = 4. A tick every 4 cycles, the period of out is 8 cycles.
`timescale 1ns/1ps
module tb_clk_div;
    reg clk = 0;
    wire out, tick;
    integer errors = 0, i, last = -1, n_ticks = 0, edges = 0;
    reg prev_out = 0;
    clk_div #(.N(4)) dut (.clk(clk), .out(out), .tick(tick));
    always #5 clk = ~clk;

    always @(posedge clk) begin
        i = i + 1;
        if (tick) begin
            n_ticks = n_ticks + 1;
            if (last >= 0 && i - last !== 4) begin errors = errors + 1; $display("ERROR: %0d cycles between ticks", i - last); end
            last = i;
        end
        if (out && !prev_out) edges = edges + 1;
        prev_out = out;
    end

    initial begin
        i = 0;
        repeat (40) @(posedge clk);
        #1;
        if (n_ticks < 9 || n_ticks > 10) begin errors = errors + 1; $display("ERROR: tick %0d times in 40 cycles", n_ticks); end
        if (edges < 4 || edges > 6) begin errors = errors + 1; $display("ERROR: rising edges of out: %0d, expected 5", edges); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
