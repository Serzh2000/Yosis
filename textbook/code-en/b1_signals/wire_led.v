// Example 1. A wire: every switch is connected to its own LED.
module wire_led (
    input  [5:0] sw,    // six switches (inputs)
    output [5:0] led    // six LEDs (outputs)
);
    assign led = sw;    // the output always equals the input: it is just a wire
endmodule
