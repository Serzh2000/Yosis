// PWM-based DAC (chapter "Digital and the Analog World").
// The counter runs in a circle 0..255; the output is 1 while the counter is less than level.
// The average output voltage is level/256 of the supply; an RC filter turns it into
// a steady voltage.
module pwm_dac (
    input        clk,
    input  [7:0] level,    // desired "voltage" 0..255
    output       pwm
);
    reg [7:0] cnt = 8'd0;
    always @(posedge clk) cnt <= cnt + 8'd1;
    assign pwm = (cnt < level);
endmodule
