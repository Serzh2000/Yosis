// Example 5. Three inputs: the security panel rule, 3-input AND, parity of three and "2 out of 3".
module three_inputs (
    input  door, night, armed,
    output alarm,       // alarm = door open AND (night OR armed)
    output led_n,       // the board LED lights at 0: inverted alarm
    output all3,        // 3-input AND
    output odd3,        // 3-input XOR: 1 if the number of ones is odd
    output two_of_3     // majority function: at least two ones
);
    assign alarm = door & (night | armed);        // the parentheses are required: & binds tighter than |
    assign led_n = ~alarm;
    assign all3  = door & night & armed;
    assign odd3  = door ^ night ^ armed;
    assign two_of_3 = (door & night) | (door & armed) | (night & armed);
endmodule
