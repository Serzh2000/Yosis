// Active-low LEDs: LED0, LED2 and LED4 should be lit.
module top(output wire [5:0] leds);
    assign leds = 6'b101010;
endmodule
