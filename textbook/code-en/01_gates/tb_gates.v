// Testbench for project 1: try all button combinations
// and print the truth table.
`timescale 1ns/1ps
module tb_gates;
    reg  [1:0] btn;          // signals that the testbench "presses"
    wire [5:0] led;          // outputs of the module under test

    // Instance of the module under test (DUT -- Device Under Test)
    gates dut (.btn(btn), .led(led));

    integer i;
    initial begin
        $dumpfile("tb_gates.vcd");
        $dumpvars(0, tb_gates);
        $display(" a b | AND OR NOT NAND NOR XOR");
        for (i = 0; i < 4; i = i + 1) begin
            btn = i[1:0];
            #10;             // wait 10 ns for the signals to settle
            // ~led -- because the LEDs are inverted
            $display(" %b %b |  %b   %b   %b    %b    %b   %b",
                     btn[0], btn[1], ~led[0], ~led[1], ~led[2],
                     ~led[3], ~led[4], ~led[5]);
        end
        $finish;
    end
endmodule
