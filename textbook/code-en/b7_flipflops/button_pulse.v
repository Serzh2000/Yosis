// Button -> synchronizer -> edge detector: one pulse per press,
// however many cycles the button is held.
module button_pulse (
    input  clk,
    input  btn,        // asynchronous button (1 = pressed)
    output pulse
);
    reg ff1 = 1'b0, ff2 = 1'b0, ff3 = 1'b0;
    always @(posedge clk) begin
        ff1 <= btn;    // synchronizer, first flip-flop
        ff2 <= ff1;    // synchronizer, second flip-flop
        ff3 <= ff2;    // previous value for the edge detector
    end
    assign pulse = ff2 & ~ff3;
endmodule
