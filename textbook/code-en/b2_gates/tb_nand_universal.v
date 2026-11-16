// Testbench: the four NAND-only circuits are compared with the built-in operators ~, &, |, ^.
`timescale 1ns/1ps
module tb_nand_universal;
    reg a, b;
    wire y_not, y_and, y_or, y_xor;
    integer i, errors;

    not_from_nand t1 (.a(a), .y(y_not));
    and_from_nand t2 (.a(a), .b(b), .y(y_and));
    or_from_nand  t3 (.a(a), .b(b), .y(y_or));
    xor_from_nand t4 (.a(a), .b(b), .y(y_xor));

    initial begin
        errors = 0;
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];
            #5;
            if (y_not !== ~a || y_and !== (a & b) || y_or !== (a | b) || y_xor !== (a ^ b)) begin
                errors = errors + 1;
                $display("ERROR: a=%b b=%b", a, b);
            end
        end
        if (errors == 0) $display("OK: nand_universal");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
