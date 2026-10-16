// Тестбенч для проекта 2 (Icarus Verilog).
// Чтобы не моделировать 13,5 млн тактов, задаём "частоту" 20 Гц:
// тогда светодиод переключается каждые 10 тактов.
`timescale 1ns/1ps
module tb_blink;
    reg clk = 0;
    always #18.5 clk = ~clk;          // период 37 нс ~ 27 МГц

    wire [5:0] led;

    blink #(.CLK_HZ(20)) dut (.clk(clk), .led(led));

    initial begin
        $dumpfile("tb_blink.vcd");    // файл для GTKWave
        $dumpvars(0, tb_blink);
        $monitor("t = %6.1f нс  cnt = %2d  led = %b", $realtime, dut.cnt, led);
        #1000;                        // моделируем 1000 нс
        $finish;
    end
endmodule
