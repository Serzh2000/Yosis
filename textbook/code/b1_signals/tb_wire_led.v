// Тестбенч: перебираем все 64 значения шины sw.
`timescale 1ns/1ps
module tb_wire_led;
    reg  [5:0] sw;
    wire [5:0] led;
    integer i, errors;

    wire_led dut (.sw(sw), .led(led));

    initial begin
        errors = 0;
        for (i = 0; i < 64; i = i + 1) begin
            sw = i[5:0];
            #10;
            if (led !== sw) begin
                errors = errors + 1;
                $display("ERROR: sw=%b led=%b", sw, led);
            end
        end
        if (errors == 0) $display("OK: wire_led, 64 combinations");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
