// Тестбенч: все 512 комбинаций a, b, cin; оба сумматора против обычного сложения.
`timescale 1ns/1ps
module tb_add4;
    reg  [3:0] a, b;
    reg        cin;
    wire [3:0] s1, s2;
    wire       c1, c2;
    integer i, j, k, errors;
    reg [4:0] ref_sum;

    add4_loop   u1 (.a(a), .b(b), .cin(cin), .s(s1), .cout(c1));
    add4_assign u2 (.a(a), .b(b), .cin(cin), .s(s2), .cout(c2));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 16; j = j + 1)
                for (k = 0; k < 2; k = k + 1) begin
                    a = i[3:0]; b = j[3:0]; cin = k[0];
                    #2;
                    ref_sum = i + j + k;
                    if ({c1, s1} !== ref_sum || {c2, s2} !== ref_sum) begin
                        errors = errors + 1;
                        $display("ERROR: %0d+%0d+%0d", i, j, k);
                    end
                end
        a = 4'd7; b = 4'd9; cin = 1'b0; #2;
        if ({c1, s1} !== 5'b10000) begin errors = errors + 1; $display("ERROR: 7+9"); end
        if (errors == 0) $display("OK: add4, 512 combinations");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
