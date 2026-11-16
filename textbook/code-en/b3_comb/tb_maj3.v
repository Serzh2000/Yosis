`timescale 1ns/1ps
// Testbench for the "Combinational Circuits" chapter: three forms of "2 of 3", "exactly two", the night guard, the panel with arm.
module tb_maj3;
    reg  a, b, c, arm;
    wire y_sdnf, y_min, y_case, y_ex, y_arm, alarm;
    reg  [1:0] cnt;
    integer i, bad = 0;
    maj3_sdnf   u1 (.a(a), .b(b), .c(c), .y(y_sdnf));
    maj3_min    u2 (.a(a), .b(b), .c(c), .y(y_min));
    maj3_case   u3 (.a(a), .b(b), .c(c), .y(y_case));
    exactly2    u4 (.a(a), .b(b), .c(c), .y(y_ex));
    guard_arm   u5 (.arm(arm), .a(a), .b(b), .c(c), .y(y_arm));
    guard_night u6 (.door(a), .night(b), .armed(c), .alarm(alarm));
    initial begin
        for (i = 0; i < 16; i = i + 1) begin
            {arm, a, b, c} = i; #1;
            cnt = a + b + c;
            if (y_sdnf !== (cnt >= 2)) bad = bad + 1;
            if (y_min  !== (cnt >= 2)) bad = bad + 1;
            if (y_case !== (cnt >= 2)) bad = bad + 1;
            if (y_ex   !== (cnt == 2)) bad = bad + 1;
            if (y_arm  !== (arm && cnt >= 2)) bad = bad + 1;
            if (alarm  !== (a && (b || c))) bad = bad + 1;
        end
        if (bad == 0) $display("maj3: OK"); else $display("maj3: ERRORS %0d", bad);
        $finish;
    end
endmodule
