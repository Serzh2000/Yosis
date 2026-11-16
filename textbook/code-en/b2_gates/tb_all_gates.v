// Testbench: the truth table of all gates; expected values are the table rows from the chapter.
`timescale 1ns/1ps
module tb_all_gates;
    reg a, b;
    wire y_not, y_and, y_or, y_nand, y_nor, y_xor, y_xnor;
    integer i, errors;
    reg [3:0] t_and  = 4'b1000;   // index = {a,b}: bits are written from 11 down to 00
    reg [3:0] t_or   = 4'b1110;
    reg [3:0] t_nand = 4'b0111;
    reg [3:0] t_nor  = 4'b0001;
    reg [3:0] t_xor  = 4'b0110;
    reg [3:0] t_xnor = 4'b1001;

    all_gates dut (.a(a), .b(b), .y_not(y_not), .y_and(y_and), .y_or(y_or),
                   .y_nand(y_nand), .y_nor(y_nor), .y_xor(y_xor), .y_xnor(y_xnor));

    initial begin
        errors = 0;
        $display(" a b | NOT AND OR NAND NOR XOR XNOR");
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];
            #5;
            $display(" %b %b |  %b   %b   %b   %b    %b   %b   %b", a, b, y_not, y_and, y_or, y_nand, y_nor, y_xor, y_xnor);
            if (y_not !== ~a || y_and !== t_and[i] || y_or !== t_or[i] || y_nand !== t_nand[i] ||
                y_nor !== t_nor[i] || y_xor !== t_xor[i] || y_xnor !== t_xnor[i]) begin
                errors = errors + 1;
                $display("ERROR: row %0d", i);
            end
        end
        if (errors == 0) $display("OK: all_gates");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
