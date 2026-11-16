// "Security Panel" project stage: "2 of 3" with an arming input, y = arm * (ab + ac + bc).
module guard_arm (
    input  arm,
    input  a, b, c,
    output y
);
    wire two_of_three = (a & b) | (a & c) | (b & c);
    assign y = arm & two_of_three;
endmodule
