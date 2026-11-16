`timescale 1ns/1ps
// Testbench for the "Minimization" chapter: on digits 0..9 all forms match the reference;
// on codes 10..15 the comparison version gives 0 and the minimal form gives 1 (for the range) -- and that is allowed.
module tb_range;
    reg  [3:0] x;
    wire y_gt_dc, y_gt_min, y_cmp, y_min, y_case;
    integer i, bad = 0;
    gt4_dc         u1 (.x(x), .y(y_gt_dc));
    gt4_min        u2 (.x(x), .y(y_gt_min));
    range3to9_cmp  u3 (.x(x), .y(y_cmp));
    range3to9_min  u4 (.x(x), .y(y_min));
    range3to9_case u5 (.x(x), .y(y_case));
    initial begin
        for (i = 0; i < 10; i = i + 1) begin
            x = i; #1;
            if (y_gt_dc  !== (i > 4)) bad = bad + 1;
            if (y_gt_min !== (i > 4)) bad = bad + 1;
            if (y_cmp  !== (i >= 3)) bad = bad + 1;
            if (y_min  !== (i >= 3)) bad = bad + 1;
            if (y_case !== (i >= 3)) bad = bad + 1;
        end
        for (i = 10; i < 16; i = i + 1) begin      // forbidden codes: check only what we promised
            x = i; #1;
            if (y_cmp !== 1'b0) bad = bad + 1;      // comparisons honestly give 0
            if (y_min !== 1'b1) bad = bad + 1;      // the minimal form gave 1 -- we don't care
            if (y_case !== 1'bx) bad = bad + 1;     // in the simulator x shows up as x
        end
        if (bad == 0) $display("range: OK"); else $display("range: ERRORS %0d", bad);
        $finish;
    end
endmodule
