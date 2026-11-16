// Testbench: check "8" (all segments), "1" (only b and c) and that the digits are all different.
`timescale 1ns/1ps
module tb_hex7seg;
    reg  [3:0] x;
    wire [6:0] seg;
    integer i, j, errors;
    reg [6:0] table_seg [0:15];

    hex7seg dut (.x(x), .seg(seg));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1) begin
            x = i[3:0];
            #5;
            table_seg[i] = seg;
        end
        if (table_seg[8] !== 7'b1111111) begin errors = errors + 1; $display("ERROR: digit 8"); end
        if (table_seg[1] !== 7'b0000110) begin errors = errors + 1; $display("ERROR: digit 1"); end
        for (i = 0; i < 16; i = i + 1)
            for (j = i + 1; j < 16; j = j + 1)
                if (table_seg[i] === table_seg[j]) begin
                    errors = errors + 1;
                    $display("ERROR: digits %0d and %0d look the same", i, j);
                end
        if (errors == 0) $display("OK: hex7seg, 16 different digits");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
