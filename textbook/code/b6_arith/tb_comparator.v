// Тестбенч: все 256 пар; ровно один из eq, gt, lt равен 1; пример 1111 и 0001.
`timescale 1ns/1ps
module tb_comparator;
    reg  [3:0] a, b;
    wire eq, gt, lt, lts;
    integer i, j, errors;

    comparator4 dut (.a(a), .b(b), .eq(eq), .gt(gt), .lt(lt), .lt_signed(lts));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 16; j = j + 1) begin
                a = i[3:0]; b = j[3:0];
                #2;
                if (eq !== (i == j) || gt !== (i > j) || lt !== (i < j) || (eq + gt + lt) !== 1) begin
                    errors = errors + 1;
                    $display("ERROR: a=%0d b=%0d", i, j);
                end
            end
        a = 4'b1111; b = 4'b0001; #2;
        if (gt !== 1'b1 || lts !== 1'b1) begin errors = errors + 1; $display("ERROR: 1111 vs 0001"); end
        if (errors == 0) $display("OK: comparator4, 256 pairs");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
