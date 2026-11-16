// Example 2. Active level: the board LED lights at 0, the reset button acts at 0.
module active_level (
    input  door,          // door sensor: 1 = door open (active high)
    input  rst_n,         // reset button: 0 = pressed (active low, suffix _n)
    output led_n,         // board LED: lit at 0
    output reset_active   // internal "reset is on" signal in the usual polarity: 1 = reset
);
    assign led_n        = ~door;    // door open (1) -> pin is 0 -> the LED lights
    assign reset_active = ~rst_n;   // button pressed (0) -> reset_active = 1
endmodule
