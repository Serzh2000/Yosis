// Этап проекта «Охранная панель»: «2 из 3» с входом охраны, y = arm * (ab + ac + bc).
module guard_arm (
    input  arm,
    input  a, b, c,
    output y
);
    wire two_of_three = (a & b) | (a & c) | (b & c);
    assign y = arm & two_of_three;
endmodule
