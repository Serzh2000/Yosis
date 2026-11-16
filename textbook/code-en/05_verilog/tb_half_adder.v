// Half adder testbench: applies all 4 combinations and checks the outputs.
`timescale 1ns/1ps
module tb_half_adder;
    reg  a, b;                       // inputs of the module under test: reg, driven by the testbench
    wire s, c;                       // outputs: wire, driven by the module
    integer i, bad = 0;

    half_adder dut (.a(a), .b(b), .s(s), .c(c));   // instance of the module under test

    initial begin
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];         // sweep: 00, 01, 10, 11
            #10;                     // wait 10 ns for the circuit to settle
            if (s !== (a ^ b) || c !== (a & b)) begin
                bad = bad + 1;
                $display("error: a=%b b=%b s=%b c=%b", a, b, s, c);
            end
        end
        if (bad == 0) $display("half_adder: OK");
        else          $display("half_adder: ERRORS %0d", bad);
        $finish;
    end
endmodule
