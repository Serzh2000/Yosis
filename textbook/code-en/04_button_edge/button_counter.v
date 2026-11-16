// Example 4. Button press counter with bounce suppression.
// S1 adds one, S2 resets. The result is shown in binary on the LEDs.
module button_counter (
    input  wire       clk,
    input  wire [1:0] btn,
    output wire [5:0] led
);
    // 1) Synchronizer: two flip-flops in a row protect against metastability
    reg [1:0] sync0 = 0, sync1 = 0;
    always @(posedge clk) begin
        sync0 <= btn;
        sync1 <= sync0;
    end

    // 2) Debounce: accept a new value only if it
    //    holds for 10 ms (270,000 clock cycles at 27 MHz)
    localparam integer STABLE = 270_000;
    reg [18:0] db_cnt = 0;
    reg        s1     = 1'b0;          // "clean" state of button S1

    always @(posedge clk) begin
        if (sync1[0] == s1) begin
            db_cnt <= 0;               // nothing has changed
        end else if (db_cnt == STABLE - 1) begin
            s1     <= sync1[0];        // change confirmed
            db_cnt <= 0;
        end else begin
            db_cnt <= db_cnt + 1'b1;
        end
    end

    // 3) Rising-edge detector: 1 for exactly one clock cycle on a press
    reg  s1_prev = 1'b0;
    always @(posedge clk) s1_prev <= s1;
    wire press = s1 & ~s1_prev;

    // 4) The counter itself
    reg [5:0] count = 0;
    always @(posedge clk) begin
        if (sync1[1])                  // S2 is reset
            count <= 0;
        else if (press)
            count <= count + 1'b1;
    end

    assign led = ~count;
endmodule
