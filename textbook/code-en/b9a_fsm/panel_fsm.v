// Mode machine of the "Security Panel": DISARMED -> ARMED -> ALARM, the right code 1-0-1 changes the mode.
// The file has two machines: the code detector (Mealy) and the mode machine (Moore), connected by the signal c.

// Code detector: the same as seq101, renamed so that the file is self-contained.
module code_detector (
    input  clk, rst, x,
    output c
);
    localparam [1:0] S0 = 2'd0, S1 = 2'd1, S10 = 2'd2;
    reg [1:0] state;
    always @(posedge clk) begin
        if (rst) state <= S0;
        else case (state)
            S0:      state <= x ? S1 : S0;
            S1:      state <= x ? S1 : S10;
            S10:     state <= x ? S1 : S0;
            default: state <= S0;
        endcase
    end
    assign c = (state == S10) && x;
endmodule

module panel_modes (
    input            clk,
    input            rst,
    input            d,          // door open
    input            c,          // the right code entered
    output           siren,
    output reg [1:0] mode
);
    localparam [1:0] OFF = 2'd0, ARMED = 2'd1, ALARM = 2'd2;
    reg [1:0] next;

    // Block 1: state register
    always @(posedge clk) begin
        if (rst) mode <= OFF;
        else     mode <= next;
    end

    // Block 2: transitions (all four combinations of d, c are covered for every mode)
    always @(*) begin
        next = mode;
        case (mode)
            OFF:     if (c) next = ARMED;
            ARMED:   if (c) next = OFF;
                     else if (d) next = ALARM;
            ALARM:   if (c) next = OFF;
            default: next = OFF;
        endcase
    end

    // Block 3: Moore output
    assign siren = (mode == ALARM);
endmodule

module panel_fsm (
    input        clk,
    input        rst,
    input        d,              // door sensor
    input        code_bit,       // the entered code bit, one per clock
    output       siren,
    output [1:0] mode
);
    wire c;
    code_detector u_code (.clk(clk), .rst(rst), .x(code_bit), .c(c));
    panel_modes   u_mode (.clk(clk), .rst(rst), .d(d), .c(c), .siren(siren), .mode(mode));
endmodule
