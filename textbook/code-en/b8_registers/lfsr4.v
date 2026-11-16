// Four-bit LFSR with feedback x^4 + x^3 + 1: it visits 15 non-zero states.
module lfsr4 (
    input        clk,
    input        rst,
    output reg [3:0] q
);
    wire fb = q[3] ^ q[2];                   // taps: the two top bits
    always @(posedge clk) begin
        if (rst) q <= 4'b0001;               // never 0000: the LFSR cannot leave it
        else     q <= {q[2:0], fb};
    end
endmodule
