// Binary -> Gray code: g = b ^ (b >> 1). All the XORs work in parallel.
module bin2gray (
    input  [2:0] b,
    output [2:0] g
);
    assign g = b ^ (b >> 1);        // g2 = b2, g1 = b2^b1, g0 = b1^b0
endmodule
