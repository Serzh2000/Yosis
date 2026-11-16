// Range 3..9 from the minimal form with don't-care codes 10..15: F = A + B + CD.
module range3to9_min (
    input  [3:0] x,
    output       y
);
    assign y = x[3] | x[2] | (x[1] & x[0]);   // gives 1 on 10..15, but there we don't care
endmodule
