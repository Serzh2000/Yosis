// Testbench: 7-3=4, 3-5=-2 (1110), then all pairs: the result matches a+b and a-b modulo 16.
`timescale 1ns/1ps
module tb_addsub4;
    reg  [3:0] a, b;
    reg        sub;
    wire [3:0] s;
    wire       cout;
    integer i, j, errors;

    addsub4 dut (.a(a), .b(b), .sub(sub), .s(s), .cout(cout));

    initial begin
        errors = 0;
        a = 4'd7; b = 4'd3; sub = 1'b1; #5;
        if (s !== 4'b0100) begin errors = errors + 1; $display("ERROR: 7-3 = %b", s); end
        a = 4'd3; b = 4'd5; sub = 1'b1; #5;
        if (s !== 4'b1110) begin errors = errors + 1; $display("ERROR: 3-5 = %b", s); end
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 16; j = j + 1) begin
                a = i[3:0]; b = j[3:0];
                sub = 1'b0; #2;
                if (s !== (i + j) % 16) begin errors = errors + 1; $display("ERROR: %0d+%0d", i, j); end
                sub = 1'b1; #2;
                if (s !== (i - j + 16) % 16) begin errors = errors + 1; $display("ERROR: %0d-%0d", i, j); end
            end
        if (errors == 0) $display("OK: addsub4");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
