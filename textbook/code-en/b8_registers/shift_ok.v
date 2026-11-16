// The correct version: non-blocking assignments (<=) in a clocked block.
// All right-hand sides are evaluated with the OLD values, then all flip-flops update together.
module shift_ok (
    input      clk,
    input      d,
    output reg q0, q1, q2
);
    always @(posedge clk) begin
        q0 <= d;
        q1 <= q0;    // old q0
        q2 <= q1;    // old q1
    end
endmodule
