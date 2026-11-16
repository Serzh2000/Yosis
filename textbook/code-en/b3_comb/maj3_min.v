// "2 of 3" in the minimal form from the Karnaugh map: y = ab + ac + bc.
module maj3_min (
    input  a, b, c,
    output y
);
    assign y = (a & b) | (a & c) | (b & c);
endmodule
