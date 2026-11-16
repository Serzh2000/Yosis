// Testbench: all 256 numbers, the digits are compared with division by 10 and 100.
`timescale 1ns/1ps
module tb_bin2bcd;
    reg  [7:0] bin;
    wire [3:0] h, t, o;
    integer i, errors;

    bin2bcd dut (.bin(bin), .h(h), .t(t), .o(o));

    initial begin
        errors = 0;
        for (i = 0; i < 256; i = i + 1) begin
            bin = i[7:0];
            #5;
            if (h !== i / 100 || t !== (i / 10) % 10 || o !== i % 10) begin
                errors = errors + 1;
                $display("ERROR: %0d -> %0d%0d%0d", i, h, t, o);
            end
        end
        if (errors == 0) $display("OK: bin2bcd, 256 numbers");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
