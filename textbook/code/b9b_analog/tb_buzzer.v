// Период 13500 тактов, единица 3375 тактов (25 %), при en = 0 звук прекращается сразу.
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
        if (out !== 1'b0) bad = bad + 1;          // без en тихо
        en = 1;
        for (k = 0; k < 27000; k = k + 1) begin   // два периода
            #1;
            if (out) ones = ones + 1;
            if (out && !prev) begin
                if (first_rise < 0) first_rise = k; else if (second_rise < 0) second_rise = k;
            end
            prev = out;
            @(posedge clk);
        end
        if (ones !== 6750) bad = bad + 1;                         // 2 * 3375
        if (second_rise - first_rise !== 13500) bad = bad + 1;    // период
        en = 0; #1;
        if (out !== 1'b0) bad = bad + 1;          // тревога снята: сразу тихо
        if (bad == 0) $display("buzzer: OK"); else $display("buzzer: ОШИБОК %0d (ones=%0d, период=%0d)", bad, ones, second_rise - first_rise);
        $finish;
    end
endmodule
