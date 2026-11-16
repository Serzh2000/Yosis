// Example 1. Logic gates on buttons.
// Two buttons are two inputs, six LEDs are six functions.
// The LEDs on the board light up from zero, so the output is inverted.
module gates (
    input  wire [1:0] btn,   // btn[0] = S1 (a), btn[1] = S2 (b)
    output wire [5:0] led    // active level is low
);
    wire a = btn[0];
    wire b = btn[1];

    wire [5:0] f;            // "logical" results: 1 = should be lit

    assign f[0] = a & b;     // AND
    assign f[1] = a | b;     // OR
    assign f[2] = ~a;        // NOT
    assign f[3] = ~(a & b);  // NAND
    assign f[4] = ~(a | b);  // NOR
    assign f[5] = a ^ b;     // XOR (exclusive OR)

    assign led = ~f;         // 1 -> 0 on the pin -> the LED is lit
endmodule
