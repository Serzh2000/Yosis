// Example 6. A "breathing" LED using PWM.
module pwm_breath (
    input  wire       clk,        // 27 MHz
    output wire [5:0] led
);
    // PWM generator: 8-bit counter -> frequency 27 MHz / 256 ~ 105 kHz
    reg [7:0] pwm_cnt = 0;
    always @(posedge clk) pwm_cnt <= pwm_cnt + 1'b1;

    // Slowly change the duty cycle: 0 -> 255 -> 0 in about 2 seconds
    localparam integer STEP = 27_000_000 / 512;
    reg [16:0] step_cnt = 0;
    reg [7:0]  duty     = 0;
    reg        up       = 1'b1;

    always @(posedge clk) begin
        if (step_cnt == STEP - 1) begin
            step_cnt <= 0;
            if (up) begin
                if (duty == 8'd255) up <= 1'b0; else duty <= duty + 1'b1;
            end else begin
                if (duty == 8'd0)   up <= 1'b1; else duty <= duty - 1'b1;
            end
        end else begin
            step_cnt <= step_cnt + 1'b1;
        end
    end

    // Comparator: the output is 1 while the counter is less than the given duty cycle
    wire pwm = (pwm_cnt < duty);

    assign led = {6{~pwm}};
endmodule
