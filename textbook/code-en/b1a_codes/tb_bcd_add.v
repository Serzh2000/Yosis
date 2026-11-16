// Testbench: all 100 pairs of digits, the result is compared with decimal arithmetic.
`timescale 1ns/1ps
module tb_bcd_add;
    reg  [3:0] a, b;
    wire [3:0] ones;
    wire       tens;
    integer i, j, errors;

    bcd_add dut (.a(a), .b(b), .ones(ones), .tens(tens));

    initial begin
        errors = 0;
        for (i = 0; i < 10; i = i + 1)
            for (j = 0; j < 10; j = j + 1) begin
                a = i[3:0];
                b = j[3:0];
                #5;
                if (ones !== (i + j) % 10 || tens !== ((i + j) >= 10)) begin
                    errors = errors + 1;
                    $display("ERROR: %0d+%0d gives tens=%b ones=%0d", i, j, tens, ones);
                end
            end
        a = 4'd7;
        b = 4'd5;
        #5;
        if (tens !== 1'b1 || ones !== 4'd2) begin errors = errors + 1; $display("ERROR: 7+5"); end
        if (errors == 0) $display("OK: bcd_add, 100 pairs");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
