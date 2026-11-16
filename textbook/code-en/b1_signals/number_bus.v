// Example 3. A number on a bus: six bits go to six LEDs that light at 0.
module number_bus (
    input  [5:0] value,   // number 0..63, bit 0 is the least significant
    output [5:0] led_n    // board LEDs: lit at 0
);
    assign led_n = ~value;   // a one in a bit = a zero on the pin = the LED lights
endmodule
