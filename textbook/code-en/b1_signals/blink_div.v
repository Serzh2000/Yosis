// Example 5. Counter divider: the top bit of the counter blinks 2^N times slower than the clock.
module blink_div #(
    parameter N = 24      // counter width: at 27 MHz N = 24 gives about 1.6 Hz
) (
    input  clk,
    output led            // the top bit of the counter
);
    reg [N-1:0] cnt = 0;                  // N-bit counter
    always @(posedge clk)
        cnt <= cnt + 1'b1;                // +1 every clock; back to 0 after overflow
    assign led = cnt[N-1];                // the period of led is 2^N clocks
endmodule
