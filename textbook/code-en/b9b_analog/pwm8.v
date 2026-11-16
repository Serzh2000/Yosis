// Eight-bit PWM. A new level is accepted only at the start of a period so that a pulse is not cut.
module pwm8 (
    input        clk,
    input  [7:0] level,          // 0..255: for how many clocks out of 256 the output is 1
    output       pwm
);
    reg [7:0] cnt = 8'd0;        // the "saw": counts 0..255 round and round
    reg [7:0] lvl = 8'd0;        // the level valid in the current period
    always @(posedge clk) begin
        cnt <= cnt + 8'd1;
        if (cnt == 8'hFF) lvl <= level;
    end
    assign pwm = (cnt < lvl);
endmodule
