// Two-flip-flop synchronizer: brings an asynchronous signal (a button) into the clk domain.
module sync2 (
    input  clk,
    input  async_in,     // not related to clk
    output sync_out      // safe to use inside the circuit
);
    reg ff1 = 1'b0, ff2 = 1'b0;
    always @(posedge clk) begin
        ff1 <= async_in;   // may catch metastability
        ff2 <= ff1;        // settles during one clock cycle
    end
    assign sync_out = ff2;
endmodule
