// The same function in the minimal form from the Karnaugh map: F = A + BC + BD, A = x[3], B = x[2], C = x[1], D = x[0].
module gt4_min (
    input  [3:0] x,
    output       y
);
    assign y = x[3] | (x[2] & x[1]) | (x[2] & x[0]);
endmodule
