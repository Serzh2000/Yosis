// Hamming (7,4) code: corrects one error in seven received bits (chapter "Number Systems and Codes").
// Positions 1..7:  p1 p2 d1 p3 d2 d3 d4.  The parity bits sit at positions that are powers of two.
module hamming74 (
    input  [3:0] d,      // four data bits
    input  [6:0] err,    // error mask: a one flips a bit in the channel
    output [6:0] sent,   // codeword as it was sent into the channel
    output [6:0] got,    // what was received (with an error)
    output [2:0] syn,    // syndrome = number of the damaged position (0 --- no error)
    output [3:0] q       // corrected data
);
    // Encoder: each parity bit is the parity of its own group of positions
    wire p1 = d[0] ^ d[1] ^ d[3];    // positions 1,3,5,7
    wire p2 = d[0] ^ d[2] ^ d[3];    // positions 2,3,6,7
    wire p3 = d[1] ^ d[2] ^ d[3];    // positions 4,5,6,7
    assign sent = {d[3], d[2], d[1], p3, d[0], p2, p1};

    // Channel: flip the selected bits
    assign got = sent ^ err;

    // Decoder: recompute the parities; zeros mean "all is well"
    wire s1 = got[0] ^ got[2] ^ got[4] ^ got[6];
    wire s2 = got[1] ^ got[2] ^ got[5] ^ got[6];
    wire s3 = got[3] ^ got[4] ^ got[5] ^ got[6];
    assign syn = {s3, s2, s1};

    // Correction: flip the bit at position syn
    wire [6:0] fixed = (syn == 3'd0) ? got : (got ^ (7'd1 << (syn - 3'd1)));
    assign q = {fixed[6], fixed[5], fixed[4], fixed[2]};
endmodule
