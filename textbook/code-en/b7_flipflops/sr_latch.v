// SR latch built from two NOR gates (figure "RS flip-flop"): the feedback loop is written with assign.
module sr_latch (
    input  s,        // Set:   s = 1 -> q = 1
    input  r,        // Reset: r = 1 -> q = 0
    output q,
    output qn        // inverted output
);
    assign q  = ~(r | qn);   // upper NOR
    assign qn = ~(s | q);    // lower NOR
endmodule
