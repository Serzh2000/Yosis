// Frequency divider: a 1 Hz square wave from the 27 MHz clock.
// A modulo-N counter gives a tick pulse once every N cycles; the pulse toggles a T flip-flop,
// so the full period of the output is 2*N cycles.
// At 27 MHz, N = 13,500,000 gives a half period of 0.5 s, that is 1 Hz. For a testbench, N is reduced.
module clk_div #(parameter N = 13_500_000) (
    input  clk,
    output reg out = 1'b0,     // square wave: period 2*N cycles
    output tick                // pulse: once every N cycles
);
    reg [24:0] cnt = 25'd0;    // 25 bits are enough up to 2^25 = 33,554,432
    assign tick = (cnt == N - 1);
    always @(posedge clk) begin
        if (tick) begin
            cnt <= 25'd0;
            out <= ~out;       // T flip-flop driven by the pulse
        end else
            cnt <= cnt + 25'd1;
    end
endmodule
