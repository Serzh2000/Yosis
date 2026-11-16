// Testbench: XOR, AND, OR; then all 16 functions of two variables, changing only the parameter TT.
`timescale 1ns/1ps
module tb_mux_logic;
    reg a, b;
    wire yx, ya, yo, yf;
    reg [3:0] tt;
    integer i, k, errors;

    xor_on_mux x1 (.a(a), .b(b), .y(yx));
    and_on_lut a1 (.a(a), .b(b), .y(ya));
    or_on_lut  o1 (.a(a), .b(b), .y(yo));

    // One module for different TT: the instances are created by hand for the check
    wire [15:0] yall;
    genvar g;
    generate
        for (g = 0; g < 16; g = g + 1) begin : lut
            mux_lut2 #(.TT(g)) u (.a(a), .b(b), .y(yall[g]));
        end
    endgenerate

    initial begin
        errors = 0;
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];
            #5;
            if (yx !== (a ^ b) || ya !== (a & b) || yo !== (a | b)) begin
                errors = errors + 1;
                $display("ERROR: a=%b b=%b", a, b);
            end
            for (k = 0; k < 16; k = k + 1) begin
                tt = k[3:0];
                if (yall[k] !== tt[i]) begin
                    errors = errors + 1;
                    $display("ERROR: TT=%b row %0d", tt, i);
                end
            end
        end
        if (errors == 0) $display("OK: mux_logic, 16 functions");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
