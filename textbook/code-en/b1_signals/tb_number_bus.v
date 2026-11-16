// Testbench: 37 = 100101 lights bits 5, 2 and 0; then all 64 numbers are checked.
`timescale 1ns/1ps
module tb_number_bus;
    reg  [5:0] value;
    wire [5:0] led_n;
    integer i, errors;

    number_bus dut (.value(value), .led_n(led_n));

    initial begin
        errors = 0;
        value = 6'd37;
        #10;
        if (led_n !== 6'b011010) begin
            errors = errors + 1;
            $display("ERROR: for 37 led_n=%b, expected 011010", led_n);
        end
        for (i = 0; i < 64; i = i + 1) begin
            value = i[5:0];
            #10;
            if (led_n !== ~value) begin
                errors = errors + 1;
                $display("ERROR: value=%0d led_n=%b", value, led_n);
            end
        end
        if (errors == 0) $display("OK: number_bus");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
