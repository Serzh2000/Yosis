// Testbench: the three forms of XOR agree; at a=b=1 XOR gives 0 while OR gives 1.
`timescale 1ns/1ps
module tb_xor_forms;
    reg a, b;
    wire y_op, y_sop, y_or_and, same;
    integer i, errors;

    xor_forms dut (.a(a), .b(b), .y_op(y_op), .y_sop(y_sop), .y_or_and(y_or_and), .same(same));

    initial begin
        errors = 0;
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];
            #5;
            if (y_op !== y_sop || y_op !== y_or_and || same !== ~y_op) begin
                errors = errors + 1;
                $display("ERROR: a=%b b=%b", a, b);
            end
        end
        a = 1; b = 1;
        #5;
        if (y_op !== 1'b0 || (a | b) !== 1'b1) begin errors = errors + 1; $display("ERROR: row 11"); end
        if (errors == 0) $display("OK: xor_forms");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
