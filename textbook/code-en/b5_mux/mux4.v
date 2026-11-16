// Example 2. A 4:1 multiplexer: with case, with bus indexing and as a tree of three 2:1 multiplexers.
module mux4_case (
    input  [3:0] x,           // data inputs x0..x3
    input  [1:0] s,           // address: the input number
    output reg   y
);
    always @(*) begin
        case (s)
            2'd0:    y = x[0];
            2'd1:    y = x[1];
            2'd2:    y = x[2];
            default: y = x[3];    // s = 3; default also covers x/z address values
        endcase
    end
endmodule

module mux4_index (
    input  [3:0] x,
    input  [1:0] s,
    output       y
);
    assign y = x[s];              // a bus bit index is a multiplexer
endmodule

module mux4_tree (
    input  [3:0] x,
    input  [1:0] s,
    output       y
);
    wire m0 = s[0] ? x[1] : x[0];    // level 1: the low address bit chooses within the pair (x0,x1)
    wire m1 = s[0] ? x[3] : x[2];    // level 1: the same within the pair (x2,x3)
    assign y = s[1] ? m1 : m0;       // level 2: the high bit chooses between the pairs
endmodule
