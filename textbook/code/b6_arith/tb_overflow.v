// Тестбенч: все 256 пар со знаком; V и насыщенный результат сравниваются с целочисленной арифметикой.
`timescale 1ns/1ps
module tb_overflow;
    reg  [3:0] a, b;
    wire [3:0] s, ss;
    wire c3, c4, v;
    integer i, j, errors, sa, sb, sr, expect_s;

    add4_ovf u1 (.a(a), .b(b), .s(s), .c3(c3), .c4(c4), .v(v));
    add4_sat u2 (.a(a), .b(b), .s(ss));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 16; j = j + 1) begin
                a = i[3:0]; b = j[3:0];
                #2;
                sa = (i > 7) ? i - 16 : i;
                sb = (j > 7) ? j - 16 : j;
                sr = sa + sb;
                if (v !== (sr > 7 || sr < -8) || s !== (i + j) % 16) begin
                    errors = errors + 1;
                    $display("ERROR: %0d+%0d v=%b s=%b", sa, sb, v, s);
                end
                expect_s = (sr > 7) ? 7 : (sr < -8) ? -8 : sr;
                if ($signed(ss) !== expect_s) begin
                    errors = errors + 1;
                    $display("ERROR: saturation %0d+%0d gives %0d", sa, sb, $signed(ss));
                end
            end
        a = 4'd5; b = 4'd3; #2;
        if (v !== 1'b1 || c3 !== 1'b1 || c4 !== 1'b0) begin errors = errors + 1; $display("ERROR: 5+3 flags"); end
        if (errors == 0) $display("OK: overflow, 256 pairs");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
