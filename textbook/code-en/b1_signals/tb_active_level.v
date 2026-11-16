// Testbench: all four combinations of door and rst_n.
`timescale 1ns/1ps
module tb_active_level;
    reg door, rst_n;
    wire led_n, reset_active;
    integer i, errors;

    active_level dut (.door(door), .rst_n(rst_n), .led_n(led_n), .reset_active(reset_active));

    initial begin
        errors = 0;
        for (i = 0; i < 4; i = i + 1) begin
            {door, rst_n} = i[1:0];
            #10;
            if (led_n !== ~door || reset_active !== ~rst_n) begin
                errors = errors + 1;
                $display("ERROR: door=%b rst_n=%b led_n=%b reset_active=%b", door, rst_n, led_n, reset_active);
            end
        end
        if (errors == 0) $display("OK: active_level");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
