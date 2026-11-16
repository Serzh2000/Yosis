// Shift register "serial in -> parallel out" (figure "Four-bit shift register").
// A new bit din enters on the right (least significant bit); the contents shift left.
module shift_sipo #(parameter W = 4) (
    input          clk,
    input          rst,
    input          din,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst) q <= {W{1'b0}};
        else     q <= {q[W-2:0], din};   // concatenation: drop the top bit, append din
    end
endmodule
