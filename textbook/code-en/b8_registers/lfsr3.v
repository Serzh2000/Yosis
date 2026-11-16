// Three-bit LFSR from the "LFSR" figure: q0 <= q1 xor q2, q1 <= q0, q2 <= q1.
// It visits all 7 non-zero states. State 000 is forbidden (it never leaves).
module lfsr3 (
    input        clk,
    input        rst,
    output reg [2:0] q       // q[0] = q0, q[1] = q1, q[2] = q2
);
    wire fb = q[1] ^ q[2];                   // feedback: XOR of the taps
    always @(posedge clk) begin
        if (rst) q <= 3'b001;                // q0 = 1: a non-zero initial state
        else     q <= {q[1], q[0], fb};      // q2<=q1, q1<=q0, q0<=fb
    end
endmodule
