// A BEGINNER'S MISTAKE: blocking assignments (=) in a clocked block.
// Each line sees the NEW value of the previous one, so the bit "flies" through
// all three flip-flops in one cycle: this is one flip-flop, not a shift register.
module shift_bad (
    input      clk,
    input      d,
    output reg q0, q1, q2
);
    always @(posedge clk) begin
        q0 = d;      // q0 changes at once
        q1 = q0;     // reads the already NEW q0
        q2 = q1;     // reads the already NEW q1
    end
endmodule
