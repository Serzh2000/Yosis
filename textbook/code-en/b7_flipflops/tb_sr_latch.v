// SR latch testbench: set, hold, reset, hold (Icarus Verilog).
`timescale 1ns/1ps
module tb_sr_latch;
    reg s = 0, r = 0;
    wire q, qn;
    integer errors = 0;
    sr_latch dut (.s(s), .r(r), .q(q), .qn(qn));

    task check(input exp_q, input [8*20-1:0] what);
        begin
            #5;
            if (q !== exp_q || qn !== ~exp_q) begin
                errors = errors + 1;
                $display("ERROR: %0s: q=%b qn=%b, expected q=%b", what, q, qn, exp_q);
            end
        end
    endtask

    initial begin
        // The initial state is unknown (X), so write a 1 first.
        s = 1; r = 0; check(1'b1, "set");
        s = 0; r = 0; check(1'b1, "hold 1");
        s = 0; r = 1; check(1'b0, "reset");
        s = 0; r = 0; check(1'b0, "hold 0");
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
