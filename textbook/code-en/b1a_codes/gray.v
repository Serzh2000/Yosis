// Example 6. Gray code: from binary to Gray code and back.
module bin2gray (
    input  [3:0] b,
    output [3:0] g
);
    assign g = b ^ (b >> 1);        // the top bit is copied, the others = XOR of two neighbours
endmodule

module gray2bin (
    input  [3:0] g,
    output [3:0] b
);
    // each binary bit = XOR of all Gray bits from the top one down to it
    assign b[3] = g[3];
    assign b[2] = g[3] ^ g[2];
    assign b[1] = g[3] ^ g[2] ^ g[1];
    assign b[0] = g[3] ^ g[2] ^ g[1] ^ g[0];
endmodule
