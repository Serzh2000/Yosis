// Diagnostic output pattern without inputs, clocks or registers.
// Tang Nano 20K: LED0, LED2, LED4 lit; LED1, LED3, LED5 dark.
// Six LEDs are active low. This isolates output pin configuration.
module top(output wire [5:0] led_n);
    assign led_n = 6'b101010;
endmodule
