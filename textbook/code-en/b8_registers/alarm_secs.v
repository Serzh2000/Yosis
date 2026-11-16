// "Security Panel" project stage: alarm seconds counter.
// It counts tick pulses while the alarm is on; stops at 9; the key (rst) clears it.
module alarm_secs (
    input            clk,
    input            rst,       // guard key
    input            alarm,     // alarm remembered (chapter "Flip-flops")
    input            tick,      // "one second has passed" (from clk_div or cnt_mod)
    output reg [3:0] secs
);
    always @(posedge clk) begin
        if (rst)                                secs <= 4'd0;
        else if (alarm && tick && secs != 4'd9) secs <= secs + 4'd1;
    end
endmodule
