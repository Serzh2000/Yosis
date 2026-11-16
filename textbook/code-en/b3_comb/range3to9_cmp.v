// "Number in the range 3..9" with comparisons: reads like the condition, but honestly gives 0 on codes 10..15.
module range3to9_cmp (
    input  [3:0] x,
    output       y
);
    assign y = (x >= 4'd3) && (x <= 4'd9);
endmodule
