// A period of 13500 clocks, 3375 clocks of one (25 %), the sound stops immediately when en = 0.
`timescale 1ns/1ps
module tb_buzzer;
    reg  clk = 0, en = 0;
    wire out;
    integer k, ones = 0, first_rise = -1, second_rise = -1, bad = 0;
    reg prev = 0;

    buzzer dut (.clk(clk), .en(en), .out(out));
    always #5 clk = ~clk;

    initial begin
        repeat (5) @(posedge clk); #1;
        if (out !== 1'b0) bad = bad + 1;          // silent without en
        en = 1;
        for (k = 0; k < 27000; k = k + 1) begin   // two periods
            #1;
            if (out) ones = ones + 1;
            if (out && !prev) begin
                if (first_rise < 0) first_rise = k; else if (second_rise < 0) second_rise = k;
            end
            prev = out;
            @(posedge clk);
        end
        if (ones !== 6750) bad = bad + 1;                         // 2 * 3375
        if (second_rise - first_rise !== 13500) bad = bad + 1;    // period
        en = 0; #1;
        if (out !== 1'b0) bad = bad + 1;          // alarm cleared: silent at once
        if (bad == 0) $display("buzzer: OK"); else $display("buzzer: ERRORS %0d (ones=%0d, period=%0d)", bad, ones, second_rise - first_rise);
        $finish;
    end
endmodule
