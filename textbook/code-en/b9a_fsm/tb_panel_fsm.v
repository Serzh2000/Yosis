// Acceptance scenario of stage 9: code -> ARMED, door -> siren, code -> silence; in the DISARMED mode the door does not start the siren.
`timescale 1ns/1ps
module tb_panel_fsm;
    reg  clk = 0, rst = 1, d = 0, code_bit = 0;
    wire siren;
    wire [1:0] mode;
    integer bad = 0;

    panel_fsm dut (.clk(clk), .rst(rst), .d(d), .code_bit(code_bit), .siren(siren), .mode(mode));
    always #5 clk = ~clk;

    task tick;
        begin @(posedge clk); #1; end
    endtask
    task enter(input b2, input b1, input b0);    // enter three code bits
        begin
            code_bit = b2; tick;
            code_bit = b1; tick;
            code_bit = b0; tick;
            code_bit = 0;  tick;                 // pause: c comes in the clock of the last bit, the mode changes right after
        end
    endtask

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        d = 1; tick; tick;                       // (c) the door in DISARMED mode: no siren
        if (siren !== 1'b0 || mode !== 2'd0) bad = bad + 1;
        d = 0; tick;
        enter(1, 0, 1);                          // (a) code -> ARMED
        if (mode !== 2'd1) bad = bad + 1;
        d = 1; tick;                             // (b) door -> siren from the next clock
        if (siren !== 1'b1 || mode !== 2'd2) bad = bad + 1;
        d = 0; tick; tick;
        if (siren !== 1'b1) bad = bad + 1;       // the door is closed, the alarm stays
        enter(1, 0, 1);                          // (d) code -> silence
        if (siren !== 1'b0 || mode !== 2'd0) bad = bad + 1;
        if (bad == 0) $display("panel_fsm: OK"); else $display("panel_fsm: ERRORS %0d", bad);
        $finish;
    end
endmodule
