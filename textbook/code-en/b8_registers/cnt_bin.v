// Binary synchronous counter with a count enable and a synchronous reset.
// After 1111 it goes to 0000 (modulus 2^W).
module cnt_bin #(parameter W = 4) (
    input          clk,
    input          rst,
    input          en,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (en) q <= q + 1'b1;     // a register and a "+1" adder in the feedback path
    end
endmodule
