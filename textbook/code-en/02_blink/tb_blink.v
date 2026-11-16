// Testbench for project 2 (Icarus Verilog).
// To avoid simulating 13.5 million clock cycles, we set a "frequency" of 20 Hz:
// then the LED toggles every 10 clock cycles.
`timescale 1ns/1ps
module tb_blink;
    reg clk = 0;
    always #18.5 clk = ~clk;          // period 37 ns ~ 27 MHz

    wire [5:0] led;

    blink #(.CLK_HZ(20)) dut (.clk(clk), .led(led));

    initial begin
        $dumpfile("tb_blink.vcd");    // file for GTKWave
        $dumpvars(0, tb_blink);
        $monitor("t = %6.1f ns  cnt = %2d  led = %b", $realtime, dut.cnt, led);
        #1000;                        // simulate 1000 ns
        $finish;
    end
endmodule
