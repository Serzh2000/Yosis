// Example 2. Blinking LED.
// A counter divides the 27 MHz frequency down to ~1 Hz.
module blink #(
    parameter integer CLK_HZ = 27_000_000     // the frequency can be set from outside
) (
    input  wire       clk,       // 27 MHz
    output wire [5:0] led
);
    localparam integer HALF = CLK_HZ / 2;     // half period = 0.5 s

    reg [24:0] cnt   = 0;        // 2^25 > 13 500 000
    reg        state = 1'b0;

    always @(posedge clk) begin
        if (cnt == HALF - 1) begin
            cnt   <= 0;
            state <= ~state;     // toggle once every 0.5 s
        end else begin
            cnt <= cnt + 1'b1;
        end
    end

    assign led = {6{~state}};    // all six LEDs blink together
endmodule
