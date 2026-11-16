// Alarm buzzer: a tone with the given period and duty cycle; without the enable the output is zero.
// At 27 MHz a period of 13500 clocks gives 2 kHz, and 3375 clocks of one give a 25 % duty cycle.
module buzzer #(
    parameter PERIOD = 13500,    // clocks per tone period
    parameter HIGH   = 3375      // of which one
) (
    input  clk,
    input  en,                   // 1 in the ALARM state
    output out
);
    reg [13:0] cnt = 14'd0;
    always @(posedge clk) begin
        if (!en || cnt == PERIOD - 1) cnt <= 14'd0;
        else                          cnt <= cnt + 14'd1;
    end
    assign out = en && (cnt < HIGH);
endmodule
