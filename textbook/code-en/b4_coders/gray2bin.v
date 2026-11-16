// Gray code -> binary: a chain of XORs from the top bit (b2 = g2, b1 = b2^g1, b0 = b1^g0).
module gray2bin (
    input  [2:0] g,
    output [2:0] b
);
    assign b[2] = g[2];
    assign b[1] = b[2] ^ g[1];
    assign b[0] = b[1] ^ g[0];
endmodule
