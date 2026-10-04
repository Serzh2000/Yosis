// Tang Nano 20K: two user buttons control six onboard LEDs.
// Buttons are active low: 0 = pressed, 1 = released.
// LEDs are active low: 0 = lit, 1 = dark.
// This is a combinational circuit: no clock, reset or SDRAM is needed.
module top (
    input wire button_a_n,
    input wire button_b_n,
    output wire [5:0] led_n
);
    wire a = ~button_a_n;
    wire b = ~button_b_n;

    // Physical LED order:
    // LED0 = A; LED1 = B; LED2 = XOR; LED3 = AND; LED4 = OR; LED5 = XNOR.
    wire [5:0] lit = {~(a ^ b), a | b, a & b, a ^ b, b, a};
    assign led_n = ~lit;
endmodule
