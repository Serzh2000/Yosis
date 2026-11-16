// Example 4. Divide-by-2: the output toggles at every rising clock edge.
module clk_div2 (
    input  clk,       // clock
    output q          // half the clock frequency
);
    reg t = 1'b0;                 // one bit of memory, initial value 0
    always @(posedge clk)         // at the rising clock edge (0 -> 1 transition)
        t <= ~t;                  // flip the value (non-blocking assignment)
    assign q = t;
endmodule
