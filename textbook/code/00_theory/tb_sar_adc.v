`timescale 1ns/1ps
module tb_sar_adc;
    reg clk = 0, start = 0;
    reg [7:0] vin;
    wire [7:0] dac, result;
    wire done;
    wire cmp = (vin >= dac);              // модель компаратора
    integer i, bad = 0;
    sar_adc dut (.clk(clk), .start(start), .cmp(cmp), .dac(dac), .result(result), .done(done));
    always #5 clk = ~clk;

    initial begin
        for (i = 0; i < 256; i = i + 7) begin
            vin = i;
            @(posedge clk); #1 start = 1;
            @(posedge clk); #1 start = 0;
            wait (done);
            @(posedge clk); #1;
            if (result !== vin) begin bad = bad + 1; $display("vin=%0d result=%0d", vin, result); end
        end
        if (bad == 0) $display("sar_adc: OK"); else $display("sar_adc: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
