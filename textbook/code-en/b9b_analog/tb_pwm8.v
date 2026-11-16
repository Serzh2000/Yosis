// The share of ones in a period equals level/256 for several levels, including 0 and 255.
`timescale 1ns/1ps
module tb_pwm8;
    reg        clk = 0;
    reg  [7:0] level = 8'd0;
    wire       pwm;
    integer    k, ones, bad = 0;
    reg  [8:0] lv [0:5];
    integer    j;

    pwm8 dut (.clk(clk), .level(level), .pwm(pwm));
    always #5 clk = ~clk;

    initial begin
        lv[0] = 0; lv[1] = 64; lv[2] = 128; lv[3] = 192; lv[4] = 255; lv[5] = 1;
        for (j = 0; j < 6; j = j + 1) begin
            level = lv[j][7:0];
            repeat (512) @(posedge clk);          // two periods: the new level takes effect
            ones = 0;
            for (k = 0; k < 256; k = k + 1) begin // count one full period
                @(posedge clk); #1;
                if (pwm) ones = ones + 1;
            end
            if (ones !== lv[j]) begin
                bad = bad + 1;
                $display("level=%0d: ones %0d", lv[j], ones);
            end
        end
        if (bad == 0) $display("pwm8: OK"); else $display("pwm8: ERRORS %0d", bad);
        $finish;
    end
endmodule
