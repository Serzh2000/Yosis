// Example 10. A two-flip-flop synchronizer and a button debounce filter.
// The button signal is not related to the clock: it can arrive at any moment, including in the "forbidden
// window" around the clock edge. The first flip-flop may then enter a metastable state,
// and the second gives it a whole clock cycle to settle.
module sync2ff (
    input  clk,
    input  async_in,        // signal from another clock domain or from a button
    output sync_out         // the same signal, but synchronous with clk and safe
);
    (* async_reg = "true" *) reg s1 = 1'b0;
    (* async_reg = "true" *) reg s2 = 1'b0;
    always @(posedge clk) begin
        s1 <= async_in;     // metastability is possible here
        s2 <= s1;           // it does not reach this point
    end
    assign sync_out = s2;
endmodule

// Debounce filter: accept a new value only if it holds for N clock cycles in a row
module debounce #(
    parameter integer N = 4
) (
    input  clk,
    input  in,
    output reg out = 1'b0
);
    wire s;
    sync2ff u_sync (.clk(clk), .async_in(in), .sync_out(s));

    reg [15:0] cnt = 0;
    always @(posedge clk) begin
        if (s == out) cnt <= 0;                   // nothing changes: the count is reset
        else if (cnt == N - 1) begin out <= s; cnt <= 0; end
        else cnt <= cnt + 16'd1;
    end
endmodule
