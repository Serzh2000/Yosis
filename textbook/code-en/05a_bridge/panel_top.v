// The whole "Security Panel": the guard_panel core, the in_filter input filter and the top module for the Tang Nano 20K board.

// ===== Core: all the logic of the panel. Knows nothing about the board or the buttons. =====
module guard_panel #(
    parameter TONE = 13,         // counter bit for the tone (27 MHz: about 1.6 kHz)
    parameter GAP  = 22          // bit for the pause between beeps (about 3.2 Hz)
) (
    input        clk, rst,                     // clock and synchronous reset
    input        door, window, motion,         // sensors, 1 = triggered
    input        night,                        // night mode
    input  [3:0] noise,                        // noise level
    input        arm_btn,                      // "arm the panel"
    input        code_bit, code_step,          // code entry: a bit and the "accept" pulse
    output       alarm_led, armed_led,
    output       siren,
    output reg [1:0] state
);
    localparam OFF = 2'd0, ARMED = 2'd1, ALARM = 2'd2;

    // Stages 2, 3, 6: combinational part
    wire vote     = (door & window) | (door & motion) | (window & motion);
    wire loud     = noise > 4'd9;
    wire intruder = vote | loud | (door & night);

    // Stage 9: entering the code 1-0-1 and the button edge
    reg [2:0] hist;
    reg       arm_d;
    always @(posedge clk) begin
        arm_d <= arm_btn;
        if (rst)            hist <= 3'b000;
        else if (code_step) hist <= {hist[1:0], code_bit};
    end
    wire arm_pulse = arm_btn & ~arm_d;
    wire unlock    = code_step & ({hist[1:0], code_bit} == 3'b101);

    // Stages 7 and 9: the machine OFF -> ARMED -> ALARM (ALARM is remembered until the right code)
    always @(posedge clk) begin
        if (rst) state <= OFF;
        else case (state)
            OFF:     if (arm_pulse) state <= ARMED;
            ARMED:   if (unlock)        state <= OFF;
                     else if (intruder) state <= ALARM;
            ALARM:   if (unlock) state <= OFF;
            default: state <= OFF;
        endcase
    end

    // Stage 8: a counter for the beep (tone and pause)
    reg [23:0] cnt;
    always @(posedge clk) cnt <= rst ? 24'd0 : cnt + 24'd1;

    assign alarm_led = (state == ALARM);
    assign armed_led = (state == ARMED);
    assign siren     = alarm_led & cnt[GAP] & cnt[TONE];
endmodule

// ===== A button or sensor input: two flip-flops (synchronizer) and a debounce filter. =====
module in_filter #(
    parameter N    = 270_000,    // for how many clocks a value must hold (10 ms at 27 MHz)
    parameter INIT = 1'b0        // the value "before the first measurement"
) (
    input      clk,
    input      raw,              // the signal from outside, not related to the clock
    output reg clean = INIT
);
    reg s1 = INIT, s2 = INIT;
    reg [18:0] cnt = 19'd0;
    always @(posedge clk) begin
        s1 <= raw;
        s2 <= s1;
        if (s2 == clean)          cnt <= 19'd0;
        else if (cnt == N - 1) begin clean <= s2; cnt <= 19'd0; end
        else                      cnt <= cnt + 19'd1;
    end
endmodule

// ===== Top module for the board: the ports match the file panel_top.cst. =====
module panel_top (
    input        clk,            // 27 MHz crystal
    input  [1:0] btn,            // S1 = btn[0] = code bit 0, S2 = btn[1] = code bit 1 (pressed = 1)
    input        door_pin, window_pin, motion_pin, night_pin, arm_pin,   // switches to ground, header J5
    output       buzzer,
    output [5:0] led             // LEDs light at 0
);
    // Power-on reset: 16 clocks after power is applied
    reg [4:0] por = 5'd0;
    wire rst = ~por[4];
    always @(posedge clk) if (rst) por <= por + 5'd1;

    // Filters. Switches "to ground": 1 on the pin = not triggered, so INIT = 1 and an inversion.
    wire door_f, window_f, motion_f, night_f, arm_f, b0_f, b1_f;
    in_filter #(.INIT(1'b1)) f_door   (.clk(clk), .raw(door_pin),   .clean(door_f));
    in_filter #(.INIT(1'b1)) f_window (.clk(clk), .raw(window_pin), .clean(window_f));
    in_filter #(.INIT(1'b1)) f_motion (.clk(clk), .raw(motion_pin), .clean(motion_f));
    in_filter #(.INIT(1'b1)) f_night  (.clk(clk), .raw(night_pin),  .clean(night_f));
    in_filter #(.INIT(1'b1)) f_arm    (.clk(clk), .raw(arm_pin),    .clean(arm_f));
    in_filter                f_b0     (.clk(clk), .raw(btn[0]),     .clean(b0_f));
    in_filter                f_b1     (.clk(clk), .raw(btn[1]),     .clean(b1_f));

    // Code entry with two buttons: pressing either gives the "accept" pulse, S2 is bit 1, S1 is bit 0
    reg any_d = 1'b0;
    always @(posedge clk) any_d <= b0_f | b1_f;
    wire code_step = (b0_f | b1_f) & ~any_d;
    wire code_bit  = b1_f;

    wire alarm_led, armed_led, siren;
    wire [1:0] state;
    guard_panel panel (
        .clk(clk), .rst(rst),
        .door(~door_f), .window(~window_f), .motion(~motion_f), .night(~night_f),
        .noise(4'd0),                          // there is no noise sensor on the board (see the ADC chapter)
        .arm_btn(~arm_f),
        .code_bit(code_bit), .code_step(code_step),
        .alarm_led(alarm_led), .armed_led(armed_led), .siren(siren), .state(state)
    );

    assign buzzer = siren;
    assign led    = ~{3'b000, state == 2'd0, armed_led, alarm_led};   // led[0] = alarm, led[1] = armed, led[2] = off
endmodule
