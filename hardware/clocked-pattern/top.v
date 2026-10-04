// Tang Nano 20K: two groups of three LEDs alternate every half second.
// The FPGA drives the LEDs through a register, rather than constant VCC/GND nets.
module top #(
    parameter integer HALF_PERIOD = 13_500_000
)(
    input wire clk,
    output wire [5:0] led_n
);
    reg [23:0] divider = 0;
    reg phase = 0;
    always @(posedge clk) begin
        if (divider == HALF_PERIOD - 1) begin
            divider <= 0;
            phase <= ~phase;
        end else begin
            divider <= divider + 1'b1;
        end
    end
    // LEDs are active low. Exactly three should be on in either phase.
    assign led_n = phase ? 6'b010101 : 6'b101010;
endmodule
