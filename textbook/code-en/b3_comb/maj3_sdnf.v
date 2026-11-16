// "2 of 3" head-on, from the canonical SOP: one product for every table row where y = 1.
module maj3_sdnf (
    input  a, b, c,
    output y
);
    assign y = (~a & b & c)    // row 3: 011
             | (a & ~b & c)    // row 5: 101
             | (a & b & ~c)    // row 6: 110
             | (a & b & c);    // row 7: 111
endmodule
