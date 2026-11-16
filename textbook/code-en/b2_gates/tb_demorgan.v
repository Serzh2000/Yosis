// Testbench: mismatch = 0 on all four combinations.
`timescale 1ns/1ps
module tb_demorgan;
    reg a, b;
    wire y1, y2, z1, z2, mismatch;
    integer i, errors;

    demorgan dut (.a(a), .b(b), .y1(y1), .y2(y2), .z1(z1), .z2(z2), .mismatch(mismatch));

    initial begin
        errors = 0;
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];
            #5;
            if (mismatch !== 1'b0) begin
                errors = errors + 1;
                $display("ERROR: a=%b b=%b", a, b);
            end
        end
        if (errors == 0) $display("OK: demorgan, mismatch is always 0");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
